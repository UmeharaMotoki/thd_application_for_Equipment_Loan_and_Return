import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { NextResponse } from "next/server";
import { buildPreflightResponse, withCors } from "@/lib/apiSecurity";

const candidates = [
  "C:/Users/umehara_motoki/.cursor/projects/c-Users-umehara-motoki-Documents-claude-code-docker/assets/c__Users_umehara_motoki_AppData_Roaming_Cursor_User_workspaceStorage_60299f4659c0ac61bb688c3167f8b6f8_images_image-4e5e898f-7e0c-4e22-b906-1861eae18b81.png",
  "C:/Users/umehara_motoki/.cursor/projects/c-Users-umehara-motoki-Documents-claude-code-docker/assets/c__Users_umehara_motoki_AppData_Roaming_Cursor_User_workspaceStorage_60299f4659c0ac61bb688c3167f8b6f8_images_image-7edad0f7-63c1-4c52-9998-8a270a58bb1a.png",
];

export async function GET(req: Request) {
  for (const path of candidates) {
    try {
      await access(path, constants.R_OK);
      const imageBuffer = await readFile(path);
      return withCors(new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      }), req);
    } catch {
      // Try next candidate.
    }
  }

  return withCors(NextResponse.json({ error: "ロゴ画像が見つかりません。" }, { status: 404 }), req);
}

export async function OPTIONS(req: Request) {
  return buildPreflightResponse(req);
}
