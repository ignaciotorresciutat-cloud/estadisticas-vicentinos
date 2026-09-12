import { getTemporadasInfo } from "@/lib/queries";

export async function Footer() {
  const temporadasInfo = await getTemporadasInfo();
  const años = [...temporadasInfo.keys()];
  const desde = años.length > 0 ? Math.min(...años) : null;
  const hasta = años.length > 0 ? Math.max(...años) : null;

  return (
    <footer className="border-t border-navy/[.14]">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-5 py-6 lg:px-10">
        <p className="font-mono text-[11px]" style={{ color: "rgba(0,56,104,.55)" }}>
          Desarrollado por Ignacio Torres Ciutat — Data recolectada por Juan Carlos Lista
        </p>
        {desde && hasta && (
          <p className="font-mono text-[11px] uppercase" style={{ color: "rgba(0,56,104,.55)" }}>
            {desde}—{hasta}
          </p>
        )}
      </div>
    </footer>
  );
}
