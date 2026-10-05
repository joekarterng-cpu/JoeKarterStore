import QRCode from "qrcode";

export async function generateQRCode(ticketCode) {
  return await QRCode.toDataURL(ticketCode);
}