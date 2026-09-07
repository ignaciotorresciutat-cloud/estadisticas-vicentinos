import type { Badge } from "@/lib/queries";

export function BadgePill({ badge, wrap }: { badge: Badge; wrap?: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs text-white ${wrap ? "" : "whitespace-nowrap"} ${
        badge.destacado ? "bg-navy font-semibold" : "bg-navy/60 font-medium"
      }`}
    >
      {badge.texto}
    </span>
  );
}
