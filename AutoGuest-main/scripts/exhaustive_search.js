const fs = require('fs');
const path = require('path');

function search(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                search(fullPath);
            }
        } else if (file.endsWith('.js') || file.endsWith('.sql')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, i) => {
                if (/CURDATE|DATE_FORMAT|DATE\(|YEAR\(|NOW\(|CURTIME/i.test(line)) {
                    if (!/new Date\(|Date\.now\(|TO_CHAR|::date|CURRENT_DATE|EXTRACT/i.test(line)) {
                        console.log(`${fullPath}:${i + 1}: ${line.trim()}`);
                    }
                }
            });
        }
    }
}

search('.');
