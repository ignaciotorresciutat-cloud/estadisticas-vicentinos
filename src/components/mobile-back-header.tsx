"use client";

import Link from "next/link";
import { MobileMenu } from "./mobile-menu";
import { ShareButton, type ShareData } from "./share-sheet";
import { useVolver } from "@/lib/use-volver";

// header mobile de las pantallas internas: link "← ARCHIVO" en vez del logo
// de Home, mismo botón de menú. Vive con el fondo de la sección que lo
// contiene (normalmente navy), no es una barra fija compartida. "share" es
// opcional: solo las fichas de jugador/temporada/camada lo pasan.
//
// El link apunta a "/" como respaldo, pero si el usuario navegó dentro del
// sitio en esta pestaña, el click usa el historial real y vuelve a la
// página anterior en vez de siempre ir al home. El texto acompaña: dice
// "ARCHIVO" solo cuando ese es de verdad el destino; si no, "VOLVER" (ver
// use-volver.ts).
export function MobileBackHeader({
  temporadasCount,
  jugadoresCount,
  clubesCount,
  camadasCount,
  share,
}: {
  temporadasCount: number;
  jugadoresCount: number;
  clubesCount: number;
  camadasCount: number;
  share?: ShareData;
}) {
  const { label, onClick } = useVolver("/", "ARCHIVO", "VOLVER");

  return (
    <div className="flex min-h-11 items-center justify-between lg:hidden">
      <Link href="/" onClick={onClick} className="flex min-h-11 items-center gap-2">
        <svg width="9" height="15" viewBox="0 0 9 15" fill="none" aria-hidden style={{ display: "block" }}>
          <path d="M7.5 1.5L2 7.5l5.5 6" stroke="#f89c38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-mono text-[11px] tracking-[.06em] text-orange">{label}</span>
      </Link>
      <div className="flex items-center gap-0.5">
        {share && <ShareButton data={share} />}
        <MobileMenu
          temporadasCount={temporadasCount}
          jugadoresCount={jugadoresCount}
          clubesCount={clubesCount}
          camadasCount={camadasCount}
        />
      </div>
    </div>
  );
}
