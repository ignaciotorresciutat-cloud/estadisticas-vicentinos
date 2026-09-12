"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 17 17" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11.2 11.2L15.4 15.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/temporadas", label: "Temporadas" },
  { href: "/jugadores", label: "Jugadores" },
  { href: "/historial", label: "Rivales" },
  { href: "/camadas", label: "Camadas" },
  { href: "/records", label: "Récords" },
];

// nav horizontal de escritorio; en mobile cada pantalla usa <MobileMenu />
// dentro de su propio hero (ver README: el header mobile no es una barra
// blanca fija, vive con el fondo de cada pantalla)
export function HeaderNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden min-w-0 flex-1 items-center justify-end gap-6 overflow-x-auto lg:flex">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 border-b-2 py-2 font-mono text-[13px] font-medium whitespace-nowrap ${
                active ? "border-orange text-navy-dark" : "border-transparent text-ink hover:text-navy-dark"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/buscar"
        className="hidden flex-none items-center justify-center rounded-full border border-navy/20 text-navy-dark hover:border-orange hover:text-orange lg:flex"
        style={{ width: 40, height: 40 }}
        aria-label="Buscar"
      >
        <SearchIcon />
      </Link>
    </>
  );
}
