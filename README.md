# SisCobro

Aplicación Flask para administrar docentes, periodos académicos y cobros de la Universidad Privada Domingo Savio. La interfaz usa HTML/Jinja, Tailwind CSS y JavaScript modular; la persistencia usa MySQL mediante SQLAlchemy.

## Árbol del proyecto

```text
docentes/
|-- app/
|   |-- __init__.py              # Fábrica Flask y registro de extensiones
|   |-- extensions.py            # Instancia compartida de SQLAlchemy
|   |-- models.py                # Docente, Periodo y Cobro
|   |-- routes/
|   |   |-- __init__.py
|   |   |-- api.py               # API JSON para el frontend
|   |   `-- web.py               # Rutas de páginas HTML
|   |-- templates/
|   |   `-- index.html            # Shell principal Jinja + Tailwind
|   `-- static/
|       |-- css/app.css           # Componentes visuales propios
|       `-- js/app.js             # Estado, fetch, render y eventos
|-- config.py                    # Variables de entorno y URL MySQL
|-- run.py                       # Punto de entrada del servidor
|-- requirements.txt             # Dependencias Python
|-- .env.example                 # Plantilla de configuración local
|-- docker-compose.yml           # MySQL 8.4 para desarrollo
`-- README.md
```

## Instalación local

1. Crear y activar un entorno virtual:

	```powershell
	py -m venv .venv
	.\.venv\Scripts\Activate.ps1
	pip install -r requirements.txt
	```

2. Levantar MySQL con Docker Desktop:

	```powershell
	docker compose up -d mysql
	```

3. Copiar `.env.example` a `.env`. Para el `docker-compose` incluido, usar:

	```env
	DATABASE_URL=mysql+pymysql://siscobro:siscobro@localhost:3306/siscobro
	SECRET_KEY=una-clave-local
	```

4. Ejecutar Flask:

	```powershell
	python run.py
	```

Abrir http://127.0.0.1:5000.

## Google Drive

Para activar la carga de hojas de ruta, crear un OAuth Client ID de tipo **Web application** en Google Cloud, habilitar Google Drive API y registrar `http://127.0.0.1:5000` como origen autorizado. Copiar el Client ID en `.env`:

```env
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
```

Al guardar un cobro, selecciona una imagen o PDF. Flask crea las carpetas `SisCobro/<DOCENTE>` en Drive, sube el archivo y almacena el enlace en MySQL.

## Migrar un respaldo JSON

El respaldo original se conserva en `db_antiguo.json`. Para importarlo en la base configurada:

```powershell
python scripts\migrar_json_mysql.py
```

El importador crea las tablas, conserva los IDs heredados como `BIGINT`, respeta el periodo activo y ejecuta la operación dentro de una transacción. En este respaldo se importaron 126 docentes, 9 periodos y 411 cobros; un cobro se omitió porque apuntaba al docente inexistente `1770831662536`.

## API principal

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/estado` | Carga el estado completo de la aplicación |
| POST/PUT/DELETE | `/api/docentes` | Gestiona docentes |
| POST/DELETE | `/api/periodos` | Crea o elimina periodos |
| PUT | `/api/periodos/<id>/activar` | Cambia el periodo activo |
| POST | `/api/cobros` | Crea o actualiza un cobro |
| PUT | `/api/cobros/<id>/estado` | Aprueba o marca como pagado |

La base se crea automáticamente con `db.create_all()` al arrancar. Para producción conviene sustituirlo por migraciones Alembic/Flask-Migrate.

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
