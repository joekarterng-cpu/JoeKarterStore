import crypto from "crypto";

export function generateTicketCode() {
  const random = crypto.randomBytes(6).toString("hex").toUpperCase();

  return `TKT-${random}`;
}