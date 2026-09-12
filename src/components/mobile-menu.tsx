"use client";

import Link from "next/link";
import { useState } from "react";

type NavItem = { href: string; label: string; meta?: string };

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 17 17" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11.2 11.2L15.4 15.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 17 17" fill="none" aria-hidden>
      <path d="M2 2l13 13M15 2L2 15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

// botón hamburguesa (mismo ícono en todas las pantallas: 2 líneas blancas +
// 1 naranja más corta, sobre fondo navy) + overlay a pantalla completa
export function MobileMenu({
  temporadasCount,
  jugadoresCount,
  clubesCount,
  camadasCount,
}: {
  temporadasCount: number;
  jugadoresCount: number;
  clubesCount: number;
  camadasCount: number;
}) {
  const [abierto, setAbierto] = useState(false);

  const items: NavItem[] = [
    { href: "/", label: "Inicio" },
    { href: "/temporadas", label: "Temporadas", meta: `${temporadasCount} temporadas` },
    { href: "/jugadores", label: "Jugadores", meta: `${jugadoresCount} fichas` },
    { href: "/historial", label: "Rivales", meta: `${clubesCount} clubes` },
    { href: "/camadas", label: "Camadas", meta: `${camadasCount} camadas` },
    { href: "/records", label: "Récords" },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
        className="flex h-11 w-11 flex-none flex-col items-end justify-center gap-[5px] lg:hidden"
      >
        <span className="block h-[2px] w-5 rounded-full bg-white" />
        <span className="block h-[2px] w-5 rounded-full bg-white" />
        <span className="block h-[2px] w-[13px] rounded-full bg-orange" />
      </button>

      {abierto && (
        <div className="fixed inset-0 z-30 flex flex-col bg-white lg:hidden">
          <div className="flex h-[72px] flex-none items-center justify-between border-b border-navy/[.14] px-5">
            <span className="font-semibold text-navy-dark">Club Vicentinos</span>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar menú"
              className="flex items-center justify-center p-1 text-navy-dark"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <Link
              href="/buscar"
              onClick={() => setAbierto(false)}
              className="mb-4 flex h-11 items-center gap-2 rounded-full border border-navy/20 px-4 text-navy-dark"
            >
              <SearchIcon />
              <span className="font-mono text-sm">Buscar</span>
            </Link>
            <ul className="divide-y divide-navy-light">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setAbierto(false)}
                    className="flex min-h-[44px] flex-col justify-center py-3"
                  >
                    <span className="text-[17px] font-semibold text-navy-dark">{item.label}</span>
                    {item.meta && <span className="font-mono text-xs text-ink">{item.meta}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
