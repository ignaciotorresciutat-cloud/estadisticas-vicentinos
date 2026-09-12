// Analiza la base de partidos: para cada partido, suma los puntos
// individuales cargados (tries/conversiones/penales/drops de jugadores de
// Vicentinos) y los compara contra resultadoPropio. Si la suma calculada no
// coincide con resultadoPropio pero SÍ coincide con resultadoRival, es una
// señal fuerte de que el resultado quedó cargado al revés.
import { prisma } from "../src/lib/prisma";

const PUNTOS_POR_TIPO: Record<string, number> = { TRY: 5, CONVERSION: 2, PENAL: 3, DROP: 3 };

async function main() {
  const [partidos, puntuaciones] = await Promise.all([
    prisma.partido.findMany({
      select: {
        id: true,
        fecha: true,
        fechaNota: true,
        temporada: true,
        condicion: true,
        resultadoPropio: true,
        resultadoRival: true,
        rival: { select: { nombreCanonico: true } },
      },
      orderBy: { fecha: "asc" },
    }),
    prisma.puntuacion.findMany({ select: { partidoId: true, tipo: true, cantidad: true } }),
  ]);

  const puntosPorPartido = new Map<number, number>();
  const triesPorPartido = new Map<number, number>();
  for (const p of puntuaciones) {
    puntosPorPartido.set(partidoId(p), (puntosPorPartido.get(partidoId(p)) ?? 0) + (PUNTOS_POR_TIPO[p.tipo] ?? 0) * p.cantidad);
    if (p.tipo === "TRY") triesPorPartido.set(partidoId(p), (triesPorPartido.get(partidoId(p)) ?? 0) + p.cantidad);
  }
  function partidoId(p: { partidoId: number }) {
    return p.partidoId;
  }

  type Hallazgo = {
    id: number;
    fecha: string;
    temporada: number;
    rival: string;
    condicion: string;
    resultadoPropio: number;
    resultadoRival: number;
    calculado: number;
    tipo: "invertido" | "no_coincide" | "sin_datos";
  };
  const hallazgos: Hallazgo[] = [];
  let sinPuntuacion = 0;

  for (const p of partidos) {
    const calc = puntosPorPartido.get(p.id);
    const fechaStr = p.fecha.toISOString().slice(0, 10);
    if (calc === undefined) {
      sinPuntuacion++;
      continue;
    }
    if (calc === p.resultadoPropio) continue; // coincide, todo bien

    const tipo: Hallazgo["tipo"] =
      calc === p.resultadoRival && p.resultadoRival !== p.resultadoPropio ? "invertido" : "no_coincide";

    hallazgos.push({
      id: p.id,
      fecha: fechaStr,
      temporada: p.temporada,
      rival: p.rival.nombreCanonico,
      condicion: p.condicion,
      resultadoPropio: p.resultadoPropio,
      resultadoRival: p.resultadoRival,
      calculado: calc,
      tipo,
    });
  }

  const invertidos = hallazgos.filter((h) => h.tipo === "invertido");
  const noCoincide = hallazgos.filter((h) => h.tipo === "no_coincide");

  console.log(`Total de partidos: ${partidos.length}`);
  console.log(`Partidos sin ninguna puntuación cargada (no se puede chequear): ${sinPuntuacion}`);
  console.log(`Partidos donde la suma coincide con resultadoPropio: ${partidos.length - sinPuntuacion - hallazgos.length}`);
  console.log();

  console.log(`=== SOSPECHOSOS DE RESULTADO INVERTIDO (${invertidos.length}) ===`);
  console.log("La suma de puntos propios coincide con el resultado del RIVAL, no con el propio.");
  for (const h of invertidos) {
    console.log(
      `  #${h.id} ${h.fecha} (T${h.temporada}) vs ${h.rival} [${h.condicion}] — DB: ${h.resultadoPropio}-${h.resultadoRival} | suma real de Vicentinos: ${h.calculado}`
    );
  }
  console.log();

  console.log(`=== NO COINCIDE CON NINGUNO DE LOS DOS (${noCoincide.length}) ===`);
  console.log("Puede ser dato incompleto (falta cargar algún punto) u otro tipo de error.");
  for (const h of noCoincide) {
    console.log(
      `  #${h.id} ${h.fecha} (T${h.temporada}) vs ${h.rival} [${h.condicion}] — DB: ${h.resultadoPropio}-${h.resultadoRival} | suma cargada: ${h.calculado} (dif ${h.calculado - h.resultadoPropio >= 0 ? "+" : ""}${h.calculado - h.resultadoPropio})`
    );
  }

  console.log();
  console.log("=== BÚSQUEDA ESPECÍFICA: LICEO NAVAL ===");
  const liceoNaval = partidos.filter((p) => p.rival.nombreCanonico.toUpperCase().includes("LICEO NAVAL"));
  for (const p of liceoNaval) {
    const calc = puntosPorPartido.get(p.id);
    const tries = triesPorPartido.get(p.id) ?? 0;
    console.log(
      `  #${p.id} ${p.fecha.toISOString().slice(0, 10)} (T${p.temporada}) [${p.condicion}] — DB: ${p.resultadoPropio}-${p.resultadoRival} | suma calculada Vicentinos: ${calc ?? "sin datos"} (${tries} tries)`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
