import { prisma } from "./prisma";

// puntos por tipo, validado contra las hojas SCORERS del excel original
const PUNTOS_POR_TIPO: Record<string, number> = {
  TRY: 5,
  CONVERSION: 2,
  PENAL: 3,
  DROP: 3,
};

// deriva la instancia de playoff (semifinal/final) a partir de la nota de
// fecha del partido, ej. "20/11/2021 SEMIFINAL" o "27/11/2021 FINAL - ...".
// el orden importa: "SEMIFINAL" contiene "FINAL" como substring.
export function etapaPartido(fechaNota: string | null): "Semifinal" | "Final" | null {
  if (!fechaNota) return null;
  const nota = fechaNota.toUpperCase();
  if (nota.includes("SEMIFINAL")) return "Semifinal";
  if (nota.includes("FINAL")) return "Final";
  return null;
}

export type FilaRankingPuntos = {
  jugadorId: number;
  nombre: string;
  tries: number;
  conversiones: number;
  penales: number;
  drops: number;
  puntos: number;
};

export async function getTemporadasDisponibles(): Promise<number[]> {
  const partidos = await prisma.partido.findMany({
    select: { temporada: true },
    distinct: ["temporada"],
    orderBy: { temporada: "desc" },
  });
  return partidos.map((p) => p.temporada);
}

export async function getRankingPuntos(temporada?: number): Promise<FilaRankingPuntos[]> {
  const grupos = await prisma.puntuacion.groupBy({
    by: ["jugadorId", "tipo"],
    where: {
      jugador: { esJugadorReal: true },
      ...(temporada ? { partido: { temporada } } : {}),
    },
    _sum: { cantidad: true },
  });

  const porJugador = new Map<number, { tries: number; conversiones: number; penales: number; drops: number }>();
  for (const g of grupos) {
    const cantidad = g._sum.cantidad ?? 0;
    const actual = porJugador.get(g.jugadorId) ?? { tries: 0, conversiones: 0, penales: 0, drops: 0 };
    if (g.tipo === "TRY") actual.tries += cantidad;
    else if (g.tipo === "CONVERSION") actual.conversiones += cantidad;
    else if (g.tipo === "PENAL") actual.penales += cantidad;
    else if (g.tipo === "DROP") actual.drops += cantidad;
    porJugador.set(g.jugadorId, actual);
  }

  const jugadorIds = [...porJugador.keys()];
  const jugadores = await prisma.jugador.findMany({
    where: { id: { in: jugadorIds } },
    select: { id: true, nombreCanonico: true },
  });
  const nombrePorId = new Map(jugadores.map((j) => [j.id, j.nombreCanonico]));

  const filas: FilaRankingPuntos[] = jugadorIds.map((id) => {
    const stats = porJugador.get(id)!;
    const puntos =
      stats.tries * PUNTOS_POR_TIPO.TRY +
      stats.conversiones * PUNTOS_POR_TIPO.CONVERSION +
      stats.penales * PUNTOS_POR_TIPO.PENAL +
      stats.drops * PUNTOS_POR_TIPO.DROP;
    return {
      jugadorId: id,
      nombre: nombrePorId.get(id) ?? "?",
      tries: stats.tries,
      conversiones: stats.conversiones,
      penales: stats.penales,
      drops: stats.drops,
      puntos,
    };
  });

  filas.sort((a, b) => b.puntos - a.puntos || b.tries - a.tries || a.nombre.localeCompare(b.nombre));
  return filas;
}

function calcularPuntos(stats: { tries: number; conversiones: number; penales: number; drops: number }): number {
  return (
    stats.tries * PUNTOS_POR_TIPO.TRY +
    stats.conversiones * PUNTOS_POR_TIPO.CONVERSION +
    stats.penales * PUNTOS_POR_TIPO.PENAL +
    stats.drops * PUNTOS_POR_TIPO.DROP
  );
}

export type Badge = { texto: string; destacado: boolean };

// ranking por competición: valores iguales comparten posición (1,1,3,4...)
function rankDesc(entries: { jugadorId: number; value: number }[]): Map<number, number> {
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const ranks = new Map<number, number>();
  let rank = 0;
  let prevValue: number | null = null;
  let seen = 0;
  for (const e of sorted) {
    seen++;
    if (e.value !== prevValue) {
      rank = seen;
      prevValue = e.value;
    }
    ranks.set(e.jugadorId, rank);
  }
  return ranks;
}

function badgeCarrera(rank: number | undefined, value: number, etiquetaRecord: string): Badge | null {
  if (!rank || rank > 10 || value <= 0) return null;
  if (rank === 1) return { texto: etiquetaRecord, destacado: true };
  return { texto: `Top ${rank}`, destacado: false };
}

type RankingsHistoricos = {
  triesRank: Map<number, number>;
  puntosRank: Map<number, number>;
  capsTitularRank: Map<number, number>;
  capsTotalRank: Map<number, number>;
};

async function getRankingsHistoricos(): Promise<RankingsHistoricos> {
  const [filasPuntos, capsRows, filasPresencias] = await Promise.all([
    getRankingPuntos(),
    prisma.participacion.groupBy({
      by: ["jugadorId"],
      where: { rol: "TITULAR", jugador: { esJugadorReal: true } },
      _count: { _all: true },
    }),
    getRankingPresencias(),
  ]);

  return {
    triesRank: rankDesc(filasPuntos.map((f) => ({ jugadorId: f.jugadorId, value: f.tries }))),
    puntosRank: rankDesc(filasPuntos.map((f) => ({ jugadorId: f.jugadorId, value: f.puntos }))),
    capsTitularRank: rankDesc(capsRows.map((r) => ({ jugadorId: r.jugadorId, value: r._count._all }))),
    capsTotalRank: rankDesc(filasPresencias.map((f) => ({ jugadorId: f.jugadorId, value: f.total }))),
  };
}

type StatsJugadorTemporada = { presencias: number; tries: number; puntos: number };
type StatsTemporadaGlobal = { totalPartidos: number; porJugador: Map<number, StatsJugadorTemporada> };

async function getStatsGlobalesPorTemporada(): Promise<Map<number, StatsTemporadaGlobal>> {
  const [partidosPorTemporada, participaciones, puntuaciones] = await Promise.all([
    prisma.partido.groupBy({ by: ["temporada"], _count: { _all: true } }),
    prisma.participacion.findMany({
      where: { jugador: { esJugadorReal: true } },
      select: { jugadorId: true, partido: { select: { temporada: true } } },
    }),
    prisma.puntuacion.findMany({
      where: { jugador: { esJugadorReal: true } },
      select: { jugadorId: true, tipo: true, cantidad: true, partido: { select: { temporada: true } } },
    }),
  ]);

  const result = new Map<number, StatsTemporadaGlobal>();
  for (const row of partidosPorTemporada) {
    result.set(row.temporada, { totalPartidos: row._count._all, porJugador: new Map() });
  }
  function bucket(temporada: number, jugadorId: number): StatsJugadorTemporada {
    let entry = result.get(temporada);
    if (!entry) {
      entry = { totalPartidos: 0, porJugador: new Map() };
      result.set(temporada, entry);
    }
    let stats = entry.porJugador.get(jugadorId);
    if (!stats) {
      stats = { presencias: 0, tries: 0, puntos: 0 };
      entry.porJugador.set(jugadorId, stats);
    }
    return stats;
  }
  for (const p of participaciones) {
    bucket(p.partido.temporada, p.jugadorId).presencias++;
  }
  for (const row of puntuaciones) {
    const stats = bucket(row.partido.temporada, row.jugadorId);
    if (row.tipo === "TRY") stats.tries += row.cantidad;
    stats.puntos += (PUNTOS_POR_TIPO[row.tipo] ?? 0) * row.cantidad;
  }
  return result;
}

function ranksParaTemporada(entry: StatsTemporadaGlobal) {
  const items = [...entry.porJugador.entries()];
  return {
    triesRank: rankDesc(items.map(([jugadorId, s]) => ({ jugadorId, value: s.tries }))),
    puntosRank: rankDesc(items.map(([jugadorId, s]) => ({ jugadorId, value: s.puntos }))),
    presenciasRank: rankDesc(items.map(([jugadorId, s]) => ({ jugadorId, value: s.presencias }))),
  };
}

export type BadgesTemporada = {
  presencias: Badge[];
  tries: Badge[];
  puntos: Badge[];
};

function badgesTemporadaJugador(params: {
  presencias: number;
  tries: number;
  puntos: number;
  totalPartidos: number;
  presenciasRank: number | undefined;
  triesRank: number | undefined;
  puntosRank: number | undefined;
}): BadgesTemporada {
  const presencias: Badge[] = [];
  const tries: Badge[] = [];
  const puntos: Badge[] = [];
  const presenciaPerfecta = params.presencias > 0 && params.presencias === params.totalPartidos;
  if (presenciaPerfecta) {
    presencias.push({ texto: "Presencia perfecta", destacado: true });
  }
  if (params.tries > 0 && params.triesRank) {
    if (params.triesRank === 1) tries.push({ texto: "Tryman", destacado: true });
    else if (params.triesRank <= 3) tries.push({ texto: `Top ${params.triesRank} tries`, destacado: false });
  }
  if (params.puntos > 0 && params.puntosRank) {
    if (params.puntosRank === 1) puntos.push({ texto: "Máximo goleador", destacado: true });
    else if (params.puntosRank <= 3) puntos.push({ texto: `Top ${params.puntosRank} puntos`, destacado: false });
  }
  if (
    params.presencias > 0 &&
    params.presenciasRank &&
    params.presenciasRank <= 3 &&
    !(presenciaPerfecta && params.presenciasRank === 1)
  ) {
    presencias.push({ texto: `Top ${params.presenciasRank} presencias`, destacado: false });
  }
  return { presencias, tries, puntos };
}

export type FilaJugadorCompleta = {
  id: number;
  nombre: string;
  camada: number | null;
  partidosJugados: number;
  titular: number;
  suplente: number;
  tries: number;
  puntos: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  primeraTemporada: number | null;
  ultimaTemporada: number | null;
  activo: boolean;
  titulos: number;
};

// ficha completa por jugador para el listado de /jugadores: partidos,
// titular/suplente, tries, puntos y tarjetas, todo opcionalmente acotado a
// una temporada. "activo" y "titulos" siempre se calculan sobre la carrera
// completa del jugador, sin importar el filtro de temporada.
export async function getListaJugadoresCompleta(temporada?: number): Promise<FilaJugadorCompleta[]> {
  const [jugadores, participaciones, puntuaciones, tarjetas, temporadasInfo, temporadaActual] = await Promise.all([
    prisma.jugador.findMany({
      where: { esJugadorReal: true },
      select: { id: true, nombreCanonico: true, camada: true },
    }),
    prisma.participacion.findMany({
      where: { jugador: { esJugadorReal: true } },
      select: { jugadorId: true, rol: true, partido: { select: { temporada: true } } },
    }),
    prisma.puntuacion.groupBy({
      by: ["jugadorId", "tipo"],
      where: { jugador: { esJugadorReal: true }, ...(temporada ? { partido: { temporada } } : {}) },
      _sum: { cantidad: true },
    }),
    prisma.tarjeta.findMany({
      where: { jugador: { esJugadorReal: true }, ...(temporada ? { partido: { temporada } } : {}) },
      select: { jugadorId: true, tipo: true },
    }),
    getTemporadasInfo(),
    getTemporadaActual(),
  ]);

  const temporadasCampeon = new Set(
    [...temporadasInfo.values()].filter((i) => i.campeon).map((i) => i.temporada)
  );

  const porJugador = new Map<number, { titular: number; suplente: number; temporadas: Set<number> }>();
  for (const p of participaciones) {
    const acc = porJugador.get(p.jugadorId) ?? { titular: 0, suplente: 0, temporadas: new Set<number>() };
    if (!temporada || p.partido.temporada === temporada) {
      if (p.rol === "TITULAR") acc.titular++;
      else acc.suplente++;
    }
    acc.temporadas.add(p.partido.temporada);
    porJugador.set(p.jugadorId, acc);
  }

  const puntosPorJugador = new Map<number, number>();
  const triesPorJugador = new Map<number, number>();
  for (const g of puntuaciones) {
    const cantidad = g._sum.cantidad ?? 0;
    puntosPorJugador.set(g.jugadorId, (puntosPorJugador.get(g.jugadorId) ?? 0) + cantidad * (PUNTOS_POR_TIPO[g.tipo] ?? 0));
    if (g.tipo === "TRY") triesPorJugador.set(g.jugadorId, (triesPorJugador.get(g.jugadorId) ?? 0) + cantidad);
  }

  const tarjetasPorJugador = new Map<number, { amarillas: number; rojas: number }>();
  for (const t of tarjetas) {
    const acc = tarjetasPorJugador.get(t.jugadorId) ?? { amarillas: 0, rojas: 0 };
    if (t.tipo === "AMARILLA") acc.amarillas++;
    else acc.rojas++;
    tarjetasPorJugador.set(t.jugadorId, acc);
  }

  const filas: FilaJugadorCompleta[] = [];
  for (const j of jugadores) {
    const acc = porJugador.get(j.id);
    if (temporada && !acc?.temporadas.has(temporada)) continue;
    const temporadasJugadas = acc ? [...acc.temporadas].sort((a, b) => a - b) : [];
    filas.push({
      id: j.id,
      nombre: j.nombreCanonico,
      camada: j.camada,
      partidosJugados: (acc?.titular ?? 0) + (acc?.suplente ?? 0),
      titular: acc?.titular ?? 0,
      suplente: acc?.suplente ?? 0,
      tries: triesPorJugador.get(j.id) ?? 0,
      puntos: puntosPorJugador.get(j.id) ?? 0,
      tarjetasAmarillas: tarjetasPorJugador.get(j.id)?.amarillas ?? 0,
      tarjetasRojas: tarjetasPorJugador.get(j.id)?.rojas ?? 0,
      primeraTemporada: temporadasJugadas[0] ?? null,
      ultimaTemporada: temporadasJugadas[temporadasJugadas.length - 1] ?? null,
      activo: temporadaActual != null && temporadasJugadas.includes(temporadaActual),
      titulos: temporadasJugadas.filter((t) => temporadasCampeon.has(t)).length,
    });
  }
  return filas;
}

// fecha del debut (primera titularidad) de cada jugador de una camada, para
// la columna "Debut" del detalle de camada.
export async function getFechasDebutPorCamada(camada: number): Promise<Map<number, Date>> {
  const participaciones = await prisma.participacion.findMany({
    where: { rol: "TITULAR", jugador: { esJugadorReal: true, camada } },
    select: { jugadorId: true, partido: { select: { fecha: true } } },
  });
  const debuts = new Map<number, Date>();
  for (const p of participaciones) {
    const actual = debuts.get(p.jugadorId);
    if (!actual || p.partido.fecha < actual) debuts.set(p.jugadorId, p.partido.fecha);
  }
  return debuts;
}

export type PerfilJugador = {
  id: number;
  nombre: string;
  camada: number | null;
  vicentinoN: number | null;
  fechaDebut: Date | null;
  capsTitular: number;
  capsSuplente: number;
  capsTotal: number;
  tries: number;
  conversiones: number;
  penales: number;
  drops: number;
  puntos: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  partidosComoCapitan: number;
  historialVsRivales: FilaHistorialRival[];
  triesPorTemporada: FilaTriesTemporada[];
  posiciones: FilaPosicion[];
  logros: LogroJugador[];
  badgeTries: Badge | null;
  badgePuntos: Badge | null;
  badgeCapsTitular: Badge | null;
  capsTotalRank: number | undefined;
  triesRank: number | undefined;
  puntosRank: number | undefined;
};

export type FilaHistorialRival = {
  clubId: number;
  club: string;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  tries: number;
};

export async function getJugadorPerfil(jugadorId: number): Promise<PerfilJugador | null> {
  const jugador = await prisma.jugador.findUnique({
    where: { id: jugadorId },
    select: { id: true, nombreCanonico: true, camada: true, vicentinoN: true },
  });
  if (!jugador) return null;

  const participaciones = await prisma.participacion.findMany({
    where: { jugadorId },
    select: {
      rol: true,
      capitan: true,
      partido: {
        select: {
          fecha: true,
          resultadoPropio: true,
          resultadoRival: true,
          rival: { select: { id: true, nombreCanonico: true } },
        },
      },
    },
  });

  const capsTitular = participaciones.filter((p) => p.rol === "TITULAR").length;
  const capsSuplente = participaciones.filter((p) => p.rol === "SUPLENTE").length;
  const partidosComoCapitan = participaciones.filter((p) => p.capitan).length;
  // el debut cuenta el primer partido como titular; no cuenta un ingreso como suplente
  const participacionesTitular = participaciones.filter((p) => p.rol === "TITULAR");
  const fechaDebut =
    participacionesTitular.length > 0
      ? participacionesTitular.reduce(
          (min, p) => (p.partido.fecha < min ? p.partido.fecha : min),
          participacionesTitular[0].partido.fecha
        )
      : null;

  const porRival = new Map<string, FilaHistorialRival>();
  for (const p of participaciones) {
    const club = p.partido.rival.nombreCanonico;
    const fila = porRival.get(club) ?? {
      clubId: p.partido.rival.id,
      club,
      partidosJugados: 0,
      ganados: 0,
      empatados: 0,
      perdidos: 0,
      tries: 0,
    };
    fila.partidosJugados++;
    if (p.partido.resultadoPropio > p.partido.resultadoRival) fila.ganados++;
    else if (p.partido.resultadoPropio < p.partido.resultadoRival) fila.perdidos++;
    else fila.empatados++;
    porRival.set(club, fila);
  }

  const puntosRows = await prisma.puntuacion.findMany({
    where: { jugadorId },
    select: { tipo: true, cantidad: true, partido: { select: { rival: { select: { nombreCanonico: true } } } } },
  });

  const stats = { tries: 0, conversiones: 0, penales: 0, drops: 0 };
  for (const row of puntosRows) {
    if (row.tipo === "TRY") {
      stats.tries += row.cantidad;
      const club = row.partido.rival.nombreCanonico;
      const fila = porRival.get(club);
      if (fila) fila.tries += row.cantidad;
    } else if (row.tipo === "CONVERSION") stats.conversiones += row.cantidad;
    else if (row.tipo === "PENAL") stats.penales += row.cantidad;
    else if (row.tipo === "DROP") stats.drops += row.cantidad;
  }

  const tarjetas = await prisma.tarjeta.findMany({ where: { jugadorId }, select: { tipo: true } });
  const tarjetasAmarillas = tarjetas.filter((t) => t.tipo === "AMARILLA").length;
  const tarjetasRojas = tarjetas.filter((t) => t.tipo === "ROJA").length;

  const historialVsRivales = [...porRival.values()].sort(
    (a, b) => b.partidosJugados - a.partidosJugados || a.club.localeCompare(b.club)
  );

  const triesPorTemporada = await getTriesPorTemporada(jugadorId);
  const puntos = calcularPuntos(stats);

  const [rankingsHistoricos, statsGlobalesPorTemporada, posiciones, logros] = await Promise.all([
    getRankingsHistoricos(),
    getStatsGlobalesPorTemporada(),
    getPosicionesJugador(jugadorId),
    getLogrosJugador(jugadorId),
  ]);

  for (const fila of triesPorTemporada) {
    const entry = statsGlobalesPorTemporada.get(fila.temporada);
    if (!entry) {
      fila.badges = { presencias: [], tries: [], puntos: [] };
      continue;
    }
    const { triesRank, puntosRank, presenciasRank } = ranksParaTemporada(entry);
    const misStats = entry.porJugador.get(jugadorId);
    fila.badges = badgesTemporadaJugador({
      presencias: fila.presencias,
      tries: fila.tries,
      puntos: misStats?.puntos ?? 0,
      totalPartidos: entry.totalPartidos,
      presenciasRank: presenciasRank.get(jugadorId),
      triesRank: triesRank.get(jugadorId),
      puntosRank: puntosRank.get(jugadorId),
    });
  }

  return {
    id: jugador.id,
    nombre: jugador.nombreCanonico,
    camada: jugador.camada,
    vicentinoN: jugador.vicentinoN,
    fechaDebut,
    capsTitular,
    capsSuplente,
    capsTotal: participaciones.length,
    ...stats,
    puntos,
    tarjetasAmarillas,
    tarjetasRojas,
    partidosComoCapitan,
    historialVsRivales,
    triesPorTemporada,
    posiciones,
    logros,
    badgeTries: badgeCarrera(rankingsHistoricos.triesRank.get(jugadorId), stats.tries, "Máximo try-scorer histórico"),
    badgePuntos: badgeCarrera(rankingsHistoricos.puntosRank.get(jugadorId), puntos, "Máximo goleador histórico"),
    badgeCapsTitular: badgeCarrera(
      rankingsHistoricos.capsTitularRank.get(jugadorId),
      capsTitular,
      "Jugador con más presencias histórico"
    ),
    capsTotalRank: rankingsHistoricos.capsTotalRank.get(jugadorId),
    triesRank: rankingsHistoricos.triesRank.get(jugadorId),
    puntosRank: rankingsHistoricos.puntosRank.get(jugadorId),
  };
}

export type FilaPartidoJugador = {
  numero: number;
  fecha: Date;
  rival: string;
  rivalId: number;
  condicion: string;
  temporada: number;
  etapa: "Semifinal" | "Final" | null;
  puntos: number;
  tries: number;
  conversiones: number;
  penales: number;
  drops: number;
  tarjetas: string[];
  rol: string;
  resultadoPropio: number;
  resultadoRival: number;
};

async function getPartidosJugador(jugadorId: number): Promise<FilaPartidoJugador[]> {
  const [participaciones, puntosRows, tarjetasRows] = await Promise.all([
    prisma.participacion.findMany({
      where: { jugadorId },
      select: {
        partidoId: true,
        rol: true,
        partido: {
          select: {
            fecha: true,
            fechaNota: true,
            condicion: true,
            temporada: true,
            resultadoPropio: true,
            resultadoRival: true,
            rival: { select: { id: true, nombreCanonico: true } },
          },
        },
      },
    }),
    prisma.puntuacion.findMany({
      where: { jugadorId },
      select: { tipo: true, cantidad: true, partidoId: true },
    }),
    prisma.tarjeta.findMany({
      where: { jugadorId },
      select: { tipo: true, partidoId: true },
    }),
  ]);

  // el excel a veces registra los puntos de un mismo tipo de un mismo
  // jugador en un mismo partido como varias filas en vez de una sola.
  function sumar(map: Map<number, number>, key: number, cantidad: number) {
    map.set(key, (map.get(key) ?? 0) + cantidad);
  }
  const triesPorPartido = new Map<number, number>();
  const conversionesPorPartido = new Map<number, number>();
  const penalesPorPartido = new Map<number, number>();
  const dropsPorPartido = new Map<number, number>();
  const puntosPorPartido = new Map<number, number>();
  for (const pt of puntosRows) {
    if (pt.tipo === "TRY") sumar(triesPorPartido, pt.partidoId, pt.cantidad);
    else if (pt.tipo === "CONVERSION") sumar(conversionesPorPartido, pt.partidoId, pt.cantidad);
    else if (pt.tipo === "PENAL") sumar(penalesPorPartido, pt.partidoId, pt.cantidad);
    else if (pt.tipo === "DROP") sumar(dropsPorPartido, pt.partidoId, pt.cantidad);
    sumar(puntosPorPartido, pt.partidoId, (PUNTOS_POR_TIPO[pt.tipo] ?? 0) * pt.cantidad);
  }
  const tarjetasPorPartido = new Map<number, string[]>();
  for (const t of tarjetasRows) {
    const lista = tarjetasPorPartido.get(t.partidoId) ?? [];
    lista.push(t.tipo);
    tarjetasPorPartido.set(t.partidoId, lista);
  }

  // número de "fecha" del campeonato: orden cronológico de TODOS los partidos
  // de cada temporada (no solo los del jugador), igual que en /temporadas/[year].
  const temporadas = [...new Set(participaciones.map((p) => p.partido.temporada))];
  const partidosDeEsasTemporadas = await prisma.partido.findMany({
    where: { temporada: { in: temporadas } },
    orderBy: { fecha: "asc" },
    select: { id: true, temporada: true },
  });
  const numeroPorPartido = new Map<number, number>();
  const contadorPorTemporada = new Map<number, number>();
  for (const p of partidosDeEsasTemporadas) {
    const n = (contadorPorTemporada.get(p.temporada) ?? 0) + 1;
    contadorPorTemporada.set(p.temporada, n);
    numeroPorPartido.set(p.id, n);
  }

  return participaciones
    .map((p) => ({
      numero: numeroPorPartido.get(p.partidoId) ?? 0,
      fecha: p.partido.fecha,
      rival: p.partido.rival.nombreCanonico,
      rivalId: p.partido.rival.id,
      condicion: p.partido.condicion,
      temporada: p.partido.temporada,
      etapa: etapaPartido(p.partido.fechaNota),
      puntos: puntosPorPartido.get(p.partidoId) ?? 0,
      tries: triesPorPartido.get(p.partidoId) ?? 0,
      conversiones: conversionesPorPartido.get(p.partidoId) ?? 0,
      penales: penalesPorPartido.get(p.partidoId) ?? 0,
      drops: dropsPorPartido.get(p.partidoId) ?? 0,
      tarjetas: tarjetasPorPartido.get(p.partidoId) ?? [],
      rol: p.rol,
      resultadoPropio: p.partido.resultadoPropio,
      resultadoRival: p.partido.resultadoRival,
    }))
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}

export type FilaTriesTemporada = {
  temporada: number;
  presencias: number;
  titular: number;
  suplente: number;
  tries: number;
  puntos: number;
  tarjetas: number;
  promedio: number;
  detalle: FilaPartidoJugador[];
  badges: BadgesTemporada;
};

export async function getTriesPorTemporada(jugadorId: number): Promise<FilaTriesTemporada[]> {
  const partidos = await getPartidosJugador(jugadorId);

  const porTemporada = new Map<number, FilaTriesTemporada>();
  for (const p of partidos) {
    const fila = porTemporada.get(p.temporada) ?? {
      temporada: p.temporada,
      presencias: 0,
      titular: 0,
      suplente: 0,
      tries: 0,
      puntos: 0,
      tarjetas: 0,
      promedio: 0,
      detalle: [],
      badges: { presencias: [], tries: [], puntos: [] },
    };
    fila.presencias++;
    if (p.rol === "TITULAR") fila.titular++;
    else fila.suplente++;
    fila.tries += p.tries;
    fila.puntos += p.puntos;
    fila.tarjetas += p.tarjetas.length;
    fila.detalle.push(p);
    porTemporada.set(p.temporada, fila);
  }

  for (const fila of porTemporada.values()) {
    fila.promedio = fila.presencias > 0 ? fila.tries / fila.presencias : 0;
    fila.detalle.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  }

  return [...porTemporada.values()].sort((a, b) => b.temporada - a.temporada);
}

export type ResumenClub = {
  temporadas: number;
  partidos: number;
  tries: number;
  jugadores: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  clubesRivales: number;
  camadas: number;
};

export async function getClub(clubId: number): Promise<{ id: number; nombre: string } | null> {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true, nombreCanonico: true } });
  return club ? { id: club.id, nombre: club.nombreCanonico } : null;
}

export async function getResumenClub(): Promise<ResumenClub> {
  const [temporadas, partidos, triesAgg, jugadores, amarillas, rojas, clubesRivales, camadas] = await Promise.all([
    prisma.partido.findMany({ select: { temporada: true }, distinct: ["temporada"] }),
    prisma.partido.count(),
    prisma.puntuacion.aggregate({ where: { tipo: "TRY" }, _sum: { cantidad: true } }),
    prisma.jugador.count({ where: { esJugadorReal: true } }),
    prisma.tarjeta.count({ where: { tipo: "AMARILLA" } }),
    prisma.tarjeta.count({ where: { tipo: "ROJA" } }),
    prisma.club.count(),
    prisma.jugador.findMany({
      where: { esJugadorReal: true, camada: { not: null } },
      select: { camada: true },
      distinct: ["camada"],
    }),
  ]);
  return {
    temporadas: temporadas.length,
    partidos,
    tries: triesAgg._sum.cantidad ?? 0,
    jugadores,
    tarjetasAmarillas: amarillas,
    tarjetasRojas: rojas,
    clubesRivales,
    camadas: camadas.length,
  };
}

export type ResumenTemporada = {
  temporada: number;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  jugadores: number;
  tries: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  puntosFavor: number;
  puntosContra: number;
  maxTryScorer: { jugadorId: number; nombre: string; tries: number } | null;
  maxPuntosScorer: { jugadorId: number; nombre: string; puntos: number } | null;
};

export async function getResumenTemporadas(): Promise<ResumenTemporada[]> {
  const [partidos, participaciones, puntosRows, tarjetas] = await Promise.all([
    prisma.partido.findMany({ select: { temporada: true, resultadoPropio: true, resultadoRival: true } }),
    prisma.participacion.findMany({
      where: { jugador: { esJugadorReal: true } },
      select: { jugadorId: true, partido: { select: { temporada: true } } },
    }),
    prisma.puntuacion.findMany({
      where: { jugador: { esJugadorReal: true } },
      select: {
        jugadorId: true,
        tipo: true,
        cantidad: true,
        jugador: { select: { nombreCanonico: true } },
        partido: { select: { temporada: true } },
      },
    }),
    prisma.tarjeta.findMany({ select: { tipo: true, partido: { select: { temporada: true } } } }),
  ]);

  type Acumulador = ResumenTemporada & {
    _jugadores: Set<number>;
    _triesPorJugador: Map<number, { jugadorId: number; nombre: string; tries: number }>;
    _puntosPorJugador: Map<number, { jugadorId: number; nombre: string; puntos: number }>;
  };
  const porTemporada = new Map<number, Acumulador>();
  function bucket(temporada: number): Acumulador {
    let e = porTemporada.get(temporada);
    if (!e) {
      e = {
        temporada,
        partidosJugados: 0,
        ganados: 0,
        empatados: 0,
        perdidos: 0,
        jugadores: 0,
        tries: 0,
        tarjetasAmarillas: 0,
        tarjetasRojas: 0,
        puntosFavor: 0,
        puntosContra: 0,
        maxTryScorer: null,
        maxPuntosScorer: null,
        _jugadores: new Set(),
        _triesPorJugador: new Map(),
        _puntosPorJugador: new Map(),
      };
      porTemporada.set(temporada, e);
    }
    return e;
  }

  for (const p of partidos) {
    const e = bucket(p.temporada);
    e.partidosJugados++;
    if (p.resultadoPropio > p.resultadoRival) e.ganados++;
    else if (p.resultadoPropio < p.resultadoRival) e.perdidos++;
    else e.empatados++;
    e.puntosFavor += p.resultadoPropio;
    e.puntosContra += p.resultadoRival;
  }
  for (const part of participaciones) {
    bucket(part.partido.temporada)._jugadores.add(part.jugadorId);
  }
  for (const pt of puntosRows) {
    const e = bucket(pt.partido.temporada);
    const puntos = (PUNTOS_POR_TIPO[pt.tipo] ?? 0) * pt.cantidad;

    const actualPuntos = e._puntosPorJugador.get(pt.jugadorId) ?? {
      jugadorId: pt.jugadorId,
      nombre: pt.jugador.nombreCanonico,
      puntos: 0,
    };
    actualPuntos.puntos += puntos;
    e._puntosPorJugador.set(pt.jugadorId, actualPuntos);

    if (pt.tipo === "TRY") {
      e.tries += pt.cantidad;
      const actualTries = e._triesPorJugador.get(pt.jugadorId) ?? {
        jugadorId: pt.jugadorId,
        nombre: pt.jugador.nombreCanonico,
        tries: 0,
      };
      actualTries.tries += pt.cantidad;
      e._triesPorJugador.set(pt.jugadorId, actualTries);
    }
  }
  for (const t of tarjetas) {
    const e = bucket(t.partido.temporada);
    if (t.tipo === "AMARILLA") e.tarjetasAmarillas++;
    else e.tarjetasRojas++;
  }

  const result: ResumenTemporada[] = [];
  for (const e of porTemporada.values()) {
    e.jugadores = e._jugadores.size;
    let maxTries: { jugadorId: number; nombre: string; tries: number } | null = null;
    for (const v of e._triesPorJugador.values()) {
      if (!maxTries || v.tries > maxTries.tries) maxTries = v;
    }
    e.maxTryScorer = maxTries;
    let maxPuntos: { jugadorId: number; nombre: string; puntos: number } | null = null;
    for (const v of e._puntosPorJugador.values()) {
      if (!maxPuntos || v.puntos > maxPuntos.puntos) maxPuntos = v;
    }
    e.maxPuntosScorer = maxPuntos;
    const { _jugadores, _triesPorJugador, _puntosPorJugador, ...limpio } = e;
    void _jugadores;
    void _triesPorJugador;
    void _puntosPorJugador;
    result.push(limpio);
  }

  result.sort((a, b) => b.temporada - a.temporada);
  return result;
}

export type FilaRankingPresencias = {
  jugadorId: number;
  nombre: string;
  titular: number;
  suplente: number;
  total: number;
};

export async function getRankingPresencias(temporada?: number): Promise<FilaRankingPresencias[]> {
  const participaciones = await prisma.participacion.findMany({
    where: {
      jugador: { esJugadorReal: true },
      ...(temporada ? { partido: { temporada } } : {}),
    },
    select: { jugadorId: true, rol: true, jugador: { select: { nombreCanonico: true } } },
  });

  const porJugador = new Map<number, FilaRankingPresencias>();
  for (const p of participaciones) {
    const fila = porJugador.get(p.jugadorId) ?? {
      jugadorId: p.jugadorId,
      nombre: p.jugador.nombreCanonico,
      titular: 0,
      suplente: 0,
      total: 0,
    };
    if (p.rol === "TITULAR") fila.titular++;
    else fila.suplente++;
    fila.total++;
    porJugador.set(p.jugadorId, fila);
  }

  const filas = [...porJugador.values()];
  filas.sort((a, b) => b.total - a.total || b.titular - a.titular || a.nombre.localeCompare(b.nombre));
  return filas;
}

export type FilaRankingTarjetas = {
  jugadorId: number;
  nombre: string;
  amarillas: number;
  rojas: number;
  total: number;
};

export async function getRankingTarjetas(temporada?: number): Promise<FilaRankingTarjetas[]> {
  const tarjetas = await prisma.tarjeta.findMany({
    where: {
      jugador: { esJugadorReal: true },
      ...(temporada ? { partido: { temporada } } : {}),
    },
    select: { jugadorId: true, tipo: true, jugador: { select: { nombreCanonico: true } } },
  });

  const porJugador = new Map<number, FilaRankingTarjetas>();
  for (const t of tarjetas) {
    const fila = porJugador.get(t.jugadorId) ?? {
      jugadorId: t.jugadorId,
      nombre: t.jugador.nombreCanonico,
      amarillas: 0,
      rojas: 0,
      total: 0,
    };
    if (t.tipo === "AMARILLA") fila.amarillas++;
    else fila.rojas++;
    fila.total++;
    porJugador.set(t.jugadorId, fila);
  }

  const filas = [...porJugador.values()];
  filas.sort((a, b) => b.total - a.total || b.rojas - a.rojas || a.nombre.localeCompare(b.nombre));
  return filas;
}

type WLD = { j: number; g: number; e: number; p: number };
function wldVacio(): WLD {
  return { j: 0, g: 0, e: 0, p: 0 };
}

export type FilaHistorialGeneral = {
  clubId: number;
  club: string;
  total: WLD;
  ultimaTemporada: number;
};

export async function getHistorialGeneral(): Promise<FilaHistorialGeneral[]> {
  const partidos = await prisma.partido.findMany({
    select: {
      rivalId: true,
      temporada: true,
      resultadoPropio: true,
      resultadoRival: true,
      rival: { select: { nombreCanonico: true } },
    },
  });

  const porClub = new Map<number, FilaHistorialGeneral>();
  for (const p of partidos) {
    const fila = porClub.get(p.rivalId) ?? {
      clubId: p.rivalId,
      club: p.rival.nombreCanonico,
      total: wldVacio(),
      ultimaTemporada: p.temporada,
    };
    fila.total.j++;
    if (p.resultadoPropio > p.resultadoRival) fila.total.g++;
    else if (p.resultadoPropio < p.resultadoRival) fila.total.p++;
    else fila.total.e++;
    fila.ultimaTemporada = Math.max(fila.ultimaTemporada, p.temporada);
    porClub.set(p.rivalId, fila);
  }

  const filas = [...porClub.values()];
  filas.sort((a, b) => b.total.j - a.total.j || a.club.localeCompare(b.club));
  return filas;
}

export type InfoTemporada = {
  temporada: number;
  torneo: string | null;
  posicion: number | null;
  rankingUrba: number | null;
  campeon: boolean;
  ascenso: boolean;
  descenso: boolean;
  nota: string | null;
};

export async function getTemporadasInfo(): Promise<Map<number, InfoTemporada>> {
  const filas = await prisma.temporadaInfo.findMany();
  return new Map(filas.map((f) => [f.temporada, f]));
}

export async function getTemporadaInfo(temporada: number): Promise<InfoTemporada | null> {
  return prisma.temporadaInfo.findUnique({ where: { temporada } });
}

export type LogroJugador = { temporada: number; tipo: "CAMPEON" | "ASCENSO" };

// un logro de temporada (campeón/ascenso) le queda acreditado a todo jugador
// que haya tenido al menos una participación esa temporada. El descenso no
// se muestra como logro en el perfil del jugador.
export async function getLogrosJugador(jugadorId: number): Promise<LogroJugador[]> {
  const [logrosTemporada, temporadasJugadas] = await Promise.all([
    prisma.temporadaInfo.findMany({
      where: { OR: [{ campeon: true }, { ascenso: true }] },
    }),
    prisma.participacion.findMany({
      where: { jugadorId },
      select: { partido: { select: { temporada: true } } },
      distinct: ["partidoId"],
    }),
  ]);

  const temporadasConCaps = new Set(temporadasJugadas.map((p) => p.partido.temporada));
  const logros: LogroJugador[] = [];
  for (const info of logrosTemporada) {
    if (!temporadasConCaps.has(info.temporada)) continue;
    if (info.campeon) logros.push({ temporada: info.temporada, tipo: "CAMPEON" });
    if (info.ascenso) logros.push({ temporada: info.temporada, tipo: "ASCENSO" });
  }
  return logros.sort((a, b) => b.temporada - a.temporada);
}

export async function getTemporadaActual(): Promise<number | null> {
  const temporadas = await getTemporadasDisponibles();
  return temporadas.length > 0 ? Math.max(...temporadas) : null;
}

// ---------- récords ----------

export type PuntoCalendario = { fecha: Date; temporada: number; rival: string; rivalId: number };

export type RecordPartido = PuntoCalendario & {
  partidoId: number;
  condicion: string;
  resultadoPropio: number;
  resultadoRival: number;
};

export type RecordRachaEquipo = {
  cantidad: number;
  desde: PuntoCalendario;
  hasta: PuntoCalendario;
};

export type RecordJugador = {
  jugadorId: number;
  nombre: string;
  cantidad: number;
  desde: PuntoCalendario;
  hasta: PuntoCalendario;
};

export type RecordJugadorPartido = PuntoCalendario & {
  jugadorId: number;
  nombre: string;
  cantidad: number;
};

export type RecordTemporada = { temporada: number; cantidad: number };

// una marca de temporada con contexto (torneo y partidos jugados), para las
// distintas categorías "en una temporada" (más tries, más puntos, mejor
// diferencia, más victorias, menos amarillas, plantel más numeroso)
export type RecordTemporadaCon = { temporada: number; cantidad: number; torneo: string | null; pj: number };

export type RecordTrymanTemporada = { temporada: number; jugadorId: number; nombre: string; tries: number };

export type RecordJugadorTemporadas = {
  jugadorId: number;
  nombre: string;
  cantidad: number;
  primeraTemporada: number;
  ultimaTemporada: number;
};

export type Records = {
  // en un partido
  mayorVictoria: RecordPartido | null;
  mayorPuntuacion: RecordPartido | null;
  partidoMasTries: (RecordPartido & { tries: number }) | null;
  // en una temporada
  temporadaMasTries: RecordTemporadaCon | null;
  temporadaMasPuntos: RecordTemporadaCon | null;
  temporadaMejorDif: RecordTemporadaCon | null;
  temporadaMasVictorias: RecordTemporadaCon | null;
  temporadaMasLimpia: RecordTemporadaCon | null;
  temporadaMasPlantel: RecordTemporadaCon | null;
  trymanTemporada: RecordTrymanTemporada | null;
  // de un jugador
  jugadorMasTriesPartido: RecordJugadorPartido | null;
  jugadorMasPuntosPartido: RecordJugadorPartido | null;
  jugadorMasTemporadas: RecordJugadorTemporadas | null;
  // rachas
  rachaVictorias: RecordRachaEquipo | null;
  jugadorMasPartidosConsecutivos: RecordJugador | null;
  jugadorRachaTries: RecordJugador | null;
};

export async function getRecords(): Promise<Records> {
  const [partidos, resumenes, temporadasInfo] = await Promise.all([
    prisma.partido.findMany({
      orderBy: { fecha: "asc" },
      select: {
        id: true,
        fecha: true,
        temporada: true,
        condicion: true,
        resultadoPropio: true,
        resultadoRival: true,
        rival: { select: { id: true, nombreCanonico: true } },
      },
    }),
    getResumenTemporadas(),
    getTemporadasInfo(),
  ]);

  type PartidoRow = (typeof partidos)[number];

  function punto(p: PartidoRow): PuntoCalendario {
    return { fecha: p.fecha, temporada: p.temporada, rival: p.rival.nombreCanonico, rivalId: p.rival.id };
  }
  function recordPartido(p: PartidoRow): RecordPartido {
    return {
      ...punto(p),
      partidoId: p.id,
      condicion: p.condicion,
      resultadoPropio: p.resultadoPropio,
      resultadoRival: p.resultadoRival,
    };
  }

  // mayor victoria: máxima diferencia de puntos en un partido ganado
  let mayorVictoria: RecordPartido | null = null;
  let mayorDif = 0;
  for (const p of partidos) {
    const dif = p.resultadoPropio - p.resultadoRival;
    if (dif > mayorDif) {
      mayorDif = dif;
      mayorVictoria = recordPartido(p);
    }
  }

  // mayor cantidad de puntos anotados por Vicentinos en un partido
  let mayorPuntuacion: RecordPartido | null = null;
  let maxPuntosPartido = 0;
  for (const p of partidos) {
    if (p.resultadoPropio > maxPuntosPartido) {
      maxPuntosPartido = p.resultadoPropio;
      mayorPuntuacion = recordPartido(p);
    }
  }

  // partido con más tries de Vicentinos
  const triesRows = await prisma.puntuacion.groupBy({
    by: ["partidoId"],
    where: { tipo: "TRY" },
    _sum: { cantidad: true },
  });
  const triesPorPartido = new Map(triesRows.map((r) => [r.partidoId, r._sum.cantidad ?? 0]));
  let partidoMasTries: (RecordPartido & { tries: number }) | null = null;
  let maxTries = 0;
  for (const p of partidos) {
    const t = triesPorPartido.get(p.id) ?? 0;
    if (t > maxTries) {
      maxTries = t;
      partidoMasTries = { ...recordPartido(p), tries: t };
    }
  }

  // récords "en una temporada": se derivan del resumen ya calculado por
  // getResumenTemporadas, sin recorrer partidos de nuevo
  function extremoTemporada(
    campo: (r: ResumenTemporada) => number,
    mejorEs: "max" | "min" = "max"
  ): RecordTemporadaCon | null {
    let best: ResumenTemporada | null = null;
    for (const r of resumenes) {
      if (r.partidosJugados === 0) continue;
      if (!best || (mejorEs === "max" ? campo(r) > campo(best) : campo(r) < campo(best))) best = r;
    }
    if (!best) return null;
    return {
      temporada: best.temporada,
      cantidad: campo(best),
      torneo: temporadasInfo.get(best.temporada)?.torneo ?? null,
      pj: best.partidosJugados,
    };
  }
  const temporadaMasTries = extremoTemporada((r) => r.tries);
  const temporadaMasPuntos = extremoTemporada((r) => r.puntosFavor);
  const temporadaMejorDif = extremoTemporada((r) => r.puntosFavor - r.puntosContra);
  const temporadaMasVictorias = extremoTemporada((r) => r.ganados);
  const temporadaMasLimpia = extremoTemporada((r) => r.tarjetasAmarillas, "min");
  const temporadaMasPlantel = extremoTemporada((r) => r.jugadores);

  let trymanTemporada: RecordTrymanTemporada | null = null;
  for (const r of resumenes) {
    if (r.maxTryScorer && (!trymanTemporada || r.maxTryScorer.tries > trymanTemporada.tries)) {
      trymanTemporada = {
        temporada: r.temporada,
        jugadorId: r.maxTryScorer.jugadorId,
        nombre: r.maxTryScorer.nombre,
        tries: r.maxTryScorer.tries,
      };
    }
  }

  // racha de victorias consecutivas más larga (orden cronológico de todo el historial)
  let rachaActual = 0;
  let inicioActual: PartidoRow | null = null;
  let mejorRacha: { inicio: PartidoRow; fin: PartidoRow; cantidad: number } | null = null;
  for (const p of partidos) {
    const gano = p.resultadoPropio > p.resultadoRival;
    if (gano) {
      if (rachaActual === 0) inicioActual = p;
      rachaActual++;
      if (!mejorRacha || rachaActual > mejorRacha.cantidad) {
        mejorRacha = { inicio: inicioActual!, fin: p, cantidad: rachaActual };
      }
    } else {
      rachaActual = 0;
      inicioActual = null;
    }
  }
  const rachaVictorias: RecordRachaEquipo | null = mejorRacha
    ? { cantidad: mejorRacha.cantidad, desde: punto(mejorRacha.inicio), hasta: punto(mejorRacha.fin) }
    : null;

  // índice cronológico global de cada partido, para detectar "sin faltar ni uno"
  const indiceDePartido = new Map(partidos.map((p, i) => [p.id, i]));

  const participaciones = await prisma.participacion.findMany({
    where: { jugador: { esJugadorReal: true } },
    select: { jugadorId: true, partidoId: true, jugador: { select: { nombreCanonico: true } } },
  });
  const porJugador = new Map<number, { nombre: string; indices: number[] }>();
  for (const part of participaciones) {
    const idx = indiceDePartido.get(part.partidoId);
    if (idx === undefined) continue;
    const entry = porJugador.get(part.jugadorId) ?? { nombre: part.jugador.nombreCanonico, indices: [] };
    entry.indices.push(idx);
    porJugador.set(part.jugadorId, entry);
  }
  for (const entry of porJugador.values()) entry.indices.sort((a, b) => a - b);

  // jugador con más partidos consecutivos sin faltar (contra el calendario completo del club)
  let jugadorMasPartidosConsecutivos: RecordJugador | null = null;
  let maxConsecutivos = 0;
  for (const [jugadorId, { nombre, indices }] of porJugador) {
    if (indices.length === 0) continue;
    let run = 1;
    let runStart = indices[0];
    let best = 1;
    let bestStart = indices[0];
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] === indices[i - 1] + 1) {
        run++;
      } else {
        run = 1;
        runStart = indices[i];
      }
      if (run > best) {
        best = run;
        bestStart = runStart;
      }
    }
    if (best > maxConsecutivos) {
      maxConsecutivos = best;
      jugadorMasPartidosConsecutivos = {
        jugadorId,
        nombre,
        cantidad: best,
        desde: punto(partidos[bestStart]),
        hasta: punto(partidos[bestStart + best - 1]),
      };
    }
  }

  // racha de tries más larga de un jugador (consecutivos entre los partidos QUE JUGÓ)
  const triesPorJugadorPartido = await prisma.puntuacion.groupBy({
    by: ["jugadorId", "partidoId"],
    where: { tipo: "TRY", jugador: { esJugadorReal: true } },
    _sum: { cantidad: true },
  });
  const anotoTry = new Set<string>();
  for (const r of triesPorJugadorPartido) {
    if ((r._sum.cantidad ?? 0) > 0) anotoTry.add(`${r.jugadorId}|${r.partidoId}`);
  }

  let jugadorRachaTries: RecordJugador | null = null;
  let maxRachaTries = 0;
  for (const [jugadorId, { nombre, indices }] of porJugador) {
    let run = 0;
    let runStartIdx = -1;
    let best = 0;
    let bestStartIdx = -1;
    let bestEndIdx = -1;
    for (const idx of indices) {
      const anoto = anotoTry.has(`${jugadorId}|${partidos[idx].id}`);
      if (anoto) {
        if (run === 0) runStartIdx = idx;
        run++;
        if (run > best) {
          best = run;
          bestStartIdx = runStartIdx;
          bestEndIdx = idx;
        }
      } else {
        run = 0;
      }
    }
    if (best > maxRachaTries) {
      maxRachaTries = best;
      jugadorRachaTries = {
        jugadorId,
        nombre,
        cantidad: best,
        desde: punto(partidos[bestStartIdx]),
        hasta: punto(partidos[bestEndIdx]),
      };
    }
  }

  // más tries de un jugador en un solo partido
  let mejorHatTrick: { jugadorId: number; partidoId: number; cantidad: number } | null = null;
  for (const r of triesPorJugadorPartido) {
    const cantidad = r._sum.cantidad ?? 0;
    if (!mejorHatTrick || cantidad > mejorHatTrick.cantidad) {
      mejorHatTrick = { jugadorId: r.jugadorId, partidoId: r.partidoId, cantidad };
    }
  }
  let jugadorMasTriesPartido: RecordJugadorPartido | null = null;
  if (mejorHatTrick) {
    const partidoIdx = indiceDePartido.get(mejorHatTrick.partidoId);
    const partidoRow = partidoIdx !== undefined ? partidos[partidoIdx] : undefined;
    const nombre = porJugador.get(mejorHatTrick.jugadorId)?.nombre;
    if (partidoRow && nombre) {
      jugadorMasTriesPartido = {
        ...punto(partidoRow),
        jugadorId: mejorHatTrick.jugadorId,
        nombre,
        cantidad: mejorHatTrick.cantidad,
      };
    }
  }

  // más puntos de un jugador en un solo partido (pondera cada tipo de punto,
  // a diferencia del hat-trick de arriba que solo cuenta tries)
  const puntosPorJugadorPartidoRows = await prisma.puntuacion.groupBy({
    by: ["jugadorId", "partidoId", "tipo"],
    where: { jugador: { esJugadorReal: true } },
    _sum: { cantidad: true },
  });
  const puntosPorJugadorPartido = new Map<string, number>();
  for (const r of puntosPorJugadorPartidoRows) {
    const key = `${r.jugadorId}|${r.partidoId}`;
    const puntos = (r._sum.cantidad ?? 0) * (PUNTOS_POR_TIPO[r.tipo] ?? 0);
    puntosPorJugadorPartido.set(key, (puntosPorJugadorPartido.get(key) ?? 0) + puntos);
  }
  let mejorPuntosPartido: { jugadorId: number; partidoId: number; cantidad: number } | null = null;
  for (const [key, cantidad] of puntosPorJugadorPartido) {
    if (!mejorPuntosPartido || cantidad > mejorPuntosPartido.cantidad) {
      const [jugadorIdStr, partidoIdStr] = key.split("|");
      mejorPuntosPartido = { jugadorId: Number(jugadorIdStr), partidoId: Number(partidoIdStr), cantidad };
    }
  }
  let jugadorMasPuntosPartido: RecordJugadorPartido | null = null;
  if (mejorPuntosPartido) {
    const partidoIdx = indiceDePartido.get(mejorPuntosPartido.partidoId);
    const partidoRow = partidoIdx !== undefined ? partidos[partidoIdx] : undefined;
    const nombre = porJugador.get(mejorPuntosPartido.jugadorId)?.nombre;
    if (partidoRow && nombre) {
      jugadorMasPuntosPartido = {
        ...punto(partidoRow),
        jugadorId: mejorPuntosPartido.jugadorId,
        nombre,
        cantidad: mejorPuntosPartido.cantidad,
      };
    }
  }

  // jugador con más temporadas distintas jugadas (veteranía)
  const temporadasPorJugador = new Map<number, Set<number>>();
  for (const [jugadorId, { indices }] of porJugador) {
    const set = new Set<number>();
    for (const idx of indices) set.add(partidos[idx].temporada);
    temporadasPorJugador.set(jugadorId, set);
  }
  let jugadorMasTemporadas: RecordJugadorTemporadas | null = null;
  for (const [jugadorId, temporadasSet] of temporadasPorJugador) {
    const cantidad = temporadasSet.size;
    if (!jugadorMasTemporadas || cantidad > jugadorMasTemporadas.cantidad) {
      const arr = [...temporadasSet].sort((a, b) => a - b);
      jugadorMasTemporadas = {
        jugadorId,
        nombre: porJugador.get(jugadorId)?.nombre ?? "?",
        cantidad,
        primeraTemporada: arr[0],
        ultimaTemporada: arr[arr.length - 1],
      };
    }
  }

  return {
    mayorVictoria,
    mayorPuntuacion,
    partidoMasTries,
    temporadaMasTries,
    temporadaMasPuntos,
    temporadaMejorDif,
    temporadaMasVictorias,
    temporadaMasLimpia,
    temporadaMasPlantel,
    trymanTemporada,
    jugadorMasTriesPartido,
    jugadorMasPuntosPartido,
    jugadorMasTemporadas,
    rachaVictorias,
    jugadorMasPartidosConsecutivos,
    jugadorRachaTries,
  };
}

export type FilaCamadaCompleta = {
  camada: number;
  jugadoresConCaps: number;
  presencias: number;
  titular: number;
  suplente: number;
  tries: number;
  puntos: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  primeraTemporada: number | null;
  ultimaTemporada: number | null;
  titulos: number;
  titulosAnios: number[];
};

// resumen por camada (generación por año de nacimiento): se arma agregando
// por jugador.camada, con el mismo criterio que getListaJugadoresCompleta.
// "titulos" cuenta temporadas campeonas distintas en las que jugó al menos
// un integrante de la camada (no la suma de títulos por jugador).
export async function getCamadasResumenCompleta(): Promise<FilaCamadaCompleta[]> {
  const [jugadores, participaciones, puntuaciones, tarjetas, temporadasInfo] = await Promise.all([
    prisma.jugador.findMany({
      where: { esJugadorReal: true, camada: { not: null } },
      select: { id: true, camada: true },
    }),
    prisma.participacion.findMany({
      where: { jugador: { esJugadorReal: true, camada: { not: null } } },
      select: { jugadorId: true, rol: true, partido: { select: { temporada: true } } },
    }),
    prisma.puntuacion.groupBy({
      by: ["jugadorId", "tipo"],
      where: { jugador: { esJugadorReal: true, camada: { not: null } } },
      _sum: { cantidad: true },
    }),
    prisma.tarjeta.findMany({
      where: { jugador: { esJugadorReal: true, camada: { not: null } } },
      select: { jugadorId: true, tipo: true },
    }),
    getTemporadasInfo(),
  ]);

  const camadaPorJugador = new Map(jugadores.map((j) => [j.id, j.camada!]));
  const temporadasCampeon = new Set(
    [...temporadasInfo.values()].filter((i) => i.campeon).map((i) => i.temporada)
  );

  type Acc = {
    jugadoresConCaps: Set<number>;
    titular: number;
    suplente: number;
    temporadas: Set<number>;
    temporadasCampeonJugadas: Set<number>;
  };
  const porCamada = new Map<number, Acc>();
  function accDe(camada: number): Acc {
    let acc = porCamada.get(camada);
    if (!acc) {
      acc = { jugadoresConCaps: new Set(), titular: 0, suplente: 0, temporadas: new Set(), temporadasCampeonJugadas: new Set() };
      porCamada.set(camada, acc);
    }
    return acc;
  }

  for (const p of participaciones) {
    const camada = camadaPorJugador.get(p.jugadorId);
    if (camada == null) continue;
    const acc = accDe(camada);
    acc.jugadoresConCaps.add(p.jugadorId);
    if (p.rol === "TITULAR") acc.titular++;
    else acc.suplente++;
    acc.temporadas.add(p.partido.temporada);
    if (temporadasCampeon.has(p.partido.temporada)) acc.temporadasCampeonJugadas.add(p.partido.temporada);
  }

  const puntosPorJugador = new Map<number, number>();
  const triesPorJugador = new Map<number, number>();
  for (const g of puntuaciones) {
    const cantidad = g._sum.cantidad ?? 0;
    puntosPorJugador.set(g.jugadorId, (puntosPorJugador.get(g.jugadorId) ?? 0) + cantidad * (PUNTOS_POR_TIPO[g.tipo] ?? 0));
    if (g.tipo === "TRY") triesPorJugador.set(g.jugadorId, (triesPorJugador.get(g.jugadorId) ?? 0) + cantidad);
  }
  const puntosPorCamada = new Map<number, number>();
  const triesPorCamada = new Map<number, number>();
  for (const j of jugadores) {
    const camada = j.camada!;
    puntosPorCamada.set(camada, (puntosPorCamada.get(camada) ?? 0) + (puntosPorJugador.get(j.id) ?? 0));
    triesPorCamada.set(camada, (triesPorCamada.get(camada) ?? 0) + (triesPorJugador.get(j.id) ?? 0));
  }

  const tarjetasPorCamada = new Map<number, { amarillas: number; rojas: number }>();
  for (const t of tarjetas) {
    const camada = camadaPorJugador.get(t.jugadorId);
    if (camada == null) continue;
    const acc = tarjetasPorCamada.get(camada) ?? { amarillas: 0, rojas: 0 };
    if (t.tipo === "AMARILLA") acc.amarillas++;
    else acc.rojas++;
    tarjetasPorCamada.set(camada, acc);
  }

  const camadas = new Set(jugadores.map((j) => j.camada!));
  const filas: FilaCamadaCompleta[] = [];
  for (const camada of camadas) {
    const acc = porCamada.get(camada);
    const temporadasArr = acc ? [...acc.temporadas].sort((a, b) => a - b) : [];
    filas.push({
      camada,
      jugadoresConCaps: acc?.jugadoresConCaps.size ?? 0,
      presencias: (acc?.titular ?? 0) + (acc?.suplente ?? 0),
      titular: acc?.titular ?? 0,
      suplente: acc?.suplente ?? 0,
      tries: triesPorCamada.get(camada) ?? 0,
      puntos: puntosPorCamada.get(camada) ?? 0,
      tarjetasAmarillas: tarjetasPorCamada.get(camada)?.amarillas ?? 0,
      tarjetasRojas: tarjetasPorCamada.get(camada)?.rojas ?? 0,
      primeraTemporada: temporadasArr[0] ?? null,
      ultimaTemporada: temporadasArr[temporadasArr.length - 1] ?? null,
      titulos: acc?.temporadasCampeonJugadas.size ?? 0,
      titulosAnios: acc ? [...acc.temporadasCampeonJugadas].sort((a, b) => a - b) : [],
    });
  }

  return filas.sort((a, b) => a.camada - b.camada);
}

export type FilaReferee = {
  referee: string;
  j: number;
  g: number;
  e: number;
  p: number;
};

export async function getRankingReferees(): Promise<FilaReferee[]> {
  const partidos = await prisma.partido.findMany({
    where: { referee: { not: null } },
    select: { referee: true, resultadoPropio: true, resultadoRival: true },
  });

  const porReferee = new Map<string, FilaReferee>();
  for (const p of partidos) {
    const nombre = p.referee!;
    const fila = porReferee.get(nombre) ?? { referee: nombre, j: 0, g: 0, e: 0, p: 0 };
    fila.j++;
    if (p.resultadoPropio > p.resultadoRival) fila.g++;
    else if (p.resultadoPropio < p.resultadoRival) fila.p++;
    else fila.e++;
    porReferee.set(nombre, fila);
  }

  const filas = [...porReferee.values()];
  filas.sort((a, b) => b.j - a.j || a.referee.localeCompare(b.referee));
  return filas;
}

export type ParticipacionDetalle = {
  jugadorId: number;
  nombre: string;
  numeroCamiseta: number | null;
  capitan: boolean;
  ingresoPor: string | null;
  ingresoPorId: number | null;
};

export type PuntoDetalle = { jugadorId: number; nombre: string; tipo: string; cantidad: number };
export type TarjetaDetalle = { jugadorId: number; nombre: string; tipo: string };

export type PartidoDetalle = {
  id: number;
  fecha: Date;
  fechaNota: string | null;
  etapa: "Semifinal" | "Final" | null;
  temporada: number;
  rival: string;
  condicion: string;
  resultadoPropio: number;
  resultadoRival: number;
  cancha: string | null;
  clima: string | null;
  campoDeJuego: string | null;
  referee: string | null;
  titulares: ParticipacionDetalle[];
  suplentes: ParticipacionDetalle[];
  puntos: PuntoDetalle[];
  tarjetas: TarjetaDetalle[];
};

async function buildPartidosDetalle(where: { temporada: number } | { rivalId: number }): Promise<PartidoDetalle[]> {
  const partidos = await prisma.partido.findMany({
    where,
    orderBy: { fecha: "asc" },
    select: {
      id: true,
      fecha: true,
      fechaNota: true,
      temporada: true,
      condicion: true,
      resultadoPropio: true,
      resultadoRival: true,
      cancha: true,
      clima: true,
      campoDeJuego: true,
      referee: true,
      rival: { select: { nombreCanonico: true } },
      participaciones: {
        orderBy: { id: "asc" },
        select: {
          rol: true,
          numeroCamiseta: true,
          capitan: true,
          jugador: { select: { id: true, nombreCanonico: true } },
          ingresoPor: { select: { id: true, nombreCanonico: true } },
        },
      },
      puntos: {
        select: { tipo: true, cantidad: true, jugador: { select: { id: true, nombreCanonico: true } } },
      },
      tarjetas: {
        select: { tipo: true, jugador: { select: { id: true, nombreCanonico: true } } },
      },
    },
  });

  return partidos.map((p) => {
    const titulares = p.participaciones
      .filter((pp) => pp.rol === "TITULAR")
      .map((pp) => ({
        jugadorId: pp.jugador.id,
        nombre: pp.jugador.nombreCanonico,
        numeroCamiseta: pp.numeroCamiseta,
        capitan: pp.capitan,
        ingresoPor: null,
        ingresoPorId: null,
      }));
    const suplentes = p.participaciones
      .filter((pp) => pp.rol === "SUPLENTE")
      .map((pp) => ({
        jugadorId: pp.jugador.id,
        nombre: pp.jugador.nombreCanonico,
        numeroCamiseta: pp.numeroCamiseta,
        capitan: pp.capitan,
        ingresoPor: pp.ingresoPor?.nombreCanonico ?? null,
        ingresoPorId: pp.ingresoPor?.id ?? null,
      }));

    return {
      id: p.id,
      fecha: p.fecha,
      fechaNota: p.fechaNota,
      etapa: etapaPartido(p.fechaNota),
      temporada: p.temporada,
      rival: p.rival.nombreCanonico,
      condicion: p.condicion,
      resultadoPropio: p.resultadoPropio,
      resultadoRival: p.resultadoRival,
      cancha: p.cancha,
      clima: p.clima,
      campoDeJuego: p.campoDeJuego,
      referee: p.referee,
      titulares,
      suplentes,
      puntos: p.puntos.map((pt) => ({
        jugadorId: pt.jugador.id,
        nombre: pt.jugador.nombreCanonico,
        tipo: pt.tipo,
        cantidad: pt.cantidad,
      })),
      tarjetas: p.tarjetas.map((t) => ({
        jugadorId: t.jugador.id,
        nombre: t.jugador.nombreCanonico,
        tipo: t.tipo,
      })),
    };
  });
}

export async function getPartidosDetalleTemporada(temporada: number): Promise<PartidoDetalle[]> {
  return buildPartidosDetalle({ temporada });
}

export type Debutante = {
  jugadorId: number;
  nombre: string;
  camada: number | null;
  fecha: Date;
  numeroFecha: number;
  rival: string;
  rivalId: number;
};

// debutante de una temporada: jugadores cuya primera titularidad histórica
// (misma definición de "debut" que ya usa la ficha del jugador) cayó en esa
// temporada. No cuenta haber entrado como suplente antes de esa fecha.
export async function getDebutantesTemporada(temporada: number): Promise<Debutante[]> {
  const [titulares, partidosTemporada] = await Promise.all([
    prisma.participacion.findMany({
      where: { rol: "TITULAR", jugador: { esJugadorReal: true } },
      select: {
        jugadorId: true,
        partidoId: true,
        partido: { select: { fecha: true, temporada: true } },
        jugador: { select: { nombreCanonico: true, camada: true } },
      },
    }),
    // orden cronológico de todos los partidos de la temporada, para poder
    // decir "debutó en la fecha N vs. Rival"
    prisma.partido.findMany({
      where: { temporada },
      orderBy: { fecha: "asc" },
      select: { id: true, rival: { select: { id: true, nombreCanonico: true } } },
    }),
  ]);

  const numeroPorPartido = new Map<number, number>();
  const rivalPorPartido = new Map<number, { id: number; nombre: string }>();
  partidosTemporada.forEach((p, i) => {
    numeroPorPartido.set(p.id, i + 1);
    rivalPorPartido.set(p.id, { id: p.rival.id, nombre: p.rival.nombreCanonico });
  });

  const primeraPorJugador = new Map<
    number,
    { fecha: Date; temporada: number; nombre: string; camada: number | null; partidoId: number }
  >();
  for (const t of titulares) {
    const actual = primeraPorJugador.get(t.jugadorId);
    if (!actual || t.partido.fecha < actual.fecha) {
      primeraPorJugador.set(t.jugadorId, {
        fecha: t.partido.fecha,
        temporada: t.partido.temporada,
        nombre: t.jugador.nombreCanonico,
        camada: t.jugador.camada,
        partidoId: t.partidoId,
      });
    }
  }

  const debutantes: Debutante[] = [];
  for (const [jugadorId, info] of primeraPorJugador) {
    if (info.temporada !== temporada) continue;
    const rival = rivalPorPartido.get(info.partidoId);
    const numeroFecha = numeroPorPartido.get(info.partidoId);
    if (!rival || !numeroFecha) continue;
    debutantes.push({
      jugadorId,
      nombre: info.nombre,
      camada: info.camada,
      fecha: info.fecha,
      numeroFecha,
      rival: rival.nombre,
      rivalId: rival.id,
    });
  }
  debutantes.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  return debutantes;
}

export async function getPartidosDetalleRival(clubId: number): Promise<PartidoDetalle[]> {
  return buildPartidosDetalle({ rivalId: clubId });
}

// el número de camiseta del titular indica la posición jugada
const POSICION_POR_NUMERO: Record<number, string> = {
  1: "Pilar Izq",
  2: "Hooker",
  3: "Pilar Der",
  4: "Segunda Línea",
  5: "Segunda Línea",
  6: "Ala",
  7: "Ala",
  8: "Octavo",
  9: "Medio Scrum",
  10: "Apertura",
  11: "Wing",
  14: "Wing",
  12: "Centro",
  13: "Centro",
  15: "Fullback",
};

const ORDEN_POSICIONES = [
  "Pilar Izq",
  "Hooker",
  "Pilar Der",
  "Segunda Línea",
  "Ala",
  "Octavo",
  "Medio Scrum",
  "Apertura",
  "Wing",
  "Centro",
  "Fullback",
];

export type FilaPosicion = { posicion: string; partidos: number };

export async function getPosicionesJugador(jugadorId: number): Promise<FilaPosicion[]> {
  const participaciones = await prisma.participacion.findMany({
    where: { jugadorId, rol: "TITULAR", numeroCamiseta: { not: null } },
    select: { numeroCamiseta: true },
  });

  const conteos = new Map<string, number>();
  for (const p of participaciones) {
    const posicion = POSICION_POR_NUMERO[p.numeroCamiseta!];
    if (!posicion) continue;
    conteos.set(posicion, (conteos.get(posicion) ?? 0) + 1);
  }

  return ORDEN_POSICIONES.map((posicion) => ({ posicion, partidos: conteos.get(posicion) ?? 0 })).filter(
    (f) => f.partidos > 0
  );
}
