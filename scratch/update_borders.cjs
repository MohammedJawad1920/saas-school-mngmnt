const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/MarksManager.jsx');
let content = fs.readFileSync(file, 'utf8');

// Target the second tbody which is the Entry table
const tboies = content.split('<tbody>');

if (tboies.length >= 3) { // 0 is before first, 1 is inside first, 2 is inside second
    let entryBody = '<tbody>' + tboies[2];
    
    // Replace td classes
    entryBody = entryBody.replace(/<td className="p-2 text-center text-muted-foreground">/g, '<td className="p-2 text-center text-muted-foreground border">');
    entryBody = entryBody.replace(/<td className="p-1 text-muted-foreground truncate max-w-\[50px\]">/g, '<td className="p-1 text-muted-foreground truncate max-w-[50px] border">');
    entryBody = entryBody.replace(/<td className="p-1 font-medium">/g, '<td className="p-1 font-medium border">');
    entryBody = entryBody.replace(/<td key=\{\`\$\{i\}-\$\{j\}\`\} className="p-1 text-center">/g, '<td key={`${i}-${j}`} className="p-1 text-center border">');
    entryBody = entryBody.replace(/<td className="p-1 text-center font-semibold text-blue-800 bg-blue-50\/30">/g, '<td className="p-1 text-center font-semibold text-blue-800 bg-blue-50/30 border">');
    entryBody = entryBody.replace(/<td key=\{i\} className="p-1 text-center">/g, '<td key={i} className="p-1 text-center border">');
    entryBody = entryBody.replace(/<td \/>/g, '<td className="border" />');
    entryBody = entryBody.replace(/<td className="p-2 text-center font-semibold text-blue-700 dark:text-blue-300">/g, '<td className="p-2 text-center font-semibold text-blue-700 dark:text-blue-300 border">');
    entryBody = entryBody.replace(/<td className="p-2 text-center font-semibold text-green-700 dark:text-green-300">/g, '<td className="p-2 text-center font-semibold text-green-700 dark:text-green-300 border">');
    entryBody = entryBody.replace(/<td className="p-2 text-center font-semibold text-yellow-700 dark:text-yellow-300">/g, '<td className="p-2 text-center font-semibold text-yellow-700 dark:text-yellow-300 border">');
    entryBody = entryBody.replace(/<td className=\{\`p-2 text-center font-bold \$\{stat\?.autoRemark === "Pass"/g, '<td className={`p-2 text-center font-bold border ${stat?.autoRemark === "Pass"');

    // Combine
    tboies[2] = entryBody.substring(7); // remove the prepended '<tbody>'
    
    fs.writeFileSync(file, tboies.join('<tbody>'));
    console.log("Successfully updated entry table borders!");
} else {
    console.log("Not enough tbodys found");
}
