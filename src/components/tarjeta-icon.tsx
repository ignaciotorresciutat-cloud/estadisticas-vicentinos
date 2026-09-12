export function TarjetaIcon({
  tipo,
  width = 12,
  height = 16,
}: {
  tipo: "AMARILLA" | "ROJA";
  width?: number;
  height?: number;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block rounded-[2px] border border-black/15 ${tipo === "AMARILLA" ? "bg-amarilla" : "bg-derrota"}`}
      style={{ width, height }}
    />
  );
}
