"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import { hayHistorialInterno, volverCoincideCon } from "./nav-history";

// Botón/link de "volver": "href" es el destino de respaldo (la sección,
// ej. "/jugadores") y "seccionLabel" es cómo se llama esa sección (ej.
// "Jugadores"). El label que se muestra es dinámico:
//   - si no hay historial interno, o si la página anterior real cae dentro
//     de esa sección, se muestra "seccionLabel" (es honesto: ES ahí adonde
//     va a ir).
//   - si la página anterior real es OTRA sección (ej. viniste de un rival,
//     no del listado de jugadores), se muestra "genericLabel" en vez de
//     prometer algo que no es.
// El click, aparte, usa el historial real cuando existe (te devuelve a la
// página anterior en vez de siempre al destino de respaldo).
export function useVolver(href: string, seccionLabel: string, genericLabel = "Volver") {
  const router = useRouter();
  // en el render del servidor no hay sessionStorage: arrancamos asumiendo
  // que el respaldo es el destino real (mismo texto que se mostraba antes
  // de este cambio), y lo corregimos en el cliente después de montar.
  const [label, setLabel] = useState(seccionLabel);

  useEffect(() => {
    setLabel(volverCoincideCon(href) ? seccionLabel : genericLabel);
  }, [href, seccionLabel, genericLabel]);

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (hayHistorialInterno()) {
      e.preventDefault();
      router.back();
    }
  }

  return { label, onClick };
}
