# SisCobro

Sistema web para gestionar docentes, periodos y cobros de la Universidad Privada Domingo Savio.

## Funcionalidades

- Registro y administracion de docentes.
- Creacion y seleccion de periodos de trabajo.
- Registro y seguimiento de pagos.
- Reporte general de cobros.
- Notas generales por periodo.
- Cambio entre tema claro y oscuro.
- Exportacion e importacion de respaldos en formato JSON.

## Requisitos

- Un navegador web moderno.
- No requiere instalacion de dependencias ni servidor.

## Uso

1. Clona o descarga este repositorio.
2. Abre `index.html` en un navegador.
3. Selecciona o crea un periodo.
4. Registra docentes y pagos desde las pestanas correspondientes.

Los datos se guardan localmente en el navegador mediante `localStorage`. Para trasladar los datos a otro equipo, utiliza las opciones de exportacion e importacion disponibles en la configuracion.

## Estructura

- `index.html`: interfaz principal.
- `style.css`: estilos de la aplicacion.
- `script.js`: inicializacion y funciones globales.
- `js/`: modulos de base de datos, docentes, periodos, cobros y reportes.

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Quill 1.3.6 mediante CDN

## Autor

Jose Manuel Cortez Concha
