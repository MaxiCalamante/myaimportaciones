import { NextResponse } from "next/server";
import { correoArgentinoClient } from "@/lib/correo-argentino/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stateId = searchParams.get("stateId") || "";

  if (!stateId) {
    return NextResponse.json({ error: "Parámetro stateId (código de provincia) requerido" }, { status: 400 });
  }

  try {
    const agencies = await correoArgentinoClient.getAgencies(stateId);
    return NextResponse.json({ agencies });
  } catch (err) {
    return NextResponse.json(
      { error: "No se pudieron obtener las sucursales", agencies: [] },
      { status: 500 }
    );
  }
}
