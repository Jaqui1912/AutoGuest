require('dotenv').config();
const db = require('./config/database');

async function compare() {
    try {
        const [oldItems] = await db.query('SELECT nombre, imagen FROM item_inventario');
        const [newItems] = await db.query('SELECT idItem, nombre FROM iteminventario');

        console.log(`Found ${oldItems.length} old items and ${newItems.length} new items.`);

        let matches = 0;
        newItems.forEach(newItem => {
            const match = oldItems.find(old => old.nombre === newItem.nombre);
            if (match) {
                matches++;
                // console.log(`Match: ${newItem.nombre} -> Image: ${match.imagen}`);
            } else {
                console.log(`No match for: ${newItem.nombre}`);
            }
        });

        console.log(`Total name matches: ${matches}/${newItems.length}`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
compare();
