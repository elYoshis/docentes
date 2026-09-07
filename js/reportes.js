function renderReporteGeneral() {
    const pId = parseInt(document.getElementById('selectPeriodoNav').value);
    const periodoAct = datos.periodos.find(p => p.id === pId);
    
    if (!periodoAct) return;

    // 1. Mostrar Fecha Actual
    const hoy = new Date();
    const fechaLarga = hoy.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('rep-fecha-emision').textContent = `Generado el: ${fechaLarga}`;
    document.getElementById('rep-periodo-nombre').textContent = `Corte: ${formatearFecha(periodoAct.fecha)}`;

    // 2. Cálculos de Montos (Solo suma lo aprobado)
    const cobrosMes = datos.cobros.filter(c => c.periodoId === periodoAct.id);
    const totalAtrasos = cobrosMes.reduce((acc, c) => c.aprobado ? acc + (parseFloat(c.atraso) || 0) : acc, 0);
    const totalActividades = cobrosMes.reduce((acc, c) => c.aprobado ? acc + (parseFloat(c.actividad) || 0) : acc, 0);

    document.getElementById('rep-txt-atrasos').textContent = `Bs. ${totalAtrasos.toFixed(2)}`;
    document.getElementById('rep-txt-actividades').textContent = `Bs. ${totalActividades.toFixed(2)}`;

    // 3. Lista de Pendientes (Los que NO están aprobados)
    const deudoresDelMes = cobrosMes.filter(c => !c.aprobado);

    const tbody = document.getElementById('lista-pendientes-body');
    tbody.innerHTML = "";

    if (deudoresDelMes.length === 0) {
        // Ajustamos el colspan a 5 porque ahora tenemos 5 columnas
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:green;">✅ Todos están al día en este periodo</td></tr>';
    } else {
        deudoresDelMes.forEach(c => {
            const d = datos.docentes.find(doc => doc.id === c.docenteId);
            const nombreDisplay = d ? obtenerNombreCompleto(d) : "Docente no encontrado";

            // Cálculos individuales para la fila
            const montoAtraso = parseFloat(c.atraso) || 0;
            const montoActividad = parseFloat(c.actividad) || 0;
            const totalDeuda = montoAtraso + montoActividad;

            // Formateo visual (guion si es 0, monto si debe)
            const txtAtraso = montoAtraso > 0 ? `Bs. ${montoAtraso.toFixed(2)}` : "-";
            const txtActividad = montoActividad > 0 ? `Bs. ${montoActividad.toFixed(2)}` : "-";

            // Dibujamos la fila con las nuevas columnas
           // Dibujamos la fila con las nuevas columnas
            tbody.innerHTML += `
                <tr>
                    <td>${nombreDisplay}</td>
                    <td style="text-align: right; color: #555;">${txtAtraso}</td>
                    <td style="text-align: right; color: #555;">${txtActividad}</td>
                    <td style="text-align: right; font-weight: bold;">Bs. ${totalDeuda.toFixed(2)}</td>
                    <td style="text-align: center;"><span class="badge badge-danger">⚠️ Pendiente</span></td>
                </tr>`;
        });
    }
}
function exportarExcel() {
    const pId = parseInt(document.getElementById('selectPeriodoNav').value);
    const periodoAct = datos.periodos.find(p => p.id === pId);
    
    if (!periodoAct) return showToast("Selecciona un periodo válido para exportar", "error");

    const cobrosMes = datos.cobros.filter(c => c.periodoId === periodoAct.id);
    if (cobrosMes.length === 0) return showToast("No hay datos para exportar en este mes", "error");

    // ==========================================
    // HOJA 1: DETALLE INDIVIDUAL DE DOCENTES
    // ==========================================
    const dataExcel = cobrosMes.map((c, index) => {
        const doc = datos.docentes.find(d => d.id === c.docenteId);
        const nombre = doc ? obtenerNombreCompleto(doc) : "DOCENTE ELIMINADO";
        
        const montoAtraso = parseFloat(c.atraso) || 0;
        const montoActividad = parseFloat(c.actividad) || 0;
        const total = montoAtraso + montoActividad;

        return {
            "N°": index + 1,
            "Docente": nombre,
            "Hoja de Ruta": c.hojaRuta ? "ENTREGADA" : "NO ENTREGADA",
            "Atraso (Bs)": montoAtraso,
            "Actividad (Bs)": montoActividad,
            "Total (Bs)": total,
            "Estado de Pago": c.aprobado ? "PAGADO / APROBADO" : "PENDIENTE",
            "Observaciones": c.observacion || "Sin observaciones"
        };
    });

    const wsDetalle = XLSX.utils.json_to_sheet(dataExcel);
    
    // Ajustar el ancho de las columnas de la Hoja 1
    wsDetalle['!cols'] = [
        {wch: 5}, {wch: 35}, {wch: 15}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 22}, {wch: 40}
    ];

    // ==========================================
    // HOJA 2: RESUMEN FINANCIERO Y METAS
    // ==========================================
    // Calculamos los totales solo del dinero aprobado
    const totalAtrasos = cobrosMes.reduce((acc, c) => c.aprobado ? acc + (parseFloat(c.atraso) || 0) : acc, 0);
    const totalActividades = cobrosMes.reduce((acc, c) => c.aprobado ? acc + (parseFloat(c.actividad) || 0) : acc, 0);
    
    const metaAtraso = parseFloat(periodoAct.metaAtraso) || 0;
    const metaActividad = parseFloat(periodoAct.metaActividad) || 0;

    // Estructuramos el cuadro de resumen
    const dataResumen = [
        { 
            "Concepto": "Recaudación por Atrasos", 
            "Meta Establecida (Bs)": metaAtraso, 
            "Total Recaudado (Bs)": totalAtrasos, 
            "Diferencia (Bs)": totalAtrasos - metaAtraso,
            "Estado de la Meta": totalAtrasos >= metaAtraso && metaAtraso > 0 ? "✅ ALCANZADA" : "⚠️ DÉFICIT"
        },
        { 
            "Concepto": "Recaudación por Actividades", 
            "Meta Establecida (Bs)": metaActividad, 
            "Total Recaudado (Bs)": totalActividades, 
            "Diferencia (Bs)": totalActividades - metaActividad,
            "Estado de la Meta": totalActividades >= metaActividad && metaActividad > 0 ? "✅ ALCANZADA" : "⚠️ DÉFICIT"
        },
        { 
            "Concepto": "TOTAL GLOBAL DEL MES", 
            "Meta Establecida (Bs)": metaAtraso + metaActividad, 
            "Total Recaudado (Bs)": totalAtrasos + totalActividades, 
            "Diferencia (Bs)": (totalAtrasos + totalActividades) - (metaAtraso + metaActividad),
            "Estado de la Meta": "-"
        }
    ];

    const wsResumen = XLSX.utils.json_to_sheet(dataResumen);
    
    // Ajustar el ancho de las columnas de la Hoja 2
    wsResumen['!cols'] = [
        {wch: 30}, {wch: 22}, {wch: 22}, {wch: 18}, {wch: 20}
    ];

    // ==========================================
    // ENSAMBLAJE Y DESCARGA DEL ARCHIVO
    // ==========================================
    const wb = XLSX.utils.book_new();
    
    // El orden en que las agregas aquí es cómo aparecerán las pestañas en el Excel
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Financiero");
    XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle de Cobros");

    // Descargamos el archivo con un nombre formal
    XLSX.writeFile(wb, `Reporte_General_${periodoAct.fecha}.xlsx`);
}

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pId = parseInt(document.getElementById('selectPeriodoNav').value);
    const periodoAct = datos.periodos.find(p => p.id === pId);
    
    if (!periodoAct) return showToast("Selecciona un periodo válido", "error");

    const cobrosMes = datos.cobros.filter(c => c.periodoId === periodoAct.id);
    
    // Cálculos económicos solo para aprobados (lo que ya está en caja)
    const totalAtrasos = cobrosMes.reduce((acc, c) => c.aprobado ? acc + (parseFloat(c.atraso) || 0) : acc, 0);
    const totalActividades = cobrosMes.reduce((acc, c) => c.aprobado ? acc + (parseFloat(c.actividad) || 0) : acc, 0);
    const hoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ACTA DE RECAUDACIÓN Y ENTREGA", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Periodo Correspondiente: ${formatearFecha(periodoAct.fecha)}`, 14, 30);
    doc.text(`Fecha de Emisión: ${hoy}`, 14, 35);

    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN DE ENTREGA:", 14, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`En la fecha ${hoy}, se hace entrega formal de los montos recaudados:`, 14, 52);
    
    doc.text(`- Monto por concepto de ACTIVIDADES:`, 20, 62);
    doc.text(`Bs. ${totalActividades.toFixed(2)}`, 150, 62, { align: "right" });
    
    doc.text(`- Monto por concepto de ATRASOS:`, 20, 69);
    doc.text(`Bs. ${totalAtrasos.toFixed(2)}`, 150, 69, { align: "right" });

    doc.line(14, 75, 196, 75);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL RECAUDADO A ENTREGAR:`, 20, 82);
    doc.text(`Bs. ${(totalAtrasos + totalActividades).toFixed(2)}`, 150, 82, { align: "right" });

    // --- SECCIÓN DE PENDIENTES MEJORADA ---
    const deudoresDelMes = cobrosMes.filter(c => !c.aprobado);

    doc.text("DETALLE DE DOCENTES PENDIENTES DE PAGO:", 14, 95);
    
    // Mapeamos los datos extrayendo las multas individuales
    const tablaData = deudoresDelMes.map((c, i) => {
        const d = datos.docentes.find(doc => doc.id === c.docenteId);
        const nombre = d ? `${d.nombre} ${d.paterno} ${d.materno}`.toUpperCase() : "DOCENTE ELIMINADO";
        
        const montoAtraso = parseFloat(c.atraso) || 0;
        const montoActividad = parseFloat(c.actividad) || 0;
        const totalDeuda = montoAtraso + montoActividad;

        return [
            i + 1, 
            nombre, 
            montoAtraso > 0 ? `Bs. ${montoAtraso.toFixed(2)}` : "-", 
            montoActividad > 0 ? `Bs. ${montoActividad.toFixed(2)}` : "-", 
            `Bs. ${totalDeuda.toFixed(2)}`
        ];
    });

    // Si no hay deudores, mostramos una fila informativa
    if (tablaData.length === 0) {
        tablaData.push(["-", "No existen pendientes en este periodo", "-", "-", "AL DÍA"]);
    }
    
    // Generamos la tabla con las nuevas columnas y alineaciones
    doc.autoTable({
        startY: 100,
        head: [['N°', 'Nombre Completo del Docente', 'Atraso', 'Actividad', 'Total Deuda']],
        body: tablaData,
        headStyles: { fillColor: [44, 62, 80], halign: 'center' },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            2: { halign: 'right', cellWidth: 25 },
            3: { halign: 'right', cellWidth: 25 },
            4: { halign: 'right', cellWidth: 28, fontStyle: 'bold' } // El total se pone en negrita
        }
    });

    // Firmas calculadas dinámicamente al final de la tabla
    const finalY = doc.lastAutoTable.finalY + 35;
    doc.line(40, finalY, 90, finalY);
    doc.line(120, finalY, 170, finalY);
    doc.setFontSize(9);
    doc.text("Firma Responsable", 65, finalY + 5, { align: "center" });
    doc.text("Firma Recibido", 145, finalY + 5, { align: "center" });

    doc.save(`Acta_Recaudacion_${periodoAct.fecha}.pdf`);
}