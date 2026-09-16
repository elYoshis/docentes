function renderCobros() {
  const tbody = document.getElementById("tabla-cobros-body");
  const container = document.getElementById("tabla-container");
  const alerta = document.getElementById("alerta-sin-periodo");

  // 1. Verificar si hay un periodo seleccionado
  const periodoAct = datos.periodos.find((p) => p.id === datos.periodoActivoId);

  if (!periodoAct) {
    container.style.display = "none";
    alerta.style.display = "block";
    return;
  }

  // 2. Mostrar contenedor y actualizar nombre del periodo
  container.style.display = "block";
  alerta.style.display = "none";

  tbody.innerHTML = "";

  // 3. FILTRAR: Obtener solo los cobros que pertenecen al periodo activo
  const cobrosDelMes = datos.cobros.filter(
    (c) => c.periodoId === datos.periodoActivoId,
  );

  // 4. LÓGICA DEL DASHBOARD (Se calcula solo con los datos del mes activo)
  // LÓGICA DEL DASHBOARD (Se calcula sumando SOLO si el checkbox está aprobado)
  const recAtraso = cobrosDelMes.reduce(
    (acc, c) => (c.aprobado ? acc + (parseFloat(c.atraso) || 0) : acc),
    0,
  );
  const recActividad = cobrosDelMes.reduce(
    (acc, c) => (c.aprobado ? acc + (parseFloat(c.actividad) || 0) : acc),
    0,
  );

  // Actualiza los Divs en la pantalla
  document.getElementById("dash-atraso-txt").textContent =
    `Bs. ${recAtraso.toFixed(2)} / ${periodoAct.metaAtraso}`;
  document.getElementById("dash-actividad-txt").textContent =
    `Bs. ${recActividad.toFixed(2)} / ${periodoAct.metaActividad}`;

  const porcAtraso =
    periodoAct.metaAtraso > 0
      ? (recAtraso / periodoAct.metaAtraso) * 100
      : recAtraso > 0
        ? 100
        : 0;
  const porcActividad =
    periodoAct.metaActividad > 0
      ? (recActividad / periodoAct.metaActividad) * 100
      : recActividad > 0
        ? 100
        : 0;
  // Conectar la base de datos con el nuevo editor Quill
  if (periodoAct && window.editorQuill) {
    window.editorQuill.root.innerHTML =
      periodoAct.notaGeneral || periodoAct.notas || "";
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
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; color: #999; padding: 20px;">No hay registros de cobro para este mes. Haz clic en "+ Registrar Pago" para empezar.</td></tr>`;
    return;
  }

  cobrosDelMes.forEach((c, index) => {
    const doc = datos.docentes.find((d) => d.id === c.docenteId);

    const paterno = doc ? doc.paterno.toUpperCase() : "-";
    const materno = doc ? (doc.materno || "").toUpperCase() : "-";
    const nombre = doc ? doc.nombre.toUpperCase() : "ELIMINADO";

    const total = (parseFloat(c.atraso) || 0) + (parseFloat(c.actividad) || 0);

    const celdaAprobado = `
            <div style="text-align: center;">
                <input type="checkbox" style="transform: scale(1.5); cursor: pointer;" 
                       ${c.aprobado ? "checked" : ""} 
                       onclick="toggleAprobado(${c.docenteId})">
            </div>`;

    const hoy = new Date().toISOString().split("T")[0];
    let celdaPago = "";

    if (c.cancelado) {
      celdaPago = `
                <div class="estado-pagado">
                    <span class="badge badge-success">✅ Pagado</span>
                    <span class="fecha-pagado-texto">${c.fechaCancelacion}</span>
                    <button onclick="cambiarEstadoPago(${c.docenteId}, false)" class="btn-deshacer">Deshacer</button>
                </div>`;
    } else {
      celdaPago = `
                <div class="celda-pago-container">
                    <input type="date" id="fecha-pago-${c.docenteId}" value="${hoy}" class="input-fecha-pago">
                    <button onclick="cambiarEstadoPago(${c.docenteId}, true)" class="btn-pagar">Pagar</button>
                </div>`;
    }
    let celdaRuta = "❌";
    if (c.linkRespaldo) {
        // Si hay link, mostramos un botón clickeable para abrir la imagen
        celdaRuta = `<a href="${c.linkRespaldo}" target="_blank" title="Ver Respaldo en Drive" style="text-decoration: none; font-size: 1.2rem; cursor: pointer;">🖼️</a>`;
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
                            <button class="btn-bubble-action" onclick="abrirModalHistorial(${c.docenteId})" title="Ver Historial">👁️</button>
                            <button class="btn-bubble-action" onclick="abrirModalCobro(${c.docenteId})" title="Editar Movimiento">✏️</button>
                            <button class="btn-bubble-action" onclick="borrarCobro(${c.docenteId})" title="Eliminar Registro">🗑️</button>
                        </div>
                    </div>
                </td>
                <td style="text-align:center">${celdaRuta}</td>
                <td>Bs. ${c.atraso.toFixed(2)}</td>
                <td>Bs. ${c.actividad.toFixed(2)}</td>
                <td><b>Bs. ${total.toFixed(2)}</b></td>
                <td>${celdaAprobado}</td>
                <td>${celdaPago}</td>
                <td><small style="color: #666;">${c.observacion || ""}</small></td>
            </tr>`;
  });
}

function cambiarEstadoPago(docenteId, marcarComoPagado) {
  const cobro = datos.cobros.find(
    (c) => c.docenteId === docenteId && c.periodoId === datos.periodoActivoId,
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
  const cobro = datos.cobros.find(
    (c) => c.docenteId === docenteId && c.periodoId === datos.periodoActivoId,
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
  // Evita que el clic en el checkbox dispare el ordenamiento de la columna
  if (event) event.stopPropagation();

  // Obtenemos si el checkbox principal está marcado o desmarcado
  const estadoGlobal = document.getElementById("check-all-aprobado").checked;

  // Obtenemos solo los cobros del mes actual
  const cobrosDelMes = datos.cobros.filter(
    (c) => c.periodoId === datos.periodoActivoId,
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
  const select = document.getElementById("select-docente-cobro");
  select.innerHTML = '<option value="">Seleccione Docente...</option>';

  const docentesOrdenados = [...datos.docentes].sort((a, b) =>
    a.paterno.localeCompare(b.paterno),
  );
  docentesOrdenados.forEach((d) => {
    select.innerHTML += `<option value="${d.id}">${obtenerNombreCompleto(d)}</option>`;
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
    const c = datos.cobros.find(
      (cob) =>
        cob.docenteId === docenteId && cob.periodoId === datos.periodoActivoId,
    );
    document.getElementById("select-docente-cobro").value = docenteId;
    document.getElementById("check-hoja-ruta").checked = c.hojaRuta;
    document.getElementById("input-atraso").value = c.atraso;
    document.getElementById("input-actividad").value = c.actividad;
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
  const dId = parseInt(document.getElementById("select-docente-cobro").value);
  if (!dId) return;

  // --- LÓGICA DE SUBIDA A DRIVE Y CARPETAS ---
  const btnGuardar = e.target.querySelector('button[type="submit"]');
  const fileInput = document.getElementById("input-archivo-ruta");
  let linkRespaldo = null;

  // Obtenemos los datos del docente para armar el nombre de su carpeta
  const docente = datos.docentes.find((d) => d.id === dId);
  // Ejemplo: "CORTEZ JOSE"
  const nombreCarpetaDocente = docente ? `${docente.paterno} ${docente.nombre}`.toUpperCase() : "DESCONOCIDO";

  // Si el usuario seleccionó un archivo, bloqueamos el botón y lo subimos
  if (fileInput.files.length > 0) {
      btnGuardar.innerText = "Subiendo y organizando... ⏳";
      btnGuardar.disabled = true;
      
      // Enviamos el archivo Y el nombre del docente a Drive
      linkRespaldo = await subirArchivoADrive(fileInput.files[0], nombreCarpetaDocente);
      
      btnGuardar.innerText = "Guardar";
      btnGuardar.disabled = false;
  }
  // --------------------------------

  datos.cobros = datos.cobros.filter(
    (c) => !(c.docenteId === dId && c.periodoId === datos.periodoActivoId),
  );

  datos.cobros.push({
    periodoId: datos.periodoActivoId,
    docenteId: dId,
    hojaRuta: document.getElementById("check-hoja-ruta").checked,
    atraso: parseFloat(document.getElementById("input-atraso").value) || 0,
    actividad: parseFloat(document.getElementById("input-actividad").value) || 0,
    observacion: document.getElementById("input-observacion").value.trim(),
    linkRespaldo: linkRespaldo // Guardamos el link generado por Drive
  });
  
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
    (c) =>
      !(c.docenteId === docenteId && c.periodoId === datos.periodoActivoId),
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
      (c) => c.docenteId === doc.id && c.periodoId === datos.periodoActivoId,
    );

    if (!existe) {
      const nombreCompleto = obtenerNombreCompleto(doc);
      contenedor.innerHTML += `
                <label style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; transition: background 0.2s;">
                    <input type="checkbox" class="check-docente-masivo" value="${doc.id}" style="width: auto; margin: 0;">
                    ${nombreCompleto}
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
  // Capturamos todos los checkboxes que el usuario haya marcado
  const checkboxes = document.querySelectorAll(".check-docente-masivo:checked");
  let agregados = 0;

  checkboxes.forEach((chk) => {
    const docId = parseInt(chk.value);

    datos.cobros.push({
      periodoId: datos.periodoActivoId,
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