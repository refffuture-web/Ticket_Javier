export type TicketExportData = {
  eventTitle: string;
  eventWhen: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  ticketTypeName: string;
  priceLabel: string;
  shortCode: string;
  qrDataUrl: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  paymentLabel: string;
  statusText: string;
  index: number;
  total: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar el QR"));
    image.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawField(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
) {
  ctx.fillStyle = "#f4f4f5";
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.fillStyle = "#71717a";
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.fillText(label.toUpperCase(), x + 14, y + 22);
  ctx.fillStyle = "#18181b";
  ctx.font = "600 16px system-ui, sans-serif";
  wrapText(ctx, value, x + 14, y + 46, w - 28, 20);
}

/** Misma ficha que `IssuedTicketCard` en pantalla. */
export async function renderTicketCanvas(
  data: TicketExportData,
): Promise<HTMLCanvasElement> {
  const width = 760;
  const height = 1180;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo");

  // Fondo / borde de tarjeta
  ctx.fillStyle = "#e4e4e7";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 16, 16, width - 32, height - 32, 18);
  ctx.fill();

  // Header sky-950
  ctx.fillStyle = "#082f49";
  roundRect(ctx, 16, 16, width - 32, 96, 18);
  ctx.fill();
  ctx.fillRect(16, 70, width - 32, 42);

  ctx.fillStyle = "#bae6fd";
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillText("BOLETERÍA MENDOZA DEL OESTE", 40, 48);
  ctx.fillStyle = "#e0f2fe";
  ctx.font = "500 15px system-ui, sans-serif";
  ctx.fillText(`Entrada ${data.index} de ${data.total}`, 40, 74);

  // Código badge
  const code = data.shortCode;
  ctx.font = "600 15px ui-monospace, monospace";
  const codeW = Math.max(ctx.measureText(code).width + 28, 90);
  const codeX = width - 40 - codeW;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, codeX, 44, codeW, 36, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(code, codeX + 14, 68);

  // Título + estado
  let y = 140;
  ctx.fillStyle = "#18181b";
  ctx.font = "700 28px system-ui, sans-serif";
  const titleEnd = wrapText(ctx, data.eventTitle, 40, y, width - 80, 34);
  y = titleEnd + 28;
  ctx.fillStyle = "#52525b";
  ctx.font = "400 15px system-ui, sans-serif";
  ctx.fillText(data.statusText, 40, y);
  y += 28;

  // Campos en grilla 2 columnas
  const gap = 12;
  const colW = (width - 80 - gap) / 2;
  const rowH = 72;
  drawField(ctx, 40, y, colW, rowH, "Fecha", data.eventDate);
  drawField(ctx, 40 + colW + gap, y, colW, rowH, "Hora", `${data.eventTime} hs`);
  y += rowH + gap;
  drawField(ctx, 40, y, width - 80, rowH, "Lugar", data.venue);
  y += rowH + gap;
  drawField(ctx, 40, y, colW, rowH, "Tipo de entrada", data.ticketTypeName);
  drawField(ctx, 40 + colW + gap, y, colW, rowH, "Precio", data.priceLabel);
  y += rowH + 28;

  // Separador + titular
  ctx.strokeStyle = "#f4f4f5";
  ctx.beginPath();
  ctx.moveTo(40, y);
  ctx.lineTo(width - 40, y);
  ctx.stroke();
  y += 28;

  ctx.fillStyle = "#71717a";
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.fillText("TITULAR", 40, y);
  y += 24;
  ctx.fillStyle = "#18181b";
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillText(data.buyerName, 40, y);
  y += 24;
  const contact = [data.buyerEmail, data.buyerPhone].filter(Boolean).join(" · ");
  if (contact) {
    ctx.fillStyle = "#52525b";
    ctx.font = "400 14px system-ui, sans-serif";
    ctx.fillText(contact, 40, y);
    y += 22;
  }
  ctx.fillStyle = "#71717a";
  ctx.fillText(`Pago: ${data.paymentLabel}`, 40, y);
  y += 28;

  // Separador + QR
  ctx.strokeStyle = "#f4f4f5";
  ctx.beginPath();
  ctx.moveTo(40, y);
  ctx.lineTo(width - 40, y);
  ctx.stroke();
  y += 24;

  const qr = await loadImage(data.qrDataUrl);
  const qrSize = 200;
  const qrPad = 10;
  const box = qrSize + qrPad * 2;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#e4e4e7";
  roundRect(ctx, 40, y, box, box, 10);
  ctx.fill();
  ctx.stroke();
  ctx.drawImage(qr, 40 + qrPad, y + qrPad, qrSize, qrSize);

  const textX = 40 + box + 24;
  const textW = width - textX - 40;
  ctx.fillStyle = "#18181b";
  ctx.font = "600 16px system-ui, sans-serif";
  ctx.fillText("Acceso al evento", textX, y + 28);
  ctx.fillStyle = "#52525b";
  ctx.font = "400 14px system-ui, sans-serif";
  wrapText(
    ctx,
    `Presentá este QR (en pantalla o impreso) en la puerta. El código ${data.shortCode} identifica esta entrada; no lo compartas si no querés ceder el ingreso.`,
    textX,
    y + 56,
    textW,
    20,
  );
  wrapText(
    ctx,
    "Llegá con tiempo: las puertas suelen cerrar al inicio del show.",
    textX,
    y + 140,
    textW,
    20,
  );

  return canvas;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursorY);
    return cursorY;
  }
  return cursorY - lineHeight;
}

export async function ticketToPngBlob(data: TicketExportData): Promise<Blob> {
  const canvas = await renderTicketCanvas(data);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo exportar PNG"))),
      "image/png",
    );
  });
}

export async function ticketToPngFile(data: TicketExportData): Promise<File> {
  const blob = await ticketToPngBlob(data);
  return new File([blob], `entrada-${data.shortCode}.png`, { type: "image/png" });
}

/** Lo que se comparte puede reenviarse: no lleva email ni teléfono del comprador. */
export function withoutContact(data: TicketExportData): TicketExportData {
  return { ...data, buyerEmail: "", buyerPhone: "" };
}

export function ticketShareText(data: TicketExportData): string {
  return [
    `Entrada ${data.index}/${data.total}: ${data.eventTitle}`,
    `Fecha: ${data.eventDate} · ${data.eventTime} hs`,
    `Lugar: ${data.venue}`,
    `${data.ticketTypeName} · ${data.priceLabel} · ${data.shortCode}`,
    `Titular: ${data.buyerName}`,
  ].join("\n");
}

export async function ticketToPdfBlob(data: TicketExportData): Promise<Blob> {
  const canvas = await renderTicketCanvas(data);
  const jpeg = canvas.toDataURL("image/jpeg", 0.94);
  const base64 = jpeg.split(",")[1];
  if (!base64) throw new Error("No se pudo exportar PDF");
  return jpegDataUrlToPdfBlob(base64, canvas.width, canvas.height);
}

function jpegDataUrlToPdfBlob(
  jpegBase64: string,
  imgWidth: number,
  imgHeight: number,
): Blob {
  const pageWidth = 595;
  const pageHeight = Math.round((imgHeight / imgWidth) * pageWidth);
  const jpegBytes = Uint8Array.from(atob(jpegBase64), (c) => c.charCodeAt(0));

  const objects: Uint8Array[] = [];
  const add = (content: string | Uint8Array) => {
    objects.push(typeof content === "string" ? encoder.encode(content) : content);
  };

  const encoder = new TextEncoder();
  add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  add(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
  add(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>\nendobj\n`,
  );
  const contentStream = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  add(
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`,
  );
  const imgHeader = encoder.encode(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
  );
  const imgFooter = encoder.encode("\nendstream\nendobj\n");
  const imageObject = new Uint8Array(
    imgHeader.length + jpegBytes.length + imgFooter.length,
  );
  imageObject.set(imgHeader, 0);
  imageObject.set(jpegBytes, imgHeader.length);
  imageObject.set(imgFooter, imgHeader.length + jpegBytes.length);
  objects.push(imageObject);

  const header = encoder.encode("%PDF-1.4\n");
  const parts: Uint8Array[] = [header];
  const offsets = [0];
  let offset = header.length;
  for (const object of objects) {
    offsets.push(offset);
    parts.push(object);
    offset += object.length;
  }
  const xrefStart = offset;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  parts.push(encoder.encode(xref));

  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const pdf = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) {
    pdf.set(part, cursor);
    cursor += part.length;
  }
  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
