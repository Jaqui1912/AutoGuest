const db = require('./config/database');

async function inspect() {
    try {
        console.log('--- Inspecting item_inventario (Current Catalog Source) ---');
        try {
            const [rows] = await db.query('SELECT * FROM item_inventario LIMIT 1');
            console.log('Sample row:', rows[0]);
            const [count] = await db.query('SELECT COUNT(*) as c FROM item_inventario');
            console.log('Count:', count[0].c);
            const [cols] = await db.query('DESCRIBE item_inventario');
            console.log('Columns:', cols.map(c => c.Field).join(', '));
        } catch (e) { console.log('Error reading item_inventario:', e.message); }

        console.log('\n--- Inspecting iteminventario (FK Constraint Requirement) ---');
        try {
            const [rows] = await db.query('SELECT * FROM iteminventario LIMIT 1');
            console.log('Sample row:', rows[0]);
            const [count] = await db.query('SELECT COUNT(*) as c FROM iteminventario');
            console.log('Count:', count[0].c);
            const [cols] = await db.query('DESCRIBE iteminventario');
            console.log('Columns:', cols.map(c => c.Field).join(', '));
        } catch (e) { console.log('Error reading iteminventario:', e.message); }

        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

inspect();
