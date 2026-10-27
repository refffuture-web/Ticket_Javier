import { supabasePublicMediaUrl } from "@/modules/storage/storage-service";

/**
 * URL de una imagen guardada.
 * Con Supabase apunta al CDN público (no consume ancho de banda de Vercel).
 */
export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  if (supabaseUrl) {
    return supabasePublicMediaUrl(supabaseUrl, key);
  }
  return `/api/media/${key}`;
}
