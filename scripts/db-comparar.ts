/**
 * Compara dos bases sqlite a nivel CONTENIDO (no ids internos de filas).
 *
 * `npm run db:comparar` compara la base recién construida contra el backup
 * de la anterior, así se ve si un rebuild cambió algo que no esperabas.
 * También se le pueden pasar dos rutas: node --import tsx scripts/db-comparar.ts <a> <b>
 */
import Database from "better-sqlite3";

const [pathA, pathB] = process.argv.slice(2);
const a = new Database(pathA, { readonly: true });
const b = new Database(pathB, { readonly: true });

function filas(db: Database.Database, sql: string): string[] {
  return (db.prepare(sql).all() as Record<string, unknown>[])
    .map((r) => JSON.stringify(r))
    .sort();
}

// los ids de Club y Jugador SÍ se comparan: están en las URLs del sitio.
const CONSULTAS: Record<string, string> = {
  Club: `select id, nombreCanonico from Club`,
  Jugador: `select id, nombreCanonico, vicentinoN, camada, esJugadorReal from Jugador`,
  TemporadaInfo: `select temporada, torneo, posicion, rankingUrba, campeon, ascenso, descenso, nota from TemporadaInfo`,
  // los ids de Partido/Participacion/etc no se exponen en ninguna URL, así que
  // se compara el contenido identificando cada partido por temporada+fecha+rival.
  Partido: `select p.temporada, date(p.fecha) f, c.nombreCanonico rival, p.fechaNota, p.condicion,
              p.resultadoPropio, p.resultadoRival, p.cancha, p.clima, p.campoDeJuego, p.referee, p.categoria
            from Partido p join Club c on c.id = p.rivalId`,
  Participacion: `select p.temporada, date(p.fecha) f, c.nombreCanonico rival, j.nombreCanonico jugador,
                    pa.rol, pa.numeroCamiseta, pa.capitan, ing.nombreCanonico entraPor
                  from Participacion pa
                  join Partido p on p.id = pa.partidoId
                  join Club c on c.id = p.rivalId
                  join Jugador j on j.id = pa.jugadorId
                  left join Jugador ing on ing.id = pa.ingresoPorId`,
  Puntuacion: `select p.temporada, date(p.fecha) f, c.nombreCanonico rival, j.nombreCanonico jugador, pu.tipo, pu.cantidad
               from Puntuacion pu
               join Partido p on p.id = pu.partidoId
               join Club c on c.id = p.rivalId
               join Jugador j on j.id = pu.jugadorId`,
  Tarjeta: `select p.temporada, date(p.fecha) f, c.nombreCanonico rival, j.nombreCanonico jugador, t.tipo
            from Tarjeta t
            join Partido p on p.id = t.partidoId
            join Club c on c.id = p.rivalId
            join Jugador j on j.id = t.jugadorId`,
};

let totalDifs = 0;

for (const [tabla, sql] of Object.entries(CONSULTAS)) {
  const fa = filas(a, sql);
  const fb = filas(b, sql);

  const setB = new Map<string, number>();
  for (const r of fb) setB.set(r, (setB.get(r) ?? 0) + 1);
  const soloA: string[] = [];
  for (const r of fa) {
    const n = setB.get(r) ?? 0;
    if (n === 0) soloA.push(r);
    else setB.set(r, n - 1);
  }
  const soloB = [...setB.entries()].flatMap(([r, n]) => Array(n).fill(r));

  const ok = soloA.length === 0 && soloB.length === 0;
  console.log(
    `${ok ? "✅" : "❌"} ${tabla.padEnd(15)} A=${String(fa.length).padStart(5)}  B=${String(fb.length).padStart(5)}` +
      (ok ? "  idénticas" : `  sólo en A: ${soloA.length}, sólo en B: ${soloB.length}`)
  );
  if (!ok) {
    totalDifs += soloA.length + soloB.length;
    soloA.slice(0, 5).forEach((r) => console.log(`     sólo en A: ${r}`));
    soloB.slice(0, 5).forEach((r) => console.log(`     sólo en B: ${r}`));
  }
}

console.log(totalDifs === 0 ? "\n✅ Las dos bases son equivalentes." : `\n❌ ${totalDifs} diferencia(s).`);
process.exit(totalDifs === 0 ? 0 : 1);
