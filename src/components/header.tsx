import Image from "next/image";
import Link from "next/link";
import { HeaderNav } from "./header-nav";

// barra fija blanca de 72px — solo desktop. En mobile, cada pantalla dibuja
// su propio encabezado (con el fondo de su hero) usando <MobileMenu />.
export function Header() {
  return (
    <header className="sticky top-0 z-20 hidden h-[72px] border-b border-navy/[.14] bg-white lg:flex lg:items-center">
      <div className="mx-auto flex w-full max-w-[1280px] min-w-0 items-center justify-between gap-4 px-5 lg:px-10">
        <Link href="/" className="flex flex-none items-center gap-2.5">
          <Image
            src="/escudo-vicentinos.jpg"
            alt="Escudo Club Vicentinos"
            width={26}
            height={32}
            className="h-8 w-[26px] object-contain"
          />
          <span>
            <span className="block font-semibold text-navy-dark">Club Vicentinos</span>
            <span className="block font-mono text-[9px] tracking-[.1em] text-ink uppercase">El archivo</span>
          </span>
        </Link>
        <HeaderNav />
      </div>
    </header>
  );
}
