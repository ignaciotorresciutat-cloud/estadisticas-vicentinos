import Link from "next/link";
import type { ReactNode } from "react";

export function JugadorLink({
  id,
  className,
  children,
}: {
  id: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={`/jugadores/${id}`} className={className ?? "hover:text-orange"}>
      {children}
    </Link>
  );
}
