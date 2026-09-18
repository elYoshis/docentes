import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from app import create_app
from app.extensions import db
from app.models import Cobro, Docente, Periodo


BACKUP_PATH = PROJECT_ROOT / "db_antiguo.json"


def load_backup():
    with BACKUP_PATH.open(encoding="utf-8") as backup_file:
        return json.load(backup_file)


def migrate():
    data = load_backup()
    app = create_app()
    skipped_cobros = []

    with app.app_context():
        db.create_all()
        try:
            for item in data.get("docentes", []):
                if db.session.get(Docente, item["id"]):
                    continue
                db.session.add(Docente(
                    id=item["id"],
                    nombre=item.get("nombre", "").strip(),
                    paterno=item.get("paterno", "").strip(),
                    materno=item.get("materno", "").strip(),
                ))

            active_id = data.get("periodoActivoId")
            for item in data.get("periodos", []):
                if db.session.get(Periodo, item["id"]):
                    continue
                db.session.add(Periodo(
                    id=item["id"],
                    fecha=item["fecha"],
                    meta_atraso=item.get("metaAtraso", 0) or 0,
                    meta_actividad=item.get("metaActividad", 0) or 0,
                    nota_general=item.get("notaGeneral") or item.get("notas") or "",
                    activo=item["id"] == active_id,
                ))

            db.session.flush()
            docente_ids = {item["id"] for item in data.get("docentes", [])}
            periodo_ids = {item["id"] for item in data.get("periodos", [])}
            for item in data.get("cobros", []):
                if item.get("docenteId") not in docente_ids:
                    skipped_cobros.append(item)
                    continue
                if item.get("periodoId") not in periodo_ids:
                    skipped_cobros.append(item)
                    continue
                if db.session.query(Cobro).filter_by(
                    periodo_id=item["periodoId"], docente_id=item["docenteId"]
                ).first():
                    continue
                db.session.add(Cobro(
                    id=item.get("id"),
                    periodo_id=item["periodoId"],
                    docente_id=item["docenteId"],
                    hoja_ruta=bool(item.get("hojaRuta", False)),
                    atraso=item.get("atraso", 0) or 0,
                    actividad=item.get("actividad", 0) or 0,
                    aprobado=bool(item.get("aprobado", False)),
                    cancelado=bool(item.get("cancelado", False)),
                    fecha_cancelacion=item.get("fechaCancelacion") or None,
                    observacion=item.get("observacion", "") or "",
                    link_respaldo=item.get("linkRespaldo"),
                ))

            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

    print(f"Docentes procesados: {len(data.get('docentes', []))}")
    print(f"Periodos procesados: {len(data.get('periodos', []))}")
    print(f"Cobros procesados: {len(data.get('cobros', [])) - len(skipped_cobros)}")
    print(f"Cobros omitidos por referencias inválidas: {len(skipped_cobros)}")
    if skipped_cobros:
        print("IDs de docentes huérfanos:", sorted({item.get("docenteId") for item in skipped_cobros}))


if __name__ == "__main__":
    try:
        migrate()
    except Exception as error:
        print(f"Migración cancelada: {error}", file=sys.stderr)
        raise