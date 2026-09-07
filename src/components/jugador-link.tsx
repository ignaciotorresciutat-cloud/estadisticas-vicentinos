import Link from "next/link";
import type { ReactNode } from "react";

export function PersonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="inline h-3 w-3 shrink-0 opacity-70"
    >
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.76-3.58-5-8-5Z" />
    </svg>
  );
}

// link a la ficha de un jugador con un ícono fijo (no solo hover) para que en
// mobile quede claro que el nombre es clickeable, sin depender del hover.
export function JugadorLink({
  id,
  className = "",
  children,
}: {
  id: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={`/jugadores/${id}`} className={`inline-flex items-center gap-1 hover:text-orange ${className}`}>
      <PersonIcon />
      {children}
    </Link>
  );
}
