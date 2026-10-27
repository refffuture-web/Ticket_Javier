import path from "node:path";

import {
  LocalStorageService,
  SupabaseEdgeUploadStorageService,
  SupabaseStorageService,
  type StorageService,
} from "@/modules/storage/storage-service";

import { env } from "./env";

function createStorage(): StorageService {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseStorageService(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }
  if (env.SUPABASE_URL && env.SUPABASE_MEDIA_UPLOAD_SECRET) {
    return new SupabaseEdgeUploadStorageService(
      env.SUPABASE_URL,
      env.SUPABASE_MEDIA_UPLOAD_SECRET,
    );
  }
  // Ruta estática bajo data/ para que Turbopack/Vercel no tracee todo el repo.
  return new LocalStorageService(path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "uploads"));
}

export const storage = createStorage();
