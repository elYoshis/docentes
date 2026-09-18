const state = { docentes: [], periodos: [], cobros: [], periodoActivoId: null };
const $ = (selector) => document.querySelector(selector);
const money = (value) => `Bs. ${Number(value || 0).toFixed(2)}`;
const activePeriod = () => state.periodos.find((periodo) => periodo.id === state.periodoActivoId);
const notify = (message) => { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); };
const themeKey = 'siscobro-theme';
const sortState = { cobros: { key: 'paterno', asc: true }, docentes: { key: 'nombre_completo', asc: true }, periodos: { key: 'fecha', asc: false }, reportes: { key: 'docente', asc: true } };
let noteEditor = null;

function initializeNoteEditor() {
  if (noteEditor || typeof Quill === 'undefined') return;
  noteEditor = new Quill('#editor-nota-general', { theme: 'snow', placeholder: 'Observaciones, cuadres o recordatorios...', modules: { toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], [{ color: [] }, { background: [] }], ['clean']] } });
}

function sortItems(items, group, key, getter = (item) => item[key]) {
  const current = sortState[group];
  if (current.key === key) current.asc = !current.asc; else { current.key = key; current.asc = true; }
  return [...items].sort((left, right) => {
    const a = getter(left, key); const b = getter(right, key);
    const numberA = Number(a); const numberB = Number(b);
    const result = !Number.isNaN(numberA) && !Number.isNaN(numberB) ? numberA - numberB : String(a ?? '').localeCompare(String(b ?? ''), 'es', { sensitivity: 'base', numeric: true });
    return current.asc ? result : -result;
  });
}

function sortByCurrent(items, group, getter) {
  const current = sortState[group];
  return [...items].sort((left, right) => {
    const a = getter(left, current.key); const b = getter(right, current.key); const numberA = Number(a); const numberB = Number(b);
    const result = !Number.isNaN(numberA) && !Number.isNaN(numberB) ? numberA - numberB : String(a ?? '').localeCompare(String(b ?? ''), 'es', { sensitivity: 'base', numeric: true });
    return current.asc ? result : -result;
  });
}

function applyTheme(theme) {
  document.body.classList.toggle('dark-mode', theme === 'dark');
  $('#btn-theme').textContent = theme === 'dark' ? '☀' : '☾';
  localStorage.setItem(themeKey, theme);
}

function toggleTheme() { applyTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark'); }

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); URL.revokeObjectURL(link.href);
}

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || 'No se pudo completar la operación.'); }
  return response.status === 204 ? null : response.json();
}

async function loadState() { const data = await api('/estado'); state.docentes = data.docentes; state.periodos = data.periodos; state.cobros = data.cobros; state.periodoActivoId = data.periodo_activo_id; renderAll(); }

function renderAll() { renderPeriodSelector(); renderDashboard(); renderCobros(); renderDocentes(); renderPeriodos(); renderReport(); }
function renderPeriodSelector() { $('#periodo-nav').innerHTML = '<option value="">Seleccionar...</option>' + state.periodos.map((p) => `<option value="${p.id}" ${p.id === state.periodoActivoId ? 'selected' : ''}>${p.fecha}</option>`).join(''); }
function renderDashboard() {
  const period = activePeriod();
  const rows = state.cobros.filter((cobro) => cobro.periodo_id === state.periodoActivoId);
  const atraso = rows.filter((cobro) => cobro.aprobado).reduce((sum, cobro) => sum + cobro.atraso, 0);
  const actividad = rows.filter((cobro) => cobro.aprobado).reduce((sum, cobro) => sum + cobro.actividad, 0);
  $('#metric-atraso').textContent = money(atraso); $('#metric-actividad').textContent = money(actividad);
  $('#meta-atraso').textContent = `Meta: ${money(period?.meta_atraso)}`; $('#meta-actividad').textContent = `Meta: ${money(period?.meta_actividad)}`;
  $('#bar-atraso').style.width = `${Math.min(100, period?.meta_atraso ? (atraso / period.meta_atraso) * 100 : 0)}%`;
  $('#bar-actividad').style.width = `${Math.min(100, period?.meta_actividad ? (actividad / period.meta_actividad) * 100 : 0)}%`;
}
function renderCobros() {
  const period = activePeriod(); const panel = $('#panel-cobros'); const empty = $('#sin-periodo');
  panel.classList.toggle('hidden', !period); empty.classList.toggle('hidden', Boolean(period)); if (!period) return;
  const search = $('#buscar-cobros').value.toLowerCase(); const approval = $('#filtro-estado').value; const payment = $('#filtro-pago').value; const route = $('#filtro-ruta').value; const type = $('#filtro-multa').value; const minimum = Number($('#filtro-minimo').value); const maximum = Number($('#filtro-maximo').value);
  const filteredRows = state.cobros.filter((cobro) => { const hasAtraso = cobro.atraso > 0; const hasActividad = cobro.actividad > 0; const total = cobro.total; const typeMatches = !type || (type === 'atraso' && hasAtraso && !hasActividad) || (type === 'actividad' && hasActividad && !hasAtraso) || (type === 'ambas' && hasAtraso && hasActividad) || (type === 'ninguna' && !hasAtraso && !hasActividad); return cobro.periodo_id === period.id && `${cobro.docente?.nombre_completo} ${cobro.observacion}`.toLowerCase().includes(search) && (!approval || (cobro.aprobado ? 'aprobado' : 'pendiente') === approval) && (!payment || (cobro.cancelado ? 'pagado' : 'pendiente') === payment) && (!route || (cobro.hoja_ruta ? 'entregada' : 'pendiente') === route) && typeMatches && (!$('#filtro-minimo').value || total >= minimum) && (!$('#filtro-maximo').value || total <= maximum); });
  const rows = sortByCurrent(filteredRows, 'cobros', (cobro, key) => key === 'paterno' ? cobro.docente?.paterno : key === 'materno' ? cobro.docente?.materno : key === 'nombre' ? cobro.docente?.nombre : cobro[key]);
  $('#tabla-cobros').innerHTML = rows.length ? rows.map((cobro, index) => `<tr class="${cobro.aprobado ? 'cobro-aprobado' : 'cobro-pendiente'} ${!cobro.cancelado ? 'cobro-pago-pendiente' : ''}"><td class="text-center font-bold">${index + 1}</td><td>${cobro.docente?.paterno?.toUpperCase() || '-'}</td><td>${cobro.docente?.materno?.toUpperCase() || '-'}</td><td><span class="docente-nombre font-bold">${cobro.docente?.nombre?.toUpperCase() || 'ELIMINADO'}<span class="docente-acciones"><button class="docente-accion" data-history="${cobro.docente_id}" title="Historial">◉</button><button class="docente-accion" data-edit-cobro="${cobro.id}" title="Editar">✎</button><button class="docente-accion" data-delete-cobro="${cobro.id}" title="Eliminar">×</button></span></span></td><td class="text-center">${cobro.link_respaldo ? `<span class="route-actions"><a class="drive-link route-icon" href="${cobro.link_respaldo}" target="_blank" rel="noreferrer" title="Abrir hoja de ruta en Google Drive" aria-label="Abrir hoja de ruta en Google Drive">🔗</a><button class="route-action" data-edit-cobro="${cobro.id}" title="Cambiar hoja de ruta">✎</button><button class="route-action route-remove" data-delete-drive="${cobro.id}" title="Borrar hoja de ruta">×</button></span>` : cobro.hoja_ruta ? '<span class="route-icon text-emerald-700" title="Hoja de ruta entregada">✓</span>' : '<span class="route-icon text-red-600" title="Hoja de ruta pendiente">×</span>'}</td><td class="amount-atraso">${money(cobro.atraso)}</td><td class="amount-actividad">${money(cobro.actividad)}</td><td class="amount-total">${money(cobro.total)}</td><td><button class="approval-pill ${cobro.aprobado ? 'approved' : 'pending'}" data-approve="${cobro.id}" title="Cambiar aprobación">${cobro.aprobado ? 'Aprobado' : 'Pendiente'}</button></td><td>${cobro.cancelado ? `<span class="payment-paid">Pagado ${cobro.fecha_cancelacion}</span> <button class="text-xs font-bold text-slate-500 underline" data-unpay="${cobro.id}">Deshacer pago</button>` : `<button class="payment-pending text-xs" data-pay="${cobro.id}">No pagado · Marcar</button>`}</td><td><input class="observation-editor" data-observation="${cobro.id}" value="${(cobro.observacion || '').replace(/"/g, '&quot;')}" placeholder="Escribir observación..."></td></tr>`).join('') : '<tr><td colspan="11" class="py-8 text-center text-black/50">No hay cobros para este periodo.</td></tr>';
  const approveAll = $('#aprobar-todos'); approveAll.checked = rows.length > 0 && rows.every((cobro) => cobro.aprobado);
  if (noteEditor && noteEditor.root.innerHTML !== (period.nota_general || '<p><br></p>')) noteEditor.root.innerHTML = period.nota_general || '';
}
function renderDocentes() { const search = $('#buscar-docentes').value.toLowerCase(); const rows = sortByCurrent(state.docentes.filter((docente) => `${docente.nombre_completo} ${docente.nombre} ${docente.paterno} ${docente.materno}`.toLowerCase().includes(search)), 'docentes', (docente, key) => docente[key]); $('#tabla-docentes').innerHTML = rows.length ? rows.map((docente) => `<tr><td class="font-bold">${docente.nombre_completo}</td><td>${docente.nombre}</td><td>${docente.paterno}</td><td>${docente.materno}</td><td><button class="text-red-700" data-delete-docente="${docente.id}">Eliminar</button></td></tr>`).join('') : '<tr><td colspan="5" class="py-8 text-center">No hay docentes que coincidan.</td></tr>'; }
function renderPeriodos() { const search = $('#buscar-periodos').value.toLowerCase(); const status = $('#filtro-periodo-estado').value; const rows = sortByCurrent(state.periodos.filter((periodo) => periodo.fecha.includes(search) && (!status || (periodo.activo ? 'activo' : 'inactivo') === status)), 'periodos', (periodo, key) => periodo[key]); $('#tabla-periodos').innerHTML = rows.length ? rows.map((periodo) => `<tr><td class="font-bold">${periodo.fecha}</td><td>${money(periodo.meta_atraso)}</td><td>${money(periodo.meta_actividad)}</td><td>${periodo.activo ? '<span class="font-bold text-emerald-700">Activo</span>' : `<button class="text-coral" data-activate="${periodo.id}">Activar</button>`}</td><td><button class="text-red-700" data-delete-periodo="${periodo.id}">Borrar</button></td></tr>`).join('') : '<tr><td colspan="5" class="py-8 text-center">No hay periodos que coincidan.</td></tr>'; }
function renderReport() { const period = activePeriod(); const rows = state.cobros.filter((cobro) => cobro.periodo_id === period?.id); const atrasos = rows.filter((cobro) => cobro.aprobado).reduce((sum, cobro) => sum + cobro.atraso, 0); const actividades = rows.filter((cobro) => cobro.aprobado).reduce((sum, cobro) => sum + cobro.actividad, 0); $('#reporte-resumen').innerHTML = [['Recaudado', money(atrasos + actividades)], ['Atrasos', money(atrasos)], ['Actividades', money(actividades)]].map(([label, value]) => `<article class="metric-card"><p class="eyebrow">${label}</p><strong>${value}</strong></article>`).join(''); const search = $('#buscar-reporte').value.toLowerCase(); const type = $('#filtro-reporte-multa').value; const pending = rows.filter((cobro) => !cobro.aprobado && `${cobro.docente?.nombre_completo}`.toLowerCase().includes(search) && (!type || (type === 'atraso' ? cobro.atraso > 0 : cobro.actividad > 0))); const sortedPending = sortByCurrent(pending, 'reportes', (cobro, key) => key === 'docente' ? cobro.docente?.nombre_completo : cobro[key]); $('#tabla-pendientes').innerHTML = sortedPending.map((cobro) => `<tr><td class="font-bold">${cobro.docente?.nombre_completo || 'Eliminado'}</td><td>${money(cobro.atraso)}</td><td>${money(cobro.actividad)}</td><td>${money(cobro.total)}</td><td class="text-orange-700">Pendiente</td></tr>`).join('') || '<tr><td colspan="5" class="py-8 text-center text-emerald-700">Todos están al día.</td></tr>'; }
function exportarExcel() { const period = activePeriod(); if (!period) return notify('Selecciona un periodo para exportar.'); const rows = state.cobros.filter((cobro) => cobro.periodo_id === period.id); if (!rows.length) return notify('No hay cobros para exportar.'); const detail = rows.map((cobro, index) => ({ Nro: index + 1, 'Apellido paterno': cobro.docente?.paterno || '', 'Apellido materno': cobro.docente?.materno || '', Nombres: cobro.docente?.nombre || '', 'Hoja de ruta': cobro.hoja_ruta ? 'ENTREGADA' : 'PENDIENTE', 'Atraso (Bs)': cobro.atraso, 'Actividad (Bs)': cobro.actividad, 'Total (Bs)': cobro.total, Aprobación: cobro.aprobado ? 'APROBADO' : 'PENDIENTE', Pago: cobro.cancelado ? `PAGADO ${cobro.fecha_cancelacion}` : 'NO PAGADO', Observación: cobro.observacion || '' })); const approved = rows.filter((cobro) => cobro.aprobado); const summary = [{ Concepto: 'Recaudación por atrasos', Meta: period.meta_atraso, Recaudado: approved.reduce((sum, cobro) => sum + cobro.atraso, 0) }, { Concepto: 'Recaudación por actividades', Meta: period.meta_actividad, Recaudado: approved.reduce((sum, cobro) => sum + cobro.actividad, 0) }]; const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'Resumen'); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detail), 'Detalle de cobros'); XLSX.writeFile(workbook, `Reporte_SisCobro_${period.fecha}.xlsx`); }
function exportarPdf() { const period = activePeriod(); if (!period) return notify('Selecciona un periodo para exportar.'); const rows = state.cobros.filter((cobro) => cobro.periodo_id === period.id); const approved = rows.filter((cobro) => cobro.aprobado); const totalAtraso = approved.reduce((sum, cobro) => sum + cobro.atraso, 0); const totalActividad = approved.reduce((sum, cobro) => sum + cobro.actividad, 0); const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFontSize(16); doc.text(`Reporte de cobros - ${period.fecha}`, 14, 18); doc.setFontSize(10); doc.text(`Atrasos recaudados: ${money(totalAtraso)}`, 14, 28); doc.text(`Actividades recaudadas: ${money(totalActividad)}`, 14, 34); doc.autoTable({ startY: 42, head: [['Nro', 'Docente', 'Atraso', 'Actividad', 'Total', 'Estado']], body: rows.map((cobro, index) => [index + 1, cobro.docente?.nombre_completo || 'Eliminado', money(cobro.atraso), money(cobro.actividad), money(cobro.total), cobro.aprobado ? 'APROBADO' : 'PENDIENTE']), headStyles: { fillColor: [23, 33, 43] }, styles: { fontSize: 8 } }); doc.save(`Reporte_SisCobro_${period.fecha}.pdf`); }

let editingCobroId = null;
function openDialog(id) { $(id).showModal(); }
function closeDialogs() { document.querySelectorAll('dialog').forEach((dialog) => dialog.close()); }
function fillCobroDocentes() { $('#cobro-docente').innerHTML = '<option value="">Seleccione docente...</option>' + state.docentes.map((docente) => `<option value="${docente.id}">${docente.nombre_completo}</option>`).join(''); }
function openCobroEditor(cobroId) { const cobro = state.cobros.find((item) => item.id === Number(cobroId)); if (!cobro) return; editingCobroId = cobro.id; fillCobroDocentes(); $('#cobro-docente').value = cobro.docente_id; $('#form-cobro [name="atraso"]').value = cobro.atraso; $('#form-cobro [name="actividad"]').value = cobro.actividad; $('#form-cobro [name="hoja_ruta"]').checked = cobro.hoja_ruta; $('#form-cobro [name="observacion"]').value = cobro.observacion || ''; $('#form-cobro [name="archivo"]').value = ''; openDialog('#modal-cobro'); }
function renderHistory(docenteId) { const docente = state.docentes.find((item) => item.id === Number(docenteId)); const rows = state.cobros.filter((cobro) => cobro.docente_id === Number(docenteId)).sort((a, b) => a.periodo_id - b.periodo_id); $('#historial-docente').textContent = docente?.nombre_completo || 'Docente eliminado'; const paid = rows.filter((cobro) => cobro.aprobado).reduce((sum, cobro) => sum + cobro.total, 0); const debt = rows.filter((cobro) => !cobro.aprobado).reduce((sum, cobro) => sum + cobro.total, 0); $('#historial-resumen').innerHTML = `<div class="panel"><small>Total</small><strong>${money(paid + debt)}</strong></div><div class="panel"><small>Pagado</small><strong>${money(paid)}</strong></div><div class="panel"><small>Deuda</small><strong>${money(debt)}</strong></div>`; $('#tabla-historial').innerHTML = rows.map((cobro) => `<tr><td>${state.periodos.find((periodo) => periodo.id === cobro.periodo_id)?.fecha || 'Desconocido'}</td><td>${money(cobro.atraso)}</td><td>${money(cobro.actividad)}</td><td>${money(cobro.total)}</td><td class="${cobro.aprobado ? 'text-emerald-700' : 'text-orange-700'}">${cobro.aprobado ? 'Pagado' : 'Pendiente'}</td></tr>`).join('') || '<tr><td colspan="5">Sin registros.</td></tr>'; openDialog('#modal-historial'); }

document.addEventListener('click', async (event) => {
  const tab = event.target.closest('[data-tab]'); if (tab) { document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.add('hidden')); $(`#tab-${tab.dataset.tab}`).classList.remove('hidden'); document.querySelectorAll('.tab-button').forEach((button) => button.classList.remove('active')); tab.classList.add('active'); }
  if (event.target.dataset.sort) { sortItems([], 'cobros', event.target.dataset.sort, (item, key) => key === 'paterno' ? item.docente?.paterno : key === 'materno' ? item.docente?.materno : key === 'nombre' ? item.docente?.nombre : item[key]); renderCobros(); return; }
  if (event.target.dataset.sortDocente) { sortItems([], 'docentes', event.target.dataset.sortDocente, (item, key) => item[key]); renderDocentes(); return; }
  if (event.target.dataset.sortPeriodo) { sortItems([], 'periodos', event.target.dataset.sortPeriodo, (item, key) => item[key]); renderPeriodos(); return; }
  if (event.target.dataset.sortReporte) { sortItems([], 'reportes', event.target.dataset.sortReporte, (item, key) => key === 'docente' ? item.docente?.nombre_completo : item[key]); renderReport(); return; }
  try {
    if (event.target.dataset.activate) { await api(`/periodos/${event.target.dataset.activate}/activar`, { method: 'PUT' }); await loadState(); }
    if (event.target.dataset.deletePeriodo && confirm('¿Borrar este periodo y sus cobros?')) { await api(`/periodos/${event.target.dataset.deletePeriodo}`, { method: 'DELETE' }); await loadState(); }
    if (event.target.dataset.deleteDocente && confirm('¿Eliminar este docente?')) { await api(`/docentes/${event.target.dataset.deleteDocente}`, { method: 'DELETE' }); await loadState(); }
    if (event.target.dataset.deleteCobro && confirm('¿Eliminar este cobro?')) { await api(`/cobros/${event.target.dataset.deleteCobro}`, { method: 'DELETE' }); await loadState(); }
    if (event.target.dataset.editCobro) { openCobroEditor(event.target.dataset.editCobro); }
    if (event.target.dataset.history) { renderHistory(event.target.dataset.history); }
    if (event.target.dataset.approve) { const cobro = state.cobros.find((item) => item.id === Number(event.target.dataset.approve)); await api(`/cobros/${cobro.id}/estado`, { method: 'PUT', body: JSON.stringify({ aprobado: !cobro.aprobado }) }); await loadState(); }
    if (event.target.dataset.pay) { await api(`/cobros/${event.target.dataset.pay}/estado`, { method: 'PUT', body: JSON.stringify({ cancelado: true, fecha_cancelacion: new Date().toISOString().slice(0, 10) }) }); await loadState(); }
    if (event.target.dataset.unpay && confirm('¿Deshacer el pago de este docente?')) { await api(`/cobros/${event.target.dataset.unpay}/estado`, { method: 'PUT', body: JSON.stringify({ cancelado: false }) }); await loadState(); notify('Pago deshecho.'); }
    if (event.target.dataset.deleteDrive && confirm('¿Borrar también esta hoja de ruta de Google Drive?')) { const token = await getDriveToken(); await fetch(`/api/cobros/${event.target.dataset.deleteDrive}/respaldo`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(async (response) => { if (!response.ok) throw new Error((await response.json()).error || 'No se pudo borrar la hoja de ruta.'); }); await loadState(); notify('Hoja de ruta borrada.'); }
    if (event.target.matches('[data-close]')) closeDialogs();
  } catch (error) { notify(error.message); }
});

$('#periodo-nav').addEventListener('change', async (event) => { if (event.target.value) { await api(`/periodos/${event.target.value}/activar`, { method: 'PUT' }); await loadState(); } });
document.addEventListener('focusout', async (event) => { if (!event.target.matches('.observation-editor')) return; const cobro = state.cobros.find((item) => item.id === Number(event.target.dataset.observation)); if (!cobro || event.target.value === (cobro.observacion || '')) return; try { await api('/cobros', { method: 'POST', body: JSON.stringify({ periodo_id: cobro.periodo_id, docente_id: cobro.docente_id, observacion: event.target.value.trim() }) }); cobro.observacion = event.target.value.trim(); notify('Observación guardada.'); } catch (error) { event.target.value = cobro.observacion || ''; notify(error.message); } });
['#buscar-cobros', '#filtro-multa', '#filtro-estado', '#filtro-pago', '#filtro-ruta', '#filtro-minimo', '#filtro-maximo'].forEach((selector) => $(selector).addEventListener('input', renderCobros));
$('#limpiar-filtros-cobros').addEventListener('click', () => { ['#buscar-cobros', '#filtro-multa', '#filtro-estado', '#filtro-pago', '#filtro-ruta', '#filtro-minimo', '#filtro-maximo'].forEach((selector) => { $(selector).value = ''; }); renderCobros(); });
$('#buscar-docentes').addEventListener('input', renderDocentes); $('#limpiar-filtros-docentes').addEventListener('click', () => { $('#buscar-docentes').value = ''; renderDocentes(); });
$('#buscar-periodos').addEventListener('input', renderPeriodos); $('#filtro-periodo-estado').addEventListener('change', renderPeriodos); $('#limpiar-filtros-periodos').addEventListener('click', () => { $('#buscar-periodos').value = ''; $('#filtro-periodo-estado').value = ''; renderPeriodos(); });
$('#buscar-reporte').addEventListener('input', renderReport); $('#filtro-reporte-multa').addEventListener('change', renderReport);
$('#exportar-excel').addEventListener('click', exportarExcel); $('#exportar-pdf').addEventListener('click', exportarPdf);
$('#form-docente').addEventListener('submit', async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); try { await api('/docentes', { method: 'POST', body: JSON.stringify(data) }); event.target.reset(); await loadState(); notify('Docente registrado.'); } catch (error) { notify(error.message); } });
$('#form-periodo').addEventListener('submit', async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); try { await api('/periodos', { method: 'POST', body: JSON.stringify(data) }); event.target.reset(); await loadState(); notify('Periodo creado.'); } catch (error) { notify(error.message); } });
$('#btn-nuevo-cobro').addEventListener('click', () => { editingCobroId = null; fillCobroDocentes(); $('#form-cobro').reset(); openDialog('#modal-cobro'); });
$('#form-cobro').addEventListener('submit', async (event) => { event.preventDefault(); const formData = new FormData(event.target); const archivo = formData.get('archivo'); const data = Object.fromEntries(formData); delete data.archivo; data.periodo_id = state.periodoActivoId; data.docente_id = Number(data.docente_id); data.atraso = Number(data.atraso || 0); data.actividad = Number(data.actividad || 0); data.hoja_ruta = Boolean(data.hoja_ruta); try { const cobro = await api('/cobros', { method: 'POST', body: JSON.stringify(data) }); if (archivo && archivo.size && window.GOOGLE_CLIENT_ID) { const token = await getDriveToken(); const uploadData = new FormData(); uploadData.append('archivo', archivo); const response = await fetch(`/api/cobros/${cobro.id}/respaldo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: uploadData }); if (!response.ok) throw new Error((await response.json()).error || 'No se pudo subir la hoja de ruta.'); } else if (archivo && archivo.size) notify('Cobro guardado. Configura GOOGLE_CLIENT_ID para subir a Drive.'); editingCobroId = null; closeDialogs(); await loadState(); notify('Cobro guardado.'); } catch (error) { notify(error.message); } });
$('#aprobar-todos').addEventListener('change', async (event) => { const rows = state.cobros.filter((cobro) => cobro.periodo_id === state.periodoActivoId); try { await Promise.all(rows.map((cobro) => api(`/cobros/${cobro.id}/estado`, { method: 'PUT', body: JSON.stringify({ aprobado: event.target.checked }) }))); await loadState(); } catch (error) { notify(error.message); } });
$('#btn-cargar-docentes').addEventListener('click', () => { const existing = new Set(state.cobros.filter((cobro) => cobro.periodo_id === state.periodoActivoId).map((cobro) => cobro.docente_id)); $('#lista-masiva').innerHTML = state.docentes.filter((docente) => !existing.has(docente.id)).map((docente) => `<label class="flex gap-2 rounded border p-2"><input type="checkbox" value="${docente.id}"> ${docente.nombre_completo}</label>`).join('') || '<p>Todos los docentes ya están cargados.</p>'; openDialog('#modal-masivo'); });
$('#form-masivo').addEventListener('submit', async (event) => { event.preventDefault(); try { for (const checkbox of document.querySelectorAll('#lista-masiva input:checked')) await api('/cobros', { method: 'POST', body: JSON.stringify({ periodo_id: state.periodoActivoId, docente_id: Number(checkbox.value) }) }); closeDialogs(); await loadState(); notify('Docentes cargados.'); } catch (error) { notify(error.message); } });
$('#guardar-nota').addEventListener('click', async () => { if (!state.periodoActivoId || !noteEditor) return; await api(`/periodos/${state.periodoActivoId}/nota`, { method: 'PUT', body: JSON.stringify({ nota_general: noteEditor.root.innerHTML }) }); notify('Nota guardada.'); });
$('#btn-theme').addEventListener('click', toggleTheme); $('#btn-theme-config').addEventListener('click', toggleTheme);
$('#btn-exportar').addEventListener('click', async () => { try { downloadJson(await api('/respaldo'), `Respaldo_SisCobro_${new Date().toISOString().slice(0, 10)}.json`); notify('Respaldo descargado.'); } catch (error) { notify(error.message); } });
$('#input-importar').addEventListener('change', async (event) => { const file = event.target.files[0]; if (!file || !confirm('Esto reemplazará los datos actuales. ¿Continuar?')) return; try { const data = JSON.parse(await file.text()); const result = await api('/respaldo', { method: 'POST', body: JSON.stringify(data) }); await loadState(); notify(`${result.mensaje} Cobros omitidos: ${result.cobros_omitidos}.`); } catch (error) { notify(error.message); } event.target.value = ''; });

function getDriveToken() {
  return new Promise((resolve, reject) => {
    if (!window.GOOGLE_CLIENT_ID || !window.google?.accounts?.oauth2) { reject(new Error('Google Drive no está configurado. Define GOOGLE_CLIENT_ID en .env.')); return; }
    const tokenClient = google.accounts.oauth2.initTokenClient({ client_id: window.GOOGLE_CLIENT_ID, scope: 'https://www.googleapis.com/auth/drive.file', callback: (response) => response.access_token ? resolve(response.access_token) : reject(new Error('No se obtuvo autorización de Google Drive.')) });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

applyTheme(localStorage.getItem(themeKey) || 'light');
initializeNoteEditor();
loadState().catch((error) => notify(error.message));