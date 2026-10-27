import { NextResponse } from "next/server";

import { supabasePublicMediaUrl } from "@/modules/storage/storage-service";
import { env } from "@/server/env";
import { storage } from "@/server/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;

  // Preferir CDN de Supabase (no gasta bandwidth de Vercel).
  const supabaseUrl = env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    return NextResponse.redirect(supabasePublicMediaUrl(supabaseUrl, key), 302);
  }

  const file = await storage.read(key);
  if (!file) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return new NextResponse(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
