import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { detectImageType, LocalStorageService } from "./storage-service";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("almacenamiento local", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  it("reconoce un PNG por sus bytes", () => {
    expect(detectImageType(png)?.contentType).toBe("image/png");
    expect(detectImageType(Uint8Array.from([0x00, 0x01]))).toBeNull();
  });

  it("guarda con un nombre nuevo y recupera los mismos bytes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "boleteria-"));
    directories.push(root);
    const storage = new LocalStorageService(root);
    const stored = await storage.save({ bytes: png, contentType: "image/png" });
    const read = await storage.read(stored.key);
    expect(read?.bytes).toEqual(png);
    expect(await storage.read("../schema.prisma")).toBeNull();
    await storage.delete(stored.key);
    expect(await storage.read(stored.key)).toBeNull();
    await storage.delete("../schema.prisma");
  });
});
