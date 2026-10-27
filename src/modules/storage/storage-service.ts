import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { toOptimizedWebp } from "./image-optimize";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MEDIA_BUCKET = "media";

type ImageType = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

export type StoredObject = {
  key: string;
  contentType: "image/webp";
};

export interface StorageService {
  save(input: { bytes: Uint8Array; contentType: string }): Promise<StoredObject>;
  read(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  delete(key: string): Promise<void>;
}

export function detectImageType(bytes: Uint8Array): ImageType | null {
  const b0 = bytes[0];
  const b1 = bytes[1];
  const b2 = bytes[2];
  const b3 = bytes[3];
  if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) {
    return { contentType: "image/png", extension: "png" };
  }
  if (
    b0 === 0x52 &&
    b1 === 0x49 &&
    b2 === 0x46 &&
    b3 === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}

export function isStoredKey(key: string): boolean {
  return /^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(key) && !key.includes("..");
}

function contentTypeForKey(key: string): string {
  const extension = path.extname(key).slice(1).toLowerCase();
  if (extension === "jpg") return "image/jpeg";
  if (extension === "png") return "image/png";
  return "image/webp";
}

async function optimizeForSave(input: {
  bytes: Uint8Array;
  contentType: string;
}): Promise<{ key: string; bytes: Uint8Array }> {
  if (input.bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("La imagen supera el tamaño permitido");
  }
  const detected = detectImageType(input.bytes);
  if (!detected || detected.contentType !== input.contentType) {
    throw new Error("Tipo de imagen no permitido");
  }
  const bytes = await toOptimizedWebp(input.bytes);
  return { key: `${randomUUID()}.webp`, bytes };
}

export class LocalStorageService implements StorageService {
  constructor(private readonly rootDir: string) {}

  async save(input: { bytes: Uint8Array; contentType: string }): Promise<StoredObject> {
    const prepared = await optimizeForSave(input);
    await mkdir(this.rootDir, { recursive: true });
    await writeFile(path.join(this.rootDir, prepared.key), prepared.bytes);
    return { key: prepared.key, contentType: "image/webp" };
  }

  async delete(key: string): Promise<void> {
    if (!isStoredKey(key)) return;
    try {
      await unlink(path.join(this.rootDir, key));
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }

  async read(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
    if (!isStoredKey(key)) {
      return null;
    }
    try {
      const bytes = await readFile(path.join(this.rootDir, key));
      return { bytes: new Uint8Array(bytes), contentType: contentTypeForKey(key) };
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }
}

export class SupabaseStorageService implements StorageService {
  private readonly client: SupabaseClient;

  constructor(
    private readonly supabaseUrl: string,
    serviceRoleKey: string,
    private readonly bucket = MEDIA_BUCKET,
  ) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async save(input: { bytes: Uint8Array; contentType: string }): Promise<StoredObject> {
    const prepared = await optimizeForSave(input);
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(prepared.key, prepared.bytes, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "31536000",
      });
    if (error) {
      throw new Error(`No se pudo subir la imagen: ${error.message}`);
    }
    return { key: prepared.key, contentType: "image/webp" };
  }

  async delete(key: string): Promise<void> {
    if (!isStoredKey(key)) return;
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) {
      throw new Error(`No se pudo borrar la imagen: ${error.message}`);
    }
  }

  async read(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
    return readFromPublicUrl(this.supabaseUrl, key);
  }
}

/**
 * Sube/borra vía edge function `media-upload` (usa service role en Supabase).
 * Sirve cuando el server no tiene SUPABASE_SERVICE_ROLE_KEY.
 */
export class SupabaseEdgeUploadStorageService implements StorageService {
  constructor(
    private readonly supabaseUrl: string,
    private readonly uploadSecret: string,
  ) {}

  private endpoint() {
    return `${this.supabaseUrl.replace(/\/$/, "")}/functions/v1/media-upload`;
  }

  async save(input: { bytes: Uint8Array; contentType: string }): Promise<StoredObject> {
    const prepared = await optimizeForSave(input);
    const contentBase64 = Buffer.from(prepared.bytes).toString("base64");
    const res = await fetch(this.endpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.uploadSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "upload",
        key: prepared.key,
        contentBase64,
        contentType: "image/webp",
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`No se pudo subir la imagen: ${detail}`);
    }
    return { key: prepared.key, contentType: "image/webp" };
  }

  async delete(key: string): Promise<void> {
    if (!isStoredKey(key)) return;
    const res = await fetch(this.endpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.uploadSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "delete", key }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`No se pudo borrar la imagen: ${detail}`);
    }
  }

  async read(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
    return readFromPublicUrl(this.supabaseUrl, key);
  }
}

async function readFromPublicUrl(
  supabaseUrl: string,
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!isStoredKey(key)) return null;
  const res = await fetch(supabasePublicMediaUrl(supabaseUrl, key));
  if (!res.ok) return null;
  const buffer = new Uint8Array(await res.arrayBuffer());
  return { bytes: buffer, contentType: contentTypeForKey(key) };
}

/** URL pública CDN de Supabase Storage (sin pasar por Vercel). */
export function supabasePublicMediaUrl(supabaseUrl: string, key: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${key}`;
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}
