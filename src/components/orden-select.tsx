"use client";

import { useRouter } from "next/navigation";

// dropdown de orden para mobile: mismo truco de <select> nativo superpuesto
// que AnioFiltroSelect, genérico para cualquier lista de {key,label}. Arma
// el href internamente (en vez de recibir una función) para poder usarse
// desde una página server sin cruzar funciones por la frontera cliente.
export function OrdenSelect({
  opciones,
  valor,
  basePath,
  paramName = "orden",
  valorPorDefecto,
}: {
  opciones: readonly { key: string; label: string }[];
  valor: string;
  basePath: string;
  paramName?: string;
  valorPorDefecto?: string;
}) {
  const router = useRouter();
  const label = opciones.find((o) => o.key === valor)?.label ?? opciones[0]?.label ?? "";
  const defecto = valorPorDefecto ?? opciones[0]?.key;

  function hrefDe(key: string): string {
    return key === defecto ? basePath : `${basePath}?${paramName}=${key}`;
  }

  return (
    <div
      className="relative flex min-h-10 flex-1 items-center justify-between gap-2 rounded-full px-3.5"
      style={{ border: "1px solid rgba(0,56,104,.18)" }}
    >
      <span className="font-mono text-[11.5px] font-semibold tracking-[.03em] text-navy">Orden: {label}</span>
      <svg width="9" height="6" viewBox="0 0 11 7" fill="none" style={{ display: "block", flexShrink: 0 }} aria-hidden>
        <path d="M1 1l4.5 4.5L10 1" stroke="#8a5a12" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        value={valor}
        onChange={(e) => router.push(hrefDe(e.target.value))}
        aria-label="Ordenar por"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {opciones.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
