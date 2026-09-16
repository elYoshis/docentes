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

Puedes abrir la aplicación directamente en el navegador:

1. Clona o descarga este repositorio.
2. Abre `index.html`.
3. Comienza creando un periodo y registrando docentes y pagos.

También puedes ejecutar el proyecto con un servidor local:

```bash
python -m http.server 8000
```

Luego visita: http://localhost:8000

## Estructura del proyecto

```text
.
├── index.html
├── style.css
├── script.js
├── js/
│   ├── app.js
│   ├── db.js
│   ├── docentes.js
│   ├── periodos.js
│   ├── cobros.js
│   └── reportes.js
├── doc.py
├── README.md
└── LICENSE
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
- Python (opcional para `doc.py`)

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
