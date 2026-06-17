const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/MarksManager.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Fix Entry Table Single Subject Input
const entrySingleInputRegex = /<Input\s*id={`mark-\${idx}-\${i}`}\s*type="number"\s*min=\{0\}\s*max=\{subj\.maxMark \|\| 100\}\s*className="w-14 mx-auto text-center h-7 text-xs"\s*value=\{typeof marksData\[st\._id\]\?\.\[i\] === 'object' \? "" : \(marksData\[st\._id\]\?\.\[i\] \?\? ""\)\}\s*onChange=\{\(e\) => handleMarkChange\(st\._id, i, null, e\.target\.value\)\}\s*\/>/;

const entrySingleInputReplacement = `<Input
                                                                id={\`mark-\${idx}-\${i}\`}
                                                                type="number"
                                                                min={0}
                                                                max={subj.maxMark || 100}
                                                                className={\`w-14 mx-auto text-center h-7 text-xs \${Number(marksData[st._id]?.[i]) < (Number(subj.passMark) || 0) && marksData[st._id]?.[i] !== "" && marksData[st._id]?.[i] != null ? 'text-red-600 font-bold border-red-200 bg-red-50/50' : ''}\`}
                                                                value={typeof marksData[st._id]?.[i] === 'object' ? "" : (marksData[st._id]?.[i] ?? "")}
                                                                onChange={(e) => handleMarkChange(st._id, i, null, e.target.value)}
                                                            />`;

content = content.replace(entrySingleInputRegex, entrySingleInputReplacement);

// 2. Fix Entry Table Sub-column Input
const entrySubColInputRegex = /<Input\s*id={`mark-\${idx}-\${i}-\${j}`}\s*type="number"\s*min=\{0\}\s*max=\{sc\.maxMark \|\| 100\}\s*className="w-14 mx-auto text-center h-7 text-xs"\s*value=\{typeof marksData\[st\._id\]\?\.\[i\]\?\.\[j\] === 'object' \? "" : \(marksData\[st\._id\]\?\.\[i\]\?\.\[j\] \?\? ""\)\}\s*onChange=\{\(e\) => handleMarkChange\(st\._id, i, j, e\.target\.value\)\}\s*\/>/;

const entrySubColInputReplacement = `<Input
                                                                            id={\`mark-\${idx}-\${i}-\${j}\`}
                                                                            type="number"
                                                                            min={0}
                                                                            max={sc.maxMark || 100}
                                                                            className={\`w-14 mx-auto text-center h-7 text-xs \${Number(marksData[st._id]?.[i]?.[j]) < (Number(sc.passMark) || 0) && marksData[st._id]?.[i]?.[j] !== "" && marksData[st._id]?.[i]?.[j] != null ? 'text-red-600 font-bold border-red-200 bg-red-50/50' : ''}\`}
                                                                            value={typeof marksData[st._id]?.[i]?.[j] === 'object' ? "" : (marksData[st._id]?.[i]?.[j] ?? "")}
                                                                            onChange={(e) => handleMarkChange(st._id, i, j, e.target.value)}
                                                                        />`;

content = content.replace(entrySubColInputRegex, entrySubColInputReplacement);

// 3. Fix Results Table Display & Render sub-columns properly
const resultRowRegex = /\{\(resultExam\.subjects \|\| \[\]\)\.map\(\(subj, i\) => \(\s*<td key=\{i\} className="p-2 text-center border">\s*\{stat\.marksMap\[typeof subj === 'string' \? subj : subj\.name\] \?\? "-"\}\s*<\/td>\s*\)\)\}/;

const resultRowReplacement = `{(resultExam.subjects || []).map((subj, i) => {
                                                const subjName = typeof subj === 'string' ? subj : subj.name;
                                                const markVal = stat.marksMap[subjName];
                                                
                                                if (subj.subColumns && subj.subColumns.length > 0) {
                                                    const subjTotal = subj.subColumns.reduce((sum, sc, j) => sum + (Number(markVal?.[j]) || 0), 0);
                                                    return (
                                                        <React.Fragment key={i}>
                                                            {subj.subColumns.map((sc, j) => {
                                                                const val = markVal?.[j] ?? "-";
                                                                const isFailed = val !== "-" && Number(val) < (Number(sc.passMark) || 0);
                                                                return (
                                                                    <td key={\`\${i}-\${j}\`} className={\`p-2 text-center border \${isFailed ? 'text-red-600 font-bold' : ''}\`}>
                                                                        {val}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="p-2 text-center font-semibold text-blue-800 bg-blue-50/30 border">
                                                                {subjTotal}
                                                            </td>
                                                        </React.Fragment>
                                                    );
                                                }
                                                
                                                const isFailed = markVal !== "-" && markVal != null && Number(markVal) < (Number(subj.passMark) || 0);
                                                return (
                                                    <td key={i} className={\`p-2 text-center border \${isFailed ? 'text-red-600 font-bold' : ''}\`}>
                                                        {typeof markVal === 'object' ? '-' : (markVal ?? "-")}
                                                    </td>
                                                );
                                            })}`;

if (resultRowRegex.test(content)) {
    content = content.replace(resultRowRegex, resultRowReplacement);
} else {
    console.log("Could not find the Result row regex");
}

fs.writeFileSync(file, content);
console.log("Successfully added red highlighting for failing marks");
