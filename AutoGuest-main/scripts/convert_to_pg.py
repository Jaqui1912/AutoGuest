#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convierte taller.sql (MySQL) a pg_migration.sql (PostgreSQL/Supabase)
Sincronizado con esquema real de taller.sql
"""

import re

INPUT_FILE = 'taller.sql'
OUTPUT_FILE = 'pg_migration.sql'

# --- CABECERA POSTGRES ---
HEADER = """-- Script de migración de MySQL a PostgreSQL para Supabase
-- Deshabilitar restricciones de llaves foráneas temporalmente
SET session_replication_role = 'replica';

-- Eliminar tablas si existen (en orden inverso de dependencia)
DROP TABLE IF EXISTS "venta_fisica" CASCADE;
DROP TABLE IF EXISTS "lineapedido" CASCADE;
DROP TABLE IF EXISTS "lineacotizacion" CASCADE;
DROP TABLE IF EXISTS "item_inventario" CASCADE;
DROP TABLE IF EXISTS "historial_estados_cita" CASCADE;
DROP TABLE IF EXISTS "evidencia" CASCADE;
DROP TABLE IF EXISTS "cotizacion_servicios" CASCADE;
DROP TABLE IF EXISTS "configuracion_taller" CASCADE;
DROP TABLE IF EXISTS "chat_mensaje" CASCADE;
DROP TABLE IF EXISTS "chat_lista" CASCADE;
DROP TABLE IF EXISTS "iteminventario" CASCADE;
DROP TABLE IF EXISTS "notificacion" CASCADE;
DROP TABLE IF EXISTS "pedidos_catalogo" CASCADE;
DROP TABLE IF EXISTS "pedido" CASCADE;
DROP TABLE IF EXISTS "paypal_webhooks" CASCADE;
DROP TABLE IF EXISTS "log_pagos_paypal" CASCADE;
DROP TABLE IF EXISTS "ticketsoporte" CASCADE;
DROP TABLE IF EXISTS "resenas" CASCADE;
DROP TABLE IF EXISTS "servicio" CASCADE;
DROP TABLE IF EXISTS "cotizacion" CASCADE;
DROP TABLE IF EXISTS "cita" CASCADE;
DROP TABLE IF EXISTS "vehiculo" CASCADE;
DROP TABLE IF EXISTS "mecanico" CASCADE;
DROP TABLE IF EXISTS "cliente" CASCADE;
DROP TABLE IF EXISTS "administrador" CASCADE;
DROP TABLE IF EXISTS "taller" CASCADE;
DROP TABLE IF EXISTS "usuario" CASCADE;

-- Crear tablas con esquemas completos sincronizados con taller.sql
CREATE TABLE IF NOT EXISTS "usuario" (
    "idUsuario"          VARCHAR(50)  PRIMARY KEY,
    "nombre"             VARCHAR(100) NOT NULL,
    "email"              VARCHAR(255) NOT NULL,
    "password"           VARCHAR(255) NOT NULL,
    "telefono"           VARCHAR(20),
    "foto_perfil"        TEXT,
    "token_recuperacion" VARCHAR(255),
    "token_expiracion"   TIMESTAMP,
    "google_id"          VARCHAR(255),
    "fechaRegistro"      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "taller" (
    "idTaller"          VARCHAR(50)  PRIMARY KEY,
    "nombre"            VARCHAR(100) NOT NULL,
    "direccion"         VARCHAR(255),
    "latitud"           DECIMAL(10,8),
    "longitud"          DECIMAL(11,8),
    "foto_perfil"       TEXT,
    "link_maps"         VARCHAR(255),
    "telefono_contacto" VARCHAR(20),
    "redes_sociales"    VARCHAR(255),
    "horario"           TEXT,
    "sobre_nosotros"    TEXT
);

CREATE TABLE IF NOT EXISTS "administrador" (
    "idUsuario" VARCHAR(50) PRIMARY KEY REFERENCES "usuario"("idUsuario"),
    "idTaller"  VARCHAR(50) REFERENCES "taller"("idTaller")
);

CREATE TABLE IF NOT EXISTS "cliente" (
    "idUsuario" VARCHAR(50) PRIMARY KEY REFERENCES "usuario"("idUsuario")
);

CREATE TABLE IF NOT EXISTS "mecanico" (
    "idUsuario"        VARCHAR(50) PRIMARY KEY REFERENCES "usuario"("idUsuario"),
    "especialidad"     VARCHAR(100),
    "idTaller"         VARCHAR(50) REFERENCES "taller"("idTaller"),
    "estado_solicitud" VARCHAR(20) DEFAULT 'PENDIENTE'
);

CREATE TABLE IF NOT EXISTS "vehiculo" (
    "idVehiculo" VARCHAR(50)  PRIMARY KEY,
    "placa"       VARCHAR(20)  NOT NULL,
    "marca"       VARCHAR(50),
    "modelo"      VARCHAR(50),
    "anio"        INTEGER,
    "idDuenio"    VARCHAR(50)  REFERENCES "usuario"("idUsuario")
);

CREATE TABLE IF NOT EXISTS "cita" (
    "idCita"               VARCHAR(50)  PRIMARY KEY,
    "fechaHora"            TIMESTAMP    NOT NULL,
    "estado"               VARCHAR(50),
    "idCliente"            VARCHAR(50)  REFERENCES "usuario"("idUsuario"),
    "idVehiculo"           VARCHAR(50)  REFERENCES "vehiculo"("idVehiculo"),
    "idMecanico"           VARCHAR(50)  REFERENCES "usuario"("idUsuario"),
    "idTaller"             VARCHAR(50)  REFERENCES "taller"("idTaller"),
    "codigo_pago_efectivo" VARCHAR(10),
    "servicio_solicitado"  VARCHAR(255),
    "metodo_pago"          VARCHAR(20) DEFAULT 'Efectivo',
    "monto"                DECIMAL(10,2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS "cotizacion" (
    "idCotizacion"       VARCHAR(50)  PRIMARY KEY,
    "totalAprobado"      FLOAT,
    "moneda"             VARCHAR(10)  DEFAULT 'MXN',
    "estado_pago"        VARCHAR(50)  DEFAULT 'PENDIENTE',
    "metodo_pago"        VARCHAR(50),
    "id_transaccion"     VARCHAR(100),
    "id_orden_paypal"    VARCHAR(100),
    "estadoAutorizacion" SMALLINT,
    "idCita"             VARCHAR(50)  REFERENCES "cita"("idCita"),
    "diagnostico"        TEXT,
    "fecha_vencimiento"  DATE,
    "mano_obra"          DECIMAL(10,2) DEFAULT 0.00,
    "costo_refacciones"  DECIMAL(10,2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS "servicio" (
    "idServicio"  VARCHAR(50)  PRIMARY KEY,
    "nombre"      VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "precio"      DECIMAL(10,2),
    "idTaller"    VARCHAR(50)  REFERENCES "taller"("idTaller")
);

CREATE TABLE IF NOT EXISTS "resenas" (
    "idResena"    SERIAL      PRIMARY KEY,
    "calificacion" INTEGER     CHECK ("calificacion" BETWEEN 1 AND 5),
    "comentario"   TEXT,
    "fecha"        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    "idUsuario"    VARCHAR(50) REFERENCES "usuario"("idUsuario"),
    "idTaller"     VARCHAR(50) REFERENCES "taller"("idTaller")
);

CREATE TABLE IF NOT EXISTS "iteminventario" (
    "idItem"         VARCHAR(50)  PRIMARY KEY,
    "nombre"         VARCHAR(100) NOT NULL,
    "precio"         FLOAT,
    "stock"          INTEGER,
    "esParaVenta"    SMALLINT,
    "esParaServicio" SMALLINT,
    "idTaller"       VARCHAR(50)  REFERENCES "taller"("idTaller"),
    "imagen"         TEXT
);

CREATE TABLE IF NOT EXISTS "notificacion" (
    "idNotificacion" SERIAL      PRIMARY KEY,
    "idUsuario"      VARCHAR(50)  REFERENCES "usuario"("idUsuario"),
    "mensaje"        TEXT         NOT NULL,
    "leido"          BOOLEAN      DEFAULT FALSE,
    "fecha"          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "pedidos_catalogo" (
    "idPedido"       VARCHAR(50)  PRIMARY KEY,
    "idItem"         VARCHAR(50)  REFERENCES "iteminventario"("idItem"),
    "cantidad"       INTEGER      NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "idTaller"       VARCHAR(50)  REFERENCES "taller"("idTaller"),
    "idUsuario"      VARCHAR(50)  REFERENCES "usuario"("idUsuario"),
    "fechaPedido"    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    "estado"         VARCHAR(50)  DEFAULT 'PENDIENTE'
);

CREATE TABLE IF NOT EXISTS "ticketsoporte" (
    "idTicket"    VARCHAR(50)  PRIMARY KEY,
    "asunto"      VARCHAR(255) NOT NULL,
    "estado"      VARCHAR(50)  DEFAULT 'Abierto',
    "idUsuario"   VARCHAR(50)  REFERENCES "usuario"("idUsuario"),
    "idAdmin"     VARCHAR(50)  REFERENCES "usuario"("idUsuario"),
    "idPedido"    VARCHAR(50), 
    "fecha"       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "chat_lista" (
    "idChat"      SERIAL      PRIMARY KEY,
    "idUsuario1"  VARCHAR(50) REFERENCES "usuario"("idUsuario"),
    "idUsuario2"  VARCHAR(50) REFERENCES "usuario"("idUsuario"),
    "fechaInicio" TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "chat_mensaje" (
    "idMensaje"  SERIAL      PRIMARY KEY,
    "idChat"     INTEGER      REFERENCES "chat_lista"("idChat"),
    "idEmisor"   VARCHAR(50)  REFERENCES "usuario"("idUsuario"),
    "mensaje"    TEXT,
    "fechaEnvio" TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "venta_fisica" (
    "id"               SERIAL PRIMARY KEY,
    "idTaller"         VARCHAR(50) NOT NULL REFERENCES "taller"("idTaller"),
    "idItem"           VARCHAR(50) REFERENCES "iteminventario"("idItem"),
    "nombreProducto"   VARCHAR(255) NOT NULL,
    "cantidad"         INTEGER NOT NULL,
    "precioUnitario"   DECIMAL(10,2) NOT NULL,
    "total"            DECIMAL(10,2) NOT NULL,
    "metodo_pago"      VARCHAR(20) DEFAULT 'Efectivo',
    "fecha"            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DATOS (INSERTs)
-- ============================================================
"""

FOOTER = """
-- Reactivar restricciones
SET session_replication_role = 'origin';
"""

def backtick_cols_to_quoted(cols_str):
    """Convierte `col1`, `col2` => "col1", "col2" """
    cols = [c.strip().strip('`') for c in cols_str.split(',')]
    return ', '.join(f'"{c}"' for c in cols)

def process_values(values_block, table_name=''):
    """
    Limpia el bloque de valores:
    - Cambia current_timestamp() -> CURRENT_TIMESTAMP
    - Reemplaza imágenes base64 por NULL
    """
    values_block = re.sub(r'current_timestamp\(\)', 'CURRENT_TIMESTAMP', values_block, flags=re.IGNORECASE)
    # Reemplazar imágenes base64 (cadenas que empiezan con 'data:image/...') por NULL
    values_block = re.sub(r"'data:image/.*?'", "NULL", values_block, flags=re.DOTALL)
    return values_block

def main():
    print(f"Leyendo {INPUT_FILE}...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    insert_order = [
        'taller', 'usuario', 'cliente', 'administrador', 'mecanico',
        'vehiculo', 'servicio', 'iteminventario', 'cita', 'cotizacion',
        'notificacion', 'resenas', 'pedidos_catalogo', 'ticketsoporte',
        'chat_lista', 'chat_mensaje', 'venta_fisica'
    ]

    pattern = re.compile(
        r"INSERT INTO `([^`]+)` \(([^)]+)\) VALUES\s*([\s\S]+?);\s*(?=\r?\n|$)",
        re.IGNORECASE
    )

    inserts_by_table = {}
    for m in pattern.finditer(content):
        table  = m.group(1)
        cols   = m.group(2)
        vals   = m.group(3).strip()

        pg_cols = backtick_cols_to_quoted(cols)
        pg_vals = process_values(vals, table)

        stmt = f'INSERT INTO "{table}" ({pg_cols}) VALUES\n{pg_vals};\n'
        inserts_by_table.setdefault(table, []).append(stmt)

    output = HEADER
    for table in insert_order:
        if table in inserts_by_table:
            output += f'\\n-- Datos: {table}\\n'
            for stmt in inserts_by_table[table]:
                output += stmt + '\\n'

    for table, stmts in inserts_by_table.items():
        if table not in insert_order:
            output += f'\\n-- Datos: {table} (no ordenado)\\n'
            for stmt in stmts:
                output += stmt + '\\n'

    output += FOOTER
    print(f"Guardando {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(output)
    print(f"¡Listo! {OUTPUT_FILE} generado correctamente.")

if __name__ == '__main__':
    main()
