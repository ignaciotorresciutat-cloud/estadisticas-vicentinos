# Cómo operar este repo desde Claude Code

Guía para retomar el proyecto en una sesión nueva de Claude Code (app de
escritorio, Code tab), cuando las carpetas temporales de sesiones anteriores
ya no existen. Todo lo de acá se aprendió a los golpes el 02/10/2026: está
verificado, no es teoría. Para qué es el proyecto, el stack y el modelo de
datos, ver el [README](README.md).

## Reglas de trabajo con Ignacio

- **Nunca hacer push sin su OK explícito.** Cada push a `main` publica en
  producción (Vercel). El flujo es: cambio → build → dejarlo corriendo en el
  preview (panel Browser) → decirle qué mirar → commit local → push sólo
  cuando él lo aprueba. Un OK vale para ese push, no para los siguientes.
- Un commit por tema, con mensaje en castellano que explique el porqué
  (`git log` es la bitácora del proyecto, ver README).
- No commitear los cambios locales de `package-lock.json` ni de
  `prisma/dev.db` que aparecen tras `npm install` / `npm run build`: son
  ruido del entorno (una línea `hasInstallScript` y la base regenerada, con
  los mismos datos según `db:comparar`). Hacer `git add` de archivos puntuales.

## El entorno (por qué todo es raro)

La sesión corre dentro de un sandbox de macOS que Ignacio **no controla**:
`~/.claude/settings.json` es de `root` (lo administra IT) y la memoria
persistente de Claude está bloqueada. Por eso esta guía vive en el repo. No
intentar cambiar el sandbox ni usar `sudo`.

Lo que el sandbox impide, y cómo se resuelve:

| Problema | Solución |
|---|---|
| No deja crear `.git` en la carpeta del proyecto de la sesión (`/private/tmp/proyecto-vicentinos`): `Operation not permitted` en `.git/config` y `.git/hooks` | Clonar en `$TMPDIR` (hoy `/tmp/claude-502`), no en la carpeta del proyecto |
| El `~/.gitconfig` global reescribe `https://github.com/` a SSH. Por SSH, la Mac entra como **`ignaciotorres-commits`** (cuenta del trabajo), que **no tiene permiso** en este repo; además el proxy del sandbox corta SSH | Usar la URL con el usuario adelante (ver abajo). Así no matchea la regla de reescritura, va por HTTPS y toma del Llavero la credencial de la cuenta personal **`ignaciotorresciutat-cloud`** |
| A mitad de sesión el sandbox puede dejar de permitir escribir `.git/config` (`git remote set-url` falla) | Clonar desde el principio con la URL correcta, así nunca hace falta tocar el remote |
| `~/.npm` no es escribible | `npm install --cache "$TMPDIR/npm-cache"` |
| `better-sqlite3` no trae binario para Node 26 y compila; node-gyp quiere escribir en `~/Library/Caches` | `npm_config_devdir="$TMPDIR/node-gyp"` |
| `@prisma/engines` baja binarios en el postinstall y el proxy corta la conexión (`ECONNRESET`) | Permitir el dominio `binaries.prisma.sh` en ese comando |
| Desde Bash no se llega a `localhost` (curl devuelve `000`) | Probar el sitio desde el panel Browser (`fetch` en la página, `read_page`, screenshots) |
| El preview (`preview_start`) lee `.claude/launch.json` de la carpeta del proyecto de la sesión, no del clon | Crear ese `launch.json` en la carpeta del proyecto apuntando al clon con `npm --prefix` (ver abajo) |

## Arrancar de cero, paso a paso

```bash
# 1. clonar (en $TMPDIR, con el usuario en la URL)
cd "$TMPDIR"
git clone https://ignaciotorresciutat-cloud@github.com/ignaciotorresciutat-cloud/estadisticas-vicentinos.git ev
cd ev

# 2. dependencias (con binaries.prisma.sh permitido)
npm_config_devdir="$TMPDIR/node-gyp" npm install --cache "$TMPDIR/npm-cache"

# 3. base + chequeos + build
npm run db:build
npm run db:verificar
npm run build
```

`git push` funciona tal cual desde el sandbox con esa URL (verificado con el
commit `411d464`). No hace falta `gh`, que además no está instalado.

### Preview en el panel Browser

Escribir en `<carpeta del proyecto de la sesión>/.claude/launch.json`
(reemplazar la ruta del clon por la real):

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "start",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["--prefix", "/tmp/claude-502/ev", "run", "start", "--", "-p", "3001"],
      "port": 3001
    }
  ]
}
```

y `preview_start` con `name: "start"`. Sirve el build de producción, que es lo
que más se parece a Vercel (páginas estáticas incluidas). Para ver un cambio:
`preview_stop` → `npm run build` → `preview_start` (el build pisa `.next/`
y no conviene hacerlo con el server levantado).

Si los screenshots del panel salen en blanco es porque el panel está oculto:
verificar por DOM (`javascript_tool`, `read_page`) o pedirle a Ignacio que
lo muestre.

### Si Ignacio quiere hacer el push él mismo

Desde su terminal (no tiene sandbox), con la URL de arriba ya configurada en
el clon:

```bash
git -C "$TMPDIR/ev" push origin main
```

Si alguna vez el clon quedó con la URL `https://github.com/...` pelada, el
push desde su terminal sale por SSH con la cuenta del trabajo y falla con
`Permission ... denied to ignaciotorres-commits`. Arreglo puntual:

```bash
GIT_CONFIG_GLOBAL=/dev/null git -C "$TMPDIR/ev" push https://github.com/ignaciotorresciutat-cloud/estadisticas-vicentinos.git main
```

## Problemas conocidos del tooling

- **`npm run lint` no corre**: `typescript-eslint` no soporta TypeScript 7.0,
  que es el del proyecto. Falla al cargar la config, antes de revisar nada.
  No afecta el build (que no corre el lint).
- `npm audit` reporta 8 vulnerabilidades (1 crítica, 6 altas) en
  dependencias; sin revisar todavía.
