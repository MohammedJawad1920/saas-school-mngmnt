const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/MarksManager.jsx');
let content = fs.readFileSync(file, 'utf8');

// ==== 1. Fix Result Table Headers ====
// We need to replace the entire <thead className="bg-muted/60 print:bg-gray-100"> block.
const resultHeadRegex = /<thead className="bg-muted\/60 print:bg-gray-100">[\s\S]*?<\/thead>/;

const newResultHead = `<thead className="bg-muted/60 print:bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-center border font-bold" rowSpan={(resultExam.subjects || []).some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}>Rank</th>
                                        <th className="p-3 text-left border font-bold w-20" rowSpan={(resultExam.subjects || []).some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}>Adm. No</th>
                                        <th className="p-3 text-left border font-bold" rowSpan={(resultExam.subjects || []).some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}>Student</th>
                                        {(resultExam.subjects || []).map((s, i) => {
                                            if (s.subColumns && s.subColumns.length > 0) {
                                                return (
                                                    <th key={i} className="p-3 text-center border font-bold" colSpan={s.subColumns.length + 1}>
                                                        {s.name}
                                                    </th>
                                                );
                                            }
                                            return (
                                                <th key={i} className="p-3 text-center border font-bold" rowSpan={2}>
                                                    {typeof s === 'string' ? s : (s.name || \`Col \${i + 1}\`)}
                                                    {s.maxMark && <div className="text-[10px] font-normal opacity-70">Max: {s.maxMark}</div>}
                                                </th>
                                            );
                                        })}
                                        <th className="p-3 text-center border font-bold bg-blue-50 dark:bg-blue-950 text-blue-900 print:text-black" rowSpan={(resultExam.subjects || []).some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}>
                                            Total
                                        </th>
                                        <th className="p-3 text-center border font-bold bg-green-50 dark:bg-green-950 text-green-900 print:text-black" rowSpan={(resultExam.subjects || []).some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}>
                                            %
                                        </th>
                                        <th className="p-3 text-center border font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 print:text-black" rowSpan={(resultExam.subjects || []).some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}>
                                            Remark
                                        </th>
                                    </tr>
                                    {(resultExam.subjects || []).some(s => s.subColumns && s.subColumns.length > 0) && (
                                        <tr>
                                            {(resultExam.subjects || []).map((s, i) => {
                                                if (s.subColumns && s.subColumns.length > 0) {
                                                    return (
                                                        <React.Fragment key={i}>
                                                            {s.subColumns.map((sc, j) => (
                                                                <th key={\`\${i}-\${j}\`} className="p-2 text-center border text-xs font-semibold">
                                                                    <div>{sc.name}</div>
                                                                    <div className="text-[10px] font-normal opacity-70">Max: {sc.maxMark}</div>
                                                                </th>
                                                            ))}
                                                            <th className="p-2 text-center border text-xs font-bold bg-blue-50/50">
                                                                Total
                                                            </th>
                                                        </React.Fragment>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </tr>
                                    )}
                                </thead>`;

content = content.replace(resultHeadRegex, newResultHead);

// ==== 2. Fix Entry Table Headers ====
// We need to replace the entire <thead className="bg-muted"> block inside the Entry Table.
const entryHeadRegex = /<thead className="bg-muted">[\s\S]*?<\/thead>/;

const newEntryHead = `<thead className="bg-muted">
                                    <tr>
                                        <th className="p-3 text-center border-b border-r w-12" rowSpan={subjects.some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}>Sl No</th>
                                        <th className="p-1 text-left border-b border-r w-[50px]" rowSpan={subjects.some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}>Adm. No</th>
                                        <th className="p-1 text-left border-b border-r min-w-[80px]" rowSpan={subjects.some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}>Name</th>
                                        {subjects.map((subj, i) => {
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
                                                    <th key={i} className="p-1 text-center border-b border-r w-auto bg-muted/60" colSpan={subj.subColumns.length + 1}>
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <span className="text-xs font-bold truncate max-w-[120px]">
                                                                {subj.name}
                                                            </span>
                                                            <SubjectActions />
                                                        </div>
                                                    </th>
                                                )
                                            }

                                            return (
                                                <th key={i} className="p-1 text-center border-b border-r w-auto" rowSpan={2}>
                                                    <div className="flex flex-col items-center gap-1 group">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-bold truncate max-w-[80px]">
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
                                            <th className="p-2 border-b border-r w-10" rowSpan={subjects.some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={() => openSubjectDialog()}
                                                    title="Add subject column"
                                                >
                                                    <Plus className="w-4 h-4 text-primary" />
                                                </Button>
                                            </th>
                                        )}
                                        <th className="p-3 text-center border-b border-r bg-blue-50 dark:bg-blue-950 min-w-[60px]" rowSpan={subjects.some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}>
                                            Total
                                        </th>
                                        <th className="p-3 text-center border-b border-r bg-green-50 dark:bg-green-950 min-w-[60px]" rowSpan={subjects.some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}>
                                            %
                                        </th>
                                        <th className="p-3 text-center border-b border-r bg-yellow-50 dark:bg-yellow-950 min-w-[60px]" rowSpan={subjects.some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}>
                                            Rank
                                        </th>
                                        <th
                                            className={\`p-3 text-center border-b border-r bg-slate-50 dark:bg-slate-900 min-w-[70px] \${activeRole !== "Teacher" ? "cursor-pointer hover:bg-slate-100 transition-colors group" : ""}\`}
                                            onClick={() => activeRole !== "Teacher" && setIsGradingDialogOpen(true)}
                                            title={activeRole !== "Teacher" ? "Click to change remark settings" : ""}
                                            rowSpan={subjects.some(s => s.subColumns && s.subColumns.length > 0) ? 2 : 1}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                Remark
                                                {activeRole !== "Teacher" && (
                                                    <Settings className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                                                )}
                                            </div>
                                        </th>
                                    </tr>
                                    {subjects.some(subj => subj.subColumns && subj.subColumns.length > 0) && (
                                        <tr>
                                            {subjects.map((subj, i) => {
                                                if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;
                                                
                                                if (subj.subColumns && subj.subColumns.length > 0) {
                                                    return (
                                                        <React.Fragment key={i}>
                                                            {subj.subColumns.map((sc, j) => (
                                                                <th key={\`\${i}-\${j}\`} className="p-1 text-center border-b border-r w-auto bg-muted">
                                                                    <div className="flex flex-col items-center gap-1 group">
                                                                        <span className="text-[11px] font-semibold truncate max-w-[80px]">
                                                                            {sc.name}
                                                                        </span>
                                                                        <div className="text-[9px] text-muted-foreground leading-none">
                                                                            ({sc.passMark}/{sc.maxMark})
                                                                        </div>
                                                                    </div>
                                                                </th>
                                                            ))}
                                                            <th className="p-1 text-center border-b border-r w-auto bg-blue-50/50">
                                                                <span className="text-[11px] font-semibold">Total</span>
                                                            </th>
                                                        </React.Fragment>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </tr>
                                    )}
                                </thead>`;

content = content.replace(entryHeadRegex, newEntryHead);

fs.writeFileSync(file, content);
console.log("Successfully updated two-tier table headers");
