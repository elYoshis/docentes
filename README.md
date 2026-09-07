# SisCobro

Aplicacion web para organizar docentes, periodos academicos y cobros de la Universidad Privada Domingo Savio.

SisCobro permite llevar el control de pagos desde el navegador, consultar el estado de cada periodo y generar una vista general de los cobros registrados.

## Funcionalidades principales

- Gestion de docentes.
- Creacion, seleccion y administracion de periodos.
- Registro de pagos y control de cobros pendientes.
- Busqueda y ordenamiento de registros.
- Panel de indicadores por periodo.
- Reporte general de cobros.
- Notas generales para cada periodo.
- Tema claro y oscuro.
- Exportacion e importacion de respaldos en formato JSON.

## Requisitos

- Navegador web moderno: Chrome, Edge, Firefox o Safari.
- Conexion a internet para cargar el editor de texto Quill desde su CDN.

No requiere Node.js, base de datos ni instalacion de dependencias para ejecutar la aplicacion.

## Ejecucion

### Opcion 1: abrir directamente

1. Clona o descarga este repositorio.
2. Abre `index.html` en el navegador.
3. Crea un periodo y registra los docentes y pagos correspondientes.

### Opcion 2: servidor local

Para evitar restricciones del navegador con archivos locales, puedes servir la carpeta con cualquier servidor estatico. Por ejemplo, si tienes Python instalado:

```bash
python -m http.server 8000
```

Luego visita <http://localhost:8000>.

## Datos y respaldos

Los datos se almacenan localmente en el navegador mediante `localStorage`; no se envian a un servidor externo.

Para evitar perder informacion:

1. Abre la seccion de configuracion.
2. Exporta periodicamente la base de datos en formato JSON.
3. Guarda el archivo en un lugar seguro.
4. Usa la opcion de importacion para restaurar un respaldo.

Los datos de un navegador no se comparten automaticamente con otros equipos o navegadores.

## Estructura del proyecto

```text
.
├── index.html          # Interfaz principal
├── style.css           # Estilos de la aplicacion
├── script.js           # Inicializacion y funciones globales
├── js/
│   ├── app.js          # Navegacion y comportamiento general
│   ├── db.js           # Estado y persistencia local
│   ├── docentes.js     # Gestion de docentes
│   ├── periodos.js     # Gestion de periodos
│   ├── cobros.js       # Registro y seguimiento de cobros
│   └── reportes.js     # Reportes generales
└── doc.py              # Generacion opcional de un informe Word
```

## Tecnologias

- HTML5
- CSS3
- JavaScript vanilla
- `localStorage`
- Quill 1.3.6 mediante CDN
- Python y `python-docx` para el script opcional `doc.py`

## Desarrollo

El proyecto no utiliza un proceso de compilacion. Los cambios en HTML, CSS o JavaScript pueden probarse recargando la pagina en el navegador.

Antes de publicar cambios, verifica que:

- La aplicacion se abre correctamente.
- Se pueden crear docentes y periodos.
- Los cobros se guardan y aparecen en los reportes.
- La exportacion e importacion de respaldos funciona correctamente.

## Autor

Jose Manuel Cortez Concha
