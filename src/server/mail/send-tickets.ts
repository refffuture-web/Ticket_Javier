import { env } from "@/server/env";

export async function sendTicketEmail(input: {
  to: string;
  eventTitle: string;
  orderId: string;
  shortCodes: string[];
}): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || input.to.trim().length === 0) return;
  const link = `${env.APP_URL}/compra/${input.orderId}`;
  const codes = input.shortCodes.map((code) => escapeHtml(code)).join("<br>");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: `Tus entradas para ${input.eventTitle}`,
      text: `Tus entradas para ${input.eventTitle} están en ${link}. Códigos: ${input.shortCodes.join(", ")}.`,
      html: `<p>Tus entradas para <strong>${escapeHtml(input.eventTitle)}</strong> están listas.</p><p><a href="${link}">Ver entradas y códigos QR</a></p><p>${codes}</p>`,
    }),
  });
  if (!response.ok) {
    throw new Error("Resend rechazó el envío");
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char] ?? char;
  });
}
