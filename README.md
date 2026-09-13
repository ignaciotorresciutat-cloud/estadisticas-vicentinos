# Estadísticas Vicentinos

El archivo histórico del Club Vicentinos: partido a partido desde 2014, con
formaciones, anotadores, tarjetas, fichas de jugador, cruces por rival y
récords del club.

## Empezar de cero

Si esta carpeta no existe (el entorno de trabajo es una carpeta temporal que
puede perderse entre sesiones):

```bash
git clone https://github.com/ignaciotorresciutat-cloud/estadisticas-vicentinos.git
cd estadisticas-vicentinos
npm install
npm run build   # reconstruye prisma/dev.db desde data/base/ y compila
npm run dev
```

No hace falta pedirle nada a nadie ni reprocesar ningún Excel: todo lo que
hace falta para tener el sitio completo, con todos los datos, está en este
repo. `git log` es la bitácora de por qué se tomó cada decisión — antes de
repetir una discusión, vale la pena mirarlo.

## Stack

- **Next.js 16** (App Router) + React 19, renderizado en servidor
- **Tailwind v4** para los estilos
- **Prisma 7** sobre **SQLite**, con el driver adapter `better-sqlite3`
- Deploy en **Vercel**

## Los datos

**La fuente de verdad son los archivos de `data/base/`**, no la base binaria
ni ningún Excel:

```
data/base/
  clubes.json                 catálogo de rivales (con su id, que está en /historial/[clubId])
  jugadores.json              catálogo de jugadores (con su id, que está en /jugadores/[id])
  temporadas/2014.json ...    un archivo por temporada, con sus partidos completos
```

Cada partido es un bloque legible: resultado, cancha, clima, árbitro,
formación, cambios, anotadores y tarjetas. Corregir un dato es editar una
línea, y el cambio se ve como un diff normal en git.

`prisma/dev.db` es un **derivado**: lo reconstruye `npm run db:build` a partir
de esos archivos, y el build de producción lo regenera en cada deploy. Por eso
no puede "perderse" ni desincronizarse: si se borra o se corrompe, se
regenera igual.

Los Excel y los `.csv` de correcciones que quedan en `data/` son el **origen
histórico** de la carga inicial. Ya no se procesan: todo lo que aportaron,
incluidas las correcciones hechas a mano, está dentro de `data/base/`.

## Comandos

```bash
npm run dev           # servidor de desarrollo
npm run build         # reconstruye la base desde data/base/ y compila el sitio

npm run db:build      # reconstruye prisma/dev.db desde data/base/
npm run db:verificar   # chequea consistencia (sumas, fechas, referencias)
npm run db:comparar    # compara la base nueva contra el backup de la anterior
npm run db:export      # vuelca la base actual a data/base/ (sólo para migraciones puntuales)
```

`db:build` nunca pisa la base sin antes construir y validar la nueva en un
archivo aparte, y deja la anterior en `prisma/dev.db.bak`.

Los scripts con prefijo `archivo:` son la carga histórica desde los Excel.
Quedan por trazabilidad; no se corren en el día a día.

## Cómo se publica

El repo está conectado a Vercel: **cada push a `main` dispara un deploy**.
Lo que está publicado es siempre exactamente lo que está en `main`.

## Generación estática

Las páginas que no dependen de un filtro por URL (`/`, `/records`,
`/referees`, cada `/jugadores/[id]` y cada `/temporadas/[year]`) se generan
una sola vez **en el build**, no en cada visita: quedan como HTML ya armado,
servido desde el CDN de Vercel sin tocar la base. Como la base sólo cambia
con un deploy nuevo, no hace falta ningún `revalidate` — el próximo build ya
es la próxima actualización.

Las páginas con filtros por query string (`?orden=`, `?tab=`, `?temporada=`:
los listados de jugadores/camadas/historial, los rankings, `/buscar`, y las
fichas de `/camadas/[camada]` y `/historial/[clubId]`) siguen
renderizándose por request, porque necesitan saber qué pidió esa URL
puntual. No es un problema de configuración: es Next.js respondiendo a que
esas páginas leen `searchParams`.

## Un detalle sobre los try penal

En el dataset conviven dos formas de anotar el try penal: como un try solo
(y entonces vale 7), o como un try más su conversión registrada aparte (5 + 2).
En los dos casos suma 7 en la cancha. Por eso cualquier validación de
"la suma de anotadores coincide con el resultado" tiene que aceptar ambas.

## Pendientes conocidos

- **13 partidos cuya suma de anotadores no cierra** con ninguna de las dos
  reglas de arriba (datos incompletos, probablemente falta cargar algún
  punto). Se dejó así a propósito el 12/09 para no tocar sin confirmar cada
  caso con el club. `npm run db:verificar` los lista siempre actualizados,
  junto con cualquier otro que aparezca — no hace falta buscarlos a mano acá.
- **3 fechas con dos partidos el mismo día** (típico typo de fecha en la
  carga original): 2022-07-09, 2025-03-15, 2025-08-02. Mismo estado: sin
  confirmar con el club todavía, aparecen en `db:verificar`.
- **`public/temporadas/2025.jpg` pesa 5 MB** (foto de cámara sin comprimir,
  4284×5712). No afecta datos ni build, sólo el peso de esa página para el
  visitante. Pendiente de comprimir.
