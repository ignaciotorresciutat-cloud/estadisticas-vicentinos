"use client";

import { useRouter } from "next/navigation";

export function TemporadaSelect({
  options,
  value,
}: {
  options: { label: string; href: string }[];
  value: string;
}) {
  const router = useRouter();
  return (
    <select
      value={value}
      onChange={(e) => router.push(e.target.value)}
      aria-label="Elegir temporada"
      className="w-full rounded-md border border-navy-light bg-white px-3 py-2 text-sm text-navy"
    >
      {options.map((o) => (
        <option key={o.href} value={o.href}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
