/**
 * Importa a data/base/ los datos de la planilla de carga (Google Sheets),
 * a partir de su exportación .xlsx (Archivo → Descargar → Microsoft Excel).
 *
 *   npm run importar-planilla -- <archivo.xlsx> [--simular]
 *
 * Compara partido por partido (clave: fecha + rival) contra data/base/ y sólo
 * reescribe lo que es nuevo o cambió, comparando por contenido y no por
 * formato: los partidos que no cambiaron quedan intactos en el JSON, así el
 * diff de git muestra únicamente lo que se cargó o corrigió en la planilla.
 *
 * También sincroniza jugadores y clubes nuevos (con ids nuevos), la camada de
 * los jugadores, los datos de torneo de cada temporada, y recalcula el N° de
 * Vicentino con la regla del club (ver numerarVicentinos).
 *
 * Con --simular muestra el reporte sin escribir nada.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const BASE_DIR = fileURLToPath(new URL("../data/base/", import.meta.url));
const TEMPORADAS_DIR = `${BASE_DIR}temporadas/`;

// último N° de Vicentino verificado del historial; del siguiente en adelante
// se calcula por orden de debut como titular (igual que en planilla/Codigo.gs)
const ULTIMO_N_HISTORICO = 85;
// cómo aparecían escritos los anotadores especiales en la carga histórica
const NORMALIZAR_ANOTADOR: Record<string, string> = { SCRUM: "TRY SCRUM", PENAL: "TRY PENAL" };
const TIPOS = ["TRY", "CONVERSION", "PENAL", "DROP"] as const;

type Fila = (string | number | boolean)[];
type Jugador = { id: number; nombre: string; camada: number | null; vicentinoN: number | null; esJugadorReal: boolean };
type Club = { id: number; nombre: string };
type Partido = {
  fecha: string;
  fechaNota: string | null;
  rival: string;
  condicion: string;
  resultadoPropio: number;
  resultadoRival: number;
  cancha: string | null;
  clima: string | null;
  campoDeJuego: string | null;
  referee: string | null;
  categoria: string | null;
  formacion: { numero: number; jugador: string; capitan?: true }[];
  cambios: { jugador: string; numero?: number; capitan?: true; entraPor: string | null }[];
  puntos: { jugador: string; tipo: string; cantidad: number }[];
  tarjetas: { jugador: string; tipo: string }[];
};
type Info = { torneo: string | null; posicion: number | null; rankingUrba: number | null; campeon: boolean; ascenso: boolean; descenso: boolean; nota: string | null };
type Temporada = { temporada: number; info: Info | null; partidos: Partido[] };

const leerJSON = <T>(path: string): T => JSON.parse(readFileSync(path, "utf-8"));
const escribirJSON = (path: string, data: unknown) => writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
const texto = (v: unknown) => (v === "" || v === null || v === undefined ? null : String(v).trim());
const numero = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));

function main() {
  const args = process.argv.slice(2);
  const simular = args.includes("--simular");
  const archivo = args.find((a) => !a.startsWith("--"));
  if (!archivo) {
    console.error("Uso: npm run importar-planilla -- <archivo.xlsx> [--simular]");
    process.exit(1);
  }

  // ---------- planilla ----------
  const wb = XLSX.readFile(archivo);
  const hoja = (nombre: string): Fila[] => {
    const sh = wb.Sheets[nombre];
    if (!sh) throw new Error(`La planilla no tiene la hoja ${nombre}`);
    const filas = XLSX.utils.sheet_to_json<Fila>(sh, { header: 1, raw: true, defval: "" }).slice(1);
    return filas.filter((f) => f[0] !== "" || (nombre === "JUGADORES" && f[1] !== "") || (nombre === "CLUBES" && f[1] !== ""));
  };
  const fechaISO = (serie: unknown) => {
    const d = XLSX.SSF.parse_date_code(Number(serie));
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  };

  const filasPartidos = hoja("PARTIDOS");
  const filasForm = hoja("BASE FORMACIONES");
  const filasPts = hoja("BASE PUNTOS");
  const filasTarj = hoja("BASE TARJETAS");
  const porId = <T extends Fila>(filas: T[]) => {
    const m = new Map<number, T[]>();
    for (const f of filas) m.set(Number(f[0]), [...(m.get(Number(f[0])) ?? []), f]);
    return m;
  };
  const formPorId = porId(filasForm), ptsPorId = porId(filasPts), tarjPorId = porId(filasTarj);

  const desdePlanilla: { temporada: number; partido: Partido }[] = filasPartidos.map((p) => {
    const id = Number(p[0]);
    const form = formPorId.get(id) ?? [];
    const titulares = form.filter((f) => f[2] === "TITULAR").sort((a, b) => Number(a[4]) - Number(b[4]) || Number(a[3]) - Number(b[3]));
    const suplentes = form.filter((f) => f[2] === "SUPLENTE").sort((a, b) => Number(a[3]) - Number(b[3]));
    const pts = (ptsPorId.get(id) ?? []).sort((a, b) => Number(a[2]) - Number(b[2]));
    const puntos: Partido["puntos"] = [];
    TIPOS.forEach((tipo, k) => {
      for (const f of pts) {
        const cantidad = Number(f[4 + k]) || 0;
        if (cantidad > 0) puntos.push({ jugador: String(f[3]), tipo, cantidad });
      }
    });
    return {
      temporada: Number(p[2]),
      partido: {
        fecha: fechaISO(p[1]),
        fechaNota: texto(p[11]),
        rival: String(p[3]),
        condicion: String(p[4]),
        resultadoPropio: Number(p[5]),
        resultadoRival: Number(p[6]),
        cancha: texto(p[7]),
        clima: texto(p[8]),
        campoDeJuego: texto(p[9]),
        referee: texto(p[10]),
        categoria: null,
        formacion: titulares.map((f) => ({ numero: Number(f[4]), jugador: String(f[5]), ...(f[6] === true ? { capitan: true as const } : {}) })),
        cambios: suplentes.map((f) => ({ jugador: String(f[5]), entraPor: texto(f[7]) })),
        puntos,
        tarjetas: (tarjPorId.get(id) ?? []).sort((a, b) => Number(a[2]) - Number(b[2])).map((f) => ({ jugador: String(f[3]), tipo: String(f[4]) })),
      },
    };
  });

  // ---------- data/base ----------
  const temporadas = new Map<number, Temporada>();
  for (const f of readdirSync(TEMPORADAS_DIR).filter((x) => x.endsWith(".json"))) {
    const t = leerJSON<Temporada>(`${TEMPORADAS_DIR}${f}`);
    temporadas.set(t.temporada, t);
  }
  const jugadores = leerJSON<Jugador[]>(`${BASE_DIR}jugadores.json`);
  const clubes = leerJSON<Club[]>(`${BASE_DIR}clubes.json`);

  const reporte: string[] = [];
  const tocadas = new Set<number>();
  let catalogos = false;

  // ---------- clubes nuevos ----------
  let maxClub = Math.max(...clubes.map((c) => c.id));
  for (const f of hoja("CLUBES")) {
    const nombre = texto(f[1]);
    if (!nombre || clubes.some((c) => c.nombre === nombre)) continue;
    clubes.push({ id: ++maxClub, nombre });
    reporte.push(`Club nuevo: ${nombre} (id ${maxClub})`);
    catalogos = true;
  }

  // ---------- jugadores nuevos y camadas ----------
  let maxJug = Math.max(...jugadores.map((j) => j.id));
  for (const f of hoja("JUGADORES")) {
    const nombre = texto(f[1]);
    if (!nombre) continue;
    const camada = numero(f[3]);
    const existente = jugadores.find((j) => j.nombre === nombre);
    if (!existente) {
      jugadores.push({ id: ++maxJug, nombre, camada, vicentinoN: null, esJugadorReal: true });
      reporte.push(`Jugador nuevo: ${nombre} (id ${maxJug}${camada ? `, camada ${camada}` : ""})`);
      catalogos = true;
    } else if (camada !== null && existente.camada !== camada) {
      reporte.push(`Camada de ${nombre}: ${existente.camada ?? "sin dato"} → ${camada}`);
      existente.camada = camada;
      catalogos = true;
    }
  }

  // ---------- partidos ----------
  const clave = (temporada: number, p: Partido) => `${temporada}|${p.fecha}|${p.rival}`;
  const enBase = new Map<string, { t: Temporada; i: number }>();
  for (const t of temporadas.values()) t.partidos.forEach((p, i) => enBase.set(clave(t.temporada, p), { t, i }));

  const nombresJug = new Set(jugadores.map((j) => j.nombre));
  const nombresClub = new Set(clubes.map((c) => c.nombre));
  const vistos = new Set<string>();
  for (const { temporada, partido } of desdePlanilla) {
    const k = clave(temporada, partido);
    vistos.add(k);
    const faltan = [
      ...partido.formacion.map((x) => x.jugador), ...partido.cambios.map((x) => x.jugador),
      ...partido.cambios.map((x) => x.entraPor).filter((x): x is string => !!x),
      ...partido.puntos.map((x) => NORMALIZAR_ANOTADOR[x.jugador] ?? x.jugador), ...partido.tarjetas.map((x) => x.jugador),
    ].filter((n) => !nombresJug.has(n));
    if (faltan.length) throw new Error(`${partido.fecha} vs ${partido.rival}: jugadores que no están en el catálogo: ${[...new Set(faltan)].join(", ")}`);
    if (!nombresClub.has(partido.rival)) throw new Error(`${partido.fecha}: el rival ${partido.rival} no está en clubes`);

    const actual = enBase.get(k);
    if (!actual) {
      if (!temporadas.has(temporada)) temporadas.set(temporada, { temporada, info: null, partidos: [] });
      const t = temporadas.get(temporada)!;
      t.partidos.push(partido);
      t.partidos.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
      tocadas.add(temporada);
      reporte.push(`Partido nuevo: ${partido.fecha} vs ${partido.rival} ${partido.resultadoPropio}-${partido.resultadoRival}`);
    } else if (canonico(actual.t.partidos[actual.i]) !== canonico(partido)) {
      reporte.push(`Partido corregido: ${partido.fecha} vs ${partido.rival}\n${diferencias(actual.t.partidos[actual.i], partido)}`);
      actual.t.partidos[actual.i] = partido;
      tocadas.add(temporada);
    }
  }
  for (const k of enBase.keys()) {
    if (!vistos.has(k)) reporte.push(`⚠️ Está en el sitio pero no en la planilla (no se borra): ${k.split("|").slice(1).join(" vs ")}`);
  }

  // ---------- datos de torneo (hoja TEMPORADAS, tabla editable O:V) ----------
  const shTemp = wb.Sheets["TEMPORADAS"];
  if (shTemp) {
    const filas = XLSX.utils.sheet_to_json<Fila>(shTemp, { header: 1, raw: true, defval: "" }).slice(2);
    for (const f of filas) {
      const anio = numero(f[14]);
      if (!anio) continue;
      const info: Info = {
        torneo: texto(f[15]), posicion: numero(f[16]), rankingUrba: numero(f[17]),
        campeon: f[18] === "SÍ", ascenso: f[19] === "SÍ", descenso: f[20] === "SÍ", nota: texto(f[21]),
      };
      const t = temporadas.get(anio);
      if (!t) continue;
      if (JSON.stringify(t.info) !== JSON.stringify(info)) {
        reporte.push(`Datos de torneo ${anio}: ${JSON.stringify(t.info)} → ${JSON.stringify(info)}`);
        t.info = info;
        tocadas.add(anio);
      }
    }
  }

  // ---------- N° de Vicentino ----------
  for (const cambio of numerarVicentinos(jugadores, temporadas)) {
    reporte.push(cambio);
    catalogos = true;
  }

  // ---------- salida ----------
  console.log(reporte.length ? reporte.join("\n") : "Sin cambios: data/base/ ya coincide con la planilla.");
  if (simular) {
    console.log("\n(--simular: no se escribió nada)");
    return;
  }
  for (const anio of [...tocadas].sort()) escribirJSON(`${TEMPORADAS_DIR}${anio}.json`, temporadas.get(anio));
  if (catalogos) {
    escribirJSON(`${BASE_DIR}jugadores.json`, jugadores);
    escribirJSON(`${BASE_DIR}clubes.json`, clubes);
  }
  if (tocadas.size || catalogos) console.log("\nEscrito en data/base/. Siguiente paso: npm run db:build && npm run db:verificar && npm run db:comparar");
}

/**
 * N° de Vicentino: lo tiene quien debutó de TITULAR en primera, en orden de
 * debut. Los N° 1..ULTIMO_N_HISTORICO son históricos y no se tocan; del
 * siguiente en adelante se recalcula siempre (así se corrige cualquier número
 * mal asignado). Devuelve los cambios hechos.
 */
function numerarVicentinos(jugadores: Jugador[], temporadas: Map<number, Temporada>): string[] {
  const partidos = [...temporadas.values()].flatMap((t) => t.partidos)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  const debut = new Map<string, [number, number]>(); // nombre -> [orden del partido, N° de camiseta]
  partidos.forEach((p, i) => {
    for (const f of p.formacion) {
      const previo = debut.get(f.jugador);
      if (!previo || i < previo[0] || (i === previo[0] && f.numero < previo[1])) debut.set(f.jugador, [i, f.numero]);
    }
  });
  const fijos = (j: Jugador) => j.vicentinoN !== null && j.vicentinoN <= ULTIMO_N_HISTORICO;
  const aNumerar = jugadores.filter((j) => j.esJugadorReal && !fijos(j) && debut.has(j.nombre))
    .sort((a, b) => debut.get(a.nombre)![0] - debut.get(b.nombre)![0] || debut.get(a.nombre)![1] - debut.get(b.nombre)![1]);
  const nuevoN = new Map(aNumerar.map((j, k) => [j.nombre, ULTIMO_N_HISTORICO + k + 1]));

  const cambios: string[] = [];
  for (const j of jugadores) {
    if (fijos(j)) continue;
    const ahora = nuevoN.get(j.nombre) ?? null;
    if (j.vicentinoN !== ahora) {
      cambios.push(`N° de Vicentino de ${j.nombre}: ${j.vicentinoN ?? "sin N°"} → ${ahora ?? "sin N°"}`);
      j.vicentinoN = ahora;
    }
  }
  return cambios;
}

/** representación por contenido de un partido, para comparar sin depender del formato */
function canonico(p: Partido): string {
  const puntos = new Map<string, Record<string, number>>();
  for (const x of p.puntos) {
    const nombre = NORMALIZAR_ANOTADOR[x.jugador] ?? x.jugador;
    const r = puntos.get(nombre) ?? { TRY: 0, CONVERSION: 0, PENAL: 0, DROP: 0 };
    r[x.tipo] += x.cantidad;
    puntos.set(nombre, r);
  }
  const ordenar = <T>(xs: T[]) => xs.map((x) => JSON.stringify(x)).sort();
  return JSON.stringify({
    fecha: p.fecha, fechaNota: p.fechaNota ?? null, rival: p.rival, condicion: p.condicion,
    rp: p.resultadoPropio, rr: p.resultadoRival, cancha: p.cancha ?? null, clima: p.clima ?? null,
    campo: p.campoDeJuego ?? null, referee: p.referee ?? null,
    formacion: ordenar(p.formacion.map((f) => [f.numero, f.jugador, f.capitan === true])),
    cambios: ordenar(p.cambios.map((c) => [c.jugador, c.entraPor ?? null])),
    puntos: ordenar([...puntos.entries()]),
    tarjetas: ordenar(p.tarjetas.map((t) => [t.jugador, t.tipo])),
  });
}

/** qué cambió entre dos versiones de un partido, para el reporte */
function diferencias(antes: Partido, despues: Partido): string {
  const a = JSON.parse(canonico(antes)), b = JSON.parse(canonico(despues));
  return Object.keys(a)
    .filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
    .map((k) => `    ${k}: ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`)
    .join("\n");
}

if (!existsSync(TEMPORADAS_DIR)) throw new Error("No encuentro data/base/temporadas/");
main();
