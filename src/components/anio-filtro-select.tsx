"use client";

import { useRouter } from "next/navigation";

// pill del hero mobile de /jugadores: se ve como un botón pero es un
// <select> nativo superpuesto, mismo truco que SeasonYearPicker.
export function AnioFiltroSelect({
  anios,
  valor,
  hrefDeAnio,
}: {
  anios: number[];
  valor: number | null;
  hrefDeAnio: (anio: number | null) => string;
}) {
  const router = useRouter();
  return (
    <div
      className="relative flex min-h-10 flex-none items-center gap-[7px] rounded-full px-[13px]"
      style={{ border: "1px solid rgba(0,56,104,.18)" }}
    >
      <span className="font-mono text-[11.5px] font-semibold tracking-[.03em] text-navy tabular-nums">
        {valor ?? "Todo el archivo"}
      </span>
      <svg width="9" height="6" viewBox="0 0 11 7" fill="none" style={{ display: "block", flexShrink: 0 }} aria-hidden>
        <path d="M1 1l4.5 4.5L10 1" stroke="#8a5a12" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        value={valor ?? ""}
        onChange={(e) => router.push(hrefDeAnio(e.target.value ? Number(e.target.value) : null))}
        aria-label="Filtrar por año"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        <option value="">Todo el archivo</option>
        {anios.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}
