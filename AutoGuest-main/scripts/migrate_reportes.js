require('dotenv').config();
const db = require('../config/database');

async function migrate() {
    try {
        // 1. Add metodo_pago to cita
        try {
            await db.query(`ALTER TABLE cita ADD COLUMN metodo_pago ENUM('Efectivo','Tarjeta','Transferencia') DEFAULT 'Efectivo'`);
            console.log('✅ cita.metodo_pago added');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ cita.metodo_pago already exists');
            else throw e;
        }

        // 2. Add monto to cita
        try {
            await db.query(`ALTER TABLE cita ADD COLUMN monto DECIMAL(10,2) DEFAULT 0.00`);
            console.log('✅ cita.monto added');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ cita.monto already exists');
            else throw e;
        }

        // 3. Create venta_fisica table
        await db.query(`
            CREATE TABLE IF NOT EXISTS venta_fisica (
                id INT AUTO_INCREMENT PRIMARY KEY,
                idTaller VARCHAR(50) NOT NULL,
                idItem VARCHAR(50),
                nombreProducto VARCHAR(255) NOT NULL,
                cantidad INT NOT NULL,
                precioUnitario DECIMAL(10,2) NOT NULL,
                total DECIMAL(10,2) NOT NULL,
                metodo_pago ENUM('Efectivo','Tarjeta','Transferencia') DEFAULT 'Efectivo',
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_taller_fecha (idTaller, fecha)
            )
        `);
        console.log('✅ venta_fisica table created/confirmed');

        console.log('\n✅ Migration complete!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration failed:', e.message);
        process.exit(1);
    }
}

migrate();
