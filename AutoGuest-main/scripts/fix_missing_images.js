require('dotenv').config();
const db = require('./config/database');
const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'pages/cliente/catalogo-om66/img');

async function fixImages() {
    try {
        const files = fs.readdirSync(imgDir);
        const [items] = await db.query("SELECT idItem, nombre, imagen FROM iteminventario");

        console.log(`Found ${files.length} files and ${items.length} items.`);

        for (const item of items) {
            let currentImage = item.imagen;
            if (currentImage && currentImage.startsWith('img/')) {
                currentImage = currentImage.replace('img/', '');
            }

            // Check if current image exists
            if (currentImage && files.includes(currentImage)) {
                // console.log(`[OK] ${item.nombre} -> ${currentImage}`);
                continue;
            }

            console.log(`[MISSING] ${item.nombre} (Current: ${item.imagen})`);

            // Try to find a match
            // Strategy 1: Slugify name and match
            const slug = item.nombre.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');

            // Strategy 2: Look for file containing part of the name
            let bestMatch = null;

            // Specific overrides (manual map based on likely matches)
            if (item.nombre.includes('Aceite')) bestMatch = findMatch(files, ['aceite', 'sae']);
            if (item.nombre.includes('Anticongelante')) bestMatch = findMatch(files, ['anticongelante']);
            if (item.nombre.includes('Líquido de Frenos')) bestMatch = findMatch(files, ['freno']);
            if (item.nombre.includes('Shampoo')) bestMatch = findMatch(files, ['shampu']);
            if (item.nombre.includes('Cera')) bestMatch = findMatch(files, ['cera']);
            if (item.nombre.includes('Abrillantador')) bestMatch = findMatch(files, ['abillantador']);

            if (bestMatch) {
                console.log(`  -> Suggestion: img/${bestMatch}`);
                await db.query("UPDATE iteminventario SET imagen = ? WHERE idItem = ?", [`img/${bestMatch}`, item.idItem]);
            }
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

function findMatch(files, keywords) {
    return files.find(f => keywords.some(k => f.toLowerCase().includes(k)));
}

fixImages();
