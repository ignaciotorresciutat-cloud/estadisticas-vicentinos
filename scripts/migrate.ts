/**
 * Sincronización ADITIVA del Excel crudo (partido a partido) + tablas de
 * equivalencia -> SQLite.
 *
 * Solo LEE el excel original, nunca lo modifica. Y con la base pasa lo
 * mismo: este script nunca borra nada. Parsea todos los partidos del Excel,
 * los compara contra lo que ya hay en la base (por temporada+fecha+rival) y
 * SOLO crea lo que todavía no existe (partidos nuevos, y los jugadores/clubes
 * que esos partidos nuevos necesiten). Un partido ya cargado no se vuelve a
 * tocar aunque el Excel lo tenga distinto — para corregir un dato de un
 * partido ya existente (resultado, a quién le pusieron un try, etc.) se usan
 * las tablas de correcciones (resultados_correcciones.csv,
 * puntuacion_correcciones.csv, condicion_correcciones.csv) + hay que aplicar
 * esa corrección puntual sobre el registro ya existente, no reimportar todo.
 *
 * Si encuentra un nombre de jugador o club que no está en las tablas de
 * equivalencia, NO carga nada: junta todos los casos y los reporta al final
 * para resolverlos a mano en los CSV y volver a correr.
 */
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma";
import { seedTemporadasInfo } from "./temporadas-info";

const EXCEL_PATH = "/Users/ignacio.torres/Downloads/Estadísticas V 2026 1 (1).xlsx";
// copia local de un segundo workbook (más viejo, va 2014-2025) del que solo
// tomamos la hoja CAMPAÑA 2025, que no existe en el archivo principal.
// El resto de sus hojas (resumen, otras campañas) se ignoran a propósito:
// tienen números de una foto anterior y el archivo principal ya es la fuente
// de verdad para todo lo demás.
const EXCEL_PATH_2025 = fileURLToPath(
  new URL("../data/Estadisticas V 2025 (fuente campaña 2025).xlsx", import.meta.url)
);
// copia local de una actualización del archivo principal con más partidos
// de 2026 cargados. Solo tomamos de acá la hoja CAMPAÑA 2026 (más nueva);
// el resto de las temporadas siguen viniendo del archivo principal.
const EXCEL_PATH_2026 = fileURLToPath(
  new URL("../data/Estadisticas V 2026 (fuente campaña 2026 actualizada).xlsx", import.meta.url)
);
// copias versionadas dentro del proyecto (las originales viven en el Desktop
// del usuario, fuera del workspace donde este script puede escribir)
const EQUIPOS_CSV = fileURLToPath(new URL("../data/equipos_canonicos.csv", import.meta.url));
const JUGADORES_CSV = fileURLToPath(new URL("../data/jugadores_canonicos.csv", import.meta.url));
// correcciones/altas de camada para jugadores que no están (o están mal) en
// la hoja CAMADAS del Excel; confirmadas a mano con el usuario. Tienen
// prioridad sobre lo que diga la hoja CAMADAS.
const CAMADAS_CORRECCIONES_CSV = fileURLToPath(
  new URL("../data/camadas_correcciones.csv", import.meta.url)
);
// correcciones de resultados mal cargados en el excel (ej. el resultado de
// un partido puntual quedó invertido); confirmadas a mano con el usuario.
const RESULTADOS_CORRECCIONES_CSV = fileURLToPath(
  new URL("../data/resultados_correcciones.csv", import.meta.url)
);
// torneo/posición/ascensos-descensos por temporada; no viene del excel de
// partidos, se carga aparte a mano (ver scripts/temporadas-info.ts)
const TEMPORADAS_INFO_CSV = fileURLToPath(new URL("../data/temporadas_info.csv", import.meta.url));
const CONDICION_CORRECCIONES_CSV = fileURLToPath(
  new URL("../data/condicion_correcciones.csv", import.meta.url)
);
// puntos (tries/conversiones/etc.) cargados a nombre del jugador equivocado
// en el excel original (ej. dos jugadores con el mismo nombre de pila en la
// misma formación); confirmadas a mano con el usuario.
const PUNTUACION_CORRECCIONES_CSV = fileURLToPath(
  new URL("../data/puntuacion_correcciones.csv", import.meta.url)
);

const FUENTES_CAMPANAS = [
  {
    path: EXCEL_PATH,
    hojas: [
      "CAMPAÑA 2014",
      "CAMPAÑA 2015",
      "CAMPAÑA 2016",
      "CAMPAÑA 2017",
      "CAMPAÑA 2018",
      "CAMPAÑA 2019",
      "CAMPAÑA 2021",
      "CAMPAÑA 2022",
      "CAMPAÑA 2023",
      "CAMPAÑA 2024",
    ],
  },
  {
    path: EXCEL_PATH_2025,
    hojas: ["CAMPAÑA 2025"],
  },
  {
    path: EXCEL_PATH_2026,
    hojas: ["CAMPAÑA 2026"],
  },
];

const CAMADAS_SHEET = "CAMADAS";

const PLACEHOLDER_JUGADORES = new Set([
  "PENAL",
  "SCRUM",
  "TRY PENAL",
  "TRY SCRUM",
  "REUBICACION GRUPO III",
]);

const NO_DATA_MARKERS = new Set(["NO HUBO", "NINGUNA", "NINGUNO", "-", "SIN DATOS", "S/D"]);

type Row = (string | number | Date | null)[];

// fuerza que el índice 0 del array sea siempre la columna A, incluso si
// alguna hoja (ej. CAMADAS) no tiene ningún dato en columna A y la libería
// xlsx recortaría el rango empezando en B.
function sheetToRows(ws: XLSX.WorkSheet): Row[] {
  const ref = ws["!ref"] ?? "A1";
  const decoded = XLSX.utils.decode_range(ref);
  decoded.s.r = 0;
  decoded.s.c = 0;
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, range: decoded }) as Row[];
}

type UnmappedRef = { kind: "club" | "jugador"; raw: string; contexto: string };

// ---------- utilidades generales ----------

function norm(s: unknown): string {
  return String(s ?? "")
    .replace(/ /g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function loadCsvMap(path: string): Map<string, string> {
  const text = readFileSync(path, "utf-8");
  const lines = text.split(/\r?\n/).slice(1); // skip header
  const map = new Map<string, string>();
  for (const line of lines) {
    if (!line.trim()) continue;
    const idx = line.indexOf(",");
    if (idx === -1) continue;
    const raw = norm(line.slice(0, idx));
    const canon = norm(line.slice(idx + 1));
    if (raw && canon) map.set(raw, canon);
  }
  return map;
}

function loadCamadaCorrecciones(path: string): Map<string, number> {
  const text = readFileSync(path, "utf-8");
  const lines = text.split(/\r?\n/).slice(1); // skip header
  const map = new Map<string, number>();
  for (const line of lines) {
    if (!line.trim()) continue;
    const idx = line.indexOf(",");
    if (idx === -1) continue;
    const nombre = norm(line.slice(0, idx));
    const camada = Number(norm(line.slice(idx + 1)));
    if (nombre && Number.isInteger(camada)) map.set(nombre, camada);
  }
  return map;
}

type ResultadoCorreccion = { resultadoPropio: number; resultadoRival: number };

function resultadoCorreccionKey(temporada: number, fechaIso: string, rival: string): string {
  return `${temporada}|${fechaIso}|${norm(rival)}`;
}

function loadResultadosCorrecciones(path: string): Map<string, ResultadoCorreccion> {
  const text = readFileSync(path, "utf-8");
  const lines = text.split(/\r?\n/).slice(1); // skip header
  const map = new Map<string, ResultadoCorreccion>();
  for (const line of lines) {
    if (!line.trim()) continue;
    const [temporada, fecha, rival, resultadoPropio, resultadoRival] = line.split(",");
    if (!temporada || !fecha || !rival) continue;
    map.set(resultadoCorreccionKey(Number(temporada), norm(fecha), rival), {
      resultadoPropio: Number(resultadoPropio),
      resultadoRival: Number(resultadoRival),
    });
  }
  return map;
}

// condicion (LOCAL/VISITANTE) que la heurística "cancha === VICENTINOS" no
// puede inferir bien, ej. semifinales/finales jugadas en cancha neutral
// donde Vicentinos igual queda como local a efectos del fixture.
function condicionCorreccionKey(temporada: number, fechaIso: string, rival: string): string {
  return `${temporada}|${fechaIso}|${norm(rival)}`;
}

function loadCondicionCorrecciones(path: string): Map<string, "LOCAL" | "VISITANTE"> {
  const text = readFileSync(path, "utf-8");
  const lines = text.split(/\r?\n/).slice(1); // skip header
  const map = new Map<string, "LOCAL" | "VISITANTE">();
  for (const line of lines) {
    if (!line.trim()) continue;
    const [temporada, fecha, rival, condicion] = line.split(",");
    if (!temporada || !fecha || !rival) continue;
    map.set(condicionCorreccionKey(Number(temporada), norm(fecha), rival), norm(condicion) as "LOCAL" | "VISITANTE");
  }
  return map;
}

// puntos cargados a nombre del jugador equivocado en el excel original
function puntuacionCorreccionKey(
  temporada: number,
  fechaIso: string,
  rival: string,
  tipo: string,
  jugadorIncorrecto: string
): string {
  return `${temporada}|${fechaIso}|${norm(rival)}|${norm(tipo)}|${norm(jugadorIncorrecto)}`;
}

function loadPuntuacionCorrecciones(path: string): Map<string, string> {
  const text = readFileSync(path, "utf-8");
  const lines = text.split(/\r?\n/).slice(1); // skip header
  const map = new Map<string, string>();
  for (const line of lines) {
    if (!line.trim()) continue;
    const [temporada, fecha, rival, tipo, jugadorIncorrecto, jugadorCorrecto] = line.split(",");
    if (!temporada || !fecha || !rival || !tipo || !jugadorIncorrecto || !jugadorCorrecto) continue;
    map.set(
      puntuacionCorreccionKey(Number(temporada), norm(fecha), rival, tipo, jugadorIncorrecto),
      norm(jugadorCorrecto)
    );
  }
  return map;
}

function makeCanonicalizer(map: Map<string, string>, kind: "club" | "jugador", unmapped: UnmappedRef[]) {
  return (rawInput: unknown, contexto: string): string | null => {
    let raw = norm(rawInput).replace(/©/g, "").trim();
    if (!raw) return null;
    if (map.has(raw)) return map.get(raw)!;
    // reintenta sacando una anotación final entre paréntesis, ej. "(Temporario por amarilla)"
    const stripped = norm(raw.replace(/\([^)]*\)\s*$/, ""));
    if (stripped && map.has(stripped)) return map.get(stripped)!;
    unmapped.push({ kind, raw, contexto });
    return null;
  };
}

// convierte un valor de celda de fecha (Date, string "FECHA: dd/mm/yyyy",
// string "d/m/yyyy (nota)", o serial numérico) a { fecha, nota }
function parseFecha(cell: unknown): { fecha: Date; nota: string | null } | null {
  if (cell instanceof Date) {
    const fecha = new Date(Date.UTC(cell.getUTCFullYear(), cell.getUTCMonth(), cell.getUTCDate()));
    return { fecha, nota: null };
  }
  if (typeof cell === "number") {
    const fecha = new Date(Date.UTC(1899, 11, 30) + Math.round(cell) * 86400000);
    return { fecha, nota: null };
  }
  const s = norm(cell);
  if (!s) return null;
  const m = s.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!m) return null;
  const [, d, mo, yRaw] = m;
  const y = yRaw.length === 2 ? String(2000 + Number(yRaw)) : yRaw;
  const fecha = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  const notaCandidata = s.replace(/^FECHA:\s*/i, "").trim();
  const esSoloFecha = new RegExp(`^${d}[/-]${mo}[/-]${yRaw}$`).test(notaCandidata);
  const nota = esSoloFecha ? null : s;
  return { fecha, nota };
}

function isBlankRow(row: Row | undefined): boolean {
  if (!row) return true;
  return row.slice(0, 6).every((c) => c === null || c === undefined || norm(c) === "");
}

const SECTION_HEADERS = new Set([
  "TRIES",
  "CONVERSIONES",
  "PENALES",
  "DROPS",
  "AMARILLAS",
  "ROJA",
  "ROJAS",
  "TARJETAS",
]);

// lee filas dentro de un bloque (CAMBIOS, o una sección de puntos/tarjetas)
// tolerando una fila en blanco suelta en el medio (se vio en algunos partidos
// de la campaña 2025), pero cortando ante 2 en blanco seguidas o el próximo
// encabezado de sección conocido.
function leerBloque(rows: Row[], startIdx: number): { fin: number; filas: Row[] } {
  let i = startIdx;
  let blancosSeguidos = 0;
  const filas: Row[] = [];
  while (i < rows.length) {
    const header = norm(rows[i]?.[2]).toUpperCase();
    if (SECTION_HEADERS.has(header)) break;
    if (isBlankRow(rows[i])) {
      blancosSeguidos++;
      if (blancosSeguidos >= 2) break;
      i++;
      continue;
    }
    blancosSeguidos = 0;
    filas.push(rows[i]);
    i++;
  }
  return { fin: i, filas };
}

// ---------- parseo de un partido ----------

type ParsedPuntuacion = { tipo: string; jugadorRaw: string; cantidad: number };
type ParsedTarjeta = { tipo: string; jugadorRaw: string };
type ParsedParticipacion = {
  jugadorRaw: string;
  rol: "TITULAR" | "SUPLENTE";
  numeroCamiseta: number | null;
  capitan: boolean;
  ingresoPorRaw: string | null;
};

type ParsedPartido = {
  temporada: number;
  fecha: Date;
  fechaNota: string | null;
  rivalRaw: string;
  condicion: "LOCAL" | "VISITANTE";
  resultadoPropio: number;
  resultadoRival: number;
  cancha: string | null;
  clima: string | null;
  campoDeJuego: string | null;
  referee: string | null;
  participaciones: ParsedParticipacion[];
  puntos: ParsedPuntuacion[];
  tarjetas: ParsedTarjeta[];
};

function parseCambioLine(line: string): { entraRaw: string; saleRaw: string } | null {
  // separador normal es "POR"; se vieron también typos ("POT") y un "X" en 2017
  const m = line.match(/^(.+?)\s+(?:POR|POT|X)\s+(.+)$/i);
  if (!m) return null;
  return { entraRaw: norm(m[1]), saleRaw: norm(m[2]) };
}

function parseCampana(
  sheetName: string,
  rows: Row[],
  warnings: string[],
  resultadosCorrecciones: Map<string, ResultadoCorreccion>,
  condicionCorrecciones: Map<string, "LOCAL" | "VISITANTE">
): ParsedPartido[] {
  const temporada = Number(sheetName.match(/\d{4}/)?.[0]);
  const partidos: ParsedPartido[] = [];

  const resultadoIdxs: number[] = [];
  rows.forEach((row, i) => {
    if (norm(row?.[2]) === "RESULTADO FINAL") resultadoIdxs.push(i);
  });

  for (const rIdx of resultadoIdxs) {
    const fechaIdx = rIdx - 2;
    const fechaCell = rows[fechaIdx]?.[1];
    const parsedFecha = parseFecha(fechaCell);
    if (!parsedFecha) {
      warnings.push(`${sheetName}: no pude parsear la fecha cerca de la fila ${rIdx + 1} (valor: ${JSON.stringify(fechaCell)})`);
      continue;
    }

    // en este dataset todos los partidos de una campaña caen dentro del mismo
    // año calendario que su hoja; si no coincide es un typo de tipeo del año
    // (ej. "25/04/2014" adentro de CAMPAÑA 2015) - corregimos el año y avisamos.
    if (parsedFecha.fecha.getUTCFullYear() !== temporada) {
      const fechaOriginal = parsedFecha.fecha.toISOString().slice(0, 10);
      parsedFecha.fecha = new Date(
        Date.UTC(temporada, parsedFecha.fecha.getUTCMonth(), parsedFecha.fecha.getUTCDate())
      );
      warnings.push(
        `${sheetName} fila ${rIdx + 1}: corregí el año de la fecha (${fechaOriginal} -> ${parsedFecha.fecha
          .toISOString()
          .slice(0, 10)}), no coincidía con la temporada de la hoja`
      );
    }

    const equipoA = norm(rows[rIdx]?.[4]);
    const scoreA = Number(rows[rIdx]?.[5]);
    const equipoB = norm(rows[rIdx + 1]?.[4]);
    const scoreB = Number(rows[rIdx + 1]?.[5]);

    let rivalRaw: string, resultadoPropio: number, resultadoRival: number;
    if (equipoA === "VICENTINOS") {
      rivalRaw = equipoB;
      resultadoPropio = scoreA;
      resultadoRival = scoreB;
    } else if (equipoB === "VICENTINOS") {
      rivalRaw = equipoA;
      resultadoPropio = scoreB;
      resultadoRival = scoreA;
    } else {
      warnings.push(`${sheetName} fila ${rIdx + 1}: ninguno de los dos equipos es "VICENTINOS" (${equipoA} / ${equipoB}), partido salteado`);
      continue;
    }

    const correccion = resultadosCorrecciones.get(
      resultadoCorreccionKey(temporada, parsedFecha.fecha.toISOString().slice(0, 10), rivalRaw)
    );
    if (correccion) {
      resultadoPropio = correccion.resultadoPropio;
      resultadoRival = correccion.resultadoRival;
      warnings.push(
        `${sheetName} fila ${rIdx + 1}: resultado vs ${rivalRaw} corregido a mano a ${resultadoPropio}-${resultadoRival}`
      );
    }

    // CANCHA / CLIMA / CAMPO DE JUEGO / REFEREE / FORMACION
    let cancha: string | null = null;
    let clima: string | null = null;
    let campoDeJuego: string | null = null;
    let referee: string | null = null;
    let cursor = rIdx + 2;
    let formacionIdx = -1;
    while (cursor < rows.length && cursor < rIdx + 40) {
      const label = norm(rows[cursor]?.[2]);
      if (label === "CANCHA") cancha = norm(rows[cursor]?.[4]) || null;
      else if (label === "CLIMA") clima = norm(rows[cursor]?.[4]) || null;
      else if (label === "CAMPO DE JUEGO") campoDeJuego = norm(rows[cursor]?.[4]) || null;
      else if (label.replace(":", "").trim() === "REFEREE") referee = norm(rows[cursor]?.[4]) || null;
      else if (label === "FORMACION") {
        formacionIdx = cursor;
        break;
      }
      cursor++;
    }
    if (formacionIdx === -1) {
      warnings.push(`${sheetName} fila ${rIdx + 1}: no encontré "FORMACION", partido salteado`);
      continue;
    }

    const condicionRaw = norm(cancha).replace(/\([^)]*\)\s*$/, "").trim().toUpperCase();
    let condicion: "LOCAL" | "VISITANTE" = condicionRaw === "VICENTINOS" ? "LOCAL" : "VISITANTE";
    const condicionCorregida = condicionCorrecciones.get(
      condicionCorreccionKey(temporada, parsedFecha.fecha.toISOString().slice(0, 10), rivalRaw)
    );
    if (condicionCorregida && condicionCorregida !== condicion) {
      warnings.push(
        `${sheetName} fila ${rIdx + 1}: condición vs ${rivalRaw} corregida a mano a ${condicionCorregida} (cancha: "${cancha}")`
      );
      condicion = condicionCorregida;
    }

    // FORMACION: filas "numero | nombre [©]"
    const participaciones: ParsedParticipacion[] = [];
    let i = formacionIdx + 1;
    while (i < rows.length) {
      const row = rows[i];
      if (isBlankRow(row)) {
        i++;
        continue;
      }
      const numero = Number(row?.[1]);
      const nombreCell = norm(row?.[2]);
      if (!Number.isInteger(numero) || numero < 1 || numero > 23 || !nombreCell) break;
      const capitan = /©/.test(nombreCell);
      participaciones.push({
        jugadorRaw: nombreCell,
        rol: "TITULAR",
        numeroCamiseta: numero,
        capitan,
        ingresoPorRaw: null,
      });
      i++;
    }

    // CAMBIOS (a veces la hoja se salta el encabezado "CAMBIOS:" y arranca
    // directo con las líneas "X POR Y" - las reconocemos igual por el patrón)
    while (i < rows.length && isBlankRow(rows[i])) i++;
    const cambiosCell = norm(rows[i]?.[2]);
    const tieneEncabezadoCambios = cambiosCell.toUpperCase().startsWith("CAMBIOS");
    const pareceLineaDeCambio = !tieneEncabezadoCambios && parseCambioLine(cambiosCell) !== null;
    if (tieneEncabezadoCambios || pareceLineaDeCambio) {
      const lines: string[] = [];
      if (tieneEncabezadoCambios) {
        const firstCell = cambiosCell.replace(/^CAMBIOS:?\s*/i, "").trim();
        if (firstCell) lines.push(firstCell);
        i++;
      }
      const bloqueCambios = leerBloque(rows, i);
      i = bloqueCambios.fin;
      for (const row of bloqueCambios.filas) {
        const cell = norm(row?.[2]);
        if (cell) lines.push(cell);
      }
      for (const line of lines) {
        if (NO_DATA_MARKERS.has(line.toUpperCase())) continue;
        const cambio = parseCambioLine(line);
        if (!cambio) {
          warnings.push(`${sheetName} partido ${parsedFecha.fecha.toISOString().slice(0, 10)}: no pude interpretar línea de CAMBIOS: "${line}"`);
          continue;
        }
        participaciones.push({
          jugadorRaw: cambio.entraRaw,
          rol: "SUPLENTE",
          numeroCamiseta: null,
          capitan: /©/.test(cambio.entraRaw),
          ingresoPorRaw: cambio.saleRaw.replace(/©/g, "").trim(),
        });
      }
    }

    // secciones de puntos / tarjetas
    const puntos: ParsedPuntuacion[] = [];
    const tarjetas: ParsedTarjeta[] = [];
    while (i < rows.length) {
      while (i < rows.length && isBlankRow(rows[i])) i++;
      const header = norm(rows[i]?.[2]).toUpperCase();
      if (!SECTION_HEADERS.has(header)) break;
      i++;
      const bloqueSeccion = leerBloque(rows, i);
      i = bloqueSeccion.fin;
      for (const row of bloqueSeccion.filas) {
        const jugadorCell = norm(row?.[2]);
        if (!jugadorCell || NO_DATA_MARKERS.has(jugadorCell.toUpperCase())) continue;
        const cantidadRaw = Number(row?.[1]);
        const cantidad = Number.isFinite(cantidadRaw) && cantidadRaw > 0 ? cantidadRaw : 1;

        if (header === "TRIES") puntos.push({ tipo: "TRY", jugadorRaw: jugadorCell, cantidad });
        else if (header === "CONVERSIONES") puntos.push({ tipo: "CONVERSION", jugadorRaw: jugadorCell, cantidad });
        else if (header === "PENALES") puntos.push({ tipo: "PENAL", jugadorRaw: jugadorCell, cantidad });
        else if (header === "DROPS") puntos.push({ tipo: "DROP", jugadorRaw: jugadorCell, cantidad });
        else if (header === "AMARILLAS") tarjetas.push({ tipo: "AMARILLA", jugadorRaw: jugadorCell });
        else if (header === "ROJA" || header === "ROJAS") tarjetas.push({ tipo: "ROJA", jugadorRaw: jugadorCell });
        else if (header === "TARJETAS") {
          const tipoCell = norm(row?.[3]).toUpperCase();
          tarjetas.push({ tipo: tipoCell.includes("ROJA") ? "ROJA" : "AMARILLA", jugadorRaw: jugadorCell });
        }
      }
    }

    partidos.push({
      temporada,
      fecha: parsedFecha.fecha,
      fechaNota: parsedFecha.nota,
      rivalRaw,
      condicion,
      resultadoPropio,
      resultadoRival,
      cancha,
      clima,
      campoDeJuego,
      referee,
      participaciones,
      puntos,
      tarjetas,
    });
  }

  return partidos;
}

// ---------- CAMADAS ----------

type CamadaEntry = { jugadorRaw: string; vicentinoN: number; camada: number };

function parseCamadas(rows: Row[]): CamadaEntry[] {
  const out: CamadaEntry[] = [];
  for (const row of rows) {
    const vicentinoN = Number(row?.[1]);
    const jugadorRaw = norm(row?.[2]);
    const camadaRaw = row?.[3];
    if (!Number.isInteger(vicentinoN) || vicentinoN <= 0 || !jugadorRaw) continue;
    const camada2 = norm(camadaRaw);
    if (!/^\d{1,2}$/.test(camada2)) continue;
    const n = Number(camada2);
    const camada = n >= 78 ? 1900 + n : 2000 + n;
    out.push({ jugadorRaw, vicentinoN, camada });
  }
  return out;
}

// ---------- main ----------

async function main() {
  const equiposMap = loadCsvMap(EQUIPOS_CSV);
  const jugadoresMap = loadCsvMap(JUGADORES_CSV);
  const resultadosCorrecciones = loadResultadosCorrecciones(RESULTADOS_CORRECCIONES_CSV);
  const condicionCorrecciones = loadCondicionCorrecciones(CONDICION_CORRECCIONES_CSV);
  const puntuacionCorrecciones = loadPuntuacionCorrecciones(PUNTUACION_CORRECCIONES_CSV);

  const unmapped: UnmappedRef[] = [];
  const canonClub = makeCanonicalizer(equiposMap, "club", unmapped);
  const canonJugador = makeCanonicalizer(jugadoresMap, "jugador", unmapped);

  const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  const warnings: string[] = [];

  const allPartidos: ParsedPartido[] = [];
  for (const fuente of FUENTES_CAMPANAS) {
    const wbFuente = fuente.path === EXCEL_PATH ? wb : XLSX.readFile(fuente.path, { cellDates: true });
    for (const sheetName of fuente.hojas) {
      const ws = wbFuente.Sheets[sheetName];
      if (!ws) {
        warnings.push(`No encontré la hoja "${sheetName}" en "${fuente.path}"`);
        continue;
      }
      const rows: Row[] = sheetToRows(ws);
      const partidos = parseCampana(sheetName, rows, warnings, resultadosCorrecciones, condicionCorrecciones);
      allPartidos.push(...partidos);
    }
  }

  const camadaRows: Row[] = sheetToRows(wb.Sheets[CAMADAS_SHEET]);
  const camadas = parseCamadas(camadaRows);

  // -------- pasada de validación: resuelve todos los nombres --------
  const clubCanonPorPartido = new Map<ParsedPartido, string>();
  for (const p of allPartidos) {
    const canon = canonClub(p.rivalRaw, `rival de partido ${p.fecha.toISOString().slice(0, 10)} (${p.temporada})`);
    if (canon) clubCanonPorPartido.set(p, canon);
  }

  const jugadorCanonCache = new Map<string, string | null>();
  function resolveJugador(raw: string, contexto: string): string | null {
    if (jugadorCanonCache.has(raw)) return jugadorCanonCache.get(raw)!;
    const canon = canonJugador(raw, contexto);
    jugadorCanonCache.set(raw, canon);
    return canon;
  }

  for (const p of allPartidos) {
    const ctx = `partido ${p.fecha.toISOString().slice(0, 10)} (${p.temporada}) vs ${p.rivalRaw}`;
    for (const part of p.participaciones) {
      resolveJugador(part.jugadorRaw, `${ctx} - formación/cambios`);
      if (part.ingresoPorRaw) resolveJugador(part.ingresoPorRaw, `${ctx} - a quién reemplazó`);
    }
    for (const pt of p.puntos) resolveJugador(pt.jugadorRaw, `${ctx} - puntos`);
    for (const t of p.tarjetas) resolveJugador(t.jugadorRaw, `${ctx} - tarjetas`);
  }
  for (const c of camadas) resolveJugador(c.jugadorRaw, "hoja CAMADAS");

  if (warnings.length) {
    console.log(`\n⚠️  ${warnings.length} advertencias de parseo (no bloquean, pero revisalas):`);
    for (const w of warnings) console.log("  -", w);
  }

  if (unmapped.length) {
    const uniq = new Map<string, UnmappedRef>();
    for (const u of unmapped) uniq.set(`${u.kind}:${u.raw}`, u);
    console.log(`\n❌ Encontré ${uniq.size} nombres que NO están en las tablas de equivalencia. No cargué nada en la base.`);
    console.log("Agregalos a equipos_canonicos.csv / jugadores_canonicos.csv y volvé a correr `npm run migrate:excel`.\n");
    for (const u of uniq.values()) {
      console.log(`  [${u.kind}] "${u.raw}"  (${u.contexto})`);
    }
    process.exit(1);
  }

  console.log(`Partidos parseados: ${allPartidos.length}. Sin nombres sin mapear. Sincronizando con la base...`);

  // -------- carga a la base: ADITIVA, nunca borra nada ----------
  // este script solo agrega lo que falta (partidos nuevos, jugadores/clubes
  // nuevos) y reutiliza lo que ya existe. Nunca hace deleteMany ni pisa un
  // partido ya cargado: si un partido ya existente necesita otro valor
  // (resultado, jugador de un try, etc.) eso se hace con las tablas de
  // correcciones + corrigiendo el registro puntual, no reimportando todo.
  const clubIds = new Map<string, number>();
  for (const c of await prisma.club.findMany({ select: { id: true, nombreCanonico: true } })) {
    clubIds.set(c.nombreCanonico, c.id);
  }
  async function getClubId(nombreCanonico: string): Promise<number> {
    const existente = clubIds.get(nombreCanonico);
    if (existente !== undefined) return existente;
    const club = await prisma.club.create({ data: { nombreCanonico } });
    clubIds.set(nombreCanonico, club.id);
    return club.id;
  }

  const jugadorIds = new Map<string, number>();
  for (const j of await prisma.jugador.findMany({ select: { id: true, nombreCanonico: true } })) {
    jugadorIds.set(j.nombreCanonico, j.id);
  }
  async function getJugadorId(nombreCanonico: string): Promise<number> {
    const existente = jugadorIds.get(nombreCanonico);
    if (existente !== undefined) return existente;
    const jugador = await prisma.jugador.create({
      data: {
        nombreCanonico,
        esJugadorReal: !PLACEHOLDER_JUGADORES.has(nombreCanonico),
      },
    });
    jugadorIds.set(nombreCanonico, jugador.id);
    return jugador.id;
  }

  // clave de partido ya cargado: temporada + fecha (día) + rival canónico.
  // cualquier partido parseado cuya clave ya exista en la base se saltea
  // entero (no se vuelve a tocar ni sus participaciones/puntos/tarjetas).
  function partidoKey(temporada: number, fechaIso: string, rivalCanon: string): string {
    return `${temporada}|${fechaIso}|${rivalCanon}`;
  }
  const partidosExistentes = new Set<string>();
  for (const p of await prisma.partido.findMany({
    select: { temporada: true, fecha: true, rival: { select: { nombreCanonico: true } } },
  })) {
    partidosExistentes.add(partidoKey(p.temporada, p.fecha.toISOString().slice(0, 10), p.rival.nombreCanonico));
  }

  // primero los jugadores con datos de CAMADAS (vicentino_n / camada)
  for (const c of camadas) {
    const canon = jugadorCanonCache.get(c.jugadorRaw)!;
    const id = await getJugadorId(canon);
    await prisma.jugador.update({
      where: { id },
      data: { vicentinoN: c.vicentinoN, camada: c.camada },
    });
  }

  // correcciones de camada confirmadas a mano (pisan lo que diga la hoja CAMADAS)
  const camadaCorrecciones = loadCamadaCorrecciones(CAMADAS_CORRECCIONES_CSV);
  for (const [nombreCanonico, camada] of camadaCorrecciones) {
    const id = await getJugadorId(nombreCanonico);
    await prisma.jugador.update({ where: { id }, data: { camada } });
  }

  let totalTries = 0;
  let nuevos = 0;
  let yaExistian = 0;

  for (const p of allPartidos) {
    const rivalCanon = clubCanonPorPartido.get(p)!;
    const fechaIso = p.fecha.toISOString().slice(0, 10);
    if (partidosExistentes.has(partidoKey(p.temporada, fechaIso, rivalCanon))) {
      yaExistian++;
      continue;
    }
    nuevos++;
    const rivalId = await getClubId(rivalCanon);

    const partido = await prisma.partido.create({
      data: {
        fecha: p.fecha,
        fechaNota: p.fechaNota,
        temporada: p.temporada,
        rivalId,
        condicion: p.condicion,
        resultadoPropio: p.resultadoPropio,
        resultadoRival: p.resultadoRival,
        cancha: p.cancha,
        clima: p.clima,
        campoDeJuego: p.campoDeJuego,
        referee: p.referee,
      },
    });

    // jugadores primero, para poder resolver ingresoPorId
    const jugadorIdPorPartido = new Map<string, number>();
    for (const part of p.participaciones) {
      const canon = jugadorCanonCache.get(part.jugadorRaw)!;
      const id = await getJugadorId(canon);
      jugadorIdPorPartido.set(part.jugadorRaw, id);
    }

    for (const part of p.participaciones) {
      const jugadorId = jugadorIdPorPartido.get(part.jugadorRaw)!;
      let ingresoPorId: number | null = null;
      if (part.ingresoPorRaw) {
        const canon = jugadorCanonCache.get(part.ingresoPorRaw)!;
        ingresoPorId = await getJugadorId(canon);
      }
      try {
        await prisma.participacion.create({
          data: {
            partidoId: partido.id,
            jugadorId,
            rol: part.rol,
            numeroCamiseta: part.numeroCamiseta,
            capitan: part.capitan,
            ingresoPorId,
          },
        });
      } catch {
        // jugador ya tiene participación en este partido (aparece 2 veces en cambios) - lo ignoramos
      }
    }

    for (const pt of p.puntos) {
      let canon = jugadorCanonCache.get(pt.jugadorRaw)!;
      const corregido = puntuacionCorrecciones.get(
        puntuacionCorreccionKey(p.temporada, p.fecha.toISOString().slice(0, 10), rivalCanon, pt.tipo, canon)
      );
      if (corregido && corregido !== canon) {
        console.log(
          `  ⚠️  ${p.temporada} ${p.fecha.toISOString().slice(0, 10)} vs ${rivalCanon}: ${pt.tipo} corregido a mano de "${canon}" a "${corregido}"`
        );
        canon = corregido;
      }
      const jugadorId = await getJugadorId(canon);
      await prisma.puntuacion.create({
        data: { partidoId: partido.id, jugadorId, tipo: pt.tipo, cantidad: pt.cantidad },
      });
      if (pt.tipo === "TRY") totalTries += pt.cantidad;
    }

    for (const t of p.tarjetas) {
      const canon = jugadorCanonCache.get(t.jugadorRaw)!;
      const jugadorId = await getJugadorId(canon);
      await prisma.tarjeta.create({ data: { partidoId: partido.id, jugadorId, tipo: t.tipo } });
    }
  }

  const numPartidos = await prisma.partido.count();
  const numJugadores = await prisma.jugador.count();
  const numJugadoresReales = await prisma.jugador.count({ where: { esJugadorReal: true } });
  const numClubes = await prisma.club.count();
  const triesAgg = await prisma.puntuacion.aggregate({ where: { tipo: "TRY" }, _sum: { cantidad: true } });
  const numTarjetasAmarillas = await prisma.tarjeta.count({ where: { tipo: "AMARILLA" } });
  const numTarjetasRojas = await prisma.tarjeta.count({ where: { tipo: "ROJA" } });

  const numTemporadasInfo = await seedTemporadasInfo(TEMPORADAS_INFO_CSV);

  console.log("\n✅ Sincronización completa (aditiva: nada se borró). Números de control:");
  console.log(`  Partidos nuevos agregados: ${nuevos}`);
  console.log(`  Partidos que ya existían (sin tocar): ${yaExistian}`);
  console.log(`  Partidos:            ${numPartidos}`);
  console.log(`  Clubes rivales:      ${numClubes}`);
  console.log(`  Jugadores (total):   ${numJugadores}`);
  console.log(`  Jugadores reales:    ${numJugadoresReales}`);
  console.log(`  Tries totales:       ${triesAgg._sum.cantidad}`);
  console.log(`  Tarjetas amarillas:  ${numTarjetasAmarillas}`);
  console.log(`  Tarjetas rojas:      ${numTarjetasRojas}`);
  console.log(`  Temporadas (info):   ${numTemporadasInfo}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
