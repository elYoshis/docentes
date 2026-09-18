from datetime import date
from decimal import Decimal
import re
from urllib.parse import quote

from flask import Blueprint, jsonify, request
import requests

from ..extensions import db
from ..models import Cobro, Docente, Periodo


api_bp = Blueprint("api", __name__)


def error(message, status=400):
    return jsonify({"error": message}), status


@api_bp.get("/estado")
def estado():
    periodo = Periodo.query.filter_by(activo=True).first()
    return jsonify({
        "docentes": [doc.to_dict() for doc in Docente.query.order_by(Docente.paterno, Docente.nombre).all()],
        "periodos": [periodo_item.to_dict() for periodo_item in Periodo.query.order_by(Periodo.fecha).all()],
        "periodo_activo_id": periodo.id if periodo else None,
        "cobros": [cobro.to_dict() for cobro in Cobro.query.all()],
    })


@api_bp.get("/respaldo")
def exportar_respaldo():
    return jsonify({
        "version": 2,
        "docentes": [doc.to_dict() for doc in Docente.query.order_by(Docente.id).all()],
        "periodos": [periodo.to_dict() for periodo in Periodo.query.order_by(Periodo.id).all()],
        "cobros": [cobro.to_dict() for cobro in Cobro.query.order_by(Cobro.id).all()],
        "periodo_activo_id": next((periodo.id for periodo in Periodo.query.filter_by(activo=True).all()), None),
    })


@api_bp.post("/respaldo")
def importar_respaldo():
    data = request.get_json() or {}
    docentes = data.get("docentes")
    periodos = data.get("periodos")
    cobros = data.get("cobros")
    if not isinstance(docentes, list) or not isinstance(periodos, list) or not isinstance(cobros, list):
        return error("El archivo no tiene un formato de respaldo válido.")

    try:
        db.session.query(Cobro).delete()
        db.session.query(Periodo).delete()
        db.session.query(Docente).delete()
        for item in docentes:
            db.session.add(Docente(
                id=item["id"], nombre=item.get("nombre", ""),
                paterno=item.get("paterno", ""), materno=item.get("materno", ""),
            ))
        active_id = data.get("periodo_activo_id")
        for item in periodos:
            db.session.add(Periodo(
                id=item["id"], fecha=item["fecha"],
                meta_atraso=item.get("meta_atraso", 0),
                meta_actividad=item.get("meta_actividad", 0),
                nota_general=item.get("nota_general", ""), activo=item["id"] == active_id,
            ))
        db.session.flush()
        docentes_validos = {item["id"] for item in docentes}
        periodos_validos = {item["id"] for item in periodos}
        omitidos = 0
        for item in cobros:
            if item.get("docente_id") not in docentes_validos or item.get("periodo_id") not in periodos_validos:
                omitidos += 1
                continue
            db.session.add(Cobro(
                id=item.get("id"), periodo_id=item["periodo_id"], docente_id=item["docente_id"],
                hoja_ruta=bool(item.get("hoja_ruta", False)), atraso=item.get("atraso", 0),
                actividad=item.get("actividad", 0), aprobado=bool(item.get("aprobado", False)),
                cancelado=bool(item.get("cancelado", False)), fecha_cancelacion=item.get("fecha_cancelacion"),
                observacion=item.get("observacion", ""), link_respaldo=item.get("link_respaldo"),
            ))
        db.session.commit()
        return jsonify({"mensaje": "Respaldo restaurado.", "cobros_omitidos": omitidos})
    except (KeyError, ValueError, TypeError) as exc:
        db.session.rollback()
        return error(f"Respaldo inválido: {exc}")


@api_bp.post("/docentes")
def crear_docente():
    data = request.get_json() or {}
    nombre = data.get("nombre", "").strip()
    paterno = data.get("paterno", "").strip()
    materno = data.get("materno", "").strip()
    if not nombre or not paterno:
        return error("Nombre y apellido paterno son obligatorios.")
    duplicado = Docente.query.filter_by(nombre=nombre, paterno=paterno, materno=materno).first()
    if duplicado:
        return error("El docente ya está registrado.", 409)
    docente = Docente(nombre=nombre, paterno=paterno, materno=materno)
    db.session.add(docente)
    db.session.commit()
    return jsonify(docente.to_dict()), 201


@api_bp.put("/docentes/<int:docente_id>")
def editar_docente(docente_id):
    docente = db.get_or_404(Docente, docente_id)
    data = request.get_json() or {}
    docente.nombre = data.get("nombre", docente.nombre).strip()
    docente.paterno = data.get("paterno", docente.paterno).strip()
    docente.materno = data.get("materno", docente.materno).strip()
    if not docente.nombre or not docente.paterno:
        return error("Nombre y apellido paterno son obligatorios.")
    db.session.commit()
    return jsonify(docente.to_dict())


@api_bp.delete("/docentes/<int:docente_id>")
def borrar_docente(docente_id):
    docente = db.get_or_404(Docente, docente_id)
    db.session.delete(docente)
    db.session.commit()
    return "", 204


@api_bp.post("/periodos")
def crear_periodo():
    data = request.get_json() or {}
    fecha = data.get("fecha", "")
    if len(fecha) != 7:
        return error("El periodo debe tener formato YYYY-MM.")
    if Periodo.query.filter_by(fecha=fecha).first():
        return error("Este periodo ya existe.", 409)
    periodo = Periodo(
        fecha=fecha,
        meta_atraso=Decimal(str(data.get("meta_atraso", 0))),
        meta_actividad=Decimal(str(data.get("meta_actividad", 0))),
    )
    if not Periodo.query.count():
        periodo.activo = True
    db.session.add(periodo)
    db.session.commit()
    return jsonify(periodo.to_dict()), 201


@api_bp.put("/periodos/<int:periodo_id>/activar")
def activar_periodo(periodo_id):
    periodo = db.get_or_404(Periodo, periodo_id)
    Periodo.query.update({Periodo.activo: False})
    periodo.activo = True
    db.session.commit()
    return jsonify(periodo.to_dict())


@api_bp.delete("/periodos/<int:periodo_id>")
def borrar_periodo(periodo_id):
    periodo = db.get_or_404(Periodo, periodo_id)
    db.session.delete(periodo)
    db.session.commit()
    return "", 204


@api_bp.put("/periodos/<int:periodo_id>/nota")
def guardar_nota(periodo_id):
    periodo = db.get_or_404(Periodo, periodo_id)
    periodo.nota_general = (request.get_json() or {}).get("nota_general", "")
    db.session.commit()
    return jsonify(periodo.to_dict())


@api_bp.post("/cobros")
def guardar_cobro():
    data = request.get_json() or {}
    periodo_id = data.get("periodo_id")
    docente_id = data.get("docente_id")
    if not periodo_id or not docente_id:
        return error("Periodo y docente son obligatorios.")
    cobro = Cobro.query.filter_by(periodo_id=periodo_id, docente_id=docente_id).first()
    es_nuevo = cobro is None
    if not cobro:
        cobro = Cobro(periodo_id=periodo_id, docente_id=docente_id)
        db.session.add(cobro)
    for field in ("hoja_ruta", "atraso", "actividad", "aprobado", "observacion", "link_respaldo"):
        if field in data:
            setattr(cobro, field, data[field])
    db.session.commit()
    return jsonify(cobro.to_dict()), 201 if es_nuevo else 200


@api_bp.put("/cobros/<int:cobro_id>/estado")
def cambiar_estado_cobro(cobro_id):
    cobro = db.get_or_404(Cobro, cobro_id)
    data = request.get_json() or {}
    if "aprobado" in data:
        cobro.aprobado = bool(data["aprobado"])
        cobro.hoja_ruta = cobro.aprobado
    if "cancelado" in data:
        cobro.cancelado = bool(data["cancelado"])
        cobro.fecha_cancelacion = date.fromisoformat(data["fecha_cancelacion"]) if cobro.cancelado and data.get("fecha_cancelacion") else None
    db.session.commit()
    return jsonify(cobro.to_dict())


@api_bp.delete("/cobros/<int:cobro_id>")
def borrar_cobro(cobro_id):
    cobro = db.get_or_404(Cobro, cobro_id)
    db.session.delete(cobro)
    db.session.commit()
    return "", 204


@api_bp.post("/cobros/<int:cobro_id>/respaldo")
def subir_respaldo(cobro_id):
    cobro = db.get_or_404(Cobro, cobro_id)
    archivo = request.files.get("archivo")
    token = request.headers.get("Authorization", "")
    if not archivo or not archivo.filename:
        return error("Selecciona una imagen o PDF.")
    if not token.startswith("Bearer "):
        return error("Falta autorización de Google Drive.", 401)

    headers = {"Authorization": token}
    docente_nombre = cobro.docente.nombre_completo if cobro.docente else "DOCENTE_DESCONOCIDO"

    def drive_request(method, url, **kwargs):
        response = requests.request(method, url, headers=headers, timeout=30, **kwargs)
        if not response.ok:
            raise RuntimeError(response.text[:300])
        return response.json() if response.content else {}

    def drive_file_id(link):
        if not link:
            return None
        match = re.search(r"(?:[?&]id=|/d/)([a-zA-Z0-9_-]+)", link)
        return match.group(1) if match else None

    def borrar_archivo_drive(link):
        file_id = drive_file_id(link)
        if not file_id:
            return
        response = requests.delete(
            f"https://www.googleapis.com/drive/v3/files/{file_id}",
            headers=headers,
            timeout=30,
        )
        if not response.ok and response.status_code != 404:
            raise RuntimeError(response.text[:300])

    try:
        # Reemplazar una hoja de ruta elimina primero el archivo anterior.
        borrar_archivo_drive(cobro.link_respaldo)
        query = quote("name='SisCobro' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false")
        folders = drive_request("GET", f"https://www.googleapis.com/drive/v3/files?q={query}&fields=files(id)").get("files", [])
        root_id = folders[0]["id"] if folders else drive_request(
            "POST", "https://www.googleapis.com/drive/v3/files?fields=id",
            json={"name": "SisCobro", "mimeType": "application/vnd.google-apps.folder", "parents": ["root"]},
        )["id"]

        teacher_query = quote(f"name='{docente_nombre}' and mimeType='application/vnd.google-apps.folder' and '{root_id}' in parents and trashed=false")
        teacher_folders = drive_request("GET", f"https://www.googleapis.com/drive/v3/files?q={teacher_query}&fields=files(id)").get("files", [])
        teacher_id = teacher_folders[0]["id"] if teacher_folders else drive_request(
            "POST", "https://www.googleapis.com/drive/v3/files?fields=id",
            json={"name": docente_nombre, "mimeType": "application/vnd.google-apps.folder", "parents": [root_id]},
        )["id"]

        metadata = {"name": archivo.filename, "parents": [teacher_id]}
        upload = requests.post(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
            headers=headers,
            files={"metadata": (None, __import__("json").dumps(metadata), "application/json"), "file": (archivo.filename, archivo.stream, archivo.mimetype)},
            timeout=60,
        )
        if not upload.ok:
            raise RuntimeError(upload.text[:300])
        link = upload.json().get("webViewLink") or f"https://drive.google.com/open?id={upload.json()['id']}"
        cobro.link_respaldo = link
        cobro.hoja_ruta = True
        db.session.commit()
        return jsonify(cobro.to_dict())
    except (requests.RequestException, RuntimeError, KeyError) as exc:
        db.session.rollback()
        return error(f"No se pudo subir a Google Drive: {exc}", 502)


@api_bp.delete("/cobros/<int:cobro_id>/respaldo")
def borrar_respaldo(cobro_id):
    cobro = db.get_or_404(Cobro, cobro_id)
    token = request.headers.get("Authorization", "")
    if not token.startswith("Bearer "):
        return error("Falta autorización de Google Drive.", 401)
    file_id_match = re.search(r"(?:[?&]id=|/d/)([a-zA-Z0-9_-]+)", cobro.link_respaldo or "")
    try:
        if file_id_match:
            response = requests.delete(
                f"https://www.googleapis.com/drive/v3/files/{file_id_match.group(1)}",
                headers={"Authorization": token},
                timeout=30,
            )
            if not response.ok and response.status_code != 404:
                return error(f"No se pudo borrar el archivo de Google Drive: {response.text[:300]}", 502)
        cobro.link_respaldo = None
        cobro.hoja_ruta = False
        db.session.commit()
        return jsonify(cobro.to_dict())
    except requests.RequestException as exc:
        db.session.rollback()
        return error(f"No se pudo conectar con Google Drive: {exc}", 502)
