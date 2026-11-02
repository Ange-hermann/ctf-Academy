import "server-only";
import { randomBytes } from "node:crypto";
import type { PaymentMethod, PaymentStatus } from "@/lib/supabase/types";

export type InitiatePaymentInput = {
  amount: number;
  currency: string;
  method: PaymentMethod;
  phone: string;
  reference: string;
  customer: { firstName: string; lastName: string; email: string };
  description: string;
};

export type PaymentInitiation = { providerReference: string; status: PaymentStatus; redirectUrl?: string };

/** Interface commune à tous les prestataires de paiement (Mobile Money, carte). */
export interface PaymentProvider {
  readonly name: string;
  initiate(input: InitiatePaymentInput): Promise<PaymentInitiation>;
  getStatus(providerReference: string): Promise<PaymentStatus>;
}

/**
 * Prestataire SIMULÉ (par défaut) : la demande passe « en attente », puis est confirmée après ~4 s.
 * Test d'échec : un numéro se terminant par 0000 produit un paiement « échoué ».
 */
class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  async initiate(input: InitiatePaymentInput): Promise<PaymentInitiation> {
    const fail = input.phone.endsWith("0000") ? 1 : 0;
    return { providerReference: `MOCK-${Date.now()}-${fail}-${randomBytes(4).toString("hex")}`, status: "pending" };
  }
  async getStatus(ref: string): Promise<PaymentStatus> {
    const [, ts, fail] = ref.split("-");
    if (Date.now() - Number(ts) < 4000) return "pending";
    return fail === "1" ? "failed" : "confirmed";
  }
}

/**
 * Squelette des prestataires réels. TODO: implémenter selon la documentation du prestataire retenu
 * (CinetPay, PayDunya ou FedaPay), avec vérification des notifications (webhook signé).
 */
class UnconfiguredProvider implements PaymentProvider {
  constructor(readonly name: string) {}
  async initiate(): Promise<PaymentInitiation> {
    throw new Error(`Le prestataire de paiement « ${this.name} » n'est pas encore configuré.`);
  }
  async getStatus(): Promise<PaymentStatus> {
    throw new Error(`Le prestataire de paiement « ${this.name} » n'est pas encore configuré.`);
  }
}

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "mock";
  if (name === "mock") return new MockPaymentProvider();
  return new UnconfiguredProvider(name);
}
