"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

type NavItem = { href: string; label: string };

const JUGADORES_ITEM: NavItem = { href: "/jugadores", label: "Jugadores" };

const RANKINGS_ITEMS: NavItem[] = [
  { href: "/rankings/puntos", label: "Puntos" },
  { href: "/rankings/presencias", label: "Presencias" },
  { href: "/rankings/tarjetas", label: "Tarjetas" },
  { href: "/camadas", label: "Camadas" },
];

const MAS_ITEMS: NavItem[] = [
  { href: "/historial", label: "Historial vs. rivales" },
  { href: "/records", label: "Récords" },
  { href: "/referees", label: "Referees" },
];

// al tocar un link, cierra ese <details> y todos sus <details> "padre"
// (ej. el submenú de Temporadas Y el menú hamburguesa que lo contiene),
// para que quede feedback visual inmediato de que la selección se hizo.
function closeAncestorDetails(e: MouseEvent<HTMLElement>) {
  const link = (e.target as HTMLElement).closest("a");
  if (!link) return;
  let el: HTMLElement | null = link;
  while (el) {
    if (el instanceof HTMLDetailsElement) el.open = false;
    el = el.parentElement;
  }
}

function Dropdown({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <details className="group relative">
      <summary className="cursor-pointer list-none text-white hover:text-orange marker:content-none">
        {label} ▾
      </summary>
      <div
        onClick={closeAncestorDetails}
        className="absolute right-0 z-10 mt-2 max-h-80 w-44 overflow-y-auto rounded-md border border-navy-light bg-white py-1 shadow-md"
      >
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="block px-3 py-1.5 text-navy hover:bg-orange-light">
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

function MobileSubmenu({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <details className="group/sub">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-1.5 text-navy marker:content-none hover:bg-orange-light">
        {label}
        <span className="text-navy/40 transition-transform group-open/sub:rotate-180">▾</span>
      </summary>
      <div className="bg-navy-light/40">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="block py-1.5 pr-3 pl-6 text-navy hover:bg-orange-light">
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

function MobileMenu({ temporadasItems }: { temporadasItems: NavItem[] }) {
  return (
    <details className="group relative sm:hidden">
      <summary
        aria-label="Abrir menú"
        className="flex cursor-pointer list-none items-center justify-center p-1 text-white marker:content-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </summary>
      <div
        onClick={closeAncestorDetails}
        className="absolute right-0 z-10 mt-2 max-h-[70vh] w-56 overflow-y-auto rounded-md border border-navy-light bg-white py-1 shadow-md"
      >
        <MobileSubmenu label="Temporadas" items={temporadasItems} />
        <div className="my-1 border-t border-navy-light" />
        <Link href={JUGADORES_ITEM.href} className="block px-3 py-1.5 text-navy hover:bg-orange-light">
          {JUGADORES_ITEM.label}
        </Link>
        <div className="my-1 border-t border-navy-light" />
        <div className="px-3 py-1 text-xs font-semibold tracking-wide text-navy/50 uppercase">Rankings</div>
        {RANKINGS_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="block px-3 py-1.5 text-navy hover:bg-orange-light">
            {item.label}
          </Link>
        ))}
        <div className="my-1 border-t border-navy-light" />
        <div className="px-3 py-1 text-xs font-semibold tracking-wide text-navy/50 uppercase">Más</div>
        {MAS_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="block px-3 py-1.5 text-navy hover:bg-orange-light">
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

export function HeaderNav({ temporadasItems }: { temporadasItems: NavItem[] }) {
  return (
    <>
      <nav className="hidden items-center gap-5 text-sm sm:flex">
        <Dropdown label="Temporadas" items={temporadasItems} />
        <Link href={JUGADORES_ITEM.href} className="text-white hover:text-orange">
          {JUGADORES_ITEM.label}
        </Link>
        <Dropdown label="Rankings" items={RANKINGS_ITEMS} />
        <Dropdown label="Más" items={MAS_ITEMS} />
      </nav>
      <MobileMenu temporadasItems={temporadasItems} />
    </>
  );
}
