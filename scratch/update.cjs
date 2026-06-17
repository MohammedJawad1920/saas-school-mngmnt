const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/MarksManager.jsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import React')) {
    content = content.replace('import { useEffect', 'import React, { useEffect');
}

// Update Result View Headers
const resultHeaderTarget = `
                                            <th className="p-3 text-left border font-bold">Student</th>
                                        {(resultExam.subjects || []).map((s, i) => (
                                            <th key={i} className="p-3 text-center border font-bold">
                                                {typeof s === 'string' ? s : (s.name || \`Col \${i + 1}\`)}
                                                {s.maxMark && <div className="text-[10px] font-normal opacity-70">Max: {s.maxMark}</div>}
                                            </th>
                                        ))}
                                        <th className="p-3 text-center border font-bold bg-blue-50 dark:bg-blue-950 text-blue-900 print:text-black">
`;

const resultHeaderReplacement = `
                                            <th className="p-3 text-left border font-bold">Student</th>
                                        {(resultExam.subjects || []).map((s, i) => {
                                            if (s.subColumns && s.subColumns.length > 0) {
                                                return (
                                                    <React.Fragment key={i}>
                                                        {s.subColumns.map((sc, j) => (
                                                            <th key={\`\${i}-\${j}\`} className="p-3 text-center border font-bold">
                                                                <div>{s.name}</div>
                                                                <div className="text-xs text-muted-foreground">{sc.name}</div>
                                                                <div className="text-[10px] font-normal opacity-70">Max: {sc.maxMark}</div>
                                                            </th>
                                                        ))}
                                                        <th className="p-3 text-center border font-bold bg-blue-50/50">
                                                            {s.name} Total
                                                        </th>
                                                    </React.Fragment>
                                                )
                                            }
                                            return (
                                                <th key={i} className="p-3 text-center border font-bold">
                                                    {typeof s === 'string' ? s : (s.name || \`Col \${i + 1}\`)}
                                                    {s.maxMark && <div className="text-[10px] font-normal opacity-70">Max: {s.maxMark}</div>}
                                                </th>
                                            )
                                        })}
                                        <th className="p-3 text-center border font-bold bg-blue-50 dark:bg-blue-950 text-blue-900 print:text-black">
`;
content = content.replace(resultHeaderTarget.trim(), resultHeaderReplacement.trim());


// Update Result View Body
const resultBodyTarget = `
                                            <td className="p-2 font-medium border">{stat.studentName}</td>
                                            {(resultExam.subjects || []).map((subj, i) => (
                                                <td key={i} className="p-2 text-center border">
                                                    {stat.marksMap[typeof subj === 'string' ? subj : subj.name] ?? "-"}
                                                </td>
                                            ))}
                                            <td className="p-2 text-center font-bold border text-blue-700 dark:text-blue-300 print:text-black">
`;

const resultBodyReplacement = `
                                            <td className="p-2 font-medium border">{stat.studentName}</td>
                                            {(resultExam.subjects || []).map((subj, i) => {
                                                if (subj.subColumns && subj.subColumns.length > 0) {
                                                    const sMarks = stat.marksMap[subj.name] || {};
                                                    let sTotal = 0;
                                                    return (
                                                        <React.Fragment key={i}>
                                                            {subj.subColumns.map((sc, j) => {
                                                                const m = sMarks[sc.name];
                                                                sTotal += (Number(m) || 0);
                                                                return (
                                                                    <td key={\`\${i}-\${j}\`} className="p-2 text-center border">
                                                                        {m ?? "-"}
                                                                    </td>
                                                                )
                                                            })}
                                                            <td className="p-2 text-center font-bold border bg-blue-50/30">
                                                                {sTotal}
                                                            </td>
                                                        </React.Fragment>
                                                    )
                                                }
                                                return (
                                                    <td key={i} className="p-2 text-center border">
                                                        {stat.marksMap[typeof subj === 'string' ? subj : subj.name] ?? "-"}
                                                    </td>
                                                )
                                            })}
                                            <td className="p-2 text-center font-bold border text-blue-700 dark:text-blue-300 print:text-black">
`;
content = content.replace(resultBodyTarget.trim(), resultBodyReplacement.trim());


// Update Entry Headers
const entryHeaderTarget = `
                                        <th className="p-1 text-left border-b min-w-[80px]">Name</th>
                                        {subjects.map((subj, i) => {
                                            // Filter for teachers: only show selected subject
                                            if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;

                                            return (
                                                <th key={i} className="p-1 text-center border-b w-auto">
                                                    <div className="flex flex-col items-center gap-1 group">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-semibold truncate max-w-[80px]">
                                                                {subj.name || \`Sub \${i + 1}\`}
                                                            </span>
                                                            {activeRole !== "Teacher" && (
                                                                <div className="flex items-center gap-1">
                                                                    <Edit
                                                                        className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                                                                        onClick={() => openSubjectDialog(i)}
                                                                    />
                                                                    <Trash2
                                                                        className="w-3 h-3 cursor-pointer text-red-500 hover:text-red-700 transition-colors"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (subjects.length <= 1) {
                                                                                toast.error("At least one subject is required.");
                                                                                return;
                                                                            }
                                                                            setSubjectToDeleteIndex(i);
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-[9px] text-muted-foreground leading-none">
                                                            ({subj.passMark}/{subj.maxMark})
                                                        </div>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                        {activeRole !== "Teacher" && (
                                            <th className="p-2 border-b w-10">
`;

const entryHeaderReplacement = `
                                        <th className="p-1 text-left border-b min-w-[80px]">Name</th>
                                        {subjects.map((subj, i) => {
                                            // Filter for teachers: only show selected subject
                                            if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;

                                            const SubjectActions = () => (
                                                activeRole !== "Teacher" ? (
                                                    <div className="flex items-center gap-1">
                                                        <Edit
                                                            className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                                                            onClick={() => openSubjectDialog(i)}
                                                        />
                                                        <Trash2
                                                            className="w-3 h-3 cursor-pointer text-red-500 hover:text-red-700 transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (subjects.length <= 1) {
                                                                    toast.error("At least one subject is required.");
                                                                    return;
                                                                }
                                                                setSubjectToDeleteIndex(i);
                                                            }}
                                                        />
                                                    </div>
                                                ) : null
                                            );

                                            if (subj.subColumns && subj.subColumns.length > 0) {
                                                return (
                                                    <React.Fragment key={i}>
                                                        {subj.subColumns.map((sc, j) => (
                                                            <th key={\`\${i}-\${j}\`} className="p-1 text-center border-b w-auto">
                                                                <div className="flex flex-col items-center gap-1 group">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-semibold truncate max-w-[80px]">
                                                                            {subj.name} - {sc.name}
                                                                        </span>
                                                                        {j === 0 && <SubjectActions />}
                                                                    </div>
                                                                    <div className="text-[9px] text-muted-foreground leading-none">
                                                                        ({sc.passMark}/{sc.maxMark})
                                                                    </div>
                                                                </div>
                                                            </th>
                                                        ))}
                                                        <th className="p-1 text-center border-b w-auto bg-blue-50/50">
                                                            <span className="text-xs font-semibold">{subj.name} Total</span>
                                                        </th>
                                                    </React.Fragment>
                                                )
                                            }

                                            return (
                                                <th key={i} className="p-1 text-center border-b w-auto">
                                                    <div className="flex flex-col items-center gap-1 group">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-semibold truncate max-w-[80px]">
                                                                {subj.name || \`Sub \${i + 1}\`}
                                                            </span>
                                                            <SubjectActions />
                                                        </div>
                                                        <div className="text-[9px] text-muted-foreground leading-none">
                                                            ({subj.passMark}/{subj.maxMark})
                                                        </div>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                        {activeRole !== "Teacher" && (
                                            <th className="p-2 border-b w-10">
`;
content = content.replace(entryHeaderTarget.trim(), entryHeaderReplacement.trim());


// Update Entry Body
const entryBodyTarget = `
                                                <td className="p-1 font-medium">{st.name}</td>
                                                {subjects.map((_, i) => {
                                                    // Filter for teachers: only show selected subject
                                                    if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;

                                                    return (
                                                        <td key={i} className="p-1 text-center">
                                                            <Input
                                                                id={\`mark-\${idx}-\${i}\`}
                                                                type="number"
                                                                min={0}
                                                                max={subjects[i]?.maxMark || 100}
                                                                className="w-14 mx-auto text-center h-7 text-xs"
                                                                value={marksData[st._id]?.[i] ?? ""}
                                                                onChange={(e) =>
                                                                    handleMarkChange(st._id, i, e.target.value)
                                                                }
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") {
                                                                        e.preventDefault();
                                                                        // For teachers, find the next visible student since only one column is shown
                                                                        if (activeRole === "Teacher" && selectedSubjectIndex !== null) {
                                                                            const nextRow = document.getElementById(
                                                                                \`mark-\${idx + 1}-\${i}\`
                                                                            );
                                                                            if (nextRow) nextRow.focus();
                                                                            return;
                                                                        }

                                                                        const nextCol = document.getElementById(
                                                                            \`mark-\${idx}-\${i + 1}\`
                                                                        );
                                                                        if (nextCol) {
                                                                            nextCol.focus();
                                                                        } else {
                                                                            const nextRow = document.getElementById(
                                                                                \`mark-\${idx + 1}-0\`
                                                                            );
                                                                            if (nextRow) nextRow.focus();
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                                {activeRole !== "Teacher" && <td />}
                                                <td className="p-2 text-center font-semibold text-blue-700 dark:text-blue-300">
                                                    {stat?.total ?? 0}
                                                </td>
                                                <td className="p-2 text-center font-semibold text-green-700 dark:text-green-300">
                                                    {stat?.percentage ?? 0}%
                                                </td>
                                                <td className="p-2 text-center font-semibold text-yellow-700 dark:text-yellow-300">
                                                    {stat?.rank ?? "-"}
                                                </td>
                                                <td className={\`p-2 text-center font-bold \${stat?.remark === "Pass" ? "text-green-600" : stat?.remark === "Fail" ? "text-red-600" : "text-blue-600"}\`}>
                                                    {stat?.remark ?? "-"}
                                                </td>
                                            </tr>
`;

const entryBodyReplacement = `
                                                <td className="p-1 font-medium">{st.name}</td>
                                                {subjects.map((subj, i) => {
                                                    if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;

                                                    if (subj.subColumns && subj.subColumns.length > 0) {
                                                        const subjTotal = subj.subColumns.reduce((sum, sc, j) => sum + (Number(marksData[st._id]?.[i]?.[j]) || 0), 0);
                                                        return (
                                                            <React.Fragment key={i}>
                                                                {subj.subColumns.map((sc, j) => (
                                                                    <td key={\`\${i}-\${j}\`} className="p-1 text-center">
                                                                        <Input
                                                                            id={\`mark-\${idx}-\${i}-\${j}\`}
                                                                            type="number"
                                                                            min={0}
                                                                            max={sc.maxMark || 100}
                                                                            className="w-14 mx-auto text-center h-7 text-xs"
                                                                            value={marksData[st._id]?.[i]?.[j] ?? ""}
                                                                            onChange={(e) => handleMarkChange(st._id, i, j, e.target.value)}
                                                                        />
                                                                    </td>
                                                                ))}
                                                                <td className="p-1 text-center font-semibold text-blue-800 bg-blue-50/30">
                                                                    {subjTotal}
                                                                </td>
                                                            </React.Fragment>
                                                        )
                                                    }

                                                    return (
                                                        <td key={i} className="p-1 text-center">
                                                            <Input
                                                                id={\`mark-\${idx}-\${i}\`}
                                                                type="number"
                                                                min={0}
                                                                max={subj.maxMark || 100}
                                                                className="w-14 mx-auto text-center h-7 text-xs"
                                                                value={marksData[st._id]?.[i] ?? ""}
                                                                onChange={(e) => handleMarkChange(st._id, i, null, e.target.value)}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                                {activeRole !== "Teacher" && <td />}
                                                <td className="p-2 text-center font-semibold text-blue-700 dark:text-blue-300">
                                                    {stat?.total ?? 0}
                                                </td>
                                                <td className="p-2 text-center font-semibold text-green-700 dark:text-green-300">
                                                    {stat?.percentage ?? 0}%
                                                </td>
                                                <td className="p-2 text-center font-semibold text-yellow-700 dark:text-yellow-300">
                                                    {stat?.rank ?? "-"}
                                                </td>
                                                <td className={\`p-2 text-center font-bold \${stat?.autoRemark === "Pass" ? "text-green-600" : stat?.autoRemark === "Fail" ? "text-red-600" : "text-blue-600"}\`}>
                                                    <div className="flex flex-col gap-1 items-center">
                                                        <span className="text-xs text-muted-foreground">{stat?.autoRemark ?? "-"}</span>
                                                        <Input 
                                                            placeholder="Custom" 
                                                            className="w-20 h-7 text-xs text-center font-bold"
                                                            value={marksData[st._id]?.manualRemark || ""}
                                                            onChange={(e) => {
                                                                setMarksData(prev => ({
                                                                    ...prev,
                                                                    [st._id]: { ...(prev[st._id] || {}), manualRemark: e.target.value }
                                                                }));
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
`;
content = content.replace(entryBodyTarget.trim(), entryBodyReplacement.trim());


fs.writeFileSync(file, content);
console.log("Successfully updated MarksManager.jsx");
