import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  const logo = await readFile(join(process.cwd(), "public", "logo.png"));
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#f0f9ff", padding: 60, alignItems: "center", gap: 56 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${logo.toString("base64")}`} alt="" width={420} height={210} />
      <div style={{ display: "flex", flexDirection: "column", width: 540, color: "#0f172a" }}>
        <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.1 }}>MYA Importaciones</div>
        <div style={{ fontSize: 30, lineHeight: 1.4, marginTop: 28 }}>Productos originales para vos, tu hogar y tu negocio.</div>
        <div style={{ fontSize: 25, color: "#0369a1", marginTop: 36 }}>Desde Tandil a todo el país</div>
        <div style={{ fontSize: 22, color: "#475569", marginTop: 16 }}>Atención de Máximo y Agustina</div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
