const fs = require('fs');
const content = fs.readFileSync('server_error.log', 'utf16le');
console.log(content);
