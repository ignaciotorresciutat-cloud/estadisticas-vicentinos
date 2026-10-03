# Planilla de carga de partidos (Google Sheets)

Reemplaza al Excel histórico ("Estadísticas V 2026.xlsx") como lugar donde se
cargan los partidos. Se carga **un partido por vez en una ficha**, con listas
desplegables y validaciones en el momento; todo lo demás (lista de partidos,
resúmenes por temporada, rankings, historial contra rivales, referees) se
calcula solo.

Todo lo que arma la planilla está en [`Codigo.gs`](Codigo.gs) (Apps Script):
la planilla en sí no se versiona, este script sí.

## Instalación (una sola vez, la hace el dueño de la planilla)

1. Abrir la Google Sheet vacía.
2. **Extensiones → Apps Script**.
3. Borrar lo que haya en `Código.gs`, pegar el contenido entero de
   [`Codigo.gs`](Codigo.gs) y guardar (ícono de disquete).
4. Arriba, en el selector de funciones, elegir **`configurar`** y tocar
   **Ejecutar**. Google pide autorizar el script (es tuyo): aceptar.
   - Pide permiso para editar la planilla y para conectarse a internet
     (baja el historial desde GitHub).
   - Si aparece "Google no verificó esta app": *Configuración avanzada →
     Ir a (nombre del proyecto)*. Es normal en scripts propios.
5. Tarda uno o dos minutos. Al terminar, la planilla tiene todas las hojas y
   los 287 partidos de 2014 a 2026.

Después de esto, quien cargue datos **no necesita autorizar nada**: las
casillas GUARDAR / LIMPIAR / ABRIR funcionan con un disparador simple
(`onEdit`), que no pide permisos.

## Cambiar el script con la planilla en uso

**`configurar` borra la planilla y la rearma desde el repo**: se pierden los
partidos cargados en la planilla que todavía no estén en el sitio. Desde que
la planilla tiene partidos reales (03/10/2026), los cambios se aplican así:

1. Pegar el `Codigo.gs` nuevo en Apps Script y guardar. Los cambios de
   comportamiento (lo que hacen las casillas y desplegables) ya funcionan.
2. Si el cambio toca fórmulas o diseño de las fichas, ejecutar
   **`actualizarPlanilla`** (también está en el menú *Vicentinos*): rehace
   las fórmulas de puntos y de CONTROL y corrige los N° de Vicentino, sin
   tocar PARTIDOS, las bases ni los catálogos. Se puede correr varias veces.

Si un cambio de diseño no entra en `actualizarPlanilla`, hay que agregarlo
ahí (no correr `configurar`).

## Hojas

| Hoja | Qué es |
|---|---|
| INICIO | Instrucciones para quien carga |
| CARGAR PARTIDO | La ficha, sólo para partidos nuevos. Lo único que se completa a mano, junto con FIXTURE, JUGADORES y CLUBES |
| FIXTURE | Fechas de la temporada (se cargan una vez). Elegir una en la ficha completa fecha, rival, condición y cancha |
| CORREGIR PARTIDO | Misma ficha, para corregir un partido ya cargado (pestaña roja, al final: casi no se usa) |
| PARTIDOS | Un partido por fila. Columna *Estado* con lo que no cierra |
| VER PARTIDO | Muestra un partido completo, sólo lectura |
| TEMPORADAS · RANKING JUGADORES · RIVALES · REFEREES | Resúmenes automáticos, con filtro por temporada |
| JUGADORES · CLUBES | Catálogos: de acá salen los desplegables |
| LISTAS | Referees, canchas, clima, campo, anotadores especiales y listas calculadas |
| BASE FORMACIONES · BASE PUNTOS · BASE TARJETAS | Los datos de cada partido en tablas (de acá va a leer el sitio) |

## Copiar la formación del partido anterior

Como el equipo suele repetirse de una fecha a la otra, la ficha **ya viene
con los 15 titulares y el capitán del partido anterior** (el último antes de
la fecha elegida): se copia sola al abrir la planilla, después de guardar y
al limpiar. Si se cambia la fecha del fixture sin haber tocado la formación,
se vuelve a copiar la que corresponde. Para no repetir los errores del viejo
"copiar y pegar el bloque":

- Copia **sólo la formación titular**. Fecha, rival, resultado, suplentes,
  puntos y tarjetas se cargan siempre de cero.
- Sólo funciona con la formación vacía y en un partido nuevo: nunca pisa lo
  que ya se cargó.
- Los titulares que se cambian quedan **en celeste**, y CONTROL muestra una
  advertencia con de qué partido se copió y cuántos quedaron iguales.

Los suplentes no llevan número: se cargan sólo con nombre y por quién
ingresaron.

## Otras ayudas de la ficha

- **Fixture:** arriba de la ficha, «Fecha del fixture» lista las fechas de
  la hoja FIXTURE que todavía no se cargaron. Elegir una completa fecha,
  rival, condición y cancha.
- **Listas acotadas:** «Ingresa por», anotadores y tarjetas sólo ofrecen a
  los que figuran en la formación o en los suplentes de ese partido (más
  TRY PENAL / TRY SCRUM en anotadores).
- **Puntos en vivo:** debajo de PUNTOS, «Faltan 7 para 36» / «Sobran 2» /
  «✅ Cierra con el resultado».
- **Cancha sugerida:** al elegir la condición, VICENTINOS si es local o la
  última cancha usada contra ese rival si es visitante (se puede cambiar).
- **Jugadores por actividad:** en el desplegable de la formación aparecen
  primero los que jugaron más recientemente.

## Validaciones de la ficha

Errores (❌, no deja guardar) y advertencias (⚠️, deja guardar):

- Fecha: falta, inválida, futura (❌) o anterior a 2014 (⚠️); ya hay otro
  partido ese día (❌).
- Rival que no está en CLUBES, falta condición o resultado (❌).
- Cancha / referee nuevos o vacíos, clima o campo vacíos (⚠️).
- Menos de 15 titulares (⚠️); jugador repetido (❌); nombres fuera de
  JUGADORES (❌).
- Capitán: ninguno (⚠️), más de uno (❌).
- Cambios: suplente sin "ingresa por", "ingresa por" sin suplente, o de
  alguien que no estaba jugando, o por sí mismo (❌); el mismo jugador
  reemplazado dos veces (⚠️).
- Puntos: anotador que no jugó o sin puntos, puntos sin anotador, más
  conversiones que tries, y **la suma de los anotadores tiene que dar el
  resultado** (❌). Si se cargó la conversión del try penal al pateador,
  lo marca (❌): el try penal ya la incluye. Anotador repetido en dos filas
  o TRY PENAL con conversiones/penales/drops (⚠️).
- Tarjetas: jugador que no jugó, falta el tipo, tipo sin jugador (❌). Dos
  amarillas no implican roja: no se valida.

## Decisiones tomadas

- **Try penal y try de scrum** son "anotadores especiales" (`TRY PENAL`,
  `TRY SCRUM`), sin jugador. En el historial aparecían también como `PENAL`
  y `SCRUM`: la planilla los unifica.
- **El try penal vale 7 (try + conversión):** en la ficha sólo se carga la
  cantidad (al elegir TRY PENAL se pone 1 solo). Se guarda en la base como
  un try y una conversión del anotador `TRY PENAL`, así suma 7 en todos
  lados. En el historial viejo a veces la conversión figura aparte al
  pateador (5 + 2): eso se respeta tal cual.
- **N° de Vicentino:** sólo para quien debuta de **titular** en primera, en
  orden de debut. Entrar de suplente no da número. Se asigna solo al
  guardar; `actualizarPlanilla` recalcula los de jugadores agregados en la
  planilla (sin ID sitio). En el historial hay 5 titulares sin N° (EMILIO
  CHAVES, MATÍAS COMPANYS, TOMÁS PARRA, JUAN PABLO OCCHIUZZI, AUGUSTO
  ROVETTA): pendiente de confirmar con el club.
- **Sin macros de Excel:** Apps Script corre en el navegador, sin alertas
  de seguridad, y los dos editores ven siempre la misma versión.
- **El sitio no lee la planilla en vivo.** El plan es un comando
  (`npm run importar-sheets`, todavía no existe) que la lea, regenere
  `data/base/`, corra `db:verificar` y deje el cambio para revisar antes de
  publicar.
