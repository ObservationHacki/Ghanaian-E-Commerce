export type DeliveryZone = "accra" | "outside_accra";

export const DELIVERY_ZONES = ["accra", "outside_accra"] as const;

function parseFee(raw: string | undefined, envName: string): number | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${envName} must be a non-negative number`);
  }
  return value;
}

export type DeliveryFeeConfig = {
  configured: boolean;
  accra: number | null;
  outsideAccra: number | null;
  error?: string;
};

export function getDeliveryFeeConfig(): DeliveryFeeConfig {
  try {
    const accra = parseFee(process.env.GHS_ACCRA_DELIVERY_FEE, "GHS_ACCRA_DELIVERY_FEE");
    const outsideAccra = parseFee(
      process.env.GHS_OUTSIDE_ACCRA_DELIVERY_FEE,
      "GHS_OUTSIDE_ACCRA_DELIVERY_FEE",
    );
    if (accra == null || outsideAccra == null) {
      return {
        configured: false,
        accra,
        outsideAccra,
        error: "Delivery fees not configured",
      };
    }
    return { configured: true, accra, outsideAccra };
  } catch (err) {
    return {
      configured: false,
      accra: null,
      outsideAccra: null,
      error: err instanceof Error ? err.message : "Invalid delivery fee configuration",
    };
  }
}

export function isDeliveryZone(value: unknown): value is DeliveryZone {
  return value === "accra" || value === "outside_accra";
}

/** Resolve fee for a zone. Throws if fees are not configured or zone is invalid. */
export function resolveDeliveryFee(zone: DeliveryZone): number {
  const config = getDeliveryFeeConfig();
  if (!config.configured || config.accra == null || config.outsideAccra == null) {
    throw Object.assign(
      new Error(config.error ?? "Delivery fees not configured"),
      { status: 503 },
    );
  }
  return zone === "accra" ? config.accra : config.outsideAccra;
}

export function deliveryZoneLabel(zone: string | null | undefined): string {
  if (zone === "accra") return "Accra";
  if (zone === "outside_accra") return "Outside Accra";
  return zone?.trim() || "—";
}
