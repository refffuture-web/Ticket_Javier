import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import { detectImageType, LocalStorageService } from "./storage-service";

async function tinyPng(): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 20, g: 40, b: 60 } },
  })
    .png()
    .toBuffer();
  return new Uint8Array(buffer);
}

describe("almacenamiento local", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  it("reconoce un PNG por sus bytes", async () => {
    const png = await tinyPng();
    expect(detectImageType(png)?.contentType).toBe("image/png");
    expect(detectImageType(Uint8Array.from([0x00, 0x01]))).toBeNull();
  });

  it("guarda como WebP optimizado y recupera bytes WebP", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "boleteria-"));
    directories.push(root);
    const storage = new LocalStorageService(root);
    const png = await tinyPng();
    const stored = await storage.save({ bytes: png, contentType: "image/png" });
    expect(stored.key.endsWith(".webp")).toBe(true);
    expect(stored.contentType).toBe("image/webp");
    const read = await storage.read(stored.key);
    expect(read?.contentType).toBe("image/webp");
    expect(detectImageType(read!.bytes)?.contentType).toBe("image/webp");
    expect(await storage.read("../schema.prisma")).toBeNull();
    await storage.delete(stored.key);
    expect(await storage.read(stored.key)).toBeNull();
    await storage.delete("../schema.prisma");
  });
});
