/**
 * Reconstruye prisma/dev.db desde los archivos de data/base/.
 *
 * Es determinístico: los mismos archivos producen siempre la misma base.
 * Por eso el .db deja de ser un dato precioso e irrecuperable y pasa a ser
 * un derivado: si se pierde o se corrompe, se regenera con este comando.
 *
 * NUNCA pisa la base actual hasta haber construido y validado la nueva:
 * arma todo en un archivo aparte, verifica, hace backup de la vieja y recién
 * ahí la reemplaza.
 */
import Database from "better-sqlite3";
import { readFileSync, readdirSync, existsSync, renameSync, copyFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE_DIR = fileURLToPath(new URL("../data/base/", import.meta.url));
const TEMPORADAS_DIR = `${BASE_DIR}temporadas/`;
const MIGRATIONS_DIR = fileURLToPath(new URL("../prisma/migrations/", import.meta.url));
const DB_PATH = fileURLToPath(new URL("../prisma/dev.db", import.meta.url));
const TMP_PATH = `${DB_PATH}.build`;
const BAK_PATH = `${DB_PATH}.bak`;

type Club = { id: number; nombre: string };
type Jugador = { id: number; nombre: string; camada: number | null; vicentinoN: number | null; esJugadorReal: boolean };

function leerJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function main() {
  // --- leer los archivos fuente ---
  const clubes = leerJson<Club[]>(`${BASE_DIR}clubes.json`);
  const jugadores = leerJson<Jugador[]>(`${BASE_DIR}jugadores.json`);
  const archivos = readdirSync(TEMPORADAS_DIR).filter((f) => f.endsWith(".json")).sort();

  const clubIdPorNombre = new Map(clubes.map((c) => [c.nombre, c.id]));
  const jugadorIdPorNombre = new Map(jugadores.map((j) => [j.nombre, j.id]));

  // --- crear la base nueva en un archivo aparte ---
  if (existsSync(TMP_PATH)) unlinkSync(TMP_PATH);
  const db = new Database(TMP_PATH);
  db.pragma("foreign_keys = OFF");

  // el esquema sale de las migraciones de Prisma: son autocontenidas y no
  // necesitan red ni el motor de Prisma.
  const migraciones = readdirSync(MIGRATIONS_DIR)
    .filter((d) => existsSync(`${MIGRATIONS_DIR}${d}/migration.sql`))
    .sort();
  for (const m of migraciones) {
    db.exec(readFileSync(`${MIGRATIONS_DIR}${m}/migration.sql`, "utf-8"));
  }

  // tabla de control de Prisma, para que `prisma migrate status` siga sano
  db.exec(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" DATETIME,
    "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
  )`);
  const insMig = db.prepare(
    `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
     VALUES (?, ?, datetime('now'), ?, datetime('now'), 1)`
  );
  for (const m of migraciones) insMig.run(m, "rebuilt-from-data-base", m);

  // --- catálogos, con los ids explícitos (están en las URLs del sitio) ---
  const insClub = db.prepare(`INSERT INTO Club (id, nombreCanonico) VALUES (?, ?)`);
  for (const c of clubes) insClub.run(c.id, c.nombre);

  const insJugador = db.prepare(
    `INSERT INTO Jugador (id, nombreCanonico, vicentinoN, camada, esJugadorReal) VALUES (?, ?, ?, ?, ?)`
  );
  for (const j of jugadores) insJugador.run(j.id, j.nombre, j.vicentinoN, j.camada, j.esJugadorReal ? 1 : 0);

  // --- temporadas y partidos ---
  const insInfo = db.prepare(
    `INSERT INTO TemporadaInfo (temporada, torneo, posicion, rankingUrba, campeon, ascenso, descenso, nota)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insPartido = db.prepare(
    `INSERT INTO Partido (fecha, fechaNota, temporada, rivalId, condicion, resultadoPropio, resultadoRival, cancha, clima, campoDeJuego, referee, categoria)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insPart = db.prepare(
    `INSERT INTO Participacion (partidoId, jugadorId, rol, numeroCamiseta, capitan, ingresoPorId) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insPunto = db.prepare(`INSERT INTO Puntuacion (partidoId, jugadorId, tipo, cantidad) VALUES (?, ?, ?, ?)`);
  const insTarjeta = db.prepare(`INSERT INTO Tarjeta (partidoId, jugadorId, tipo) VALUES (?, ?, ?)`);

  const errores: string[] = [];
  const jugadorId = (nombre: string, ctx: string): number | null => {
    const id = jugadorIdPorNombre.get(nombre);
    if (id === undefined) errores.push(`jugador desconocido "${nombre}" (${ctx})`);
    return id ?? null;
  };

  let nPartidos = 0;
  let nParticipaciones = 0;
  let nPuntos = 0;
  let nTarjetas = 0;

  const cargar = db.transaction(() => {
    for (const archivo of archivos) {
      const t = leerJson<any>(`${TEMPORADAS_DIR}${archivo}`);
      if (t.info) {
        insInfo.run(
          t.temporada,
          t.info.torneo,
          t.info.posicion,
          t.info.rankingUrba,
          t.info.campeon ? 1 : 0,
          t.info.ascenso ? 1 : 0,
          t.info.descenso ? 1 : 0,
          t.info.nota
        );
      }
      for (const p of t.partidos ?? []) {
        const ctx = `${t.temporada} ${p.fecha} vs ${p.rival}`;
        const rivalId = clubIdPorNombre.get(p.rival);
        if (rivalId === undefined) {
          errores.push(`club desconocido "${p.rival}" (${ctx})`);
          continue;
        }
        const r = insPartido.run(
          `${p.fecha}T00:00:00.000+00:00`,
          p.fechaNota,
          t.temporada,
          rivalId,
          p.condicion,
          p.resultadoPropio,
          p.resultadoRival,
          p.cancha,
          p.clima,
          p.campoDeJuego,
          p.referee,
          p.categoria
        );
        const partidoId = Number(r.lastInsertRowid);
        nPartidos++;

        for (const f of p.formacion ?? []) {
          const jid = jugadorId(f.jugador, ctx);
          if (jid === null) continue;
          insPart.run(partidoId, jid, "TITULAR", f.numero ?? null, f.capitan ? 1 : 0, null);
          nParticipaciones++;
        }
        for (const c of p.cambios ?? []) {
          const jid = jugadorId(c.jugador, ctx);
          if (jid === null) continue;
          const porId = c.entraPor ? jugadorId(c.entraPor, ctx) : null;
          insPart.run(partidoId, jid, "SUPLENTE", c.numero ?? null, c.capitan ? 1 : 0, porId);
          nParticipaciones++;
        }
        for (const pt of p.puntos ?? []) {
          const jid = jugadorId(pt.jugador, ctx);
          if (jid === null) continue;
          insPunto.run(partidoId, jid, pt.tipo, pt.cantidad);
          nPuntos++;
        }
        for (const ta of p.tarjetas ?? []) {
          const jid = jugadorId(ta.jugador, ctx);
          if (jid === null) continue;
          insTarjeta.run(partidoId, jid, ta.tipo);
          nTarjetas++;
        }
      }
    }
  });

  cargar();
  db.pragma("foreign_keys = ON");
  const fk = db.pragma("foreign_key_check") as unknown[];
  db.close();

  // --- validar antes de tocar la base real ---
  if (errores.length) {
    unlinkSync(TMP_PATH);
    console.error(`✗ No se construyó nada. ${errores.length} referencia(s) rota(s):`);
    errores.slice(0, 20).forEach((e) => console.error(`   ${e}`));
    if (errores.length > 20) console.error(`   ... y ${errores.length - 20} más`);
    process.exit(1);
  }
  if (fk.length) {
    unlinkSync(TMP_PATH);
    console.error(`✗ No se construyó nada. ${fk.length} violación(es) de integridad referencial.`);
    process.exit(1);
  }

  // --- recién ahora se reemplaza, con backup de la anterior ---
  if (existsSync(DB_PATH)) copyFileSync(DB_PATH, BAK_PATH);
  renameSync(TMP_PATH, DB_PATH);

  console.log(`✅ Base reconstruida desde data/base/`);
  console.log(`   ${clubes.length} clubes, ${jugadores.length} jugadores`);
  console.log(`   ${nPartidos} partidos, ${nParticipaciones} participaciones, ${nPuntos} puntos, ${nTarjetas} tarjetas`);
  if (existsSync(BAK_PATH)) console.log(`   (la base anterior quedó en prisma/dev.db.bak)`);
}

main();
