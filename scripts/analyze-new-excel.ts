/**
 * Análisis de solo lectura: compara el excel nuevo que compartió el usuario
 * contra lo que YA está cargado en la base. No escribe nada en la base ni
 * en ningún CSV. Reutiliza el mismo parseo que migrate.ts (parseCampana,
 * parseCamadas, canonicalización, correcciones a mano) para que el diff sea
 * justo: solo muestra diferencias reales de contenido, no ruido de formato.
 */
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma";

const NUEVO_EXCEL_PATH = "/Users/ignacio.torres/Downloads/Estadísticas V 2026 1 (3).xlsx";

const EQUIPOS_CSV = fileURLToPath(new URL("../data/equipos_canonicos.csv", import.meta.url));
const JUGADORES_CSV = fileURLToPath(new URL("../data/jugadores_canonicos.csv", import.meta.url));
const CAMADAS_CORRECCIONES_CSV = fileURLToPath(new URL("../data/camadas_correcciones.csv", import.meta.url));
const RESULTADOS_CORRECCIONES_CSV = fileURLToPath(new URL("../data/resultados_correcciones.csv", import.meta.url));
const CONDICION_CORRECCIONES_CSV = fileURLToPath(new URL("../data/condicion_correcciones.csv", import.meta.url));
const PUNTUACION_CORRECCIONES_CSV = fileURLToPath(new URL("../data/puntuacion_correcciones.csv", import.meta.url));

const HOJAS_A_COMPARAR = [
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
  "CAMPAÑA 2026",
];
const CAMADAS_SHEET = "CAMADAS";

const PLACEHOLDER_JUGADORES = new Set(["PENAL", "SCRUM", "TRY PENAL", "TRY SCRUM", "REUBICACION GRUPO III"]);
const NO_DATA_MARKERS = new Set(["NO HUBO", "NINGUNA", "NINGUNO", "-", "SIN DATOS", "S/D"]);
const PUNTOS_POR_TIPO: Record<string, number> = { TRY: 5, CONVERSION: 2, PENAL: 3, DROP: 3 };

type Row = (string | number | Date | null)[];

function sheetToRows(ws: XLSX.WorkSheet): Row[] {
  const ref = ws["!ref"] ?? "A1";
  const decoded = XLSX.utils.decode_range(ref);
  decoded.s.r = 0;
  decoded.s.c = 0;
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, range: decoded }) as Row[];
}

type UnmappedRef = { kind: "club" | "jugador"; raw: string; contexto: string };

function norm(s: unknown): string {
  return String(s ?? "")
    .replace(/ /g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function loadCsvMap(path: string): Map<string, string> {
  const text = readFileSync(path, "utf-8");
  const lines = text.split(/\r?\n/).slice(1);
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
  const lines = text.split(/\r?\n/).slice(1);
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
  const lines = text.split(/\r?\n/).slice(1);
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

function condicionCorreccionKey(temporada: number, fechaIso: string, rival: string): string {
  return `${temporada}|${fechaIso}|${norm(rival)}`;
}
function loadCondicionCorrecciones(path: string): Map<string, "LOCAL" | "VISITANTE"> {
  const text = readFileSync(path, "utf-8");
  const lines = text.split(/\r?\n/).slice(1);
  const map = new Map<string, "LOCAL" | "VISITANTE">();
  for (const line of lines) {
    if (!line.trim()) continue;
    const [temporada, fecha, rival, condicion] = line.split(",");
    if (!temporada || !fecha || !rival) continue;
    map.set(condicionCorreccionKey(Number(temporada), norm(fecha), rival), norm(condicion) as "LOCAL" | "VISITANTE");
  }
  return map;
}

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
  const lines = text.split(/\r?\n/).slice(1);
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
    const raw = norm(rawInput).replace(/©/g, "").trim();
    if (!raw) return null;
    if (map.has(raw)) return map.get(raw)!;
    const stripped = norm(raw.replace(/\([^)]*\)\s*$/, ""));
    if (stripped && map.has(stripped)) return map.get(stripped)!;
    unmapped.push({ kind, raw, contexto });
    return null;
  };
}

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

const SECTION_HEADERS = new Set(["TRIES", "CONVERSIONES", "PENALES", "DROPS", "AMARILLAS", "ROJA", "ROJAS", "TARJETAS"]);

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
      warnings.push(`${sheetName}: no pude parsear la fecha cerca de la fila ${rIdx + 1}`);
      continue;
    }
    if (parsedFecha.fecha.getUTCFullYear() !== temporada) {
      parsedFecha.fecha = new Date(
        Date.UTC(temporada, parsedFecha.fecha.getUTCMonth(), parsedFecha.fecha.getUTCDate())
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
      warnings.push(`${sheetName} fila ${rIdx + 1}: ninguno es VICENTINOS`);
      continue;
    }

    const correccion = resultadosCorrecciones.get(
      resultadoCorreccionKey(temporada, parsedFecha.fecha.toISOString().slice(0, 10), rivalRaw)
    );
    if (correccion) {
      resultadoPropio = correccion.resultadoPropio;
      resultadoRival = correccion.resultadoRival;
    }

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
      warnings.push(`${sheetName} fila ${rIdx + 1}: no encontré FORMACION`);
      continue;
    }

    const condicionRaw = norm(cancha).replace(/\([^)]*\)\s*$/, "").trim().toUpperCase();
    let condicion: "LOCAL" | "VISITANTE" = condicionRaw === "VICENTINOS" ? "LOCAL" : "VISITANTE";
    const condicionCorregida = condicionCorrecciones.get(
      condicionCorreccionKey(temporada, parsedFecha.fecha.toISOString().slice(0, 10), rivalRaw)
    );
    if (condicionCorregida) condicion = condicionCorregida;

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
      participaciones.push({ jugadorRaw: nombreCell, rol: "TITULAR", numeroCamiseta: numero, capitan, ingresoPorRaw: null });
      i++;
    }

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
        if (!cambio) continue;
        participaciones.push({
          jugadorRaw: cambio.entraRaw,
          rol: "SUPLENTE",
          numeroCamiseta: null,
          capitan: /©/.test(cambio.entraRaw),
          ingresoPorRaw: cambio.saleRaw.replace(/©/g, "").trim(),
        });
      }
    }

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

// ---------- comparación ----------

function fechaIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function partidoKey(temporada: number, fecha: Date, rivalCanon: string): string {
  return `${temporada}|${fechaIso(fecha)}|${rivalCanon}`;
}

async function main() {
  const equiposMap = loadCsvMap(EQUIPOS_CSV);
  const jugadoresMap = loadCsvMap(JUGADORES_CSV);
  const resultadosCorrecciones = loadResultadosCorrecciones(RESULTADOS_CORRECCIONES_CSV);
  const condicionCorrecciones = loadCondicionCorrecciones(CONDICION_CORRECCIONES_CSV);
  const puntuacionCorrecciones = loadPuntuacionCorrecciones(PUNTUACION_CORRECCIONES_CSV);
  const camadaCorrecciones = loadCamadaCorrecciones(CAMADAS_CORRECCIONES_CSV);

  const unmapped: UnmappedRef[] = [];
  const canonClub = makeCanonicalizer(equiposMap, "club", unmapped);
  const canonJugador = makeCanonicalizer(jugadoresMap, "jugador", unmapped);

  const wb = XLSX.readFile(NUEVO_EXCEL_PATH, { cellDates: true });
  const warnings: string[] = [];

  const allPartidos: ParsedPartido[] = [];
  for (const sheetName of HOJAS_A_COMPARAR) {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      console.log(`⚠️  No encontré la hoja "${sheetName}" en el excel nuevo.`);
      continue;
    }
    const rows = sheetToRows(ws);
    allPartidos.push(...parseCampana(sheetName, rows, warnings, resultadosCorrecciones, condicionCorrecciones));
  }

  const camadaRows = sheetToRows(wb.Sheets[CAMADAS_SHEET]);
  const camadasNuevas = parseCamadas(camadaRows);

  // resolver nombres canónicos
  const clubCanonPorPartido = new Map<ParsedPartido, string>();
  for (const p of allPartidos) {
    const canon = canonClub(p.rivalRaw, `rival ${fechaIso(p.fecha)} (${p.temporada})`);
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
    const ctx = `partido ${fechaIso(p.fecha)} (${p.temporada}) vs ${p.rivalRaw}`;
    for (const part of p.participaciones) {
      resolveJugador(part.jugadorRaw, `${ctx} - formación/cambios`);
      if (part.ingresoPorRaw) resolveJugador(part.ingresoPorRaw, `${ctx} - a quién reemplazó`);
    }
    for (const pt of p.puntos) resolveJugador(pt.jugadorRaw, `${ctx} - puntos`);
    for (const t of p.tarjetas) resolveJugador(t.jugadorRaw, `${ctx} - tarjetas`);
  }
  for (const c of camadasNuevas) resolveJugador(c.jugadorRaw, "hoja CAMADAS");

  console.log("=".repeat(70));
  console.log("NOMBRES SIN MAPEAR EN EL EXCEL NUEVO");
  console.log("=".repeat(70));
  if (unmapped.length === 0) {
    console.log("Ninguno. Todos los nombres del excel nuevo ya están en las tablas de equivalencia.");
  } else {
    const uniq = new Map<string, UnmappedRef>();
    for (const u of unmapped) uniq.set(`${u.kind}:${u.raw}`, u);
    for (const u of uniq.values()) console.log(`  [${u.kind}] "${u.raw}"  (${u.contexto})`);
  }

  // -------- construir vista comparable del excel nuevo --------
  type PartidoComparable = {
    temporada: number;
    fecha: Date;
    rivalCanon: string;
    condicion: string;
    resultadoPropio: number;
    resultadoRival: number;
    cancha: string | null;
    clima: string | null;
    campoDeJuego: string | null;
    referee: string | null;
    fechaNota: string | null;
    roster: string; // string comparable: titulares/suplentes ordenados
    puntos: string; // string comparable: jugador|tipo|cantidad ordenado
    tarjetas: string; // string comparable: jugador|tipo ordenado
  };

  function rosterSignature(p: ParsedPartido): string {
    const items = p.participaciones.map((part) => {
      const canon = jugadorCanonCache.get(part.jugadorRaw) ?? part.jugadorRaw;
      return `${part.rol}:${canon}:${part.numeroCamiseta ?? "-"}:${part.capitan ? "C" : ""}`;
    });
    return items.sort().join(" | ");
  }

  function puntosSignature(p: ParsedPartido, rivalCanon: string): string {
    const agregados = new Map<string, number>();
    for (const pt of p.puntos) {
      let canon = jugadorCanonCache.get(pt.jugadorRaw) ?? pt.jugadorRaw;
      const corregido = puntuacionCorrecciones.get(
        puntuacionCorreccionKey(p.temporada, fechaIso(p.fecha), rivalCanon, pt.tipo, canon)
      );
      if (corregido) canon = corregido;
      const key = `${canon}|${pt.tipo}`;
      agregados.set(key, (agregados.get(key) ?? 0) + pt.cantidad);
    }
    return [...agregados.entries()]
      .map(([k, v]) => `${k}:${v}`)
      .sort()
      .join(" | ");
  }

  function tarjetasSignature(p: ParsedPartido): string {
    const items = p.tarjetas.map((t) => `${jugadorCanonCache.get(t.jugadorRaw) ?? t.jugadorRaw}:${t.tipo}`);
    return items.sort().join(" | ");
  }

  const nuevoPorKey = new Map<string, PartidoComparable & { raw: ParsedPartido }>();
  for (const p of allPartidos) {
    const rivalCanon = clubCanonPorPartido.get(p);
    if (!rivalCanon) continue; // sin canon, ya reportado arriba
    const key = partidoKey(p.temporada, p.fecha, rivalCanon);
    nuevoPorKey.set(key, {
      temporada: p.temporada,
      fecha: p.fecha,
      rivalCanon,
      condicion: p.condicion,
      resultadoPropio: p.resultadoPropio,
      resultadoRival: p.resultadoRival,
      cancha: p.cancha,
      clima: p.clima,
      campoDeJuego: p.campoDeJuego,
      referee: p.referee,
      fechaNota: p.fechaNota,
      roster: rosterSignature(p),
      puntos: puntosSignature(p, rivalCanon),
      tarjetas: tarjetasSignature(p),
      raw: p,
    });
  }

  // -------- vista comparable de lo que YA está en la base --------
  const temporadasSet = [...new Set(allPartidos.map((p) => p.temporada))];
  const partidosDb = await prisma.partido.findMany({
    where: { temporada: { in: temporadasSet } },
    select: {
      id: true,
      fecha: true,
      temporada: true,
      condicion: true,
      resultadoPropio: true,
      resultadoRival: true,
      cancha: true,
      clima: true,
      campoDeJuego: true,
      referee: true,
      fechaNota: true,
      rival: { select: { nombreCanonico: true } },
      participaciones: {
        select: {
          rol: true,
          numeroCamiseta: true,
          capitan: true,
          jugador: { select: { nombreCanonico: true } },
        },
      },
      puntos: { select: { tipo: true, cantidad: true, jugador: { select: { nombreCanonico: true } } } },
      tarjetas: { select: { tipo: true, jugador: { select: { nombreCanonico: true } } } },
    },
  });

  const dbPorKey = new Map<string, (typeof partidosDb)[number]>();
  for (const p of partidosDb) {
    dbPorKey.set(partidoKey(p.temporada, p.fecha, p.rival.nombreCanonico), p);
  }

  function rosterSignatureDb(p: (typeof partidosDb)[number]): string {
    return p.participaciones
      .map((part) => `${part.rol}:${part.jugador.nombreCanonico}:${part.numeroCamiseta ?? "-"}:${part.capitan ? "C" : ""}`)
      .sort()
      .join(" | ");
  }
  function puntosSignatureDb(p: (typeof partidosDb)[number]): string {
    const agregados = new Map<string, number>();
    for (const pt of p.puntos) {
      const key = `${pt.jugador.nombreCanonico}|${pt.tipo}`;
      agregados.set(key, (agregados.get(key) ?? 0) + pt.cantidad);
    }
    return [...agregados.entries()]
      .map(([k, v]) => `${k}:${v}`)
      .sort()
      .join(" | ");
  }
  function tarjetasSignatureDb(p: (typeof partidosDb)[number]): string {
    return p.tarjetas.map((t) => `${t.jugador.nombreCanonico}:${t.tipo}`).sort().join(" | ");
  }

  const soloEnNuevo: string[] = [];
  const soloEnDb: string[] = [];
  const diferentes: { key: string; cambios: string[] }[] = [];

  for (const [key, nuevo] of nuevoPorKey) {
    const db = dbPorKey.get(key);
    if (!db) {
      soloEnNuevo.push(key);
      continue;
    }
    const cambios: string[] = [];
    if (nuevo.resultadoPropio !== db.resultadoPropio || nuevo.resultadoRival !== db.resultadoRival) {
      cambios.push(`resultado: ${db.resultadoPropio}-${db.resultadoRival} -> ${nuevo.resultadoPropio}-${nuevo.resultadoRival}`);
    }
    if (nuevo.condicion !== db.condicion) cambios.push(`condición: ${db.condicion} -> ${nuevo.condicion}`);
    if ((nuevo.cancha ?? null) !== (db.cancha ?? null)) cambios.push(`cancha: "${db.cancha}" -> "${nuevo.cancha}"`);
    if ((nuevo.clima ?? null) !== (db.clima ?? null)) cambios.push(`clima: "${db.clima}" -> "${nuevo.clima}"`);
    if ((nuevo.campoDeJuego ?? null) !== (db.campoDeJuego ?? null))
      cambios.push(`campo de juego: "${db.campoDeJuego}" -> "${nuevo.campoDeJuego}"`);
    if ((nuevo.referee ?? null) !== (db.referee ?? null)) cambios.push(`referee: "${db.referee}" -> "${nuevo.referee}"`);
    if ((nuevo.fechaNota ?? null) !== (db.fechaNota ?? null))
      cambios.push(`nota de fecha: "${db.fechaNota}" -> "${nuevo.fechaNota}"`);
    if (nuevo.roster !== rosterSignatureDb(db)) cambios.push(`formación/cambios distintos`);
    if (nuevo.puntos !== puntosSignatureDb(db)) cambios.push(`puntos distintos`);
    if (nuevo.tarjetas !== tarjetasSignatureDb(db)) cambios.push(`tarjetas distintas`);
    if (cambios.length > 0) diferentes.push({ key, cambios });
  }
  for (const key of dbPorKey.keys()) {
    if (!nuevoPorKey.has(key)) soloEnDb.push(key);
  }

  console.log("\n" + "=".repeat(70));
  console.log(`PARTIDOS NUEVOS (están en el excel nuevo, NO en la base): ${soloEnNuevo.length}`);
  console.log("=".repeat(70));
  for (const key of soloEnNuevo.sort()) {
    const p = nuevoPorKey.get(key)!;
    console.log(
      `  ${key} · ${p.condicion} · ${p.resultadoPropio}-${p.resultadoRival} · ${p.raw.participaciones.length} jugadores`
    );
  }

  console.log("\n" + "=".repeat(70));
  console.log(`PARTIDOS QUE ESTÁN EN LA BASE PERO NO EN EL EXCEL NUEVO: ${soloEnDb.length}`);
  console.log("=".repeat(70));
  for (const key of soloEnDb.sort()) console.log(`  ${key}`);

  console.log("\n" + "=".repeat(70));
  console.log(`PARTIDOS CON DIFERENCIAS DE CONTENIDO: ${diferentes.length}`);
  console.log("=".repeat(70));
  for (const d of diferentes.sort((a, b) => a.key.localeCompare(b.key))) {
    console.log(`  ${d.key}`);
    for (const c of d.cambios) console.log(`      - ${c}`);
  }

  // -------- CAMADAS --------
  const jugadoresDb = await prisma.jugador.findMany({
    where: { esJugadorReal: true },
    select: { nombreCanonico: true, camada: true, vicentinoN: true },
  });
  const dbPorNombre = new Map(jugadoresDb.map((j) => [j.nombreCanonico, j]));

  console.log("\n" + "=".repeat(70));
  console.log("CAMADAS: diferencias entre la hoja CAMADAS nueva y la base actual");
  console.log("=".repeat(70));
  let sinCambiosCamadas = true;
  for (const c of camadasNuevas) {
    const canon = jugadorCanonCache.get(c.jugadorRaw);
    if (!canon) continue;
    const actual = dbPorNombre.get(canon);
    const tieneCorreccionManual = camadaCorrecciones.has(canon);
    if (!actual) {
      console.log(`  [NUEVO] ${canon}: vicentinoN=${c.vicentinoN}, camada=${c.camada} (no existía como jugador real)`);
      sinCambiosCamadas = false;
      continue;
    }
    const cambioCamada = actual.camada !== c.camada;
    const cambioVicentino = actual.vicentinoN !== c.vicentinoN;
    if (cambioCamada || cambioVicentino) {
      sinCambiosCamadas = false;
      const nota = tieneCorreccionManual ? " (⚠ tiene una corrección manual en camadas_correcciones.csv, revisar si sigue aplicando)" : "";
      console.log(
        `  ${canon}: camada ${actual.camada ?? "-"} -> ${c.camada}, vicentinoN ${actual.vicentinoN ?? "-"} -> ${c.vicentinoN}${nota}`
      );
    }
  }
  if (sinCambiosCamadas) console.log("Sin diferencias en la hoja CAMADAS.");

  console.log("\n" + "=".repeat(70));
  console.log("RESUMEN");
  console.log("=".repeat(70));
  console.log(`Partidos parseados del excel nuevo (hojas comparadas): ${allPartidos.length}`);
  console.log(`Nombres sin mapear: ${unmapped.length}`);
  console.log(`Partidos nuevos: ${soloEnNuevo.length}`);
  console.log(`Partidos solo en la base (no están en el excel nuevo): ${soloEnDb.length}`);
  console.log(`Partidos con diferencias de contenido: ${diferentes.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
