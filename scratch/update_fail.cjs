const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/MarksManager.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Replace "Fail" with "Failed"
content = content.replace(/let autoRemark = hasFailed \? "Fail" : "Pass";/g, 'let autoRemark = hasFailed ? "Failed" : "Pass";');
content = content.replace(/stat\.remark === "Fail"/g, 'stat.remark === "Failed"');
content = content.replace(/stat\?\.autoRemark === "Fail"/g, 'stat?.autoRemark === "Failed"');
content = content.replace(/<SelectItem value="Fail">Fail<\/SelectItem>/g, '<SelectItem value="Failed">Failed</SelectItem>');

// 2. Remove "Absent" and "Withheld" SelectItems
content = content.replace(/<SelectItem value="Absent">Absent<\/SelectItem>\s*/g, '');
content = content.replace(/<SelectItem value="Withheld">Withheld<\/SelectItem>\s*/g, '');

fs.writeFileSync(file, content);
console.log("Successfully updated Fail to Failed and removed extra dropdown items");
