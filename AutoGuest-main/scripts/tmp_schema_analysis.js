require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function analyzeSchema() {
    const client = await pool.connect();
    try {
        // 1. Todas las tablas
        const tables = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        console.log('\n=== TABLAS EN LA BASE DE DATOS ===');
        tables.rows.forEach(r => console.log(' -', r.table_name));

        // 2. Foreign keys definidas
        const fks = await client.query(`
            SELECT
                tc.table_name AS tabla_origen,
                kcu.column_name AS columna,
                ccu.table_name AS tabla_destino,
                ccu.column_name AS columna_destino,
                tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
            ORDER BY tc.table_name
        `);
        console.log('\n=== FOREIGN KEYS DEFINIDAS ===');
        if (fks.rows.length === 0) {
            console.log('⚠️  NO HAY FOREIGN KEYS DEFINIDAS EN LA BASE DE DATOS');
        } else {
            fks.rows.forEach(r =>
                console.log(` ${r.tabla_origen}.${r.columna} → ${r.tabla_destino}.${r.columna_destino}`)
            );
        }

        // 3. Tablas sin ningún FK (ni como origen ni como destino)
        const tablesWithFks = new Set([
            ...fks.rows.map(r => r.tabla_origen),
            ...fks.rows.map(r => r.tabla_destino)
        ]);
        const allTables = tables.rows.map(r => r.table_name);
        const looseTables = allTables.filter(t => !tablesWithFks.has(t));
        console.log('\n=== TABLAS SIN NINGUNA RELACIÓN FK ===');
        looseTables.forEach(t => console.log(' ⚠️ ', t));

        // 4. Conteo de filas por tabla
        console.log('\n=== FILAS POR TABLA ===');
        for (const t of allTables) {
            try {
                const count = await client.query(`SELECT COUNT(*) FROM "${t}"`);
                console.log(` ${t}: ${count.rows[0].count} filas`);
            } catch(e) {
                console.log(` ${t}: ❌ error - ${e.message}`);
            }
        }

    } finally {
        client.release();
        pool.end();
    }
}

analyzeSchema().catch(console.error);
