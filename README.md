# Estadísticas Vicentinos

El archivo histórico del Club Vicentinos: partido a partido desde 2014, con
formaciones, anotadores, tarjetas, fichas de jugador, cruces por rival y
récords del club.

## Stack

- **Next.js 16** (App Router) + React 19, renderizado en servidor
- **Tailwind v4** para los estilos
- **Prisma 7** sobre **SQLite**, con el driver adapter `better-sqlite3`
- Deploy en **Vercel**

## Los datos

La base (`prisma/dev.db`) **está versionada en el repo a propósito**: es la
fuente que lee el sitio en producción, y el sitio nunca escribe en ella
durante la ejecución. Cada commit es, por lo tanto, una foto completa y
recuperable de los datos en ese momento.

Los Excel de `data/` son el **origen histórico**, no la fuente activa. Se
usaron para la carga inicial y quedan archivados como respaldo. Las
correcciones posteriores ya están aplicadas dentro de la base: no hay que
reimportar nada para que el sitio muestre el dato correcto.

Los `.csv` de `data/` son tablas de equivalencia (nombres canónicos de clubes
y jugadores, camadas) y correcciones puntuales confirmadas a mano.

## Comandos

```bash
npm run dev                      # servidor de desarrollo
npm run build                    # build de producción
npm run analizar:resultados      # chequea que los resultados cierren con la suma de anotadores
```

Scripts de carga (histórico, ya no se corren en el día a día):

```bash
npm run migrate:excel            # importación aditiva desde los Excel
npm run corregir:resultados      # aplica data/resultados_correcciones.csv
npm run corregir:participaciones # aplica data/participacion_correcciones.csv
```

## Cómo se publica

El repo está conectado a Vercel: **cada push a `main` dispara un deploy**.
Lo que está publicado es siempre exactamente lo que está en `main`.

## Un detalle sobre los try penal

En el dataset conviven dos formas de anotar el try penal: como un try solo
(y entonces vale 7), o como un try más su conversión registrada aparte (5 + 2).
En los dos casos suma 7 en la cancha. Por eso cualquier validación de
"la suma de anotadores coincide con el resultado" tiene que aceptar ambas.
