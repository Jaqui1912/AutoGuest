const { Pool } = require('pg');

/**
 * Pool de conexiones PostgreSQL (Supabase).
 *
 * Variables de entorno esperadas en .env:
 *   DB_HOST      - Host de Supabase (ej. db.xxxxxxxx.supabase.co)
 *   DB_USER      - Usuario (usualmente 'postgres')
 *   DB_PASSWORD  - Contraseña de la base de datos
 *   DB_NAME      - Nombre de la BD (usualmente 'postgres')
 *   DB_PORT      - Puerto (usualmente 5432 o 6543 para PgBouncer)
 *   DATABASE_URL - (Alternativa) Connection string completo de Supabase
 */
const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    }
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        ssl: { rejectUnauthorized: false }, // Necesario para Supabase
        max: 10,   // Máximo de conexiones en el pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    };

const pool = new Pool(poolConfig);

/**
 * Mapeo de nombres de columnas: PostgreSQL guarda todo en minúsculas
 * pero el código usa camelCase (ej: idUsuario, idTaller, etc.)
 * Este mapa convierte los nombres de vuelta al formato original.
 */
const columnNameMap = {
    idusuario: 'idUsuario',
    idcliente: 'idCliente',
    idtaller: 'idTaller',
    idmecanico: 'idMecanico',
    idadministrador: 'idAdministrador',
    idvehiculo: 'idVehiculo',
    idduenio: 'idDuenio',
    idcita: 'idCita',
    idservicio: 'idServicio',
    idresena: 'idResena',
    idnotificacion: 'idNotificacion',
    idpedido: 'idPedido',
    idchat: 'idChat',
    idmensaje: 'idMensaje',
    iditeminventario: 'idItemInventario',
    iditem: 'idItem',
    idcotizacion: 'idCotizacion',
    iddetallecotizacion: 'idDetalleCotizacion',
    idpago: 'idPago',
    idreporte: 'idReporte',
    idticket: 'idTicket',
    idevidencia: 'idEvidencia',
    evidenciabase64: 'evidenciaBase64',
    totalaprobado: 'totalAprobado',
    fechacotizacion: 'fechaCotizacion',
    idlinea: 'idLinea',
    esparaventa: 'esParaVenta',
    esparaservicio: 'esParaServicio',
    nombrecliente: 'clienteNombre',
    clientenombre: 'clienteNombre',
    tallernombre: 'tallerNombre',
    tallerdireccion: 'tallerDireccion',
    tallertelefono: 'tallerTelefono',
    motivo: 'motivo',
    serviciosolicitado: 'servicio_solicitado',
    servicio_solicitado: 'servicio_solicitado',
    vehiculomarca: 'vehiculoMarca',
    vehiculomodelo: 'vehiculoModelo',
    vehiculoplaca: 'vehiculoPlaca',
    servicionombre: 'servicioNombre',
    mecaniconombre: 'mecanicoNombre',
    createdat: 'createdAt',
    updatedat: 'updatedAt',
    foto_perfil: 'foto_perfil',
    token_recuperacion: 'token_recuperacion',
    token_expiracion: 'token_expiracion',
    estado_solicitud: 'estado_solicitud',
    fecha_creacion: 'fecha_creacion',
    fecha_modificacion: 'fecha_modificacion',
    fechacreacion: 'fechaCreacion',
    fechahora: 'fechaHora',
    idcita: 'idCita',
    idresena: 'idResena',
    id_mensaje: 'idMensaje',
    id_cita: 'idCita',
    remitente_id: 'remitenteId',
    remitente_tipo: 'remitenteTipo',
    tipo_contenido: 'tipoContenido',
    nombre_archivo: 'nombreArchivo',
    fecha_envio: 'fechaEnvio',
    fechaenvio: 'fechaEnvio',
    id_chat: 'idChat',
    ultimo_mensaje: 'ultimoMensaje',
    fecha_actualizacion: 'fechaActualizacion',
    logo_url: 'logo_url',
    rfc: 'rfc',
    terminos_condiciones: 'terminos_condiciones',
    moneda_default: 'moneda_default'
};

/**
 * Convierte las keys de un objeto de columnas PG (minúsculas)
 * al formato camelCase que espera el código.
 */
function mapRowKeys(row) {
    if (!row || typeof row !== 'object') return row;
    const mapped = {};
    for (const key of Object.keys(row)) {
        mapped[columnNameMap[key] || key] = row[key];
    }
    return mapped;
}

/**
 * Wrapper que imita la API de mysql2/promise para un cliente individual:
 */
const wrapClient = (client) => {
    return {
        query: async (sql, params) => {
            let pgSql = sql;
            if (params && params.length > 0) {
                let i = 0;
                pgSql = sql.replace(/\?/g, () => `$${++i}`);
            }
            const result = await client.query(pgSql, params);
            const mappedRows = result.rows.map(mapRowKeys);
            mappedRows.affectedRows = result.rowCount;
            return [mappedRows, result.fields];
        },
        beginTransaction: async () => {
            await client.query('BEGIN');
        },
        commit: async () => {
            await client.query('COMMIT');
        },
        rollback: async () => {
            await client.query('ROLLBACK');
        },
        release: () => {
            client.release();
        }
    };
};

/**
 * Wrapper que imita la API de mysql2/promise:
 *   pool.query(sql, params) → devuelve [rows, fields]
 * Así el resto de las rutas existentes no necesitan cambios.
 *
 * En PostgreSQL los parámetros son $1, $2, ... en lugar de ?
 * El helper convierte automáticamente los '?' a '$n'.
 * Además, convierte los nombres de columnas al camelCase original.
 */
const originalQuery = pool.query.bind(pool);

pool.query = async (sql, params) => {
    // Convertir placeholders de MySQL (?) a PostgreSQL ($1, $2, ...)
    let pgSql = sql;
    if (params && params.length > 0) {
        let i = 0;
        pgSql = sql.replace(/\?/g, () => `$${++i}`);
    }
    const result = await originalQuery(pgSql, params);
    // Mapear columnas de minúsculas a camelCase y devolver [rows, fields]
    const mappedRows = result.rows.map(mapRowKeys);
    // Agregar affectedRows para compatibilidad con MySQL (INSERT/UPDATE/DELETE)
    mappedRows.affectedRows = result.rowCount;
    return [mappedRows, result.fields];
};

/**
 * Obtener una conexión individual para transacciones.
 */
pool.getConnection = async () => {
    const client = await pool.connect();
    return wrapClient(client);
};

// Probar la conexión al iniciar
pool.connect()
    .then(client => {
        console.log('✅ Conexión a PostgreSQL (Supabase) establecida con éxito.');
        client.release();
    })
    .catch(err => {
        console.error('❌ Error al conectar con PostgreSQL:', err.message);
        if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
            console.error('   → Verifica DB_HOST y DB_PORT en tu archivo .env');
        }
        if (err.code === '28P01') {
            console.error('   → Credenciales incorrectas. Verifica DB_USER y DB_PASSWORD.');
        }
        if (err.code === '3D000') {
            console.error(`   → La base de datos "${process.env.DB_NAME}" no existe.`);
        }
    });

module.exports = pool;
