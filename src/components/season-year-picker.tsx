"use client";

import { useRouter } from "next/navigation";

// caja del hero mobile que parece un botón pero es un <select> nativo
// superpuesto: abre el selector de año propio del sistema operativo sin
// necesitar un overlay a medida.
export function SeasonYearPicker({ temporadas, actual }: { temporadas: number[]; actual: number }) {
  const router = useRouter();
  return (
    <div
      className="relative flex min-h-[52px] flex-1 items-center justify-between gap-2.5 rounded-[11px] px-[15px]"
      style={{ border: "1px solid rgba(255,255,255,.28)" }}
    >
      <div className="flex items-baseline gap-2.5">
        <span className="text-[30px] leading-none font-extrabold tracking-[-.035em] text-white tabular-nums">
          {actual}
        </span>
        <span className="font-mono text-[9.5px] tracking-[.1em] text-white/60 uppercase">Elegir año</span>
      </div>
      <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ display: "block", flexShrink: 0 }} aria-hidden>
        <path d="M1 1l5 5 5-5" stroke="#f89c38" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        value={actual}
        onChange={(e) => router.push(`/temporadas/${e.target.value}`)}
        aria-label="Elegir temporada"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {temporadas.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}
