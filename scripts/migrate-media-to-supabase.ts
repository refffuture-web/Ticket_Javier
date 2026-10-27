/**
 * Convierte fotos locales (jpg/png/webp) a WebP, las sube a Supabase Storage
 * y actualiza las keys en la base local.
 *
 * Uso: pnpm exec tsx scripts/migrate-media-to-supabase.ts
 */
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import sharp from "sharp";

config({ path: path.resolve(process.cwd(), ".env") });

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "data/uploads");
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UPLOAD_SECRET = process.env.SUPABASE_MEDIA_UPLOAD_SECRET;
const MAX_EDGE = 1920;
const WEBP_QUALITY = 78;

if (!SUPABASE_URL) {
  throw new Error("Falta SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
}
if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function toWebp(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes)
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
}

async function uploadWebp(key: string, bytes: Buffer): Promise<void> {
  if (SERVICE_ROLE) {
    const client = createClient(SUPABASE_URL!, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.storage.from("media").upload(key, bytes, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "31536000",
    });
    if (error) throw new Error(error.message);
    return;
  }

  if (!UPLOAD_SECRET) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY o SUPABASE_MEDIA_UPLOAD_SECRET");
  }

  const res = await fetch(`${SUPABASE_URL!.replace(/\/$/, "")}/functions/v1/media-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPLOAD_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "upload",
      key,
      contentBase64: bytes.toString("base64"),
      contentType: "image/webp",
    }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}

async function migrateKey(oldKey: string): Promise<string | null> {
  const filePath = path.join(UPLOAD_DIR, oldKey);
  let raw: Buffer;
  try {
    raw = await readFile(filePath);
  } catch {
    console.warn(`  skip (archivo ausente): ${oldKey}`);
    return null;
  }

  const webp = await toWebp(raw);
  const newKey = oldKey.toLowerCase().endsWith(".webp")
    ? oldKey.replace(/\.webp$/i, ".webp")
    : `${randomUUID()}.webp`;

  // Si ya era webp con el mismo nombre, re-subimos optimizado con la misma key.
  const key = oldKey.toLowerCase().endsWith(".webp") ? oldKey : newKey;

  await uploadWebp(key, webp);
  console.log(
    `  ${oldKey} → ${key} (${raw.byteLength} → ${webp.byteLength} bytes, -${Math.round((1 - webp.byteLength / raw.byteLength) * 100)}%)`,
  );

  if (key !== oldKey) {
    try {
      await unlink(filePath);
    } catch {
      /* ignore */
    }
  } else {
    // Reemplazar local por webp optimizado (por si se cae a local).
    await writeFile(filePath, webp);
  }

  return key === oldKey ? oldKey : key;
}

async function main() {
  console.log("Migrando media → Supabase WebP…");
  console.log(`Upload dir: ${UPLOAD_DIR}`);

  const events = await db.event.findMany({
    select: { id: true, coverImageKey: true },
  });
  const gallery = await db.eventGalleryImage.findMany({
    select: { id: true, imageKey: true },
  });
  const artists = await db.lineupArtist.findMany({
    select: { id: true, photoKey: true },
  });

  const mapped = new Map<string, string>();

  async function mapKey(oldKey: string | null): Promise<string | null> {
    if (!oldKey) return null;
    if (mapped.has(oldKey)) return mapped.get(oldKey)!;
    const next = await migrateKey(oldKey);
    if (!next) return oldKey;
    mapped.set(oldKey, next);
    return next;
  }

  for (const event of events) {
    if (!event.coverImageKey) continue;
    const next = await mapKey(event.coverImageKey);
    if (next && next !== event.coverImageKey) {
      await db.event.update({
        where: { id: event.id },
        data: { coverImageKey: next },
      });
    }
  }

  for (const photo of gallery) {
    const next = await mapKey(photo.imageKey);
    if (next && next !== photo.imageKey) {
      await db.eventGalleryImage.update({
        where: { id: photo.id },
        data: { imageKey: next },
      });
    }
  }

  for (const artist of artists) {
    if (!artist.photoKey) continue;
    const next = await mapKey(artist.photoKey);
    if (next && next !== artist.photoKey) {
      await db.lineupArtist.update({
        where: { id: artist.id },
        data: { photoKey: next },
      });
    }
  }

  // Archivos huérfanos en disco no referenciados: convertir y subir igual.
  let files: string[] = [];
  try {
    files = await readdir(UPLOAD_DIR);
  } catch {
    files = [];
  }
  for (const name of files) {
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(name)) continue;
    if (mapped.has(name)) continue;
    await mapKey(name);
  }

  const fingerprint = createHash("sha1")
    .update([...mapped.entries()].sort().join("|"))
    .digest("hex")
    .slice(0, 8);
  console.log(`Listo. ${mapped.size} archivos migrados (run ${fingerprint}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
