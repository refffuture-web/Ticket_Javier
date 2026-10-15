import path from "node:path";

import { LocalStorageService } from "@/modules/storage/storage-service";

import { env } from "./env";

export const storage = new LocalStorageService(
  path.resolve(process.cwd(), env.UPLOAD_DIR ?? "data/uploads"),
);
