import Link from "next/link";

export function TemporadaTabs({
  basePath,
  temporadas,
  temporadaActiva,
}: {
  basePath: string;
  temporadas: number[];
  temporadaActiva?: number;
}) {
  function href(temporada?: number) {
    return temporada ? `${basePath}?temporada=${temporada}` : basePath;
  }

  function claseTab(activa: boolean) {
    return `rounded px-2.5 py-1 text-sm ${activa ? "bg-navy text-white" : "bg-navy-light text-navy-dark hover:bg-navy/10"}`;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Link href={href()} className={claseTab(!temporadaActiva)}>
        Histórico
      </Link>
      {temporadas.map((t) => (
        <Link key={t} href={href(t)} className={claseTab(temporadaActiva === t)}>
          {t}
        </Link>
      ))}
    </div>
  );
}
