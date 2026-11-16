# SisCobro

Sistema para la gestión de docentes, periodos académicos y cobros de la Universidad Privada Domingo Savio.

SisCobro es una aplicación web ligera para controlar pagos, consultar el estado de cada periodo y generar reportes de cobros sin depender de un servidor externo.

## Características

- Gestión de docentes con búsqueda por nombre, apellido o CI.
- Administración de periodos académicos.
- Registro de cobros y seguimiento de pagos pendientes.
- Filtros por estado y hoja de ruta.
- Indicadores del periodo con resumen de atrasos y actividades.
- Carga masiva de docentes para cada periodo.
- Registro manual de pagos y aprobación de movimientos.
- Notas generales por periodo.
- Exportación de reportes en PDF y Excel.
- Respaldo y restauración de datos en formato JSON.
- Modo claro y oscuro.
- Integración con Google Drive para almacenamiento documental.

## Demo

Puedes ejecutar la aplicación sin entrar al modo desarrollador:

1. Descarga o copia la carpeta completa `docentes`.
2. Haz doble clic en `Iniciar SisCobro.bat`.
3. La aplicación se abrirá en el navegador predeterminado.

También puedes abrir `index.html` directamente, aunque el lanzador es el método recomendado porque inicia la aplicación mediante un servidor local.

### Ejecución manual

Si necesitas iniciar el servidor manualmente:

```bash
python -m http.server 5000 --bind 127.0.0.1
```

Luego visita: http://127.0.0.1:5000

## Estructura del proyecto

```text
.
├── Iniciar SisCobro.bat
├── index.html
├── style.css
├── js/
│   ├── app.js
│   ├── db.js
│   ├── docentes.js
│   ├── periodos.js
│   ├── cobros.js
│   └── reportes.js
├── README.md
```

## Tecnologías

- HTML5
- CSS3
- JavaScript
- LocalStorage
- Google Drive API
- Quill
- jsPDF
- SheetJS

La aplicación no requiere Node.js ni un proceso de compilación. Solo necesita Python instalado para utilizar `Iniciar SisCobro.bat`.

## Datos y respaldo

La información principal se guarda en el navegador mediante `localStorage`.

Para proteger la información:

- Exporta respaldos periódicamente en formato JSON.
- Guarda los archivos en una ubicación segura.
- Restaura la base de datos cuando sea necesario.

## Contribución

Las contribuciones son bienvenidas. Si deseas mejorar la aplicación, puedes hacer un fork del repositorio y enviar un pull request.

## Autor

José Manuel Cortez Concha

## Licencia

Este proyecto está disponible bajo una licencia abierta para uso educativo y personal. Si necesitas un tipo de licencia específica, puede ajustarse según el caso.
