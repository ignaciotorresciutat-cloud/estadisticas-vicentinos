"use client";

import Link from "next/link";
import { useVolver } from "@/lib/use-volver";

function Chevron() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ display: "block", flexShrink: 0 }}>
      <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// breadcrumb de las fichas en desktop. "href" es el destino de respaldo (la
// listing de esa sección) y "label" cómo se llama. El texto que se ve es
// dinámico: si volver te lleva de verdad a esa sección, dice "label"; si te
// lleva a otro lado (viniste de una sección distinta), dice "Volver" en vez
// de prometer un destino que no es (ver use-volver.ts).
export function BackLink({ href, label }: { href: string; label: string }) {
  const { label: textoMostrado, onClick } = useVolver(href, label);
  return (
    <Link href={href} onClick={onClick} className="inline-flex min-h-9 items-center gap-2 text-orange">
      <Chevron />
      <span className="font-mono text-[11px] tracking-[.12em] uppercase">{textoMostrado}</span>
    </Link>
  );
}
