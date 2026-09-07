import Link from "next/link";
import { getTemporadasDisponibles } from "@/lib/queries";
import { HeaderNav } from "./header-nav";

export async function Header() {
  const temporadas = await getTemporadasDisponibles();
  const temporadasItems = [
    { href: "/temporadas", label: "Ver todas" },
    ...temporadas.map((t) => ({ href: `/temporadas/${t}`, label: String(t) })),
  ];

  return (
    <header className="bg-navy">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-semibold text-white">Club Vicentinos</span>
        </Link>
        <HeaderNav temporadasItems={temporadasItems} />
      </div>
    </header>
  );
}
