require('dotenv').config();
const db = require('./config/database');

async function inspectSchema() {
    try {
        console.log('\n--- ALL TABLES SCHEMA ---');
        const [allCols] = await db.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position
        `);
        
        let currentTable = '';
        allCols.forEach(col => {
            if (col.table_name !== currentTable) {
                currentTable = col.table_name;
                console.log(`\n[Table: ${currentTable}]`);
            }
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

    } catch (error) {
        console.error('Error inspecting schema:', error);
    } finally {
        process.exit();
    }
}

inspectSchema();
