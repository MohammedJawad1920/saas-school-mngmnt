const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/MarksManager.jsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<SelectValue placeholder="Auto" \/>/g, '<SelectValue placeholder={stat?.autoRemark ?? "-"} />');
content = content.replace(/<SelectItem value="auto">Auto \(\{stat\?\.autoRemark \?\? "-"\}\)<\/SelectItem>/g, '<SelectItem value="auto">{stat?.autoRemark ?? "-"}</SelectItem>');

fs.writeFileSync(file, content);
console.log("Successfully removed Auto from dropdown!");
