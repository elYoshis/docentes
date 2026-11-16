let categoriaCobroActiva = 'general';

// Cambia la categoría en pantalla (sin refrescar)
function aplicarCategoriaCobro(categoria) {
    categoriaCobroActiva = categoria;
    sincronizarPeriodoActivo();

    // Cambiar estilos de los botones
    document.getElementById('btn-tab-general').classList.toggle('active', categoria === 'general');
    document.getElementById('btn-tab-medicina').classList.toggle('active', categoria === 'medicina');

    // Ocultar/Mostrar la cabecera de Actividad en la tabla
    const thAct = document.getElementById('th-actividad');
    if (thAct) thAct.style.display = (categoria === 'medicina') ? 'none' : '';
}

// Al cambiar de pestaña General/Medicina cambia también el periodo activo, el selector y el reporte
function cambiarCategoriaCobro(categoria) {
    aplicarCategoriaCobro(categoria);
    guardarYRefrescar();
}
function renderCobros() {
  const tbody = document.getElementById("tabla-cobros-body");
  const container = document.getElementById("tabla-container");
  const alerta = document.getElementById("alerta-sin-periodo");

  // 1. Verificar si hay un periodo seleccionado
  const periodoAct = datos.periodos.find((p) => p.id === datos.periodoActivoId);

  if (!periodoAct) {
    container.style.display = "none";
    alerta.textContent = categoriaCobroActiva === 'medicina'
      ? "⚠️ No hay un periodo activo de Medicina. Créalo o actívalo en la pestaña Periodos."
      : "⚠️ No hay un periodo activo General. Créalo o actívalo en la pestaña Periodos.";
    document.getElementById("dash-atraso-txt").textContent = "Bs. 0 / 0";
    document.getElementById("dash-actividad-txt").textContent = "Bs. 0 / 0";
    document.getElementById("bar-atraso").style.width = "0%";
    document.getElementById("bar-actividad").style.width = "0%";
    alerta.style.display = "block";
    return;
  }

  // 2. Mostrar contenedor y actualizar nombre del periodo
  container.style.display = "block";
  alerta.style.display = "none";

  tbody.innerHTML = "";

  // 3. FILTRAR: Obtener solo los cobros que pertenecen al periodo activo
  const cobrosDelMes = datos.cobros.filter((c) => 
      c.periodoId === datos.periodoActivoId && 
      (c.categoria || 'general') === categoriaCobroActiva
  );

 
  // LÓGICA DEL DASHBOARD (Se calcula sumando SOLO si el checkbox está aprobado)
  const recAtraso = cobrosDelMes.reduce(
    (acc, c) => (c.aprobado ? acc + numeroSeguro(c.atraso) : acc),
    0,
  );
  const recActividad = categoriaCobroActiva === 'medicina' ? 0 : cobrosDelMes.reduce(
    (acc, c) => (c.aprobado ? acc + numeroSeguro(c.actividad) : acc),
    0,
  );

  

  // Actualiza los Divs en la pantalla
  // NUEVO: Definir la meta según la pestaña en la que estamos
  const metaAtrasoActual = numeroSeguro(periodoAct.metaAtraso);
  
  const metaActividadActual = categoriaCobroActiva === 'medicina' 
      ? 0 
      : numeroSeguro(periodoAct.metaActividad);

  // Actualiza los Divs en la pantalla
  document.getElementById("dash-atraso-txt").textContent = `Bs. ${recAtraso.toFixed(2)} / ${metaAtrasoActual}`;
  
  if (categoriaCobroActiva === 'medicina') {
      document.getElementById("dash-actividad-txt").textContent = `No aplica en Medicina`;
  } else {
      document.getElementById("dash-actividad-txt").textContent = `Bs. ${recActividad.toFixed(2)} / ${metaActividadActual}`;
  }

  const porcAtraso = metaAtrasoActual > 0 ? (recAtraso / metaAtrasoActual) * 100 : (recAtraso > 0 ? 100 : 0);
  const porcActividad = metaActividadActual > 0 ? (recActividad / metaActividadActual) * 100 : (recActividad > 0 ? 100 : 0);
  // Conectar la base de datos con el nuevo editor Quill
  if (periodoAct && window.editorQuill) {
    const nota = periodoAct.notaGeneral || periodoAct.notas || "";
    window.editorQuill.setContents(window.editorQuill.clipboard.convert(nota), 'silent');
  }

  document.getElementById("bar-atraso").style.width =
    Math.min(porcAtraso, 100) + "%";
  document.getElementById("bar-actividad").style.width =
    Math.min(porcActividad, 100) + "%";
  // --- SINCRONIZAR CHECKBOX GLOBAL ---
  const checkAll = document.getElementById("check-all-aprobado");
  if (checkAll) {
    // Se marca automáticamente solo si hay registros y TODOS están aprobados
    checkAll.checked =
      cobrosDelMes.length > 0 && cobrosDelMes.every((c) => c.aprobado === true);
  }

  // 5. RENDERIZAR TABLA (Con columnas separadas)
  if (cobrosDelMes.length === 0) {
    const colSpan = categoriaCobroActiva === 'medicina' ? 10 : 11;
    tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; color: #999; padding: 20px;">No hay registros de cobro para este mes en esta categoría.</td></tr>`;
    return;
  }

  cobrosDelMes.forEach((c, index) => {
    const doc = datos.docentes.find((d) => Number(d.id) === Number(c.docenteId));

    const paterno = doc ? escaparHTML(normalizarTexto(doc.paterno)) : "-";
    const materno = doc ? escaparHTML(normalizarTexto(doc.materno || "")) : "-";
    const nombre = doc ? escaparHTML(normalizarTexto(doc.nombre)) : "ELIMINADO";
    const ocultarAct = categoriaCobroActiva === 'medicina' ? 'style="display:none;"' : '';
    const atraso = numeroSeguro(c.atraso);
    const valAct = categoriaCobroActiva === 'medicina' ? 0 : numeroSeguro(c.actividad);
    const total = atraso + valAct;
    const docenteId = Number(c.docenteId);

    const celdaAprobado = `
            <div style="text-align: center;">
                <input type="checkbox" style="transform: scale(1.5); cursor: pointer;" 
                       ${c.aprobado ? "checked" : ""} 
                       onclick="toggleAprobado(${c.docenteId})">
            </div>`;

    const hoy = fechaLocalISO();
    let celdaPago = "";

    if (c.cancelado) {
      celdaPago = `
                <div class="estado-pagado">
                    <span class="badge badge-success">✅ Pagado</span>
                    <span class="fecha-pagado-texto">${escaparHTML(c.fechaCancelacion || '')}</span>
                    <button onclick="cambiarEstadoPago(${docenteId}, false)" class="btn-deshacer">Deshacer</button>
                </div>`;
    } else {
      celdaPago = `
                <div class="celda-pago-container">
                    <input type="date" id="fecha-pago-${c.docenteId}" value="${hoy}" class="input-fecha-pago">
                    <button onclick="cambiarEstadoPago(${docenteId}, true)" class="btn-pagar">Pagar</button>
                </div>`;
    }
    let celdaRuta = "❌";
    const linkRespaldo = urlSegura(c.linkRespaldo);
    if (linkRespaldo) {
        // Si hay link, mostramos un botón clickeable para abrir la imagen
        celdaRuta = `<a href="${escaparHTML(linkRespaldo)}" target="_blank" rel="noopener noreferrer" title="Ver Respaldo en Drive" style="text-decoration: none; font-size: 1.2rem; cursor: pointer;">🖼️</a>`;
    } else if (c.hojaRuta) {
        // Si solo se marcó el check pero no se subió archivo
        celdaRuta = "✅";
    }
    // Fila sin la columna final de acciones; las acciones están flotando en el nombre
    tbody.innerHTML += `
            <tr data-estado="${c.aprobado ? "aprobado" : "pendiente"}"
                data-ruta="${c.hojaRuta ? "entregada" : "falta"}">
                <td>${index + 1}</td>
                <td>${paterno}</td>
                <td>${materno}</td>
                <td>
                    <div class="name-bubble-container">
                        <span>${nombre}</span>
                        <div class="btn-historial-bubble">
                            <button class="btn-bubble-action" onclick="abrirModalHistorial(${docenteId})" title="Ver Historial">👁️</button>
                            <button class="btn-bubble-action" onclick="abrirModalCobro(${docenteId})" title="Editar Movimiento">✏️</button>
                            <button class="btn-bubble-action" onclick="borrarCobro(${docenteId})" title="Eliminar Registro">🗑️</button>
                        </div>
                    </div>
                </td>
                <td style="text-align:center">${celdaRuta}</td>
                <td>Bs. ${atraso.toFixed(2)}</td>
                <td ${ocultarAct}>Bs. ${valAct.toFixed(2)}</td>
                <td><b>Bs. ${total.toFixed(2)}</b></td>
                <td>${celdaAprobado}</td>
                <td>${celdaPago}</td>
                <td><small style="color: #666;">${escaparHTML(c.observacion || "")}</small></td>
            </tr>`;
  });
}

function cambiarEstadoPago(docenteId, marcarComoPagado) {
  if (!datos.periodoActivoId) {
    showToast("Selecciona un periodo activo antes de registrar pagos", "error");
    return;
  }

  const cobro = datos.cobros.find(
    (c) => Number(c.docenteId) === Number(docenteId) && c.periodoId === datos.periodoActivoId && (c.categoria || 'general') === categoriaCobroActiva
  );
  if (!cobro) return;

  if (marcarComoPagado) {
    const inputFecha = document.getElementById(`fecha-pago-${docenteId}`);
    if (!inputFecha || !inputFecha.value) {
      showToast("Por favor selecciona una fecha de pago válida", "error");
      return;
    }
    cobro.cancelado = true;
    cobro.fechaCancelacion = inputFecha.value;
    showToast("Pago registrado correctamente", "success");
  } else {
    cobro.cancelado = false;
    cobro.fechaCancelacion = null;
    showToast("Pago desmarcado", "success");
  }

  guardarYRefrescar();
}

function toggleAprobado(docenteId) {
  if (!datos.periodoActivoId) return;

  const cobro = datos.cobros.find(
    (c) => Number(c.docenteId) === Number(docenteId) && c.periodoId === datos.periodoActivoId && (c.categoria || 'general') === categoriaCobroActiva
  );

  if (cobro) {
    // 1. Cambiamos el estado de aprobado
    cobro.aprobado = !cobro.aprobado;

    // 2. Vinculamos directamente la hoja de ruta al checkbox
    // Si apruebas (true), la hoja de ruta se marca entregada. Si desmarcas (false), se quita.
    cobro.hojaRuta = cobro.aprobado;

    // 3. Guardamos y refrescamos toda la pantalla.
    // Esto hace que las fórmulas matemáticas vuelvan a sumar y actualicen los Divs del Dashboard instantáneamente.
    guardarYRefrescar();

    showToast(
      cobro.aprobado
        ? "✅ Aprobado: Hoja marcada y montos sumados"
        : "⚠️ Aprobación retirada: Montos restados",
      cobro.aprobado ? "success" : "error",
    );
  }
}

function toggleAllAprobado(event) {
  if (event) event.stopPropagation();
  if (!datos.periodoActivoId) return;

  const estadoGlobal = document.getElementById("check-all-aprobado").checked;
  // Se añade el filtro de categoría aquí:
  const cobrosDelMes = datos.cobros.filter(
    (c) => c.periodoId === datos.periodoActivoId && (c.categoria || 'general') === categoriaCobroActiva
  );
  if (cobrosDelMes.length === 0) return;
  // Aplicamos el nuevo estado a todos
  cobrosDelMes.forEach((c) => {
    c.aprobado = estadoGlobal;
    c.hojaRuta = estadoGlobal; // Sincronizamos la hoja de ruta
  });

  // Refrescamos la pantalla para actualizar totales y colores
  guardarYRefrescar();

  showToast(
    estadoGlobal
      ? "✅ Todos los registros fueron aprobados"
      : "⚠️ Se retiró la aprobación general",
    estadoGlobal ? "success" : "error",
  );
}

function abrirModalCobro(docenteId = null) {
  if (!datos.periodoActivoId) {
    showToast("Selecciona o crea un periodo activo antes de registrar cobros", "error");
    return;
  }

  const select = document.getElementById("select-docente-cobro");
  select.innerHTML = '<option value="">Seleccione Docente...</option>';
  document.getElementById("contenedor-actividad").style.display = categoriaCobroActiva === 'medicina' ? 'none' : 'block';

  const docentesOrdenados = [...datos.docentes].sort((a, b) =>
    a.paterno.localeCompare(b.paterno),
  );
  docentesOrdenados.forEach((d) => {
    select.innerHTML += `<option value="${Number(d.id)}">${escaparHTML(obtenerNombreCompleto(d))}</option>`;
  });

  if (!docenteId) {
    document.getElementById("select-docente-cobro").value = "";
    document.getElementById("check-hoja-ruta").checked = false;
    document.getElementById("input-atraso").value = 0;
    document.getElementById("input-actividad").value = 0;
    document.getElementById("modal-titulo").textContent =
      "Nuevo Registro de Cobro";
    document.getElementById("input-observacion").value = "";
    document.getElementById("input-archivo-ruta").value = "";
    document.getElementById("nombre-archivo-txt").textContent = "Sin archivo";
    document.getElementById("nombre-archivo-txt").style.color = "#64748b";
  } else {
    // Si enviamos docenteId (estamos editando un registro existente del mes)
    // Si enviamos docenteId (estamos editando un registro existente del mes)
    const c = datos.cobros.find(
      (cob) => Number(cob.docenteId) === Number(docenteId) && cob.periodoId === datos.periodoActivoId && (cob.categoria || 'general') === categoriaCobroActiva
    );
    if (!c) {
      showToast("No se encontró el cobro que deseas editar", "error");
      return;
    }
    document.getElementById("select-docente-cobro").value = docenteId;
    document.getElementById("check-hoja-ruta").checked = c.hojaRuta;
    document.getElementById("input-atraso").value = numeroSeguro(c.atraso);
    document.getElementById("input-actividad").value = categoriaCobroActiva === 'medicina' ? 0 : numeroSeguro(c.actividad);
    document.getElementById("modal-titulo").textContent = "Editar Registro";
    document.getElementById("input-observacion").value = c.observacion || "";
  }

  document.getElementById("modal-cobro").style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal-cobro").style.display = "none";
}

async function guardarCobro(e) {
  e.preventDefault();
  if (!datos.periodoActivoId) {
    showToast("Selecciona o crea un periodo activo antes de registrar cobros", "error");
    return;
  }

  const dId = Number(document.getElementById("select-docente-cobro").value);
  if (!Number.isInteger(dId) || dId <= 0) {
    showToast("Selecciona un docente para registrar el cobro", "error");
    return;
  }

  const atrasoInput = document.getElementById("input-atraso").value;
  const actividadInput = document.getElementById("input-actividad").value;
  const atraso = atrasoInput === '' ? 0 : Number(atrasoInput);
  const actividad = categoriaCobroActiva === 'medicina' || actividadInput === ''
    ? 0
    : Number(actividadInput);
  if (!Number.isFinite(atraso) || atraso < 0 || !Number.isFinite(actividad) || actividad < 0) {
    showToast("Las multas deben ser montos válidos iguales o mayores a cero", "error");
    return;
  }

  // --- LÓGICA DE SUBIDA A DRIVE Y CARPETAS ---
  const btnGuardar = e.target.querySelector('button[type="submit"]');
  const fileInput = document.getElementById("input-archivo-ruta");
  let linkRespaldo = null;

  // Obtenemos los datos del docente para armar el nombre de su carpeta
  const docente = datos.docentes.find((d) => Number(d.id) === dId);
  // Ejemplo: "CORTEZ JOSE"
  const nombreCarpetaDocente = docente ? `${docente.paterno} ${docente.nombre}`.toUpperCase() : "DESCONOCIDO";

  // Si el usuario seleccionó un archivo, bloqueamos el botón y lo subimos
  if (fileInput && fileInput.files.length > 0) {
      if (btnGuardar) {
          btnGuardar.innerText = "Subiendo y organizando... ⏳";
          btnGuardar.disabled = true;
      }
      try {
          linkRespaldo = await subirArchivoADrive(fileInput.files[0], nombreCarpetaDocente);
      } catch (error) {
          console.error("Error al subir el respaldo:", error);
          showToast("No se pudo subir el respaldo. El cobro no se guardó.", "error");
          return;
      } finally {
          if (btnGuardar) {
              btnGuardar.innerText = "Guardar";
              btnGuardar.disabled = false;
          }
      }
  }
  // --------------------------------

  const cobroExistente = datos.cobros.find(
    (c) => Number(c.docenteId) === dId &&
      c.periodoId === datos.periodoActivoId &&
      (c.categoria || 'general') === categoriaCobroActiva,
  );

  const datosCobro = {
    hojaRuta: document.getElementById("check-hoja-ruta").checked,
    atraso,
    actividad,
    observacion: document.getElementById("input-observacion").value.trim(),
  };

  if (cobroExistente) {
    // Actualizar en el mismo lugar conserva el orden y los estados existentes.
    Object.assign(cobroExistente, datosCobro);
    if (linkRespaldo) cobroExistente.linkRespaldo = linkRespaldo;
  } else {
    datos.cobros.push({
      periodoId: datos.periodoActivoId,
      categoria: categoriaCobroActiva,
      docenteId: dId,
      ...datosCobro,
      aprobado: false,
      cancelado: false,
      linkRespaldo,
    });
  }
  
  guardarYRefrescar();
  cerrarModal();
}

function limpiarSeleccionArchivo() {
    document.getElementById("input-archivo-ruta").value = "";
    const texto = document.getElementById("nombre-archivo-txt");
    texto.textContent = "Sin archivo";
    texto.style.color = "#64748b";
    texto.style.fontWeight = "normal";
}
function borrarCobro(docenteId) {
  datos.cobros = datos.cobros.filter(
    (c) => !(Number(c.docenteId) === Number(docenteId) && c.periodoId === datos.periodoActivoId && (c.categoria || 'general') === categoriaCobroActiva)
  );
  guardarYRefrescar();
}

function abrirModalSeleccionMasiva() {
  if (!datos.periodoActivoId) {
    showToast("⚠️ Selecciona un periodo activo primero", "error");
    return;
  }

  const contenedor = document.getElementById("lista-checkbox-docentes");
  contenedor.innerHTML = "";
  document.getElementById("buscar-docente-modal").value = "";

  // Ordenamos alfabéticamente
  const docentesOrdenados = [...datos.docentes].sort((a, b) =>
    a.paterno.localeCompare(b.paterno),
  );
  let disponibles = 0;

  docentesOrdenados.forEach((doc) => {
    // Solo mostramos a los docentes que NO están ya agregados en este mes
   const existe = datos.cobros.some(
     (c) => Number(c.docenteId) === Number(doc.id) && c.periodoId === datos.periodoActivoId && (c.categoria || 'general') === categoriaCobroActiva
    );

    if (!existe) {
      const nombreCompleto = obtenerNombreCompleto(doc);
      contenedor.innerHTML += `
                <label style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; transition: background 0.2s;">
                    <input type="checkbox" class="check-docente-masivo" value="${Number(doc.id)}" style="width: auto; margin: 0;">
                    ${escaparHTML(nombreCompleto)}
                </label>
            `;
      disponibles++;
    }
  });

  if (disponibles === 0) {
    showToast(
      "ℹ️ Todos los docentes ya están registrados en esta planilla",
      "error",
    );
    return;
  }

  document.getElementById("modal-seleccion-docentes").style.display = "flex";
}

function cerrarModalSeleccion() {
  document.getElementById("modal-seleccion-docentes").style.display = "none";
}

function guardarDocentesSeleccionados() {
  if (!datos.periodoActivoId) {
    showToast("Selecciona un periodo activo antes de cargar docentes", "error");
    return;
  }

  // Capturamos todos los checkboxes que el usuario haya marcado
  const checkboxes = document.querySelectorAll(".check-docente-masivo:checked");
  let agregados = 0;

  checkboxes.forEach((chk) => {
    const docId = Number(chk.value);
    if (!Number.isInteger(docId) || docId <= 0) return;

    datos.cobros.push({
      periodoId: datos.periodoActivoId,
      categoria: categoriaCobroActiva,
      docenteId: docId,
      hojaRuta: false,
      atraso: 0,
      actividad: 0,
      observacion: "",
      cancelado: false,
      fechaCancelacion: null,
    });
    agregados++;
  });

  if (agregados > 0) {
    showToast(`✅ Se agregaron ${agregados} docentes a la planilla`, "success");
    guardarYRefrescar();
    cerrarModalSeleccion();
  } else {
    showToast("⚠️ Debes seleccionar al menos un docente", "error");
  }
}

// Buscador en vivo dentro del modal
function filtrarListaDocentesModal() {
  const filtro = document
    .getElementById("buscar-docente-modal")
    .value.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const labels = document
    .getElementById("lista-checkbox-docentes")
    .getElementsByTagName("label");

  for (let i = 0; i < labels.length; i++) {
    const texto = labels[i].textContent
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (texto.includes(filtro)) {
      labels[i].style.display = "flex";
    } else {
      labels[i].style.display = "none";
    }
  }
}

function filtrarCobrosAvanzado() {
  // Obtenemos los valores de los tres campos
  const textoFiltro = document
    .getElementById("search-cobro")
    .value.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const estadoFiltro = document.getElementById("filtro-estado").value;
  const rutaFiltro = document.getElementById("filtro-ruta").value;

  const tbody = document.getElementById("tabla-cobros-body");
  const rows = tbody.getElementsByTagName("tr");

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.cells.length === 1) continue; // Ignora la fila de "No hay registros"

    // Sacamos el texto y los atributos de la fila
    const textoFila = row.textContent
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const estadoFila = row.getAttribute("data-estado");
    const rutaFila = row.getAttribute("data-ruta");

    // Verificamos si la fila cumple con las 3 condiciones al mismo tiempo
    const cumpleTexto = textoFila.includes(textoFiltro);
    const cumpleEstado = estadoFiltro === "" || estadoFila === estadoFiltro;
    const cumpleRuta = rutaFiltro === "" || rutaFila === rutaFiltro;

    // Si cumple todo, se muestra; si no, se oculta
    if (cumpleTexto && cumpleEstado && cumpleRuta) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  }
}
function actualizarNombreArchivo(input) {
    const texto = document.getElementById('nombre-archivo-txt');
    if (input.files && input.files[0]) {
        texto.textContent = "✅ " + input.files[0].name;
        texto.style.color = "#059669"; // Verde éxito
        texto.style.fontWeight = "bold";
    } else {
        texto.textContent = "Sin archivo";
        texto.style.color = "#64748b";
        texto.style.fontWeight = "normal";
    }
}