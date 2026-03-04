import { z } from "zod";

export const phoneSchema = z.string().regex(/^\+233[0-9]{9}$/, "Phone must be E.164 +233 format");

export const initiateTransactionSchema = z.object({
  recipientNumber: phoneSchema,
  network: z.enum(["MTN", "TELECEL", "AIRTELTIGO"]),
  type: z.enum(["AIRTIME", "DATA"]),
  amountGhs: z.number().positive(),
  bundleId: z.string().optional()
});

export type InitiateTransaction = z.infer<typeof initiateTransactionSchema>;
