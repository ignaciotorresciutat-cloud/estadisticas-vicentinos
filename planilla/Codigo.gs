/**
 * Planilla de carga de partidos — Club Vicentinos
 *
 * Arma la planilla completa (fichas, fixture, listas, base, resúmenes y
 * validaciones) dentro de una Google Sheet vacía, cargando el historial desde
 * el repo del sitio (data/base/ en GitHub), y maneja los botones de las fichas.
 *
 * Instalación: ver planilla/README.md. En corto: Extensiones → Apps Script,
 * pegar este archivo entero, guardar, y ejecutar `configurar` una vez.
 *
 * Los botones de las fichas (casillas y desplegables de arriba) funcionan con
 * el disparador simple onEdit: no piden permisos a quien carga los datos.
 */

const REPO_RAW = 'https://raw.githubusercontent.com/ignaciotorresciutat-cloud/estadisticas-vicentinos/main/data/base/';
const PRIMERA_TEMPORADA = 2014;

const H = {
  INICIO: 'INICIO',
  CARGA: 'CARGAR PARTIDO',
  FIX: 'FIXTURE',
  PARTIDOS: 'PARTIDOS',
  VER: 'VER PARTIDO',
  TEMP: 'TEMPORADAS',
  RANK: 'RANKING JUGADORES',
  RIV: 'RIVALES',
  REF: 'REFEREES',
  JUG: 'JUGADORES',
  CLUB: 'CLUBES',
  LIST: 'LISTAS',
  CORR: 'CORREGIR PARTIDO',
  FORM: 'BASE FORMACIONES',
  PTS: 'BASE PUNTOS',
  TARJ: 'BASE TARJETAS',
};

// las dos fichas comparten el mismo diseño; cada una tiene sus rangos con
// nombre con su prefijo (F_FECHA en la de carga, C_FECHA en la de corrección)
const FICHAS = { [H.CARGA]: 'F', [H.CORR]: 'C' };

// anotadores que no son una persona
const ESPECIALES = ['TRY PENAL', 'TRY SCRUM'];
// cómo aparecían escritos en la carga histórica
const NORMALIZAR_ANOTADOR = { SCRUM: 'TRY SCRUM', PENAL: 'TRY PENAL' };

const CLIMAS = ['BUENO', 'NUBLADO', 'LLOVIZNA', 'LLUVIOSO', 'VENTOSO', 'MUY VENTOSO', 'FRÍO', 'INESTABLE'];
const CAMPOS = ['MUY BUENO', 'BUENO', 'REGULAR', 'PESADO', 'BARROSO', 'MALO', 'ANEGADO'];
const CANCHA_LOCAL = 'VICENTINOS';
// último N° de Vicentino verificado del historial (MIGUEL ALMIRÓN, debut 10/05/2025).
// Del siguiente en adelante, la planilla los calcula por orden de debut como titular.
const ULTIMO_N_HISTORICO = 85;

// Fixture inicial: [temporada, fecha N°, 'aaaa-mm-dd', rival (como en CLUBES), 'LOCAL'|'VISITANTE', cancha opcional].
// Después se mantiene a mano en la hoja FIXTURE.
// 2026: URBA, 1° División B (fase regular, 26 fechas). Fuente: PDF del fixture de URBA.
const FIXTURE_INICIAL = [
  [2026, 1, '2026-03-14', 'CAR', 'VISITANTE'],
  [2026, 2, '2026-03-21', 'CUQ', 'LOCAL'],
  [2026, 3, '2026-03-28', 'LICEO NAVAL', 'VISITANTE'],
  [2026, 4, '2026-04-11', 'CLUB ITALIANO', 'LOCAL'],
  [2026, 5, '2026-04-18', 'SAN PATRICIO', 'VISITANTE'],
  [2026, 6, '2026-04-25', 'LICEO MILITAR', 'LOCAL'],
  [2026, 7, '2026-05-09', 'BANCO NACIÓN', 'VISITANTE'],
  [2026, 8, '2026-05-16', 'DELTA', 'VISITANTE'],
  [2026, 9, '2026-05-23', 'MANUEL BELGRANO', 'LOCAL'],
  [2026, 10, '2026-06-06', 'MARIANO MORENO', 'VISITANTE'],
  [2026, 11, '2026-06-13', 'MONTE GRANDE', 'LOCAL'],
  [2026, 12, '2026-06-20', 'SAN MARTIN', 'VISITANTE'],
  [2026, 13, '2026-07-04', 'DON BOSCO', 'LOCAL'],
  [2026, 14, '2026-07-11', 'CAR', 'LOCAL'],
  [2026, 15, '2026-07-18', 'CUQ', 'VISITANTE'],
  [2026, 16, '2026-08-01', 'LICEO NAVAL', 'LOCAL'],
  [2026, 17, '2026-08-15', 'CLUB ITALIANO', 'VISITANTE'],
  [2026, 18, '2026-08-22', 'SAN PATRICIO', 'LOCAL'],
  [2026, 19, '2026-08-29', 'LICEO MILITAR', 'VISITANTE'],
  [2026, 20, '2026-09-05', 'BANCO NACIÓN', 'LOCAL'],
  [2026, 21, '2026-09-12', 'DELTA', 'LOCAL'],
  [2026, 22, '2026-09-26', 'MANUEL BELGRANO', 'VISITANTE'],
  [2026, 23, '2026-10-03', 'MARIANO MORENO', 'LOCAL'],
  [2026, 24, '2026-10-10', 'MONTE GRANDE', 'VISITANTE'],
  [2026, 25, '2026-10-17', 'SAN MARTIN', 'LOCAL'],
  [2026, 26, '2026-10-24', 'DON BOSCO', 'VISITANTE'],
];

// ---- diseño de las fichas (igual en CARGAR y CORREGIR) ----
const F = {
  GUARDAR: 'D3', LIMPIAR: 'H3', INFO: 'C4',
  // bloque PARTIDO, a todo el ancho: etiquetas en C y G, valores en D:E y H:K.
  // Primero el selector (fixture en CARGAR, partido en CORREGIR), después lo
  // que se completa solo y al final lo que se carga a mano
  SEL: 'D7',
  FECHA: 'D8', TEMPORADA: 'H8', RIVAL: 'D9', COND: 'H9', CANCHA: 'D10',
  PF: 'D11', PC: 'H11', CLIMA: 'D12', CAMPO: 'H12', REF: 'D13', NOTA: 'H13',
  COPIAR: 'D14',                    // sólo en CARGAR: copiar formación del partido anterior
  TIT_FILA: 16, TIT_N: 15,          // filas 16..30: B=N°, C=jugador, D=capitán
  SUP_FILA: 34, SUP_N: 10,          // filas 34..43: B=contador, C=jugador, D=capitán, E=ingresa por
  PTS_FILA: 16, PTS_N: 13,          // filas 16..28: G=anotador, H..K=tries/conv/pen/drops, L=pts
  TARJ_FILA: 34, TARJ_N: 6,         // filas 34..39: G=jugador, H=tipo
  // columnas ocultas W..Z
  JUGARON_COL: 23,                  // W16..: los que jugaron este partido (desplegable de "ingresa por" y tarjetas)
  ANOT_COL: 24,                     // X16..: los que jugaron + TRY PENAL / TRY SCRUM (desplegable de anotadores)
  COPIA_DE: 'Y14', COPIA_COL: 25,   // Y: formación copiada, para marcar en celeste lo que cambió
  EDIT_ID: 'Z1', ERRORES: 'Z2', AVISOS: 'Z3',
  CHECK_FILA: 10, CHECK_N: 36,      // Z10..Z45: una validación por celda
};

// VER PARTIDO: filtro de temporada y selector de partido
const VER = { TEMP: 'D3', PARTIDO: 'D7' };

const AMARILLO = '#fff4c2';
const AUTO = '#e8eef5';      // celdas que se completan solas (se pueden cambiar igual)
const NARANJA_CLARO = '#fde7c8';
const CELESTE = '#dbeafe';
const NAVY = '#003868';
const GRIS = '#f1f3f6';
const ROJO = '#9c2b1f';

// =====================================================================
// Menú y botones
// =====================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Vicentinos')
    .addItem('Guardar partido', 'guardarPartido')
    .addItem('Limpiar ficha', 'limpiarFicha')
    .addSeparator()
    .addItem('Actualizar planilla (no borra datos)', 'actualizarPlanilla')
    .addItem('Numerar Vicentinos', 'numerarVicentinos')
    .addItem('Configurar planilla desde cero (BORRA lo cargado)…', 'configurar')
    .addToUi();
  // si la ficha está vacía, ya la deja con la próxima fecha del fixture sin cargar
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(H.CARGA);
  if (sh && sh.getRange(F.FECHA).getValue() === '' && sh.getRange(F.RIVAL).getValue() === '') preseleccionarFixture_(ss);
}

function onEdit(e) {
  const rango = e.range;
  const hoja = rango.getSheet().getName();
  // VER PARTIDO: al cambiar la temporada, el partido elegido (de otra temporada) se borra
  if (hoja === H.VER && rango.getA1Notation() === VER.TEMP) return rango.getSheet().getRange(VER.PARTIDO).clearContent();
  if (!(hoja in FICHAS) || rango.getNumRows() !== 1 || rango.getNumColumns() !== 1) return;
  const celda = rango.getA1Notation();
  const ss = e.source;
  const carga = hoja === H.CARGA;

  // casillas: se ejecuta la acción y se destildan solas
  if ([F.GUARDAR, F.LIMPIAR].includes(celda)) {
    if (rango.getValue() !== true) return;
    try {
      if (celda === F.GUARDAR) guardar_(ss, hoja);
      if (celda === F.LIMPIAR) limpiar_(ss, hoja, true);
    } finally {
      rango.setValue(false);
    }
    return;
  }
  // TRY PENAL: vale 7 (try + conversión), así que sólo hace falta la cantidad: se pone 1 solo
  const filaPts = rango.getRow();
  if (rango.getColumn() === 7 && filaPts >= F.PTS_FILA && filaPts < F.PTS_FILA + F.PTS_N && rango.getValue() === 'TRY PENAL') {
    const sh = rango.getSheet();
    if (sh.getRange(filaPts, 8).getValue() === '') sh.getRange(filaPts, 8).setValue(1);
    sh.getRange(filaPts, 9, 1, 3).clearContent();
    return;
  }
  // capitán (sólo titulares): hay uno solo, así que al tildar uno se destildan los demás
  const fila = rango.getRow();
  if (rango.getColumn() === 4 && fila >= F.TIT_FILA && fila < F.TIT_FILA + F.TIT_N) {
    if (rango.getValue() === true) desmarcarOtrosCapitanes_(rango.getSheet(), fila);
    return;
  }
  // desplegable de arriba: fixture (carga) o partido a corregir (corrección)
  if (celda === F.SEL && rango.getValue() !== '') {
    if (!carga) return abrir_(ss);
    const sh = ss.getSheetByName(H.CARGA);
    const recopiar = formacionSinTocar_(sh); // antes de cambiar la fecha
    aplicarFixture_(ss, true);
    if (recopiar) {
      // la formación todavía no se tocó: se trae la del partido anterior a la fecha nueva
      sh.getRange(F.TIT_FILA, 3, F.TIT_N, 1).clearContent();
      sh.getRange(F.TIT_FILA, 4, F.TIT_N, 1).setValue(false);
      sh.getRange(F.TIT_FILA, F.COPIA_COL, F.TIT_N, 1).clearContent();
      sh.getRange(F.COPIA_DE).clearContent();
      copiarFormacion_(ss, true);
    }
    return;
  }
  // cancha sugerida al elegir condición o rival
  if (carga && (celda === F.COND || celda === F.RIVAL)) sugerirCancha_(ss, ss.getSheetByName(H.CARGA));
}

function guardarPartido() { guardar_(SpreadsheetApp.getActive(), H.CARGA); }
function limpiarFicha() { limpiar_(SpreadsheetApp.getActive(), H.CARGA, true); }

// =====================================================================
// Guardar / corregir / limpiar
// =====================================================================

function guardar_(ss, hoja) {
  const sh = ss.getSheetByName(hoja);
  const correccion = hoja === H.CORR;
  const aviso = (msg) => ss.toast(msg, 'Vicentinos', 8);
  SpreadsheetApp.flush();

  const editId = correccion ? sh.getRange(F.EDIT_ID).getValue() : '';
  if (correccion && !editId) return aviso('Elegí arriba el partido a corregir.');
  const fecha = sh.getRange(F.FECHA).getValue();
  if (!(fecha instanceof Date)) return aviso('❌ No se guardó: falta la fecha.');
  const errores = Number(sh.getRange(F.ERRORES).getValue()) || 0;
  if (errores > 0) return aviso(`❌ No se guardó: hay ${errores} ${errores === 1 ? 'error' : 'errores'} marcados en CONTROL.`);

  // el año según la zona horaria de la planilla (la del script puede ser otra)
  const temporada = Number(Utilities.formatDate(fecha, ss.getSpreadsheetTimeZone(), 'yyyy'));
  const val = (a1) => sh.getRange(a1).getValue();

  const shP = ss.getSheetByName(H.PARTIDOS);
  const idsP = columna_(shP, 1);
  const id = editId || (idsP.length ? Math.max(...idsP.filter(Number)) + 1 : 1);

  const filaPartido = [id, fecha, temporada, val(F.RIVAL), val(F.COND), val(F.PF), val(F.PC),
    val(F.CANCHA), val(F.CLIMA), val(F.CAMPO), val(F.REF), val(F.NOTA)];

  const tit = sh.getRange(F.TIT_FILA, 2, F.TIT_N, 3).getValues().filter((r) => r[1] !== '');   // N°, jugador, capitán
  const sup = sh.getRange(F.SUP_FILA, 3, F.SUP_N, 3).getValues().filter((r) => r[0] !== '');   // jugador, (flecha), ingresa por
  const pts = sh.getRange(F.PTS_FILA, 7, F.PTS_N, 5).getValues().filter((r) => r[0] !== '');
  const tarj = sh.getRange(F.TARJ_FILA, 7, F.TARJ_N, 2).getValues().filter((r) => r[0] !== '');

  const filasForm = [
    ...tit.map((r, i) => [id, temporada, 'TITULAR', i + 1, r[0], r[1], r[2] === true, '']),
    ...sup.map((r, i) => [id, temporada, 'SUPLENTE', i + 1, '', r[0], false, r[2]]), // un suplente no es capitán
  ];
  const filasPts = pts.map((r, i) => {
    const tries = Number(r[1]) || 0;
    // TRY PENAL: se guarda como try + conversión, así suma 7 en cualquier lado (base, sitio, rankings)
    if (r[0] === 'TRY PENAL') return [id, temporada, i + 1, r[0], tries, tries, 0, 0];
    return [id, temporada, i + 1, r[0], tries, Number(r[2]) || 0, Number(r[3]) || 0, Number(r[4]) || 0];
  });
  const filasTarj = tarj.map((r, i) => [id, temporada, i + 1, r[0], r[1]]);

  // partido: en una corrección se pisa su fila; si es nuevo va al final
  if (editId) {
    const i = idsP.indexOf(editId);
    if (i < 0) return aviso(`❌ No encontré el partido #${editId} para actualizarlo.`);
    shP.getRange(i + 2, 1, 1, filaPartido.length).setValues([filaPartido]);
  } else {
    agregarFilas_(shP, [filaPartido]);
  }
  // base: se borran las filas viejas del partido y se escriben las nuevas
  [[H.FORM, filasForm], [H.PTS, filasPts], [H.TARJ, filasTarj]].forEach(([nombre, filas]) => {
    const base = ss.getSheetByName(nombre);
    borrarFilasDe_(base, id);
    agregarFilas_(base, filas);
  });

  const nP = columna_(shP, 1).length;
  if (nP > 1) shP.getRange(2, 1, nP, 12).sort([{ column: 2, ascending: true }, { column: 1, ascending: true }]);

  sumarALista_(ss, 1, val(F.REF));
  sumarALista_(ss, 2, val(F.CANCHA));
  // el N° de Vicentino es por debut como TITULAR: los que sólo entraron de suplente no reciben número
  asignarNumeroVicentino_(ss, tit.map((r) => r[1]));

  limpiar_(ss, hoja, false);
  const cuando = Utilities.formatDate(fecha, ss.getSpreadsheetTimeZone(), 'dd/MM/yyyy');
  aviso(correccion
    ? `✅ Corrección guardada: ${cuando} vs ${filaPartido[3]} (#${id}).`
    : `✅ Partido guardado: ${cuando} vs ${filaPartido[3]} (#${id}).`);
}

/** CORREGIR PARTIDO: carga en la ficha el partido elegido arriba */
function abrir_(ss) {
  const sh = ss.getSheetByName(H.CORR);
  const etiqueta = String(sh.getRange(F.SEL).getValue());
  const m = etiqueta.match(/#(\d+)$/);
  if (!m) return;
  const id = Number(m[1]);

  const p = filasDe_(ss.getSheetByName(H.PARTIDOS), id, 12)[0];
  if (!p) return ss.toast(`No encontré el partido #${id}.`, 'Vicentinos', 6);
  limpiarCampos_(sh);

  const set = (a1, v) => sh.getRange(a1).setValue(v);
  set(F.FECHA, p[1]); set(F.RIVAL, p[3]); set(F.COND, p[4]); set(F.PF, p[5]); set(F.PC, p[6]);
  set(F.CANCHA, p[7]); set(F.CLIMA, p[8]); set(F.CAMPO, p[9]); set(F.REF, p[10]); set(F.NOTA, p[11]);

  const form = filasDe_(ss.getSheetByName(H.FORM), id, 8);
  const sup = form.filter((r) => r[2] === 'SUPLENTE').sort((a, b) => a[3] - b[3]);

  const { grilla: grillaTit, desplazados, sinLugar } = grillaTitulares_(form);
  sh.getRange(F.TIT_FILA, 3, F.TIT_N, 2).setValues(grillaTit);

  const supJug = Array.from({ length: F.SUP_N }, () => ['']);
  const supIng = Array.from({ length: F.SUP_N }, () => ['']);
  sup.slice(0, F.SUP_N).forEach((r, i) => { supJug[i] = [r[5]]; supIng[i] = [r[7]]; });
  sh.getRange(F.SUP_FILA, 3, F.SUP_N, 1).setValues(supJug);
  sh.getRange(F.SUP_FILA, 5, F.SUP_N, 1).setValues(supIng);

  const pts = filasDe_(ss.getSheetByName(H.PTS), id, 8).sort((a, b) => a[2] - b[2]);
  const grillaPts = Array.from({ length: F.PTS_N }, () => ['', '', '', '', '']);
  pts.slice(0, F.PTS_N).forEach((r, i) => {
    // el TRY PENAL se muestra sólo con la cantidad (su conversión va incluida)
    grillaPts[i] = r[3] === 'TRY PENAL' ? [r[3], r[4] || '', '', '', ''] : [r[3], r[4] || '', r[5] || '', r[6] || '', r[7] || ''];
  });
  sh.getRange(F.PTS_FILA, 7, F.PTS_N, 5).setValues(grillaPts);

  const tarj = filasDe_(ss.getSheetByName(H.TARJ), id, 5).sort((a, b) => a[2] - b[2]);
  const grillaTarj = Array.from({ length: F.TARJ_N }, () => ['', '']);
  tarj.slice(0, F.TARJ_N).forEach((r, i) => { grillaTarj[i] = [r[3], r[4]]; });
  sh.getRange(F.TARJ_FILA, 7, F.TARJ_N, 2).setValues(grillaTarj);

  sh.getRange(F.EDIT_ID).setValue(id);
  sh.getRange(F.INFO).setValue(`Corrigiendo el partido #${id}. Al tildar GUARDAR CORRECCIÓN se reemplaza.`);

  if (sinLugar > 0 || sup.length > F.SUP_N || pts.length > F.PTS_N || tarj.length > F.TARJ_N) {
    ss.toast('⚠️ Este partido tiene más datos de los que entran en la ficha: revisalo antes de guardar.', 'Vicentinos', 10);
  } else if (desplazados > 0) {
    ss.toast('⚠️ Había números de camiseta repetidos: revisá la formación.', 'Vicentinos', 10);
  } else {
    ss.toast(`Partido #${id} listo para corregir.`, 'Vicentinos', 5);
  }
}

/**
 * CARGAR PARTIDO: copia los titulares (y el capitán) del partido anterior,
 * para editar sólo lo que cambia. Sólo la formación titular: fecha, rival,
 * resultado, suplentes, puntos y tarjetas se cargan siempre de cero.
 */
function copiarFormacion_(ss, silencioso) {
  const sh = ss.getSheetByName(H.CARGA);
  const aviso = (msg, s) => { if (!silencioso) ss.toast(msg, 'Vicentinos', s || 8); };
  const yaCargados = sh.getRange(F.TIT_FILA, 3, F.TIT_N, 1).getValues().filter((r) => r[0] !== '').length;
  if (yaCargados > 0) {
    return aviso(`La formación ya tiene ${yaCargados} ${yaCargados === 1 ? 'jugador' : 'jugadores'}: borralos (o tildá LIMPIAR) antes de copiar, para no pisar nada.`);
  }

  // el último partido antes de la fecha de la ficha (o el último cargado, si todavía no hay fecha)
  const shP = ss.getSheetByName(H.PARTIDOS);
  const n = columna_(shP, 1).length;
  if (!n) return aviso('Todavía no hay partidos cargados para copiar.');
  const fechaFicha = sh.getRange(F.FECHA).getValue();
  const tope = fechaFicha instanceof Date ? fechaFicha.getTime() : Infinity;
  const anterior = shP.getRange(2, 1, n, 4).getValues()
    .filter((r) => r[1] instanceof Date && r[1].getTime() < tope)
    .sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  if (!anterior) return aviso('No hay ningún partido cargado antes de esa fecha.');

  const { grilla } = grillaTitulares_(filasDe_(ss.getSheetByName(H.FORM), anterior[0], 8));
  sh.getRange(F.TIT_FILA, 3, F.TIT_N, 2).setValues(grilla);

  const desde = `${Utilities.formatDate(anterior[1], ss.getSpreadsheetTimeZone(), 'dd/MM/yyyy')} vs ${anterior[3]}`;
  sh.getRange(F.COPIA_DE).setValue(desde);
  sh.getRange(F.TIT_FILA, F.COPIA_COL, F.TIT_N, 1).setValues(grilla.map((g) => [g[0]]));
  aviso(`Formación copiada de ${desde}. Cambiá sólo los que no se repiten: quedan marcados en celeste.`, 10);
}

/** CARGAR PARTIDO: completa fecha, rival, condición y cancha con la fecha del fixture elegida */
function aplicarFixture_(ss, avisar) {
  const sh = ss.getSheetByName(H.CARGA);
  const etiqueta = sh.getRange(F.SEL).getValue();
  const fix = ss.getSheetByName(H.FIX);
  const n = columna_(fix, 3).length;
  const fila = n ? fix.getRange(2, 1, n, 8).getValues().find((r) => r[7] === etiqueta) : null;
  if (!fila) return ss.toast('No encontré esa fecha en la hoja FIXTURE.', 'Vicentinos', 6);

  const [, fechaN, fecha, rival, cond, cancha] = fila;
  sh.getRange(F.FECHA).setValue(fecha);
  sh.getRange(F.RIVAL).setValue(rival);
  sh.getRange(F.COND).setValue(cond);
  // la cancha del fixture o, si está vacía, la sugerida (calculada con los datos de la fila, sin releer la ficha)
  sh.getRange(F.CANCHA).setValue(cancha || canchaSugerida_(ss, rival, cond));
  sh.getRange(F.INFO).setValue(`Partido nuevo · Fecha ${fechaN} del fixture`);
  if (avisar) ss.toast(`Fecha ${fechaN}: completé fecha, rival, condición y cancha.`, 'Vicentinos', 6);
}

/** CARGAR PARTIDO: deja elegida la fecha más antigua del fixture que todavía no se cargó */
function preseleccionarFixture_(ss) {
  SpreadsheetApp.flush(); // que la lista de pendientes ya no incluya el partido recién guardado
  const sh = ss.getSheetByName(H.CARGA);
  const proxima = ss.getSheetByName(H.LIST).getRange('G2').getValue();
  if (!proxima) {
    sh.getRange(F.SEL).clearContent();
    sh.getRange(F.INFO).setValue('Partido nuevo · no quedan fechas del fixture sin cargar: completá los datos a mano.');
  } else {
    sh.getRange(F.SEL).setValue(proxima);
    aplicarFixture_(ss, false);
  }
  // la formación viene copiada del partido anterior: sólo hay que cambiar lo que no se repite
  copiarFormacion_(ss, true);
}

/** true si la formación está vacía o sigue igual a la copiada (no se editó a mano) */
function formacionSinTocar_(sh) {
  const actual = sh.getRange(F.TIT_FILA, 3, F.TIT_N, 1).getValues().map((r) => r[0]);
  const copia = sh.getRange(F.TIT_FILA, F.COPIA_COL, F.TIT_N, 1).getValues().map((r) => r[0]);
  if (actual.every((v) => v === '')) return true;
  return sh.getRange(F.COPIA_DE).getValue() !== '' && actual.every((v, i) => v === copia[i]);
}

/** si la cancha está vacía, propone VICENTINOS (local) o la última cancha usada contra ese rival (visitante) */
function sugerirCancha_(ss, sh) {
  if (sh.getRange(F.CANCHA).getDisplayValue() !== '') return;
  const sugerida = canchaSugerida_(ss, sh.getRange(F.RIVAL).getDisplayValue(), sh.getRange(F.COND).getDisplayValue());
  if (sugerida) sh.getRange(F.CANCHA).setValue(sugerida);
}

/** VICENTINOS si es local; de visitante, la última cancha usada contra ese rival (o el nombre del rival) */
function canchaSugerida_(ss, rival, cond) {
  if (cond === 'LOCAL') return CANCHA_LOCAL;
  if (cond !== 'VISITANTE' || !rival) return '';
  const shP = ss.getSheetByName(H.PARTIDOS);
  const n = columna_(shP, 1).length;
  const ultima = n ? shP.getRange(2, 1, n, 8).getValues()
    .filter((r) => r[3] === rival && r[4] === 'VISITANTE' && r[7] !== '')
    .sort((a, b) => b[1] - a[1])[0] : null;
  return ultima ? ultima[7] : rival;
}

/** deja tildado sólo el capitán de la fila indicada (titulares y suplentes) */
function desmarcarOtrosCapitanes_(sh, filaElegida) {
  [[F.TIT_FILA, F.TIT_N], [F.SUP_FILA, F.SUP_N]].forEach(([desde, n]) => {
    const rango = sh.getRange(desde, 4, n, 1);
    const vals = rango.getValues();
    let cambio = false;
    vals.forEach((v, i) => {
      if (v[0] === true && desde + i !== filaElegida) { v[0] = false; cambio = true; }
    });
    if (cambio) rango.setValues(vals);
  });
}

/** ubica a los titulares de un partido en las 15 filas de la ficha, por número de camiseta */
function grillaTitulares_(filasForm) {
  const tit = filasForm.filter((r) => r[2] === 'TITULAR').sort((a, b) => a[3] - b[3]);
  const grilla = Array.from({ length: F.TIT_N }, () => ['', false]);
  const sobrantes = [];
  tit.forEach((r) => {
    const n = Number(r[4]);
    if (n >= 1 && n <= F.TIT_N && grilla[n - 1][0] === '') grilla[n - 1] = [r[5], r[6] === true];
    else sobrantes.push(r);
  });
  let sinLugar = 0;
  sobrantes.forEach((r) => {
    const libre = grilla.findIndex((g) => g[0] === '');
    if (libre >= 0) grilla[libre] = [r[5], r[6] === true];
    else sinLugar++;
  });
  return { grilla, desplazados: sobrantes.length, sinLugar };
}

function limpiar_(ss, hoja, avisar) {
  const sh = ss.getSheetByName(hoja);
  limpiarCampos_(sh);
  sh.getRange(F.SEL).clearContent();
  if (hoja === H.CARGA) preseleccionarFixture_(ss);
  if (avisar) ss.toast(hoja === H.CORR ? 'Corrección descartada.' : 'Ficha limpia: quedó lista la próxima fecha del fixture.', 'Vicentinos', 5);
}

function limpiarCampos_(sh) {
  [F.FECHA, F.RIVAL, F.COND, F.PF, F.PC, F.CANCHA, F.CLIMA, F.CAMPO, F.REF, F.NOTA, F.EDIT_ID, F.COPIA_DE, F.INFO]
    .forEach((a1) => sh.getRange(a1).clearContent());
  sh.getRange(F.TIT_FILA, 3, F.TIT_N, 1).clearContent();
  sh.getRange(F.TIT_FILA, 4, F.TIT_N, 1).setValue(false);
  sh.getRange(F.TIT_FILA, F.COPIA_COL, F.TIT_N, 1).clearContent();
  sh.getRange(F.SUP_FILA, 3, F.SUP_N, 1).clearContent();
  sh.getRange(F.SUP_FILA, 5, F.SUP_N, 1).clearContent();
  sh.getRange(F.PTS_FILA, 7, F.PTS_N, 5).clearContent();
  sh.getRange(F.TARJ_FILA, 7, F.TARJ_N, 2).clearContent();
}

// ---- helpers de hoja ----

/** valores no vacíos de una columna, desde la fila 2 */
function columna_(sh, col) {
  const n = sh.getMaxRows() - 1;
  if (n < 1) return [];
  const vals = sh.getRange(2, col, n, 1).getValues().map((r) => r[0]);
  let ultimo = vals.length - 1;
  while (ultimo >= 0 && vals[ultimo] === '') ultimo--;
  return vals.slice(0, ultimo + 1);
}

function agregarFilas_(sh, filas) {
  if (!filas.length) return;
  const desde = columna_(sh, 1).length + 2;
  const faltan = desde + filas.length - 1 - sh.getMaxRows();
  if (faltan > 0) sh.insertRowsAfter(sh.getMaxRows(), faltan + 200);
  sh.getRange(desde, 1, filas.length, filas[0].length).setValues(filas);
}

function filasDe_(sh, id, ancho) {
  const n = columna_(sh, 1).length;
  if (!n) return [];
  return sh.getRange(2, 1, n, ancho).getValues().filter((r) => r[0] === id);
}

function borrarFilasDe_(sh, id) {
  const ids = columna_(sh, 1);
  for (let i = ids.length - 1; i >= 0; i--) {
    if (ids[i] !== id) continue;
    let j = i;
    while (j - 1 >= 0 && ids[j - 1] === id) j--;
    sh.deleteRows(j + 2, i - j + 1);
    i = j;
  }
}

function sumarALista_(ss, col, valor) {
  if (valor === '' || valor === null) return;
  const sh = ss.getSheetByName(H.LIST);
  const vals = columna_(sh, col);
  if (vals.includes(valor)) return;
  sh.getRange(vals.length + 2, col).setValue(valor);
}

function asignarNumeroVicentino_(ss, nombres) {
  const sh = ss.getSheetByName(H.JUG);
  const n = columna_(sh, 2).length;
  if (!n) return;
  const rango = sh.getRange(2, 2, n, 2);
  const filas = rango.getValues();
  let max = Math.max(0, ...filas.map((r) => Number(r[1]) || 0));
  let cambio = false;
  nombres.forEach((nombre) => {
    const f = filas.find((r) => r[0] === nombre);
    if (f && f[1] === '') { f[1] = ++max; cambio = true; }
  });
  if (cambio) rango.setValues(filas);
}

// =====================================================================
// Actualizar una planilla en uso (sin borrar datos)
// =====================================================================

/**
 * Aplica los cambios de diseño y fórmulas de las fichas sobre la planilla
 * actual, sin tocar PARTIDOS, las bases ni los catálogos. Es lo que hay que
 * correr cuando la planilla ya tiene partidos cargados (configurar los borra).
 * Se puede correr más de una vez.
 */
function actualizarPlanilla() {
  const ss = SpreadsheetApp.getActive();
  // primero lo que toca datos (rápido); después las fórmulas
  const cambios = renumerarVicentinosNuevos_(ss);
  SpreadsheetApp.flush();

  // No se cambia el idioma de la planilla (eso la recarga en el navegador y
  // corta la ejecución): las fórmulas se pasan al separador del idioma actual.
  SEPARADOR_ES = !String(ss.getSpreadsheetLocale()).startsWith('en');
  try {
    Object.entries(FICHAS).forEach(([hoja, P]) => {
      const sh = ss.getSheetByName(hoja);
      escribirFormulasPuntos_(sh, P);
      escribirChecks_(sh, P, hoja === H.CARGA);
    });
    // la formación ya se copia sola: fuera la casilla "Volver a copiar la anterior"
    const carga = ss.getSheetByName(H.CARGA);
    carga.getRange(F.COPIAR).removeCheckboxes().clearContent().clearNote().setBackground(null);
    carga.getRange('E14').clearContent();
  } finally {
    SEPARADOR_ES = false;
  }

  avisarNumeros_(ss, cambios, 'Planilla actualizada: fichas al día (try penal a 7, sin casilla de copiar).');
}

/** sólo la numeración de Vicentinos, sin tocar fórmulas */
function numerarVicentinos() {
  const ss = SpreadsheetApp.getActive();
  avisarNumeros_(ss, renumerarVicentinosNuevos_(ss), 'Numeración de Vicentinos revisada.');
}

function avisarNumeros_(ss, cambios, titulo) {
  const texto = cambios.length ? `N° de Vicentino corregidos:\n${cambios.join('\n')}` : 'Los N° de Vicentino ya estaban bien.';
  Logger.log(`${titulo}\n${texto}`);
  ss.toast(cambios.length ? `${cambios.length} N° de Vicentino corregidos (detalle en la ventana).` : texto, 'Vicentinos', 10);
  try {
    SpreadsheetApp.getUi().alert(titulo, texto, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    // sin interfaz (por ejemplo, desde un disparador): queda el detalle en el registro
  }
}

// Fórmulas escritas con "," (en_US). Con la planilla en español, al escribirlas
// sin cambiar el idioma hay que pasar las comas que separan argumentos a ";"
// (las comas dentro de textos entre comillas no se tocan).
let SEPARADOR_ES = false;
function fml_(formula) {
  if (!SEPARADOR_ES) return formula;
  let dentroDeTexto = false;
  return formula.split('').map((c) => {
    if (c === '"') dentroDeTexto = !dentroDeTexto;
    return c === ',' && !dentroDeTexto ? ';' : c;
  }).join('');
}

/**
 * Recalcula el N° de Vicentino de los jugadores que no tienen uno histórico
 * fijo: los agregados en la planilla (sin ID sitio) y los del historial que
 * fueron titulares pero quedaron sin N°. Sólo lo reciben los que jugaron de
 * titular, en orden de su primer partido como titular, a continuación del
 * último N° histórico. Los N° históricos (con ID sitio) no se tocan.
 * Devuelve la lista de cambios ("NOMBRE: antes → ahora").
 */
function renumerarVicentinosNuevos_(ss) {
  const shJ = ss.getSheetByName(H.JUG);
  const n = columna_(shJ, 2).length;
  if (!n) return [];
  const filas = shJ.getRange(2, 1, n, 3).getValues(); // ID sitio, nombre, N°
  // fijos: sólo los N° históricos ya verificados (1..ULTIMO_N_HISTORICO). Del
  // siguiente en adelante se recalcula todo, aunque el jugador tenga ID sitio:
  // así se corrige cualquier número mal asignado al guardar.
  const fijo = (r) => r[0] !== '' && r[2] !== '' && Number(r[2]) <= ULTIMO_N_HISTORICO;
  const base = ULTIMO_N_HISTORICO;

  const shP = ss.getSheetByName(H.PARTIDOS);
  const nP = columna_(shP, 1).length;
  const fechaDe = new Map(nP ? shP.getRange(2, 1, nP, 2).getValues().map((r) => [r[0], r[1]]) : []);
  const shF = ss.getSheetByName(H.FORM);
  const nF = columna_(shF, 1).length;
  // orden de debut: fecha del partido, después ID del partido, después N° de camiseta
  const antes = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  const debut = new Map(); // nombre -> clave del primer partido como titular
  (nF ? shF.getRange(2, 1, nF, 6).getValues() : []).forEach(([id, , rol, , num, jugador]) => {
    if (rol !== 'TITULAR') return;
    const clave = [new Date(fechaDe.get(id) || 0).getTime(), id, Number(num) || 0];
    const previo = debut.get(jugador);
    if (!previo || antes(clave, previo) < 0) debut.set(jugador, clave);
  });

  const nuevos = filas.map((r, i) => ({ i, nombre: r[1], antes: r[2], debut: debut.get(r[1]) })).filter((x) => !fijo(filas[x.i]));
  const conDebut = nuevos.filter((x) => x.debut).sort((a, b) => antes(a.debut, b.debut));
  const nuevoN = new Map(conDebut.map((x, k) => [x.i, base + k + 1]));

  const cambios = [];
  nuevos.forEach((x) => {
    const ahora = nuevoN.get(x.i) || '';
    if (String(x.antes) !== String(ahora)) {
      cambios.push(`${x.nombre}: ${x.antes === '' ? 'sin N°' : x.antes} → ${ahora === '' ? 'sin N° (no fue titular)' : ahora}`);
      filas[x.i][2] = ahora;
    }
  });
  if (cambios.length) shJ.getRange(2, 3, n, 1).setValues(filas.map((r) => [r[2]]));
  return cambios;
}

// =====================================================================
// Configuración inicial
// =====================================================================

function configurar() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();
  if (ss.getSheetByName(H.PARTIDOS)) {
    const r = ui.alert('Configurar desde cero',
      'Esto borra TODAS las hojas y la vuelve a armar con los datos del repo: SE PIERDEN los partidos cargados en esta planilla que todavía no estén en el sitio. Para aplicar cambios sin perder datos, usá «Actualizar planilla». ¿Seguimos igual?',
      ui.ButtonSet.YES_NO);
    if (r !== ui.Button.YES) return;
  }

  ss.setSpreadsheetTimeZone('America/Argentina/Buenos_Aires');
  // HOY() (estado del fixture, "fecha posterior a hoy") sólo se actualiza al
  // editar; recalculando cada hora, el estado cambia solo al pasar el día
  ss.setRecalculationInterval(SpreadsheetApp.RecalculationInterval.HOUR);
  // setFormula interpreta las fórmulas según el idioma de la planilla: en
  // es_AR el separador es ";" y todas las de este script (con ",") darían
  // #ERROR!. Se escriben en en_US y recién al final se pasa a es_AR; Sheets
  // las traduce solo.
  ss.setSpreadsheetLocale('en_US');

  const datos = construirDatos_(descargarBase_());

  // hojas limpias, en orden
  const tmp = ss.insertSheet('_tmp_' + Date.now());
  ss.getSheets().forEach((s) => { if (s.getSheetId() !== tmp.getSheetId()) ss.deleteSheet(s); });
  ss.getNamedRanges().forEach((n) => n.remove());
  const orden = [H.INICIO, H.CARGA, H.FIX, H.PARTIDOS, H.VER, H.TEMP, H.RANK, H.RIV, H.REF,
    H.JUG, H.CLUB, H.LIST, H.CORR, H.FORM, H.PTS, H.TARJ];
  const hojas = {};
  orden.forEach((nombre, i) => { hojas[nombre] = ss.insertSheet(nombre, i); });
  ss.deleteSheet(tmp);

  // 1. datos
  escribirTabla_(hojas[H.JUG], ['ID sitio', 'Nombre', 'N° Vicentino', 'Camada', 'Notas'], datos.jugadores);
  escribirTabla_(hojas[H.CLUB], ['ID sitio', 'Nombre'], datos.clubes);
  escribirTabla_(hojas[H.PARTIDOS],
    ['ID', 'Fecha', 'Temporada', 'Rival', 'Condición', 'Vicentinos', 'Rival (tantos)', 'Cancha', 'Clima', 'Campo', 'Referee', 'Nota'],
    datos.partidos);
  escribirTabla_(hojas[H.FORM], ['ID partido', 'Temporada', 'Rol', 'Orden', 'N°', 'Jugador', 'Capitán', 'Ingresa por'], datos.formaciones);
  escribirTabla_(hojas[H.PTS], ['ID partido', 'Temporada', 'Orden', 'Anotador', 'Tries', 'Conv.', 'Penales', 'Drops'], datos.puntos);
  escribirTabla_(hojas[H.TARJ], ['ID partido', 'Temporada', 'Orden', 'Jugador', 'Tipo'], datos.tarjetas);
  escribirTabla_(hojas[H.FIX], ['Temporada', 'Fecha N°', 'Fecha', 'Rival', 'Condición', 'Cancha'], datos.fixture);
  hojas[H.PARTIDOS].getRange('B2:B').setNumberFormat('dd/mm/yyyy');
  armarListas_(hojas[H.LIST], datos);

  // 2. rangos con nombre (hacen legibles las fórmulas)
  crearNombres_(ss, hojas);

  // 3. columnas calculadas, fichas y hojas de consulta
  formulasBase_(hojas);
  armarFixture_(hojas[H.FIX]);
  armarFicha_(ss, hojas[H.CARGA], 'F', false);
  armarFicha_(ss, hojas[H.CORR], 'C', true);
  armarVer_(hojas[H.VER], datos.ultimaTemporada);
  armarTemporadas_(hojas[H.TEMP], datos.infoTemporadas);
  armarRanking_(hojas[H.RANK]);
  armarRivales_(hojas[H.RIV]);
  armarReferees_(hojas[H.REF]);
  armarInicio_(hojas[H.INICIO]);

  // 4. protecciones (sólo advierten: no bloquean a nadie). Los selectores de
  // las hojas de consulta quedan libres, para que elegir no dispare el aviso.
  const selectores = { [H.VER]: ['D3:E3', 'D7:K7'], [H.RANK]: ['C2:C3'], [H.RIV]: ['C2'], [H.REF]: ['C2'] };
  [H.PARTIDOS, H.FORM, H.PTS, H.TARJ, H.VER, H.TEMP, H.RANK, H.RIV, H.REF].forEach((n) => {
    const prot = hojas[n].protect().setDescription('Se completa sola desde CARGAR PARTIDO').setWarningOnly(true);
    if (selectores[n]) prot.setUnprotectedRanges(selectores[n].map((a1) => hojas[n].getRange(a1)));
  });

  const colores = { [H.CARGA]: '#f89c38', [H.FIX]: '#f89c38', [H.PARTIDOS]: NAVY, [H.VER]: NAVY, [H.CORR]: ROJO };
  Object.entries(colores).forEach(([n, c]) => hojas[n].setTabColor(c));
  [H.FORM, H.PTS, H.TARJ].forEach((n) => hojas[n].setTabColor('#9aa9b8'));

  SpreadsheetApp.flush();
  ss.setSpreadsheetLocale('es_AR');
  preseleccionarFixture_(ss);
  ss.setActiveSheet(hojas[H.INICIO]);
  ui.alert('Listo', `Planilla armada con ${datos.partidos.length} partidos (${PRIMERA_TEMPORADA}–${datos.ultimaTemporada}).`, ui.ButtonSet.OK);
}

function descargarBase_() {
  const bajar = (ruta) => {
    const r = UrlFetchApp.fetch(REPO_RAW + ruta, { muteHttpExceptions: true });
    return r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) : null;
  };
  const temporadas = [];
  const hasta = new Date().getFullYear();
  for (let anio = PRIMERA_TEMPORADA; anio <= hasta; anio++) {
    const t = bajar(`temporadas/${anio}.json`);
    if (t) temporadas.push(t);
  }
  return { clubes: bajar('clubes.json'), jugadores: bajar('jugadores.json'), temporadas };
}

/** número de serie de fecha (días desde 30/12/1899), sin hora: igual que una fecha cargada a mano */
function serieFecha_(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
}

/** pasa del formato del repo (un JSON por temporada) a las tablas de la planilla */
function construirDatos_(base) {
  const jugadores = base.jugadores
    .filter((j) => j.esJugadorReal)
    .sort((a, b) => (a.vicentinoN || 1e9) - (b.vicentinoN || 1e9) || a.nombre.localeCompare(b.nombre))
    .map((j) => [j.id, j.nombre, j.vicentinoN || '', j.camada || '', '']);
  const clubes = base.clubes
    .slice().sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map((c) => [c.id, c.nombre]);

  const todos = [];
  base.temporadas.forEach((t) => t.partidos.forEach((p) => todos.push({ temporada: t.temporada, p })));
  todos.sort((a, b) => (a.p.fecha < b.p.fecha ? -1 : a.p.fecha > b.p.fecha ? 1 : 0));

  const partidos = [], formaciones = [], puntos = [], tarjetas = [];
  const referees = new Set(), canchas = new Set([CANCHA_LOCAL]);
  todos.forEach(({ temporada, p }, i) => {
    const id = i + 1;
    partidos.push([id, serieFecha_(p.fecha), temporada, p.rival, p.condicion, p.resultadoPropio, p.resultadoRival,
      p.cancha || '', p.clima || '', p.campoDeJuego || '', p.referee || '', p.fechaNota || '']);
    if (p.referee) referees.add(p.referee);
    if (p.cancha) canchas.add(p.cancha);

    p.formacion.slice().sort((a, b) => a.numero - b.numero).forEach((f, k) => {
      formaciones.push([id, temporada, 'TITULAR', k + 1, f.numero, f.jugador, f.capitan === true, '']);
    });
    (p.cambios || []).forEach((c, k) => {
      formaciones.push([id, temporada, 'SUPLENTE', k + 1, '', c.jugador, c.capitan === true, c.entraPor || '']);
    });

    const porAnotador = new Map();
    (p.puntos || []).forEach((x) => {
      const nombre = NORMALIZAR_ANOTADOR[x.jugador] || x.jugador;
      if (!porAnotador.has(nombre)) porAnotador.set(nombre, { TRY: 0, CONVERSION: 0, PENAL: 0, DROP: 0 });
      porAnotador.get(nombre)[x.tipo] += x.cantidad;
    });
    [...porAnotador.entries()].forEach(([nombre, c], k) => {
      puntos.push([id, temporada, k + 1, nombre, c.TRY, c.CONVERSION, c.PENAL, c.DROP]);
    });

    (p.tarjetas || []).forEach((t, k) => tarjetas.push([id, temporada, k + 1, t.jugador, t.tipo]));
  });

  const infoTemporadas = base.temporadas.map((t) => {
    const i = t.info || {};
    return [t.temporada, i.torneo || '', i.posicion || '', i.rankingUrba || '',
      i.campeon ? 'SÍ' : '', i.ascenso ? 'SÍ' : '', i.descenso ? 'SÍ' : '', i.nota || ''];
  });

  // cancha del fixture: la indicada, o VICENTINOS si es local, o la última cancha
  // en la que se jugó de visitante contra ese rival (se puede corregir en la hoja)
  const ultimaCanchaVisitante = (rival) => {
    const previos = todos.filter(({ p }) => p.rival === rival && p.condicion === 'VISITANTE' && p.cancha);
    return previos.length ? previos[previos.length - 1].p.cancha : '';
  };
  const fixture = FIXTURE_INICIAL.map(([temp, n, iso, rival, cond, cancha]) => [temp, n, serieFecha_(iso), rival, cond,
    cancha || (cond === 'LOCAL' ? CANCHA_LOCAL : ultimaCanchaVisitante(rival))]);

  return {
    jugadores, clubes, partidos, formaciones, puntos, tarjetas, infoTemporadas, fixture,
    referees: [...referees].sort(), canchas: [...canchas].sort(),
    ultimaTemporada: Math.max(...base.temporadas.map((t) => t.temporada)),
  };
}

function escribirTabla_(sh, encabezado, filas) {
  const total = filas.length + 1;
  if (sh.getMaxRows() < total + 300) sh.insertRowsAfter(sh.getMaxRows(), total + 300 - sh.getMaxRows());
  sh.getRange(1, 1, 1, encabezado.length).setValues([encabezado]);
  if (filas.length) sh.getRange(2, 1, filas.length, encabezado.length).setValues(filas);
  estiloEncabezado_(sh.getRange(1, 1, 1, encabezado.length));
  sh.setFrozenRows(1);
}

function estiloEncabezado_(rango) {
  rango.setBackground(NAVY).setFontColor('#ffffff').setFontWeight('bold');
}

function armarListas_(sh, datos) {
  const cols = [
    ['Referees', datos.referees], ['Canchas', datos.canchas], ['Clima', CLIMAS],
    ['Campo de juego', CAMPOS], ['Anotadores especiales', ESPECIALES],
  ];
  const alto = Math.max(...cols.map((c) => c[1].length)) + 300;
  if (sh.getMaxRows() < alto) sh.insertRowsAfter(sh.getMaxRows(), alto - sh.getMaxRows());
  cols.forEach(([titulo, vals], i) => {
    sh.getRange(1, i + 1).setValue(titulo);
    if (vals.length) sh.getRange(2, i + 1, vals.length, 1).setValues(vals.map((v) => [v]));
  });
  // listas calculadas (para los desplegables)
  sh.getRange('F1').setFormula('=VSTACK("Temporadas","Todas",IFERROR(SORT(UNIQUE(FILTER(PARTIDOS!C2:C,PARTIDOS!C2:C<>"")),1,FALSE),""))');
  sh.getRange('G1').setFormula('=VSTACK("Fixture sin cargar",IFERROR(FILTER(FIXTURE!H2:H,FIXTURE!H2:H<>"",FIXTURE!G2:G<>"✅ Cargado"),""))');
  sh.getRange('H1').setFormula('=VSTACK("Partidos (más nuevo primero)",IFERROR(SORT(FILTER(PARTIDOS!M2:M,PARTIDOS!M2:M<>""),1,FALSE),""))');
  // jugadores: primero los que jugaron más recientemente (los del plantel actual quedan arriba)
  sh.getRange('I1').setFormula('=VSTACK("Jugadores (más recientes primero)",LET(n,FILTER(JUGADORES!B2:B,JUGADORES!B2:B<>""),' +
    'ult,MAP(n,LAMBDA(x,IFERROR(MAXIFS(\'BASE FORMACIONES\'!A2:A,\'BASE FORMACIONES\'!F2:F,x),0))),SORT(n,ult,FALSE,n,TRUE)))');
  sh.getRange('J1').setFormula('=VSTACK("Clubes (A-Z)",SORT(FILTER(CLUBES!B2:B,CLUBES!B2:B<>"")))');
  estiloEncabezado_(sh.getRange('A1:J1'));
  sh.getRange('F1:J1').setBackground('#46658a');
  sh.setFrozenRows(1);
  sh.setColumnWidths(1, 10, 190);
  sh.getRange('A1').setNote('Referees y Canchas se completan solas al guardar un partido con uno nuevo. Se pueden editar a mano. Columnas F a J: se calculan solas, no tocar.');
}

function crearNombres_(ss, h) {
  const n = (nombre, hoja, a1) => ss.setNamedRange(nombre, h[hoja].getRange(a1));
  // listas
  n('L_JUG', H.JUG, 'B2:B'); n('L_CLUB', H.CLUB, 'B2:B'); n('L_REF', H.LIST, 'A2:A');
  n('L_CANCHA', H.LIST, 'B2:B'); n('L_ESP', H.LIST, 'E2:E');
  // partidos
  n('PA_ID', H.PARTIDOS, 'A2:A'); n('PA_FECHA', H.PARTIDOS, 'B2:B'); n('PA_TEMP', H.PARTIDOS, 'C2:C');
  n('PA_RIVAL', H.PARTIDOS, 'D2:D'); n('PA_COND', H.PARTIDOS, 'E2:E'); n('PA_PF', H.PARTIDOS, 'F2:F');
  n('PA_PC', H.PARTIDOS, 'G2:G'); n('PA_REF', H.PARTIDOS, 'K2:K'); n('PA_ETIQ', H.PARTIDOS, 'M2:M');
  n('PA_RES', H.PARTIDOS, 'N2:N');
  // base
  n('BF_ID', H.FORM, 'A2:A'); n('BF_TEMP', H.FORM, 'B2:B'); n('BF_ROL', H.FORM, 'C2:C');
  n('BF_JUG', H.FORM, 'F2:F'); n('BF_CAP', H.FORM, 'G2:G'); n('BF_ING', H.FORM, 'H2:H');
  n('BF_INGOK', H.FORM, 'I2:I');
  n('BP_ID', H.PTS, 'A2:A'); n('BP_TEMP', H.PTS, 'B2:B'); n('BP_JUG', H.PTS, 'D2:D');
  n('BP_TRIES', H.PTS, 'E2:E'); n('BP_CONV', H.PTS, 'F2:F'); n('BP_PEN', H.PTS, 'G2:G');
  n('BP_DROP', H.PTS, 'H2:H'); n('BP_PTS', H.PTS, 'I2:I'); n('BP_JUGO', H.PTS, 'J2:J');
  n('BT_ID', H.TARJ, 'A2:A'); n('BT_TEMP', H.TARJ, 'B2:B'); n('BT_JUG', H.TARJ, 'D2:D');
  n('BT_TIPO', H.TARJ, 'E2:E'); n('BT_JUGO', H.TARJ, 'F2:F');
  // fichas (mismos nombres con distinto prefijo)
  Object.entries(FICHAS).forEach(([hoja, P]) => {
    const f = (sufijo, a1) => n(`${P}_${sufijo}`, hoja, a1);
    const t0 = F.TIT_FILA, t1 = F.TIT_FILA + F.TIT_N - 1;
    const s0 = F.SUP_FILA, s1 = F.SUP_FILA + F.SUP_N - 1;
    const p0 = F.PTS_FILA, p1 = F.PTS_FILA + F.PTS_N - 1;
    const k0 = F.TARJ_FILA, k1 = F.TARJ_FILA + F.TARJ_N - 1;
    f('FECHA', F.FECHA); f('RIVAL', F.RIVAL); f('COND', F.COND); f('PF', F.PF); f('PC', F.PC);
    f('CANCHA', F.CANCHA); f('CLIMA', F.CLIMA); f('CAMPO', F.CAMPO); f('REF', F.REF);
    f('EDIT_ID', F.EDIT_ID); f('ERRORES', F.ERRORES); f('AVISOS', F.AVISOS);
    f('TIT', `C${t0}:C${t1}`); f('CAP', `D${t0}:D${t1}`);
    f('SUP', `C${s0}:C${s1}`); f('ING', `E${s0}:E${s1}`);
    f('ANOT', `G${p0}:G${p1}`); f('TRIES', `H${p0}:H${p1}`); f('CONV', `I${p0}:I${p1}`);
    f('PEN', `J${p0}:J${p1}`); f('DROP', `K${p0}:K${p1}`); f('PTS', `L${p0}:L${p1}`);
    f('TARJ', `G${k0}:G${k1}`); f('TTIPO', `H${k0}:H${k1}`);
    f('CHECKS', `Z${F.CHECK_FILA}:Z${F.CHECK_FILA + F.CHECK_N - 1}`);
    f('COPIA_DE', F.COPIA_DE); f('COPIA', `Y${t0}:Y${t1}`);
  });
}

function formulasBase_(h) {
  const calc = (sh, a1, formula, titulo) => {
    sh.getRange(a1).setFormula(formula);
    estiloEncabezado_(sh.getRange(a1));
    sh.getRange(a1).setBackground('#46658a').setNote(`${titulo}: se calcula sola, no escribir en esta columna.`);
  };
  const p = h[H.PARTIDOS];
  calc(p, 'M1', '=VSTACK("Partido",ARRAYFORMULA(IF(A2:A="","",TEXT(B2:B,"yyyy-mm-dd")&" · "&D2:D&" · "&F2:F&"-"&G2:G&" · #"&A2:A)))', 'Etiqueta');
  calc(p, 'N1', '=VSTACK("Res.",ARRAYFORMULA(IF(A2:A="","",IF(F2:F>G2:G,"G",IF(F2:F<G2:G,"P","E")))))', 'Resultado');
  calc(p, 'O1', '=VSTACK("Pts anotadores",MAP(A2:A,LAMBDA(id,IF(id="","",SUMIF(BP_ID,id,BP_PTS)))))', 'Suma de los anotadores');
  calc(p, 'P1', '=VSTACK("Tries penales",MAP(A2:A,LAMBDA(id,IF(id="","",SUMIFS(BP_TRIES,BP_ID,id,BP_JUG,"TRY PENAL")))))', 'Tries penales');
  calc(p, 'Q1', '=VSTACK("Titulares",MAP(A2:A,LAMBDA(id,IF(id="","",COUNTIFS(BF_ID,id,BF_ROL,"TITULAR")))))', 'Titulares');
  calc(p, 'R1', '=VSTACK("Capitanes",MAP(A2:A,LAMBDA(id,IF(id="","",COUNTIFS(BF_ID,id,BF_CAP,TRUE)))))', 'Capitanes');
  calc(p, 'S1', '=VSTACK("Estado",MAP(A2:A,B2:B,F2:F,O2:O,P2:P,Q2:Q,R2:R,LAMBDA(id,fe,pf,suma,pen,tit,cap,IF(id="","",LET(' +
    'nojugo,COUNTIFS(BP_ID,id,BP_JUGO,FALSE)+COUNTIFS(BT_ID,id,BT_JUGO,FALSE),' +
    'ingreso,COUNTIFS(BF_ID,id,BF_INGOK,FALSE),' +
    'msg,IF(AND(suma<>pf,suma+2*pen<>pf),"puntos: anotadores "&suma&" vs resultado "&pf&" · ","")' +
    '&IF(tit<>15,tit&" titulares · ","")' +
    '&IF(cap=0,"sin capitán · ",IF(cap>1,cap&" capitanes · ",""))' +
    '&IF(COUNTIF(PA_FECHA,fe)>1,"fecha repetida · ","")' +
    '&IF(nojugo>0,"anotador o tarjeta de alguien que no jugó · ","")' +
    '&IF(ingreso>0,"«ingresa por» de alguien que no jugó · ",""),' +
    'IF(msg="","✅","⚠️ "&LEFT(msg,LEN(msg)-3)))))))', 'Estado del partido');
  p.setColumnWidth(13, 300); p.setColumnWidth(19, 420);

  calc(h[H.FORM], 'I1', '=VSTACK("¿Ingreso válido?",MAP(A2:A,C2:C,H2:H,LAMBDA(id,rol,ing,IF(OR(id="",rol<>"SUPLENTE",ing=""),"",COUNTIFS(BF_ID,id,BF_JUG,ing)>0))))', '¿El «ingresa por» estaba jugando?');
  calc(h[H.PTS], 'I1', '=VSTACK("Puntos",ARRAYFORMULA(IF(A2:A="","",E2:E*5+F2:F*2+G2:G*3+H2:H*3)))', 'Puntos');
  calc(h[H.PTS], 'J1', '=VSTACK("¿Jugó?",MAP(A2:A,D2:D,LAMBDA(id,j,IF(id="","",OR(COUNTIF(L_ESP,j)>0,COUNTIFS(BF_ID,id,BF_JUG,j)>0)))))', '¿El anotador jugó ese partido?');
  calc(h[H.TARJ], 'F1', '=VSTACK("¿Jugó?",MAP(A2:A,D2:D,LAMBDA(id,j,IF(id="","",COUNTIFS(BF_ID,id,BF_JUG,j)>0))))', '¿Jugó ese partido?');
  calc(h[H.JUG], 'F1', '=VSTACK("Partidos",MAP(B2:B,LAMBDA(x,IF(x="","",COUNTIF(BF_JUG,x)))))', 'Partidos jugados');
  calc(h[H.CLUB], 'C1', '=VSTACK("Partidos",MAP(B2:B,LAMBDA(x,IF(x="","",COUNTIF(PA_RIVAL,x)))))', 'Partidos contra este club');

  h[H.JUG].setColumnWidth(2, 260); h[H.JUG].setColumnWidth(5, 220);
  h[H.CLUB].setColumnWidth(2, 260);
  h[H.JUG].getRange('A:A').setFontColor('#9aa9b8');
  h[H.CLUB].getRange('A:A').setFontColor('#9aa9b8');
  h[H.JUG].getRange('A1').setNote('ID que usa el sitio web. En jugadores nuevos dejalo vacío: se asigna al importar.');
  h[H.JUG].getRange('C1').setNote('Se asigna solo cuando el jugador debuta (al guardar su primer partido).');
}

// ---- FIXTURE ----

function armarFixture_(sh) {
  const lst = sh.getParent().getSheetByName(H.LIST);
  sh.getRange('G1').setFormula('=VSTACK("Estado",MAP(C2:C,D2:D,LAMBDA(fe,ri,IF(fe="","",' +
    'IF(COUNTIF(L_CLUB,ri)=0,"⚠️ El rival no está en CLUBES",' +
    'IF(COUNTIFS(PA_FECHA,fe,PA_RIVAL,ri)>0,"✅ Cargado",' +
    'IF(COUNTIF(PA_FECHA,fe)>0,"⚠️ Ese día ya hay otro partido cargado",' +
    'IF(fe<=TODAY(),"Falta cargar","Por jugar"))))))))');
  sh.getRange('H1').setFormula('=VSTACK("Cómo aparece en la ficha",ARRAYFORMULA(IF(C2:C="","",' +
    '"Fecha "&B2:B&" · "&TEXT(C2:C,"dd/mm/yyyy")&" · "&D2:D&IF(E2:E="LOCAL"," (local)"," (visitante)"))))');
  estiloEncabezado_(sh.getRange('G1:H1'));
  sh.getRange('G1:H1').setBackground('#46658a');

  const filas = Math.max(columna_(sh, 3).length + 60, 80);
  sh.getRange(2, 1, filas, 6).setBackground(AMARILLO);
  sh.getRange(2, 3, filas, 1).setNumberFormat('dd/mm/yyyy')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
  sh.getRange(2, 4, filas, 1).setDataValidation(lista_(lst.getRange('J2:J'), false));
  sh.getRange(2, 5, filas, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['LOCAL', 'VISITANTE'], true).setAllowInvalid(false).build());
  sh.getRange(2, 6, filas, 1).setDataValidation(lista_(lst.getRange('B2:B'), true));

  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('✅').setFontColor('#1e6b34').setRanges([sh.getRange('G2:G')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('⚠️').setBackground('#fdf0da').setFontColor('#8a5a12').setRanges([sh.getRange('G2:G')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Falta cargar').setFontColor(ROJO).setRanges([sh.getRange('G2:G')]).build(),
  ]);
  sh.getRange('A1').setNote('Se completa una vez al empezar la temporada. En CARGAR PARTIDO, al elegir una fecha de acá se completan solos fecha, rival, condición y cancha. Los rivales tienen que estar escritos igual que en CLUBES.');
  sh.setColumnWidth(4, 220); sh.setColumnWidth(6, 200); sh.setColumnWidth(7, 260); sh.setColumnWidth(8, 380);
}

// ---- fichas: CARGAR PARTIDO y CORREGIR PARTIDO ----

function armarFicha_(ss, sh, P, correccion) {
  sh.clear();
  if (sh.getMaxColumns() < 26) sh.insertColumnsAfter(sh.getMaxColumns(), 26 - sh.getMaxColumns());
  // ~1330 px en total: entra con CONTROL a la vista en una pantalla común al 100%
  const anchos = { A: 8, B: 34, C: 190, D: 60, E: 200, F: 10, G: 190, H: 56, I: 48, J: 56, K: 48, L: 44, M: 10, N: 380 };
  Object.entries(anchos).forEach(([col, w]) => sh.setColumnWidth(colNum_(col), w));
  const lst = ss.getSheetByName(H.LIST);
  const N = (sufijo) => `${P}_${sufijo}`;
  const t0 = F.TIT_FILA, s0 = F.SUP_FILA, p0 = F.PTS_FILA, pN = F.PTS_N, k0 = F.TARJ_FILA;

  // encabezado y acciones
  sh.getRange('B1').setValue(correccion ? 'CORREGIR PARTIDO' : 'CARGAR PARTIDO')
    .setFontSize(14).setFontWeight('bold').setFontColor(correccion ? ROJO : NAVY);
  sh.getRange('B2').setValue(correccion
    ? 'Sólo para corregir un partido YA cargado. Para cargar uno nuevo, usá la hoja CARGAR PARTIDO.'
    : 'Completá las celdas amarillas. A la derecha, CONTROL marca los errores (❌) y advertencias (⚠️). Cuando no haya ❌, tildá GUARDAR.')
    .setFontColor(correccion ? ROJO : '#46658a').setFontStyle('italic');
  sh.getRange('C3').setValue(correccion ? 'GUARDAR CORRECCIÓN ▶' : 'GUARDAR ▶');
  sh.getRange('G3').setValue(correccion ? 'DESCARTAR ▶' : 'LIMPIAR ▶');
  sh.getRangeList(['C3', 'G3']).setFontWeight('bold').setHorizontalAlignment('right');
  [F.GUARDAR, F.LIMPIAR].forEach((a1) => sh.getRange(a1).insertCheckboxes());
  sh.getRange(F.GUARDAR).setBackground('#d8f0dc');
  sh.getRange('C4:L4').merge();
  sh.getRange(F.INFO).setFontColor(correccion ? ROJO : '#46658a').setFontStyle('italic');

  // bloque PARTIDO, a todo el ancho: selector arriba, después lo automático y al final lo que se carga a mano
  titulo_(sh, 'B6', 'PARTIDO');
  sh.getRange('C7').setValue(correccion ? 'Partido a corregir ▶' : 'Fecha del fixture ▶').setFontWeight('bold').setFontSize(12);
  sh.getRange('D7:K7').merge();
  ['D8:E8', 'D9:E9', 'D10:E10', 'D11:E11', 'D12:E12', 'D13:E13', 'H8:K8', 'H9:K9', 'H11:K11', 'H12:K12', 'H13:L13']
    .forEach((a1) => sh.getRange(a1).merge());
  sh.getRange(F.SEL).setBackground(correccion ? AMARILLO : NARANJA_CLARO).setFontWeight('bold').setFontSize(12)
    .setBorder(true, true, true, true, null, null, '#f89c38', SpreadsheetApp.BorderStyle.SOLID_MEDIUM)
    .setDataValidation(lista_(lst.getRange(correccion ? 'H2:H' : 'G2:G'), false))
    .setNote(correccion
      ? 'Elegí el partido: se carga en la ficha para corregirlo.'
      : 'Viene elegida la fecha más antigua del fixture que falta cargar. Si es otro partido, elegilo acá. Si el partido no está en el fixture (amistoso, playoff), completá los datos de abajo a mano.');

  const etiquetas = [
    ['C8', 'Fecha'], ['G8', 'Temporada'], ['C9', 'Rival'], ['G9', 'Condición'], ['C10', 'Cancha'],
    ['C11', 'Tantos Vicentinos'], ['G11', 'Tantos rival'], ['C12', 'Clima'], ['G12', 'Campo de juego'],
    ['C13', 'Referee'], ['G13', 'Nota (opcional)'],
  ];
  etiquetas.forEach(([a1, t]) => sh.getRange(a1).setValue(t).setFontWeight('bold'));
  sh.getRange(F.TEMPORADA).setFormula(`=IF(ISDATE(${N('FECHA')}),YEAR(${N('FECHA')}),"")`)
    .setFontColor('#46658a').setHorizontalAlignment('left');
  if (!correccion) {
    sh.getRange('G10:L10').merge().setValue('← vienen del fixture (editables)')
      .setFontColor('#46658a').setFontStyle('italic').setFontSize(9).setVerticalAlignment('middle');
  }

  sh.getRange(F.FECHA).setNumberFormat('dd/mm/yyyy')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
  sh.getRange(F.RIVAL).setDataValidation(lista_(lst.getRange('J2:J'), false));
  sh.getRange(F.COND).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['LOCAL', 'VISITANTE'], true).setAllowInvalid(false).build());
  [F.PF, F.PC].forEach((a1) => sh.getRange(a1).setDataValidation(enteroNoNegativo_()));
  sh.getRange(F.CANCHA).setDataValidation(lista_(lst.getRange('B2:B'), true))
    .setNote(correccion ? null : 'Se completa sola al elegir la condición: VICENTINOS si es local, o la última cancha usada contra ese rival. Se puede cambiar.');
  sh.getRange(F.CLIMA).setDataValidation(lista_(lst.getRange('C2:C'), true));
  sh.getRange(F.CAMPO).setDataValidation(lista_(lst.getRange('D2:D'), true));
  sh.getRange(F.REF).setDataValidation(lista_(lst.getRange('A2:A'), true));
  sh.getRangeList([F.FECHA, F.RIVAL, F.COND, F.CANCHA]).setBackground(correccion ? AMARILLO : AUTO);
  sh.getRangeList([F.PF, F.PC, F.CLIMA, F.CAMPO, F.REF, F.NOTA]).setBackground(AMARILLO);
  sh.getRangeList([F.FECHA, F.PF, F.PC]).setHorizontalAlignment('left');

  // listas de "los que jugaron este partido" (columnas ocultas W y X)
  const jugaron = `VSTACK(${N('TIT')},${N('SUP')})`;
  sh.getRange(F.TIT_FILA, F.JUGARON_COL).setFormula(`=IFERROR(SORT(UNIQUE(FILTER(${jugaron},${jugaron}<>""))),"")`);
  sh.getRange(F.TIT_FILA, F.ANOT_COL).setFormula(`=VSTACK(IFERROR(SORT(UNIQUE(FILTER(${jugaron},${jugaron}<>""))),""),"TRY PENAL","TRY SCRUM")`);
  const listaJugaron = sh.getRange(F.TIT_FILA, F.JUGARON_COL, 32, 1);
  const listaAnotadores = sh.getRange(F.TIT_FILA, F.ANOT_COL, 32, 1);

  // formación titular
  titulo_(sh, 'B14', 'FORMACIÓN TITULAR');
  sh.getRange('B15:D15').setValues([['N°', 'Jugador', 'Capitán']]);
  estiloEncabezado_(sh.getRange('B15:D15'));
  sh.getRange(t0, 2, F.TIT_N, 1).setValues(Array.from({ length: F.TIT_N }, (_, i) => [i + 1])).setHorizontalAlignment('center');
  sh.getRange(t0, 3, F.TIT_N, 1).setDataValidation(lista_(lst.getRange('I2:I'), false)).setBackground(AMARILLO);
  sh.getRange(t0, 4, F.TIT_N, 1).insertCheckboxes();

  // suplentes: sin número ni capitán (el capitán es siempre un titular);
  // "ingresa por" sólo ofrece a los que jugaron este partido
  titulo_(sh, 'B32', 'SUPLENTES QUE INGRESARON');
  sh.getRange('B33:E33').setValues([['#', 'Jugador', '', 'Ingresa por']]);
  estiloEncabezado_(sh.getRange('B33:E33'));
  sh.getRange(s0, 2, F.SUP_N, 1).setValues(Array.from({ length: F.SUP_N }, (_, i) => [i + 1]))
    .setHorizontalAlignment('center').setFontColor('#9aa9b8');
  sh.getRange(s0, 3, F.SUP_N, 1).setDataValidation(lista_(lst.getRange('I2:I'), false)).setBackground(AMARILLO);
  sh.getRange(s0, 4, F.SUP_N, 1).setValues(Array.from({ length: F.SUP_N }, () => ['por ▶']))
    .setHorizontalAlignment('center').setFontColor('#9aa9b8').setFontStyle('italic');
  sh.getRange(s0, 5, F.SUP_N, 1).setDataValidation(lista_(listaJugaron, false)).setBackground(AMARILLO);

  // puntos: el anotador se elige entre los que jugaron (más TRY PENAL / TRY SCRUM)
  titulo_(sh, 'G14', 'PUNTOS');
  sh.getRange('G15:L15').setValues([['Anotador', 'Tries', 'Conv.', 'Pen.', 'Drop', 'Pts']]);
  sh.getRange('H15:L15').setHorizontalAlignment('center');
  estiloEncabezado_(sh.getRange('G15:L15'));
  sh.getRange(p0, 7, pN, 1).setDataValidation(lista_(listaAnotadores, false)).setBackground(AMARILLO);
  sh.getRange(p0, 8, pN, 4).setDataValidation(enteroNoNegativo_()).setBackground(AMARILLO).setHorizontalAlignment('center');
  const pT = p0 + pN;
  sh.getRange(`G${pT}`).setValue('Total').setFontWeight('bold');
  sh.getRange(`L${pT}`).setFormula(`=SUM(${N('PTS')})`).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(`H${pT}:K${pT}`).merge().setHorizontalAlignment('center').setFontWeight('bold');
  escribirFormulasPuntos_(sh, P);

  // tarjetas: sólo a los que jugaron
  titulo_(sh, 'G32', 'TARJETAS');
  sh.getRange('G33:H33').setValues([['Jugador', 'Tipo']]);
  sh.getRange('H33:I33').merge();
  estiloEncabezado_(sh.getRange('G33:I33'));
  sh.getRange(k0, 7, F.TARJ_N, 1).setDataValidation(lista_(listaJugaron, false)).setBackground(AMARILLO);
  sh.getRange(k0, 8, F.TARJ_N, 2).mergeAcross(); // el tipo ocupa H:I (AMARILLA no entra en una columna angosta)
  sh.getRange(k0, 8, F.TARJ_N, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['AMARILLA', 'ROJA'], true).setAllowInvalid(false).build()).setBackground(AMARILLO);

  // validaciones: una fórmula por celda en Z (oculta), el panel las muestra
  escribirChecks_(sh, P, !correccion);
  sh.getRange(F.ERRORES).setFormula(`=COUNTIF(${N('CHECKS')},"❌*")`);
  sh.getRange(F.AVISOS).setFormula(`=COUNTIF(${N('CHECKS')},"⚠️*")`);
  sh.hideColumns(F.JUGARON_COL, 4); // W..Z

  // "vacía": en CARGAR la fecha del fixture ya viene puesta, así que cuenta si falta resultado y formación
  const vacia = correccion
    ? `AND(${N('FECHA')}="",${N('RIVAL')}="",COUNTA(${N('TIT')})=0)`
    : `AND(${N('PF')}="",${N('PC')}="",COUNTA(${N('TIT')})=0)`;
  const listo = correccion ? 'Lista para guardar la corrección' : 'Lista para guardar';
  sh.getRange('N1').setFormula(`=IF(${vacia},"${correccion ? 'Elegí arriba el partido a corregir' : 'Falta cargar el partido'}",` +
    `IF(${N('ERRORES')}>0,"❌ "&${N('ERRORES')}&IF(${N('ERRORES')}=1," error"," errores")&": corregilos para poder guardar",` +
    `IF(${N('AVISOS')}>0,"⚠️ ${listo} ("&${N('AVISOS')}&IF(${N('AVISOS')}=1," advertencia"," advertencias")&")","✅ ${listo}")))`)
    .setFontSize(14).setFontWeight('bold');
  titulo_(sh, 'N3', 'CONTROL DE LA FICHA');
  sh.getRange('N4').setFormula(`=IF(${vacia},"${correccion ? 'Cuando elijas un partido, acá vas a ver si tiene algún problema.' : 'Revisá la fecha del fixture y cargá el resultado y la formación: acá vas a ver los problemas a medida que avances.'}",` +
    `IFERROR(FILTER(${N('CHECKS')},${N('CHECKS')}<>""),"✅ No hay problemas."))`);
  sh.getRange('N4:N45').setWrap(true).setVerticalAlignment('top');

  // formato condicional
  const reglas = [
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('❌').setBackground('#fbe3e0').setFontColor(ROJO).setRanges([sh.getRange('N1:N45')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('⚠️').setBackground('#fdf0da').setFontColor('#8a5a12').setRanges([sh.getRange('N1:N45')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('✅').setBackground('#e3f4e6').setFontColor('#1e6b34').setRanges([sh.getRange('N1:N45'), sh.getRange(`H${pT}`)]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('Faltan').setBackground('#fdf0da').setFontColor('#8a5a12').setRanges([sh.getRange(`H${pT}`)]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('Sobran').setBackground('#fbe3e0').setFontColor(ROJO).setRanges([sh.getRange(`H${pT}`)]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND(C${t0}<>"",COUNTIF($C$${t0}:$C$${t0 + F.TIT_N - 1},C${t0})+COUNTIF($C$${s0}:$C$${s0 + F.SUP_N - 1},C${t0})>1)`)
      .setBackground('#f4b6ae').setRanges([sh.getRange(t0, 3, F.TIT_N, 1), sh.getRange(s0, 3, F.SUP_N, 1)]).build(),
  ];
  if (!correccion) {
    // formación copiada: en celeste lo que cambió respecto del partido anterior
    reglas.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND($Y${t0}<>"",C${t0}<>$Y${t0})`)
      .setBackground(CELESTE).setRanges([sh.getRange(t0, 3, F.TIT_N, 1)]).build());
  }
  sh.setConditionalFormatRules(reglas);

  sh.setFrozenRows(4);
  sh.getRange('A1:N45').setFontFamily('Arial');

  // protección suave: sólo las celdas de carga quedan libres de aviso
  const libres = [F.GUARDAR, F.LIMPIAR, 'D7:K7', 'D8:E13', 'H8:K9', 'H11:L13',
    `C${t0}:D${t0 + F.TIT_N - 1}`, `C${s0}:C${s0 + F.SUP_N - 1}`, `E${s0}:E${s0 + F.SUP_N - 1}`, `G${p0}:K${p0 + pN - 1}`, `G${k0}:I${k0 + F.TARJ_N - 1}`];
  const prot = sh.protect().setDescription('Ficha: sólo se editan las celdas amarillas').setWarningOnly(true);
  prot.setUnprotectedRanges(libres.map((a1) => sh.getRange(a1)));
}

/**
 * Puntos de la ficha: la columna Pts por fila, el indicador "Faltan / Sobran" y la ayuda.
 * El TRY PENAL vale 7 (try + conversión): sólo se carga la cantidad de tries.
 */
function escribirFormulasPuntos_(sh, P) {
  const N = (sufijo) => `${P}_${sufijo}`;
  const p0 = F.PTS_FILA, pN = F.PTS_N, pT = p0 + pN;
  sh.getRange(p0, 12, pN, 1).setFormulas(Array.from({ length: pN }, (_, i) => {
    const r = p0 + i;
    return [fml_(`=IF(G${r}="","",IF(G${r}="TRY PENAL",N(H${r})*7,N(H${r})*5+N(I${r})*2+N(J${r})*3+N(K${r})*3))`)];
  })).setHorizontalAlignment('center').setFontColor('#46658a');
  // cuánto falta para cerrar con el resultado, en vivo
  sh.getRange(`H${pT}`).setFormula(fml_(`=IF(${N('PF')}="","",LET(suma,SUM(${N('PTS')}),` +
    `IF(suma=${N('PF')},"✅ Cierra con el resultado",` +
    `IF(suma<${N('PF')},"Faltan "&(${N('PF')}-suma)&" para "&${N('PF')},"Sobran "&(suma-${N('PF')})))))`));
  sh.getRange(`G${pT + 1}`).setValue('TRY PENAL: sólo la cantidad, ya vale 7 (try + conversión). Try de scrum: «TRY SCRUM».')
    .setFontColor('#46658a').setFontStyle('italic').setFontSize(9);
}

/** escribe las validaciones de CONTROL en la columna oculta Z (pisando las anteriores) */
function escribirChecks_(sh, P, conCopia) {
  const checks = formulasControl_(P, conCopia);
  sh.getRange(F.CHECK_FILA, 26, F.CHECK_N, 1).clearContent();
  sh.getRange(F.CHECK_FILA, 26, checks.length, 1).setFormulas(checks.map((f) => [fml_(f)]));
}

/** validaciones de la ficha; se escriben con F_ y se pasan al prefijo de cada hoja */
function formulasControl_(P, conCopia) {
  const nombres = (expr, cond) => `TEXTJOIN(", ",TRUE,UNIQUE(FILTER(${expr},${cond})))`;
  const formulas = [
    '=IF(F_FECHA="","❌ Falta la fecha.",IF(NOT(ISDATE(F_FECHA)),"❌ La fecha no es válida.",IF(F_FECHA>TODAY(),"❌ La fecha es posterior a hoy.",IF(YEAR(F_FECHA)<2014,"⚠️ La fecha es anterior a 2014: revisá el año.",""))))',
    '=IF(NOT(ISDATE(F_FECHA)),"",IFERROR("❌ Ya hay un partido cargado ese día: "&TEXTJOIN(", ",TRUE,FILTER(PA_ETIQ,PA_FECHA=F_FECHA,PA_ID<>F_EDIT_ID))&".",""))',
    '=IF(F_RIVAL="","❌ Falta el rival.",IF(COUNTIF(L_CLUB,F_RIVAL)=0,"❌ El rival no está en la hoja CLUBES.",""))',
    '=IF(F_COND="","❌ Falta indicar si fue LOCAL o VISITANTE.","")',
    '=IF(OR(F_PF="",F_PC=""),"❌ Falta el resultado (tantos de Vicentinos y del rival).","")',
    '=IF(F_CANCHA="","⚠️ Falta la cancha.",IF(COUNTIF(L_CANCHA,F_CANCHA)=0,"⚠️ Cancha nueva: «"&F_CANCHA&"». Se agrega a LISTAS al guardar.",""))',
    '=IF(F_REF="","⚠️ Falta el referee.",IF(COUNTIF(L_REF,F_REF)=0,"⚠️ Referee nuevo: «"&F_REF&"». Se agrega a LISTAS al guardar.",""))',
    '=IF(F_CLIMA="","⚠️ Falta el clima.","")',
    '=IF(F_CAMPO="","⚠️ Falta el estado del campo de juego.","")',
    '=IF(COUNTA(F_TIT)<15,"⚠️ Hay "&COUNTA(F_TIT)&" titulares cargados (lo normal son 15).","")',
    `=IFERROR("❌ No están en la hoja JUGADORES (agregalos ahí primero): "&LET(n,VSTACK(F_TIT,F_SUP,F_ING,F_TARJ),${nombres('n', 'n<>"",COUNTIF(L_JUG,n)=0')})&".","")`,
    `=IFERROR("❌ Anotador que no está en JUGADORES ni es TRY PENAL / TRY SCRUM: "&${nombres('F_ANOT', 'F_ANOT<>"",COUNTIF(L_JUG,F_ANOT)+COUNTIF(L_ESP,F_ANOT)=0')}&".","")`,
    `=IFERROR("❌ Jugador repetido en formación/suplentes: "&LET(n,VSTACK(F_TIT,F_SUP),${nombres('n', 'n<>"",COUNTIF(F_TIT,n)+COUNTIF(F_SUP,n)>1')})&".","")`,
    '=LET(cap,COUNTIF(F_CAP,TRUE),IF(cap=0,"⚠️ No hay capitán marcado.",IF(cap>1,"❌ Hay "&cap&" capitanes marcados.","")))',
    `=IFERROR("❌ Falta indicar por quién ingresó: "&${nombres('F_SUP', 'F_SUP<>"",F_ING=""')}&".","")`,
    '=IF(COUNTIFS(F_SUP,"",F_ING,"<>")>0,"❌ Hay un «Ingresa por» sin el suplente al lado.","")',
    `=IFERROR("❌ «Ingresa por» tiene que ser alguien que estaba jugando: "&${nombres('F_ING', 'F_ING<>"",COUNTIF(F_TIT,F_ING)+COUNTIF(F_SUP,F_ING)=0')}&".","")`,
    `=IFERROR("❌ Un suplente figura ingresando por sí mismo: "&${nombres('F_SUP', 'F_SUP<>"",F_SUP=F_ING')}&".","")`,
    `=IFERROR("⚠️ Figura reemplazado más de una vez (revisá si es correcto): "&${nombres('F_ING', 'F_ING<>"",COUNTIF(F_ING,F_ING)>1')}&".","")`,
    `=IFERROR("❌ Sumó puntos alguien que no está en la formación ni en los suplentes: "&${nombres('F_ANOT', 'F_ANOT<>"",COUNTIF(F_TIT,F_ANOT)+COUNTIF(F_SUP,F_ANOT)+COUNTIF(L_ESP,F_ANOT)=0')}&".","")`,
    `=IFERROR("⚠️ Aparece en más de una fila de PUNTOS (conviene sumarlo en una sola): "&${nombres('F_ANOT', 'F_ANOT<>"",COUNTIF(F_ANOT,F_ANOT)>1')}&".","")`,
    `=IFERROR("❌ Anotador sin puntos cargados: "&${nombres('F_ANOT', 'F_ANOT<>"",F_PTS=0')}&".","")`,
    '=IF(COUNTIFS(F_ANOT,"",F_TRIES,"<>")+COUNTIFS(F_ANOT,"",F_CONV,"<>")+COUNTIFS(F_ANOT,"",F_PEN,"<>")+COUNTIFS(F_ANOT,"",F_DROP,"<>")>0,"❌ Hay puntos cargados sin anotador.","")',
    // el try penal ya vale 7 en Pts; si además se cargó su conversión al pateador, sobran 2 por cada uno
    '=IF(F_PF="","",LET(suma,SUM(F_PTS),pen,SUMIF(F_ANOT,"TRY PENAL",F_TRIES),IF(suma=F_PF,"",' +
      'IF(AND(pen>0,suma-2*pen=F_PF),"❌ El try penal ya vale 7 (incluye la conversión): sacá la conversión que le cargaste al pateador.",' +
      '"❌ Los anotadores suman "&suma&", pero Vicentinos hizo "&F_PF&"."))))',
    '=IF(COUNTIFS(F_ANOT,"TRY PENAL",F_CONV,"<>")+COUNTIFS(F_ANOT,"TRY PENAL",F_PEN,"<>")+COUNTIFS(F_ANOT,"TRY PENAL",F_DROP,"<>")>0,"⚠️ En TRY PENAL va sólo la cantidad de tries: ya vale 7 (try + conversión), el resto no se cuenta.","")',
    '=IF(SUM(F_CONV)>SUM(F_TRIES),"❌ Hay más conversiones ("&SUM(F_CONV)&") que tries ("&SUM(F_TRIES)&").","")',
    `=IFERROR("❌ Tarjeta para alguien que no jugó: "&${nombres('F_TARJ', 'F_TARJ<>"",COUNTIF(F_TIT,F_TARJ)+COUNTIF(F_SUP,F_TARJ)=0')}&".","")`,
    '=IF(COUNTIFS(F_TARJ,"<>",F_TTIPO,"")>0,"❌ Falta el tipo de tarjeta (AMARILLA o ROJA).","")',
    '=IF(COUNTIFS(F_TARJ,"",F_TTIPO,"<>")>0,"❌ Hay un tipo de tarjeta sin jugador.","")',
  ];
  if (conCopia) {
    formulas.splice(10, 0, '=IF(F_COPIA_DE="","","⚠️ Formación copiada de "&F_COPIA_DE&": "&SUMPRODUCT((F_TIT<>"")*(F_TIT=F_COPIA))&" de "&COUNTA(F_TIT)&" titulares sin cambios. Revisá posición por posición (en celeste, los que cambiaste).")');
  }
  return formulas.map((f) => f.replace(/\bF_/g, `${P}_`));
}

// ---- VER PARTIDO ----

function armarVer_(sh, anioMasReciente) {
  // misma grilla que las fichas de carga (ver armarFicha_), así se lee igual
  const lst = sh.getParent().getSheetByName(H.LIST);
  if (sh.getMaxColumns() < 26) sh.insertColumnsAfter(sh.getMaxColumns(), 26 - sh.getMaxColumns());
  const anchos = { A: 8, B: 34, C: 190, D: 60, E: 200, F: 10, G: 190, H: 56, I: 48, J: 56, K: 48, L: 44 };
  Object.entries(anchos).forEach(([col, w]) => sh.setColumnWidth(colNum_(col), w));

  sh.getRange('B1').setValue('VER PARTIDO').setFontSize(14).setFontWeight('bold').setFontColor(NAVY);
  sh.getRange('B2').setValue('Sólo para consultar. Para corregir un partido, usá la hoja CORREGIR PARTIDO.')
    .setFontColor('#46658a').setFontStyle('italic');

  // filtro: temporada (fila 3) y partido de esa temporada (fila 7, como el fixture en la ficha)
  sh.getRange('C3').setValue('Temporada ▶').setFontWeight('bold').setHorizontalAlignment('right');
  sh.getRange('D3:E3').merge();
  sh.getRange(VER.TEMP).setValue(anioMasReciente).setBackground(AMARILLO).setHorizontalAlignment('left')
    .setDataValidation(lista_(lst.getRange('F2:F'), false));
  sh.getRange('Y1').setFormula(`=IFERROR(SORT(FILTER(PA_ETIQ,PA_ETIQ<>"",(${VER.TEMP}="Todas")+(PA_TEMP=${VER.TEMP})),1,FALSE),"")`);
  titulo_(sh, 'B6', 'PARTIDO');
  sh.getRange('C7').setValue('Partido ▶').setFontWeight('bold').setFontSize(12);
  sh.getRange('D7:K7').merge();
  sh.getRange(VER.PARTIDO).setBackground(AMARILLO).setFontWeight('bold').setFontSize(12)
    .setBorder(true, true, true, true, null, null, '#f89c38', SpreadsheetApp.BorderStyle.SOLID_MEDIUM)
    .setDataValidation(lista_(sh.getRange('Y1:Y400'), false));
  sh.getRange('Z1').setFormula(`=IFERROR(VALUE(REGEXEXTRACT(${VER.PARTIDO},"#(\\d+)$")),"")`);
  sh.hideColumns(25, 2);

  // datos del partido: mismos pares que en la ficha
  ['D8:E8', 'D9:E9', 'D10:E10', 'D11:E11', 'D12:E12', 'D13:E13', 'H8:K8', 'H9:K9', 'H10:L10', 'H11:K11', 'H12:K12', 'H13:L13']
    .forEach((a1) => sh.getRange(a1).merge().setBackground(GRIS).setHorizontalAlignment('left'));
  const campo = (etiqueta, a1Etiqueta, a1Valor, col) => {
    sh.getRange(a1Etiqueta).setValue(etiqueta).setFontWeight('bold');
    sh.getRange(a1Valor).setFormula(`=IF($Z$1="","",XLOOKUP($Z$1,PA_ID,PARTIDOS!${col}2:${col}))`);
  };
  campo('Fecha', 'C8', 'D8', 'B'); campo('Temporada', 'G8', 'H8', 'C');
  campo('Rival', 'C9', 'D9', 'D'); campo('Condición', 'G9', 'H9', 'E');
  campo('Cancha', 'C10', 'D10', 'H'); campo('Estado', 'G10', 'H10', 'S');
  campo('Tantos Vicentinos', 'C11', 'D11', 'F'); campo('Tantos rival', 'G11', 'H11', 'G');
  campo('Clima', 'C12', 'D12', 'I'); campo('Campo de juego', 'G12', 'H12', 'J');
  campo('Referee', 'C13', 'D13', 'K'); campo('Nota', 'G13', 'H13', 'L');
  sh.getRange('D8').setNumberFormat('dd/mm/yyyy');

  // formación titular (izquierda) y puntos (derecha)
  titulo_(sh, 'B14', 'FORMACIÓN TITULAR');
  sh.getRange('B15:D15').setValues([['N°', 'Jugador', 'Capitán']]); estiloEncabezado_(sh.getRange('B15:D15'));
  sh.getRange('B16').setFormula('=IF($Z$1="","",IFERROR(SORT(FILTER(HSTACK(\'BASE FORMACIONES\'!E2:E,BF_JUG,ARRAYFORMULA(IF(BF_CAP=TRUE,"©",""))),BF_ID=$Z$1,BF_ROL="TITULAR"),1,TRUE),""))');
  sh.getRange('B16:B30').setHorizontalAlignment('center');
  sh.getRange('D16:D30').setHorizontalAlignment('center');

  titulo_(sh, 'G14', 'PUNTOS');
  sh.getRange('G15:L15').setValues([['Anotador', 'Tries', 'Conv.', 'Pen.', 'Drop', 'Pts']]); estiloEncabezado_(sh.getRange('G15:L15'));
  sh.getRange('H15:L15').setHorizontalAlignment('center');
  sh.getRange('G16').setFormula('=IF($Z$1="","",IFERROR(FILTER(HSTACK(BP_JUG,BP_TRIES,BP_CONV,BP_PEN,BP_DROP,BP_PTS),BP_ID=$Z$1),"Sin puntos"))');
  sh.getRange('H16:L30').setHorizontalAlignment('center');

  // suplentes (izquierda) y tarjetas (derecha)
  titulo_(sh, 'B32', 'SUPLENTES QUE INGRESARON');
  sh.getRange('B33:E33').setValues([['#', 'Jugador', '', 'Ingresa por']]); estiloEncabezado_(sh.getRange('B33:E33'));
  sh.getRange('B34').setFormula('=IF($Z$1="","",IFERROR(LET(s,FILTER(HSTACK(BF_JUG,BF_ING),BF_ID=$Z$1,BF_ROL="SUPLENTE"),' +
    'HSTACK(SEQUENCE(ROWS(s)),CHOOSECOLS(s,1),ARRAYFORMULA(IF(CHOOSECOLS(s,1)="","","por ▶")),CHOOSECOLS(s,2))),"Sin cambios cargados"))');
  sh.getRange('B34:B45').setHorizontalAlignment('center').setFontColor('#9aa9b8');
  sh.getRange('D34:D45').setHorizontalAlignment('center').setFontColor('#9aa9b8').setFontStyle('italic');

  titulo_(sh, 'G32', 'TARJETAS');
  sh.getRange('G33:I33').setValues([['Jugador', 'Tipo', '']]); estiloEncabezado_(sh.getRange('G33:I33'));
  sh.getRange('G34').setFormula('=IF($Z$1="","",IFERROR(FILTER(HSTACK(BT_JUG,BT_TIPO),BT_ID=$Z$1),"Sin tarjetas"))');

  sh.setFrozenRows(3);
  sh.getRange('A1:L45').setFontFamily('Arial');
}

// ---- resúmenes ----

function armarTemporadas_(sh, info) {
  sh.getRange('A1').setValue('TEMPORADAS').setFontSize(18).setFontWeight('bold').setFontColor(NAVY);
  const enc = ['Temporada', 'Torneo', 'Posición', 'PJ', 'G', 'E', 'P', 'PF', 'PC', 'Dif.', '% G', 'Tries'];
  sh.getRange(2, 1, 1, enc.length).setValues([enc]); estiloEncabezado_(sh.getRange(2, 1, 1, enc.length));
  sh.getRange('A3').setFormula('=LET(anios,SORT(UNIQUE(FILTER(PA_TEMP,PA_TEMP<>"")),1,FALSE),' +
    'pj,MAP(anios,LAMBDA(anio,COUNTIF(PA_TEMP,anio))),' +
    'g,MAP(anios,LAMBDA(anio,COUNTIFS(PA_TEMP,anio,PA_RES,"G"))),' +
    'e,MAP(anios,LAMBDA(anio,COUNTIFS(PA_TEMP,anio,PA_RES,"E"))),' +
    'p,MAP(anios,LAMBDA(anio,COUNTIFS(PA_TEMP,anio,PA_RES,"P"))),' +
    'pf,MAP(anios,LAMBDA(anio,SUMIF(PA_TEMP,anio,PA_PF))),' +
    'pc,MAP(anios,LAMBDA(anio,SUMIF(PA_TEMP,anio,PA_PC))),' +
    'tries,MAP(anios,LAMBDA(anio,SUMIF(BP_TEMP,anio,BP_TRIES))),' +
    'torneo,MAP(anios,LAMBDA(anio,IFERROR(VLOOKUP(anio,$O$3:$P,2,FALSE),""))),' +
    'pos,MAP(anios,LAMBDA(anio,IFERROR(VLOOKUP(anio,$O$3:$Q,3,FALSE),""))),' +
    'HSTACK(anios,torneo,pos,pj,g,e,p,pf,pc,ARRAYFORMULA(pf-pc),ARRAYFORMULA(IF(pj=0,"",g/pj)),tries))');
  sh.getRange('K3:K60').setNumberFormat('0%');

  sh.getRange('O1').setValue('Torneos (se edita a mano)').setFontWeight('bold').setFontColor(NAVY);
  const encInfo = ['Temporada', 'Torneo', 'Posición', 'Ranking URBA', 'Campeón', 'Ascenso', 'Descenso', 'Nota'];
  sh.getRange(2, 15, 1, encInfo.length).setValues([encInfo]); estiloEncabezado_(sh.getRange(2, 15, 1, encInfo.length));
  if (info.length) sh.getRange(3, 15, info.length, encInfo.length).setValues(info).setBackground(AMARILLO);
  sh.setFrozenRows(2);
  sh.setColumnWidth(2, 130); sh.setColumnWidth(16, 130); sh.setColumnWidth(22, 260);
}

function armarRanking_(sh) {
  sh.getRange('A1').setValue('RANKING DE JUGADORES').setFontSize(18).setFontWeight('bold').setFontColor(NAVY);
  sh.getRange('B2').setValue('Temporada').setFontWeight('bold');
  sh.getRange('B3').setValue('Ordenar por').setFontWeight('bold');
  const lst = sh.getParent().getSheetByName(H.LIST);
  sh.getRange('C2').setValue('Todas').setBackground(AMARILLO).setDataValidation(lista_(lst.getRange('F2:F'), false));
  sh.getRange('C3').setValue('Puntos').setBackground(AMARILLO).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['Puntos', 'Presencias', 'Titularidades', 'Tries', 'Amarillas'], true).setAllowInvalid(false).build());

  const enc = ['#', 'Jugador', 'N° Vic.', 'Camada', 'Titular', 'Suplente', 'Presencias', 'Tries', 'Conv.', 'Penales', 'Drops', 'Puntos', 'Amarillas', 'Rojas'];
  sh.getRange(5, 1, 1, enc.length).setValues([enc]); estiloEncabezado_(sh.getRange(5, 1, 1, enc.length));
  sh.getRange('A6').setFormula('=IFERROR(LET(crit,IF($C$2="Todas",">0",$C$2),' +
    'n,FILTER(L_JUG,L_JUG<>""),' +
    'num,MAP(n,LAMBDA(x,XLOOKUP(x,L_JUG,JUGADORES!C2:C,""))),' +
    'cam,MAP(n,LAMBDA(x,XLOOKUP(x,L_JUG,JUGADORES!D2:D,""))),' +
    'tit,MAP(n,LAMBDA(x,COUNTIFS(BF_JUG,x,BF_ROL,"TITULAR",BF_TEMP,crit))),' +
    'sup,MAP(n,LAMBDA(x,COUNTIFS(BF_JUG,x,BF_ROL,"SUPLENTE",BF_TEMP,crit))),' +
    'tri,MAP(n,LAMBDA(x,SUMIFS(BP_TRIES,BP_JUG,x,BP_TEMP,crit))),' +
    'con,MAP(n,LAMBDA(x,SUMIFS(BP_CONV,BP_JUG,x,BP_TEMP,crit))),' +
    'pen,MAP(n,LAMBDA(x,SUMIFS(BP_PEN,BP_JUG,x,BP_TEMP,crit))),' +
    'dro,MAP(n,LAMBDA(x,SUMIFS(BP_DROP,BP_JUG,x,BP_TEMP,crit))),' +
    'pts,MAP(n,LAMBDA(x,SUMIFS(BP_PTS,BP_JUG,x,BP_TEMP,crit))),' +
    'am,MAP(n,LAMBDA(x,COUNTIFS(BT_JUG,x,BT_TIPO,"AMARILLA",BT_TEMP,crit))),' +
    'ro,MAP(n,LAMBDA(x,COUNTIFS(BT_JUG,x,BT_TIPO,"ROJA",BT_TEMP,crit))),' +
    'pres,ARRAYFORMULA(tit+sup),' +
    'tabla,FILTER(HSTACK(n,num,cam,tit,sup,pres,tri,con,pen,dro,pts,am,ro),ARRAYFORMULA(pres+pts+am+ro)>0),' +
    'col,SWITCH($C$3,"Presencias",6,"Titularidades",4,"Tries",7,"Amarillas",12,11),' +
    'orden,SORT(tabla,col,FALSE,6,FALSE),' +
    'HSTACK(SEQUENCE(ROWS(orden)),orden)),"Sin datos para esa temporada")');
  sh.setFrozenRows(5);
  sh.setColumnWidth(1, 40); sh.setColumnWidth(2, 240);
}

function armarRivales_(sh) {
  sh.getRange('A1').setValue('HISTORIAL CONTRA RIVALES').setFontSize(18).setFontWeight('bold').setFontColor(NAVY);
  sh.getRange('B2').setValue('Temporada').setFontWeight('bold');
  sh.getRange('C2').setValue('Todas').setBackground(AMARILLO)
    .setDataValidation(lista_(sh.getParent().getSheetByName(H.LIST).getRange('F2:F'), false));
  const enc = ['Rival', 'J', 'G', 'E', 'P', 'PF', 'PC', 'Dif.', 'Local J', 'Local G', 'Visit. J', 'Visit. G'];
  sh.getRange(5, 1, 1, enc.length).setValues([enc]); estiloEncabezado_(sh.getRange(5, 1, 1, enc.length));
  const cnt = (extra) => `MAP(n,LAMBDA(x,COUNTIFS(PA_RIVAL,x,PA_TEMP,crit${extra})))`;
  sh.getRange('A6').setFormula('=IFERROR(LET(crit,IF($C$2="Todas",">0",$C$2),n,FILTER(L_CLUB,L_CLUB<>""),' +
    `j,${cnt('')},g,${cnt(',PA_RES,"G"')},e,${cnt(',PA_RES,"E"')},p,${cnt(',PA_RES,"P"')},` +
    'pf,MAP(n,LAMBDA(x,SUMIFS(PA_PF,PA_RIVAL,x,PA_TEMP,crit))),pc,MAP(n,LAMBDA(x,SUMIFS(PA_PC,PA_RIVAL,x,PA_TEMP,crit))),' +
    `lj,${cnt(',PA_COND,"LOCAL"')},lg,${cnt(',PA_COND,"LOCAL",PA_RES,"G"')},vj,${cnt(',PA_COND,"VISITANTE"')},vg,${cnt(',PA_COND,"VISITANTE",PA_RES,"G"')},` +
    'SORT(FILTER(HSTACK(n,j,g,e,p,pf,pc,ARRAYFORMULA(pf-pc),lj,lg,vj,vg),j>0),2,FALSE,3,FALSE)),"Sin partidos en esa temporada")');
  sh.setFrozenRows(5);
  sh.setColumnWidth(1, 240);
}

function armarReferees_(sh) {
  sh.getRange('A1').setValue('REFEREES').setFontSize(18).setFontWeight('bold').setFontColor(NAVY);
  sh.getRange('B2').setValue('Temporada').setFontWeight('bold');
  sh.getRange('C2').setValue('Todas').setBackground(AMARILLO)
    .setDataValidation(lista_(sh.getParent().getSheetByName(H.LIST).getRange('F2:F'), false));
  const enc = ['Referee', 'J', 'G', 'E', 'P', '% G'];
  sh.getRange(5, 1, 1, enc.length).setValues([enc]); estiloEncabezado_(sh.getRange(5, 1, 1, enc.length));
  const cnt = (extra) => `MAP(n,LAMBDA(x,COUNTIFS(PA_REF,x,PA_TEMP,crit${extra})))`;
  sh.getRange('A6').setFormula('=IFERROR(LET(crit,IF($C$2="Todas",">0",$C$2),n,FILTER(L_REF,L_REF<>""),' +
    `j,${cnt('')},g,${cnt(',PA_RES,"G"')},e,${cnt(',PA_RES,"E"')},p,${cnt(',PA_RES,"P"')},` +
    'SORT(FILTER(HSTACK(n,j,g,e,p,ARRAYFORMULA(IF(j=0,"",g/j))),j>0),2,FALSE,3,FALSE)),"Sin partidos en esa temporada")');
  sh.getRange('F6:F400').setNumberFormat('0%');
  sh.setFrozenRows(5);
  sh.setColumnWidth(1, 220);
}

function armarInicio_(sh) {
  const lineas = [
    ['ESTADÍSTICAS CLUB VICENTINOS — PLANILLA DE CARGA', 'titulo'],
    ['', ''],
    ['Cómo cargar un partido', 'sub'],
    ['1. Andá a la hoja CARGAR PARTIDO. Completá sólo las celdas amarillas.', ''],
    ['2. La ficha ya viene con la próxima fecha del fixture sin cargar: fecha, rival, condición y cancha están completos (en gris). Si es otro partido, elegilo en «Fecha del fixture».', ''],
    ['3. La formación titular también viene cargada: es la del partido anterior. Cambiá sólo los que no se repiten (quedan en celeste) y marcá el capitán si cambió.', ''],
    ['4. Suplentes, anotadores y tarjetas se eligen de listas que sólo muestran a los que jugaron ese partido.', ''],
    ['5. A la derecha, CONTROL te avisa en el momento si algo no cierra: ❌ es un error, ⚠️ una advertencia. Debajo de PUNTOS ves cuántos faltan para llegar al resultado.', ''],
    ['6. Cuando no quede ningún ❌, tildá la casilla GUARDAR. El partido pasa a la lista y la ficha queda limpia.', ''],
    ['', ''],
    ['Fixture', 'sub'],
    ['Al empezar la temporada, cargá en la hoja FIXTURE las fechas (fecha, rival, local o visitante). La columna Estado muestra cuáles ya están cargadas.', ''],
    ['', ''],
    ['Corregir un partido ya cargado (casi nunca debería hacer falta)', 'sub'],
    ['Usá la hoja CORREGIR PARTIDO (pestaña roja, al final): elegí el partido arriba, corregí y tildá GUARDAR CORRECCIÓN. Reemplaza al anterior.', ''],
    ['', ''],
    ['Jugador, club, referee o cancha nuevos', 'sub'],
    ['Jugador nuevo: agregalo al final de la hoja JUGADORES (nombre y camada). El N° de Vicentino se asigna solo cuando debuta.', ''],
    ['Club nuevo: agregalo al final de la hoja CLUBES.', ''],
    ['Referee o cancha nuevos: escribilos directamente en la ficha; se suman a LISTAS al guardar.', ''],
    ['', ''],
    ['Qué se completa solo (no hace falta tocarlo)', 'sub'],
    ['PARTIDOS: la lista de todos los partidos, con una columna Estado que marca los que tienen algo raro.', ''],
    ['VER PARTIDO: muestra cualquier partido completo, sólo para consultar.', ''],
    ['TEMPORADAS, RANKING JUGADORES, RIVALES y REFEREES: resúmenes que se actualizan solos (con filtro por temporada).', ''],
    ['BASE FORMACIONES, BASE PUNTOS y BASE TARJETAS: los datos de cada partido, en tablas. De ahí sale el sitio web.', ''],
  ];
  sh.setColumnWidth(1, 900);
  sh.getRange(1, 1, lineas.length, 1).setValues(lineas.map((l) => [l[0]])).setWrap(true).setFontFamily('Arial');
  lineas.forEach(([, tipo], i) => {
    const c = sh.getRange(i + 1, 1);
    if (tipo === 'titulo') c.setFontSize(18).setFontWeight('bold').setFontColor(NAVY);
    if (tipo === 'sub') c.setFontSize(12).setFontWeight('bold').setFontColor('#8a5a12');
  });
  sh.setHiddenGridlines(true);
}

// ---- utilidades de formato ----

function lista_(rango, permitirOtros) {
  return SpreadsheetApp.newDataValidation().requireValueInRange(rango, true).setAllowInvalid(permitirOtros).build();
}

function enteroNoNegativo_() {
  return SpreadsheetApp.newDataValidation().requireNumberGreaterThanOrEqualTo(0)
    .setAllowInvalid(false).setHelpText('Tiene que ser un número entero, 0 o más.').build();
}

function titulo_(sh, a1, texto) {
  sh.getRange(a1).setValue(texto).setFontWeight('bold').setFontColor(NAVY).setFontSize(11);
}

function colNum_(letra) {
  return letra.split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
}

// para poder probar construirDatos_ y formulasControl_ fuera de Apps Script (node)
if (typeof module !== 'undefined') module.exports = { construirDatos_, formulasControl_ };
