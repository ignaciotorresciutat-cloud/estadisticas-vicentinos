export function TarjetaIcon({ tipo }: { tipo: "AMARILLA" | "ROJA" }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-4 w-3 rounded-[2px] ${tipo === "AMARILLA" ? "bg-yellow-400" : "bg-red-600"}`}
    />
  );
}
