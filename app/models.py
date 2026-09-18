from datetime import date, datetime

from .extensions import db


class Docente(db.Model):
    __tablename__ = "docentes"

    id = db.Column(db.BigInteger, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    paterno = db.Column(db.String(100), nullable=False)
    materno = db.Column(db.String(100), nullable=False, default="")
    creado_en = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    cobros = db.relationship("Cobro", back_populates="docente", cascade="all, delete-orphan")

    @property
    def nombre_completo(self):
        return " ".join(filter(None, [self.paterno, self.materno, self.nombre])).upper()

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "paterno": self.paterno,
            "materno": self.materno,
            "nombre_completo": self.nombre_completo,
        }


class Periodo(db.Model):
    __tablename__ = "periodos"

    id = db.Column(db.BigInteger, primary_key=True)
    fecha = db.Column(db.String(7), unique=True, nullable=False)
    meta_atraso = db.Column(db.Numeric(12, 2), default=0, nullable=False)
    meta_actividad = db.Column(db.Numeric(12, 2), default=0, nullable=False)
    nota_general = db.Column(db.Text, default="", nullable=False)
    activo = db.Column(db.Boolean, default=False, nullable=False)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    cobros = db.relationship("Cobro", back_populates="periodo", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "fecha": self.fecha,
            "meta_atraso": float(self.meta_atraso or 0),
            "meta_actividad": float(self.meta_actividad or 0),
            "nota_general": self.nota_general,
            "activo": self.activo,
        }


class Cobro(db.Model):
    __tablename__ = "cobros"
    __table_args__ = (db.UniqueConstraint("periodo_id", "docente_id", name="uq_cobro_periodo_docente"),)

    id = db.Column(db.BigInteger, primary_key=True)
    periodo_id = db.Column(db.BigInteger, db.ForeignKey("periodos.id"), nullable=False)
    docente_id = db.Column(db.BigInteger, db.ForeignKey("docentes.id"), nullable=False)
    hoja_ruta = db.Column(db.Boolean, default=False, nullable=False)
    atraso = db.Column(db.Numeric(12, 2), default=0, nullable=False)
    actividad = db.Column(db.Numeric(12, 2), default=0, nullable=False)
    aprobado = db.Column(db.Boolean, default=False, nullable=False)
    cancelado = db.Column(db.Boolean, default=False, nullable=False)
    fecha_cancelacion = db.Column(db.Date, nullable=True)
    observacion = db.Column(db.Text, default="", nullable=False)
    link_respaldo = db.Column(db.String(500), nullable=True)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    periodo = db.relationship("Periodo", back_populates="cobros")
    docente = db.relationship("Docente", back_populates="cobros")

    def to_dict(self):
        return {
            "id": self.id,
            "periodo_id": self.periodo_id,
            "docente_id": self.docente_id,
            "docente": self.docente.to_dict() if self.docente else None,
            "hoja_ruta": self.hoja_ruta,
            "atraso": float(self.atraso or 0),
            "actividad": float(self.actividad or 0),
            "total": float(self.atraso or 0) + float(self.actividad or 0),
            "aprobado": self.aprobado,
            "cancelado": self.cancelado,
            "fecha_cancelacion": self.fecha_cancelacion.isoformat() if self.fecha_cancelacion else None,
            "observacion": self.observacion,
            "link_respaldo": self.link_respaldo,
        }
