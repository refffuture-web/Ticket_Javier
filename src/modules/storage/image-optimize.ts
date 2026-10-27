import sharp from "sharp";

import { detectImageType } from "./storage-service";

/** Máximo lado largo; reduce peso sin perder detalle en banners. */
const MAX_EDGE = 1920;
const WEBP_QUALITY = 78;

/**
 * Convierte JPG/PNG/WebP a WebP optimizado.
 * Rechaza tipos no imagen o archivos corruptos.
 */
export async function toOptimizedWebp(bytes: Uint8Array): Promise<Uint8Array> {
  const detected = detectImageType(bytes);
  if (!detected) {
    throw new Error("Tipo de imagen no permitido");
  }

  const optimized = await sharp(Buffer.from(bytes))
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();

  if (optimized.byteLength > 5 * 1024 * 1024) {
    throw new Error("La imagen supera el tamaño permitido");
  }

  return new Uint8Array(optimized);
}
