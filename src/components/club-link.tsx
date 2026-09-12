import Link from "next/link";
import type { ReactNode } from "react";

export function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="inline h-3 w-3 shrink-0 opacity-70"
    >
      <path d="M12 2 4 5v6c0 5 3.4 8.6 8 11 4.6-2.4 8-6 8-11V5l-8-3Z" />
    </svg>
  );
}

// link a la ficha de un club rival con un ícono fijo (no solo hover) para que
// en mobile quede claro que el nombre es clickeable, sin depender del hover.
export function ClubLink({
  id,
  className = "",
  children,
}: {
  id: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={`/historial/${id}`} className={`inline-flex items-center gap-1 hover:text-orange ${className}`}>
      <ShieldIcon />
      {children}
    </Link>
  );
}
