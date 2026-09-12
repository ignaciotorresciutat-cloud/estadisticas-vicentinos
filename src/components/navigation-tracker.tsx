"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { registrarNavegacion, registrarRutaInicial } from "@/lib/nav-history";

// montado una vez en el layout raíz. No renderiza nada: solo escucha cada
// cambio de ruta para saber si el usuario ya navegó dentro del sitio en
// esta pestaña, y por dónde pasó (ver nav-history.ts). El mount inicial
// (la ruta con la que se abrió la pestaña) también se registra, para que
// la ruta anterior quede bien calculada apenas haya una segunda navegación
// — pero no cuenta como "navegación interna" en sí misma.
export function NavigationTracker() {
  const pathname = usePathname();
  const esPrimeraRuta = useRef(true);

  useEffect(() => {
    if (esPrimeraRuta.current) {
      esPrimeraRuta.current = false;
      registrarRutaInicial(pathname);
      return;
    }
    registrarNavegacion(pathname);
  }, [pathname]);

  return null;
}
