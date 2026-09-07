import Link from "next/link";
import { TemporadaSelect } from "./temporada-select";

export function TemporadaTabs({
  basePath,
  temporadas,
  temporadaActiva,
  mode = "query",
  hideHistorico = false,
}: {
  basePath: string;
  temporadas: number[];
  temporadaActiva?: number;
  mode?: "query" | "path";
  hideHistorico?: boolean;
}) {
  const getHref = (t: number) => (mode === "path" ? `${basePath}/${t}` : `${basePath}?temporada=${t}`);

  const opciones = [
    ...(!hideHistorico ? [{ label: "Histórico", href: basePath }] : []),
    ...temporadas.map((t) => ({ label: String(t), href: getHref(t) })),
  ];
  const valorActivo = temporadaActiva ? getHref(temporadaActiva) : basePath;

  return (
    <div>
      {/* mobile: dropdown para no ocupar tanto espacio con todas las pills */}
      <div className="sm:hidden">
        <TemporadaSelect options={opciones} value={valorActivo} />
      </div>
      <div className="hidden flex-wrap gap-2 sm:flex">
        {!hideHistorico && <Tab label="Histórico" href={basePath} activa={!temporadaActiva} />}
        {temporadas.map((t) => (
          <Tab key={t} label={String(t)} href={getHref(t)} activa={temporadaActiva === t} />
        ))}
      </div>
    </div>
  );
}

function Tab({ label, href, activa }: { label: string; href: string; activa: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm whitespace-nowrap ${
        activa ? "bg-navy text-white" : "bg-navy-light text-navy hover:bg-orange-light"
      }`}
    >
      {label}
    </Link>
  );
}
