/* Private loopback UI: credentials stay in the Node process. Supplier text is always textContent. */
const $ = id => document.getElementById(id);
const token = document.querySelector('meta[name="local-token"]').content;
const rows = new Map(), selected = new Set();
let cursor = 0, runId = '', busy = false, requesting = false, closed = false, compatible = false;
const sharedStates = new Map();
const labels = { idle: 'Sin iniciar', running: 'En curso', paused: 'Pausado', stopping: 'Deteniendo', completed: 'Terminado', partial: 'Terminado con incidencias', cancelled: 'Detenido', error: 'Requiere atención' };
const statusLabels = { ready: 'Pendiente de sincronizar', review: 'Revisar identidad', error: 'Sin evidencia nueva', candidate: 'Candidato privado', existing: 'Ya registrado', saved: 'Sincronizado con el panel web' };
const availability = { in_stock: 'Disponible en proveedor', out_of_stock: 'Agotado confirmado', unknown: 'Sin confirmar' };
const note = message => { $('notice').textContent = message; };
async function api(path, input) {
  const response = await fetch('/api/' + path, { method: input === undefined ? 'GET' : 'POST', headers: { 'x-local-token': token, ...(input === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
  const data = await response.json(); if (!response.ok) throw Error(data.error || 'No se pudo completar la acción.'); return data;
}
function cell(text, element = 'td') { const el = document.createElement(element); el.textContent = text; return el; }
function sharedLink(text, href) { const a = cell(text, 'a'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
function priceText(value) { return Number(value).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }); }
async function checkWeb(row) {
  try { sharedStates.set(row.id, await api('web-state?row=' + encodeURIComponent(row.id))); renderRows(); }
  catch (e) { note(e.message); }
}
function selectionState() {
  const choices = [...selected].map(id => rows.get(id)).filter(Boolean);
  $('selection').textContent = choices.length ? 'Vas a guardar: ' + choices.map(r => r.title + (r.variant ? ' · ' + r.variant : '') + ' (' + r.supplier + ')').join('; ') : 'Ningún resultado seleccionado.';
  $('apply').textContent = 'Guardar selección (' + choices.length + '/20)';
  $('apply').disabled = busy || requesting || !choices.length || choices.length > 20 || !$('confirm').checked;
}
function renderRows() {
  const body = $('rows'); body.replaceChildren(); const filter = $('filter').value.toLowerCase();
  for (const row of rows.values()) {
    if (!(row.title + ' ' + row.supplier + ' ' + row.message + ' ' + (statusLabels[row.status] || '')).toLowerCase().includes(filter)) continue;
    const tr = document.createElement('tr'), checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.setAttribute('aria-label', 'Guardar ' + row.title); checkbox.checked = selected.has(row.id); checkbox.disabled = !['ready', 'candidate'].includes(row.status) || busy || requesting;
    checkbox.addEventListener('change', () => { if (checkbox.checked && selected.size >= 20) { checkbox.checked = false; note('Podés guardar hasta 20 resultados revisados por vez.'); return; } if (checkbox.checked) selected.add(row.id); else selected.delete(row.id); $('confirm').checked = false; selectionState(); });
    const pick = cell(''); pick.append(checkbox); tr.append(pick);
    const title = cell(''), a = document.createElement('a'); a.textContent = row.myaTitle || row.title; a.href = row.url; a.target = '_blank'; a.rel = 'noreferrer noopener'; title.append(a);
    title.append(cell(row.supplier + (row.variant ? ' · ' + row.variant : ''), 'small'));
    if (row.myaTitle && row.myaTitle !== row.title) title.append(cell('Fuente: ' + row.title, 'small')); tr.append(title);
    tr.append(cell(availability[row.availability] || 'Se conserva la anterior'));
    tr.append(cell(row.originCost > 0 ? Number(row.originCost).toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' ' + row.currency : 'Sin cotización verificable'));
    const result = cell(''), badge = cell(statusLabels[row.status] || row.status, 'span'); badge.className = 'status ' + (row.status === 'review' ? 'review-status' : row.status); result.append(badge, cell(row.message, 'div')); tr.append(result); body.append(tr);
    if (row.priceMessage) result.append(cell('Precios: ' + row.priceMessage, 'small'));
    const web = cell(''); web.className = 'web-actions';
    if (row.retailPrice !== undefined) web.append(cell('Minorista: ' + priceText(row.retailPrice), 'small'), cell('Mayorista: ' + priceText(row.wholesalePrice), 'small'));
    if (row.proposedRetail !== undefined) web.append(cell('Propuesto, pendiente de revisión: minorista ' + priceText(row.proposedRetail) + ' · mayorista ' + priceText(row.proposedWholesale), 'small'));
    if (row.productId) web.append(sharedLink('Editar precios y producto', 'https://myaimportaciones.com/admin?editProduct=' + encodeURIComponent(row.productId)));
    else if (row.offerId) web.append(sharedLink('Completar alta y publicar', 'https://myaimportaciones.com/admin/oportunidades/importacion'));
    else web.append(cell('Guardá el candidato para continuar el alta.', 'small'));
    const state = sharedStates.get(row.id);
    if (state) {
      web.append(cell(state.message || ({ active: 'Activo en el catálogo compartido', draft: 'Borrador: falta publicar', archived: 'Producto archivado' }[state.state] || 'Pendiente'), 'small'));
      if (state.retail_price !== undefined) web.append(cell('Minorista: ' + priceText(state.retail_price) + ' · Mayorista: ' + priceText(state.wholesale_price), 'small'));
      if (state.fulfillment_mode === 'supplier') web.append(cell(state.supplier_available ? 'Proveedor disponible en la base compartida' : 'Proveedor sin disponibilidad habilitada en la base', 'small'));
      if (state.editUrl && !row.productId) web.append(sharedLink('Editar producto agregado', state.editUrl));
      if (state.publicUrl) web.append(sharedLink('Ver ficha en la tienda', state.publicUrl));
    }
    const verify = cell('Verificar estado compartido', 'button'); verify.className = 'secondary'; verify.disabled = !compatible; verify.addEventListener('click', () => checkWeb(row)); web.append(verify); tr.append(web);
  }
  if (!body.children.length) { const tr = document.createElement('tr'), td = cell(rows.size ? 'No hay resultados para ese filtro.' : 'Los resultados van a aparecer aquí mientras se consulta cada producto.'); td.colSpan = 6; tr.append(td); body.append(tr); }
  $('results').textContent = rows.size; selectionState();
}
async function poll() {
  if (closed) return;
  try {
    let tableDirty = false;
    let state = await api('state?after=' + cursor);
    if (runId !== state.runId || state.cursor < cursor) { state = await api('state?after=0'); runId = state.runId; cursor = 0; rows.clear(); sharedStates.clear(); selected.clear(); $('logs').replaceChildren(); $('confirm').checked = false; tableDirty = true; }
    const nextBusy = ['running', 'paused', 'stopping'].includes(state.phase) || state.applying || state.finishing;
    if (busy !== nextBusy) tableDirty = true; busy = nextBusy;
    for (const event of state.events) {
      if (event.row) { tableDirty = true; rows.set(event.row.id, event.row); sharedStates.delete(event.row.id); if (event.row.status === 'saved') selected.delete(event.row.id); }
      if (event.message) { const li = cell(new Date(event.at).toLocaleTimeString('es-AR') + ' · ' + event.message, 'li'); $('logs').append(li); while ($('logs').children.length > 150) $('logs').firstChild.remove(); $('logs').scrollTop = $('logs').scrollHeight; }
    }
    cursor = state.cursor; $('phase').textContent = state.applying ? 'Guardando selección' : labels[state.phase]; $('current').textContent = state.current || 'Elegí proveedores para comenzar.'; $('checked').textContent = state.checked + (state.total ? '/' + state.total : ''); $('saved').textContent = state.saved; $('progress').max = Math.max(1, state.total); $('progress').value = state.checked;
    $('start').disabled = busy || requesting || !compatible; $('recover').disabled = busy || requesting || !compatible; $('pause').disabled = state.phase !== 'running' || requesting; $('resume').disabled = state.phase !== 'paused' || requesting; $('stop').disabled = !['running', 'paused'].includes(state.phase) || requesting;
    $('sync-summary').textContent = !state.runId ? 'Al iniciar se aplican las opciones de sincronización marcadas arriba.' : state.syncEnabled ? 'Sincronización durante el recorrido habilitada. ' + (state.pricesEnabled ? 'Ajuste por margen habilitado; revisá el resultado de cada precio.' : 'Precios automáticos desmarcados.') : 'Recorrido en modo revisión: hay que guardar los resultados para sincronizarlos.';
    $('logfile').textContent = state.logFile ? 'Historial privado: ' + state.logFile : ''; $('connection').textContent = 'Esta PC · conectado'; if (tableDirty) renderRows(); else selectionState();
  } catch (e) { $('connection').textContent = 'Herramienta desconectada'; note(e.message + ' Abrí Iniciar proveedores MYA.cmd si cerraste la consola.'); }
  if (!closed) setTimeout(poll, 1000);
}
async function action(name, input = {}) { if (requesting) return false; requesting = true; $('start').disabled = true; selectionState(); try { note(''); await api(name, input); return true; } catch (e) { note(e.message); return false; } finally { requesting = false; selectionState(); } }
$('start').addEventListener('click', () => { const suppliers = [...document.querySelectorAll('#suppliers input:checked')].map(x => x.value); action('start', { mode: document.querySelector('input[name="mode"]:checked').value, suppliers, query: $('query').value, limit: Number($('limit').value), pages: Number($('pages').value), visible: $('visible').checked, sync: $('sync').checked, prices: $('prices').checked }); });
$('sync').addEventListener('change', () => { $('prices').disabled = !$('sync').checked; if (!$('sync').checked) $('prices').checked = false; });
$('recover').addEventListener('click', () => action('recover', { sync: $('sync').checked, prices: $('prices').checked }));
for (const id of ['pause', 'resume', 'stop']) $(id).addEventListener('click', () => action(id));
$('apply').addEventListener('click', () => action('apply', { ids: [...selected], confirmed: $('confirm').checked }));
$('confirm').addEventListener('change', selectionState); $('filter').addEventListener('input', renderRows);
$('shutdown').addEventListener('click', async () => { if (!await action('shutdown')) return; closed = true; $('connection').textContent = 'Herramienta cerrada'; note('La herramienta local terminó. Podés cerrar esta pestaña; el respaldo en la nube continúa.'); for (const button of document.querySelectorAll('button')) button.disabled = true; });
async function init() {
  try {
    const connection = await api('connection'); compatible = connection.version === 2;
    $('shared-status').textContent = connection.message + ' Disponibilidad automática: ' + (connection.autoStock ? 'habilitada' : 'deshabilitada') + '. Ajuste por margen: ' + (connection.marginPrices ? 'habilitado' : 'pendiente de habilitar') + '.';
  } catch { $('shared-status').textContent = 'Está abierta una versión anterior. Dejá que termine tu recorrido, cerrá la herramienta y volvé a abrirla para usar la sincronización nueva. El botón de recuperar permite volver a comprobar los resultados pendientes.'; }
  try {
    const suppliers = await api('suppliers'); $('suppliers').replaceChildren();
    for (const s of suppliers) { const label = document.createElement('label'); label.className = 'supplier'; const input = document.createElement('input'); input.type = 'checkbox'; input.value = s.official_key; input.disabled = !s.is_active || !s.automation_authorized || s.official_key === 'madrid-center'; input.checked = !input.disabled; label.append(input, document.createTextNode(' ' + s.name)); label.append(cell(s.official_key === 'madrid-center' ? 'Lista autorizada / manual' : input.disabled ? 'Consulta deshabilitada' : 'Registro verificado ' + (s.capabilities?.reviewed_on || 'sin fecha'), 'small')); $('suppliers').append(label); }
  } catch (e) { note(e.message); }
  poll();
}
init();
