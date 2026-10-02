import Link from "next/link";
import type { Metadata } from "next";
import { getResumenClub } from "@/lib/queries";
import { MobileBackHeader } from "@/components/mobile-back-header";

// reemplaza el 404 genérico (en inglés) de Next. Lo usan tanto las URLs que
// no existen como los notFound() de las fichas (jugador, temporada, camada,
// rival) cuando el id no está en la base.
export const metadata: Metadata = {
  title: "Página no encontrada · Club Vicentinos",
};

const ATAJOS = [
  { href: "/temporadas", label: "Temporadas" },
  { href: "/jugadores", label: "Jugadores" },
  { href: "/historial", label: "Rivales" },
  { href: "/records", label: "Récords" },
];

export default async function NotFound() {
  const club = await getResumenClub();

  return (
    <main>
      <section className="bg-navy">
        <div className="mx-auto max-w-[1280px] px-5 pt-6 pb-9 lg:px-10 lg:py-[72px]">
          {/* mobile: header propio de la pantalla (no hay barra fija en mobile) */}
          <MobileBackHeader
            temporadasCount={club.temporadas}
            jugadoresCount={club.jugadores}
            clubesCount={club.clubesRivales}
            camadasCount={club.camadas}
          />
          <p className="mt-6 font-mono text-[10px] font-semibold tracking-[.14em] text-orange uppercase lg:mt-0 lg:text-[11px] lg:tracking-[.16em]">
            Error 404
          </p>
          <h1 className="mt-3 max-w-[18ch] text-balance text-[32px] leading-[1.05] font-extrabold tracking-[-.032em] text-white lg:mt-5 lg:text-[56px] lg:leading-[1.02] lg:tracking-[-.035em]">
            Esta página no está en el archivo.
          </h1>
          <p className="mt-4 max-w-[46ch] text-pretty text-[13.5px] leading-[1.5] text-white/75 lg:mt-5 lg:text-[17px] lg:leading-[1.55]">
            Puede que el link esté mal escrito o que apunte a algo que no existe. Buscá un jugador, un rival o un año, o
            volvé al inicio.
          </p>

          <form action="/buscar" className="mt-6 max-w-[520px] lg:mt-8">
            <div className="flex min-h-[50px] items-center gap-[11px] rounded-[12px] bg-white px-[15px]">
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden className="flex-none" style={{ color: "#46658a" }}>
                <circle cx="7" cy="7" r="5.4" stroke="currentColor" strokeWidth="1.8" />
                <path d="M11.2 11.2L15.4 15.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                name="q"
                placeholder="Jugador, rival o año"
                aria-label="Buscar en el archivo"
                className="w-full bg-transparent text-[16px] outline-none"
                style={{ color: "#46658a" }}
              />
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center rounded-full bg-orange px-[18px] font-mono text-[11px] font-semibold tracking-[.1em] text-navy-dark uppercase"
            >
              Ir al inicio
            </Link>
            {ATAJOS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="inline-flex min-h-10 items-center rounded-full px-[16px] font-mono text-[11px] tracking-[.1em] text-white uppercase"
                style={{ border: "1px solid rgba(255,255,255,.28)" }}
              >
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
