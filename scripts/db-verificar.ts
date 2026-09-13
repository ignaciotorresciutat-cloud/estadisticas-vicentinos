/**
 * Chequeos de consistencia sobre data/base/. Se corre antes de commitear
 * un cambio de datos: avisa si algo no cierra, antes de que llegue al sitio.
 *
 * Sale con código 1 si encuentra errores (cosas que seguro están mal) y con 0
 * si sólo hay avisos (cosas para mirar, que pueden ser legítimas).
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE_DIR = fileURLToPath(new URL("../data/base/", import.meta.url));
const TEMPORADAS_DIR = `${BASE_DIR}temporadas/`;

const VALOR: Record<string, number> = { TRY: 5, CONVERSION: 2, PENAL: 3, DROP: 3 };
// el try penal se anotó históricamente de dos formas: como un try solo (y
// entonces vale 7) o como un try más su conversión aparte (5 + 2). En los dos
// casos suma 7 en la cancha, así que la validación acepta las dos.
const NO_JUGADORES = new Set(["TRY PENAL", "TRY SCRUM", "PENAL", "SCRUM"]);

function leer<T>(p: string): T {
  return JSON.parse(readFileSync(p, "utf-8")) as T;
}

const errores: string[] = [];
const avisos: string[] = [];

const clubes = leer<{ id: number; nombre: string }[]>(`${BASE_DIR}clubes.json`);
const jugadores = leer<{ id: number; nombre: string; camada: number | null; esJugadorReal: boolean }[]>(
  `${BASE_DIR}jugadores.json`
);

// --- catálogos ---
const nombresClub = new Set(clubes.map((c) => c.nombre));
const nombresJugador = new Set(jugadores.map((j) => j.nombre));
if (nombresClub.size !== clubes.length) errores.push("hay nombres de club repetidos en clubes.json");
if (nombresJugador.size !== jugadores.length) errores.push("hay nombres de jugador repetidos en jugadores.json");
const idsClub = new Set(clubes.map((c) => c.id));
const idsJugador = new Set(jugadores.map((j) => j.id));
if (idsClub.size !== clubes.length) errores.push("hay ids de club repetidos");
if (idsJugador.size !== jugadores.length) errores.push("hay ids de jugador repetidos");

for (const j of jugadores) {
  if (j.esJugadorReal && j.camada === null) avisos.push(`jugador sin camada: ${j.nombre}`);
}

// --- partidos ---
let totalPartidos = 0;
const fechasVistas = new Map<string, string[]>();

for (const archivo of readdirSync(TEMPORADAS_DIR).filter((f) => f.endsWith(".json")).sort()) {
  const t = leer<any>(`${TEMPORADAS_DIR}${archivo}`);

  for (const p of t.partidos ?? []) {
    totalPartidos++;
    const id = `${t.temporada} ${p.fecha} vs ${p.rival}`;

    if (!nombresClub.has(p.rival)) errores.push(`${id}: club desconocido "${p.rival}"`);
    if (!["LOCAL", "VISITANTE"].includes(p.condicion)) errores.push(`${id}: condición inválida "${p.condicion}"`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha)) errores.push(`${id}: fecha con formato raro "${p.fecha}"`);
    if (!p.fecha.startsWith(String(t.temporada))) errores.push(`${id}: la fecha no cae en la temporada del archivo`);

    const clave = `${t.temporada}|${p.fecha}`;
    fechasVistas.set(clave, [...(fechasVistas.get(clave) ?? []), p.rival]);

    // referencias a jugadores
    const refs: [string, string][] = [
      ...(p.formacion ?? []).map((f: any) => [f.jugador, "formación"] as [string, string]),
      ...(p.cambios ?? []).flatMap((c: any) =>
        [[c.jugador, "cambios"] as [string, string]].concat(c.entraPor ? [[c.entraPor, "cambios"]] : [])
      ),
      ...(p.puntos ?? []).map((x: any) => [x.jugador, "puntos"] as [string, string]),
      ...(p.tarjetas ?? []).map((x: any) => [x.jugador, "tarjetas"] as [string, string]),
    ];
    for (const [nombre, donde] of refs) {
      if (!nombresJugador.has(nombre)) errores.push(`${id}: jugador desconocido "${nombre}" (en ${donde})`);
    }

    // un jugador no puede figurar dos veces en el mismo partido
    const enPartido = [
      ...(p.formacion ?? []).map((f: any) => f.jugador),
      ...(p.cambios ?? []).map((c: any) => c.jugador),
    ];
    const repetidos = enPartido.filter((n, i) => enPartido.indexOf(n) !== i);
    for (const r of new Set(repetidos)) errores.push(`${id}: "${r}" figura más de una vez en el equipo`);

    // suma de anotadores vs resultado
    const puntos = p.puntos ?? [];
    if (puntos.length === 0) {
      avisos.push(`${id}: sin anotadores cargados (resultado ${p.resultadoPropio}-${p.resultadoRival})`);
    } else {
      let con5 = 0;
      let con7 = 0;
      for (const pt of puntos) {
        const base = (VALOR[pt.tipo] ?? 0) * pt.cantidad;
        const esTryPenal = pt.tipo === "TRY" && NO_JUGADORES.has(pt.jugador.toUpperCase());
        con5 += base;
        con7 += esTryPenal ? 7 * pt.cantidad : base;
      }
      if (con5 !== p.resultadoPropio && con7 !== p.resultadoPropio) {
        avisos.push(
          `${id}: la suma de anotadores (${con5}${con7 !== con5 ? ` o ${con7}` : ""}) no da el resultado (${p.resultadoPropio})`
        );
      }
    }
  }
}

for (const [clave, rivales] of fechasVistas) {
  if (rivales.length > 1) {
    const [temporada, fecha] = clave.split("|");
    avisos.push(`${temporada}: dos partidos el mismo día (${fecha}) — contra ${rivales.join(" y ")}`);
  }
}

// --- salida ---
console.log(`Revisados: ${clubes.length} clubes, ${jugadores.length} jugadores, ${totalPartidos} partidos\n`);

if (errores.length) {
  console.log(`❌ ERRORES (${errores.length}) — hay que corregirlos:`);
  errores.forEach((e) => console.log(`   ${e}`));
  console.log();
}

if (avisos.length) {
  console.log(`⚠️  AVISOS (${avisos.length}) — para mirar, pueden ser legítimos:`);
  avisos.forEach((a) => console.log(`   ${a}`));
  console.log();
}

if (!errores.length && !avisos.length) console.log("✅ Todo cierra.");
else if (!errores.length) console.log("✅ Sin errores.");

process.exit(errores.length ? 1 : 0);
