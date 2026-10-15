import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageType = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

export type StoredObject = {
  key: string;
  contentType: ImageType["contentType"];
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

export class LocalStorageService implements StorageService {
  constructor(private readonly rootDir: string) {}

  async save(input: { bytes: Uint8Array; contentType: string }): Promise<StoredObject> {
    if (input.bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("La imagen supera el tamaño permitido");
    }
    const detected = detectImageType(input.bytes);
    if (!detected || detected.contentType !== input.contentType) {
      throw new Error("Tipo de imagen no permitido");
    }
    const key = `${randomUUID()}.${detected.extension}`;
    await mkdir(this.rootDir, { recursive: true });
    await writeFile(path.join(this.rootDir, key), input.bytes);
    return { key, contentType: detected.contentType };
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
    const extension = path.extname(key).slice(1);
    const contentType =
      extension === "jpg"
        ? "image/jpeg"
        : extension === "png"
          ? "image/png"
          : "image/webp";
    try {
      const bytes = await readFile(path.join(this.rootDir, key));
      return { bytes: new Uint8Array(bytes), contentType };
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }
}

function isStoredKey(key: string): boolean {
  return /^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(key) && !key.includes("..");
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}
