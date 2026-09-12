import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

// tamaño estándar de imagen de Open Graph (el que usan WhatsApp/Facebook/etc.
// para armar la vista previa del link)
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export type OgCardData = {
  kicker: string;
  title: string;
  sub: string;
  stats: { label: string; value: string | number }[];
};

// se lee del disco (no por fetch a sí mismo): las rutas de opengraph-image
// sin parámetros dinámicos se pre-generan en build time, cuando todavía no
// hay ningún servidor corriendo para responder un fetch propio.
export async function escudoDataUri(): Promise<string> {
  const buffer = await readFile(path.join(process.cwd(), "public", "escudo-vicentinos.jpg"));
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

// misma composición visual que la tarjeta de preview del modal de
// "Compartir" (share-sheet.tsx), pero renderizada como imagen real: es lo
// que WhatsApp/Instagram/Facebook van a mostrar de verdad al pegar el link.
export function ShareOgCard({ data, escudo }: { data: OgCardData; escudo: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#003868",
        padding: "72px 80px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            display: "flex",
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#fff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={escudo} width={46} height={57} style={{ objectFit: "contain" }} alt="" />
        </div>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: "#f89c38" }}>
          {data.kicker}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 68, fontWeight: 800, color: "#fff", marginTop: 44, lineHeight: 1.08, letterSpacing: -2 }}>
        {data.title}
      </div>
      <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,.75)", marginTop: 18 }}>{data.sub}</div>
      {data.stats.length > 0 && (
        <div style={{ display: "flex", gap: 2, marginTop: 52 }}>
          {data.stats.map((s) => {
            // valores largos (ej. "Nombre Jugador · 123") no entran con el
            // tamaño pensado para un número corto: se achica según el largo.
            const largo = String(s.value).length;
            const statFontSize = largo > 14 ? 26 : largo > 8 ? 34 : 44;
            return (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  flex: 1,
                  background: "rgba(255,255,255,.1)",
                  padding: "22px 26px",
                  borderRadius: 6,
                }}
              >
                <div style={{ display: "flex", fontSize: statFontSize, fontWeight: 800, color: "#fff", lineHeight: 1.15 }}>{s.value}</div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 17,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,.55)",
                    marginTop: 10,
                  }}
                >
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export async function shareOgResponse(data: OgCardData): Promise<ImageResponse> {
  const escudo = await escudoDataUri();
  return new ImageResponse(<ShareOgCard data={data} escudo={escudo} />, OG_SIZE);
}
