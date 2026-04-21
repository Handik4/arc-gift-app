/**
 * circleTransfer.ts
 * ─────────────────────────────────────────────
 * ArcGift · Circle USDC Transfer via Arc Network
 * Handles gasless cross-chain USDC transfers using:
 *   - Circle's CCTP (Cross-Chain Transfer Protocol)
 *   - Arc Network's Forwarding Service (enableForwarder = true)
 *   - Solana automatic ATA creation via recipientSetupOptions
 */

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const CIRCLE_API_BASE = "https://api.circle.com/v1/w3s";
const FORWARDING_FEE_USD = 0.20;
const PROTOCOL_FEE_RATE = 0.00005; // 0.005%
const USDC_DECIMALS = 6;

/* ─────────────────────────────────────────────
   Chain ID map (Circle's domain IDs)
───────────────────────────────────────────── */
const CHAIN_DOMAIN_MAP: Record<string, number> = {
  ethereum: 0,
  avalanche: 1,
  optimism: 2,
  arbitrum: 3,
  base: 6,
  polygon: 7,
  solana: 5,
};

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

/** Input parameters for initiating a gift transfer */
export interface TransferParams {
  giftId: string;
  amountUsdc: number;          // Human-readable e.g. 42 (not 42_000_000)
  destinationChain: string;    // e.g. "base", "solana", "ethereum"
  recipientAddress: string;    // On-chain wallet address of recipient
  enableForwarder: boolean;    // Must be true for gasless Arc transfers
  senderWalletId?: string;     // Circle wallet ID of sender (from your backend)
}

/** Fee breakdown returned before / after transfer */
export interface FeeBreakdown {
  gasFeeUsd: number;
  forwardingFeeUsd: number;
  protocolFeeUsd: number;
  totalFeeUsd: number;
  recipientReceivesUsd: number;
  maxFeeRaw: bigint;           // In USDC micro-units (6 decimals)
}

/** Result of a successful transfer initiation */
export interface TransferResult {
  txHash: string;
  transferId: string;
  status: "pending" | "confirmed" | "failed";
  feeBreakdown: FeeBreakdown;
  estimatedArrival: string;    // ISO timestamp
}

/** Solana-specific recipient setup options */
interface SolanaRecipientSetupOptions {
  /** Creates Associated Token Account if recipient has none */
  createAssociatedTokenAccount: boolean;
  /** USDC mint on Solana */
  tokenMintAddress: string;
}

/** Circle API transfer payload */
interface CircleTransferPayload {
  idempotencyKey: string;
  source: {
    type: "wallet";
    id: string;
  };
  destination: {
    type: "blockchain";
    address: string;
    chain: string;
  };
  amount: {
    amount: string;   // Stringified decimal e.g. "42.00"
    currency: "USD";
  };
  feeLevel?: "LOW" | "MEDIUM" | "HIGH";
  enableForwarder: boolean;
  maxFee?: string;
  // Arc Network / Circle extension fields
  recipientSetupOptions?: {
    solana?: SolanaRecipientSetupOptions;
  };
}

/* ─────────────────────────────────────────────
   Fee Calculator
───────────────────────────────────────────── */

/**
 * Calculates maxFee per Arc Network spec:
 *   maxFee = gas fee + forwarding fee ($0.20) + (amount * 0.00005)
 *
 * The gas fee is estimated via the Circle API; we use a conservative
 * estimate here so the transaction doesn't get rejected.
 */
export function calculateFees(amountUsdc: number, estimatedGasFeeUsd = 0.001): FeeBreakdown {
  const gasFeeUsd = estimatedGasFeeUsd;
  const forwardingFeeUsd = FORWARDING_FEE_USD;
  const protocolFeeUsd = amountUsdc * PROTOCOL_FEE_RATE;

  const totalFeeUsd = gasFeeUsd + forwardingFeeUsd + protocolFeeUsd;
  const recipientReceivesUsd = Math.max(0, amountUsdc - totalFeeUsd);

  // Convert to USDC micro-units (6 decimal places) as bigint for on-chain precision
  const maxFeeRaw = BigInt(Math.ceil(totalFeeUsd * 10 ** USDC_DECIMALS));

  return {
    gasFeeUsd,
    forwardingFeeUsd,
    protocolFeeUsd,
    totalFeeUsd,
    recipientReceivesUsd,
    maxFeeRaw,
  };
}

/* ─────────────────────────────────────────────
   Solana ATA Setup Options
───────────────────────────────────────────── */

/**
 * Returns recipientSetupOptions for Solana transfers.
 * Automatically creates an Associated Token Account (ATA) if the
 * recipient doesn't have one — preventing failed transfers.
 *
 * USDC Mint on Solana: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
 */
function buildSolanaSetupOptions(): { solana: SolanaRecipientSetupOptions } {
  return {
    solana: {
      createAssociatedTokenAccount: true,
      tokenMintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    },
  };
}

/* ─────────────────────────────────────────────
   Idempotency Key Generator
───────────────────────────────────────────── */
function generateIdempotencyKey(giftId: string, recipientAddress: string): string {
  const timestamp = Date.now();
  const hash = btoa(`${giftId}:${recipientAddress}:${timestamp}`).replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
  return `arcgift_${hash}`;
}

/* ─────────────────────────────────────────────
   Main Transfer Function
───────────────────────────────────────────── */

/**
 * Initiates a USDC gift transfer via Circle's API + Arc Network forwarding.
 *
 * Key features:
 * - enableForwarder: true → Arc Network sponsors gas on the destination chain
 * - recipientSetupOptions → Solana ATA auto-creation
 * - maxFee computed from Arc spec: gas + $0.20 + (amount * 0.00005)
 *
 * @param params - Transfer configuration
 * @returns Transfer result with txHash and fee breakdown
 *
 * @example
 * ```ts
 * const result = await initiateCircleTransfer({
 *   giftId: "gift_01jxk8mn",
 *   amountUsdc: 42,
 *   destinationChain: "solana",
 *   recipientAddress: "7X8sKtMH...",
 *   enableForwarder: true,
 * });
 * ```
 */
export async function initiateCircleTransfer(params: TransferParams): Promise<TransferResult> {
  const {
    giftId,
    amountUsdc,
    destinationChain,
    recipientAddress,
    enableForwarder,
    senderWalletId = process.env.NEXT_PUBLIC_CIRCLE_SENDER_WALLET_ID ?? "",
  } = params;

  // ── Validate chain ──
  const domainId = CHAIN_DOMAIN_MAP[destinationChain.toLowerCase()];
  if (domainId === undefined) {
    throw new Error(`Unsupported destination chain: "${destinationChain}"`);
  }

  // ── Calculate fees ──
  const fees = calculateFees(amountUsdc);

  // ── Build payload ──
  const isSolana = destinationChain.toLowerCase() === "solana";

  const payload: CircleTransferPayload = {
    idempotencyKey: generateIdempotencyKey(giftId, recipientAddress),
    source: {
      type: "wallet",
      id: senderWalletId,
    },
    destination: {
      type: "blockchain",
      address: recipientAddress,
      chain: destinationChain.toUpperCase(),
    },
    amount: {
      amount: amountUsdc.toFixed(2),
      currency: "USD",
    },
    feeLevel: "MEDIUM",
    enableForwarder,
    // Arc Network maxFee field (stringified micro-units)
    maxFee: fees.maxFeeRaw.toString(),
    // Solana: auto-create ATA if not present
    ...(isSolana && {
      recipientSetupOptions: buildSolanaSetupOptions(),
    }),
  };

  // ── API call ──
  const response = await fetch(`${CIRCLE_API_BASE}/transfers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CIRCLE_API_KEY ?? ""}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(`Circle API error ${response.status}: ${error.message ?? JSON.stringify(error)}`);
  }

  const data = await response.json();
  const transfer = data?.data?.transfer;

  if (!transfer?.id) {
    throw new Error("Circle API returned no transfer ID");
  }

  return {
    txHash: transfer.transactionHash ?? transfer.id,
    transferId: transfer.id,
    status: transfer.status ?? "pending",
    feeBreakdown: fees,
    estimatedArrival: new Date(Date.now() + getEstimatedMs(destinationChain)).toISOString(),
  };
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function getEstimatedMs(chain: string): number {
  const times: Record<string, number> = {
    solana: 1_000,
    base: 2_000,
    arbitrum: 3_000,
    polygon: 3_000,
    avalanche: 4_000,
    ethereum: 15_000,
  };
  return times[chain.toLowerCase()] ?? 10_000;
}

/* ─────────────────────────────────────────────
   Polling helper — poll transfer status
───────────────────────────────────────────── */

/**
 * Poll a transfer until it reaches a terminal state.
 * Useful for showing live progress in the UI.
 */
export async function pollTransferStatus(
  transferId: string,
  onUpdate: (status: string) => void,
  maxAttempts = 30,
  intervalMs = 2_000
): Promise<"confirmed" | "failed"> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    try {
      const res = await fetch(`${CIRCLE_API_BASE}/transfers/${transferId}`, {
        headers: { Authorization: `Bearer ${process.env.CIRCLE_API_KEY ?? ""}` },
      });
      const data = await res.json();
      const status = data?.data?.transfer?.status ?? "pending";
      onUpdate(status);

      if (status === "complete") return "confirmed";
      if (status === "failed") return "failed";
    } catch {
      // Network hiccup — continue polling
    }
  }

  return "failed";
}
