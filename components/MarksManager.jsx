"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2, Save, Plus, Printer, Trophy, Edit, Settings, X, User, Check, ChevronsUpDown, Search, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { useReactToPrint } from "react-to-print";
import { ComboBox } from "@/components/ui/combobox";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

// ─── Multi-Select Dropdown ────────────────────────────────────────────────────
function MultiSelect({ options = [], selected = [], onChange, placeholder = "Select...", disabled = false }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
    const selectedLabels = options.filter(o => selected.includes(o.value)).map(o => o.label);

    const toggle = (value) => {
        if (selected.includes(value)) onChange(selected.filter(v => v !== value));
        else onChange([...selected, value]);
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(o => !o)}
                className={`flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-9 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-accent/30"}`}
            >
                <span className={`truncate flex-1 text-left ${selectedLabels.length === 0 ? "text-muted-foreground" : ""}`}>
                    {selectedLabels.length === 0
                        ? placeholder
                        : selectedLabels.length <= 2
                            ? selectedLabels.join(", ")
                            : `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2} more`}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md animate-in fade-in-0 zoom-in-95">
                    <div className="flex items-center gap-2 px-2 py-1.5 border-b">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <input
                            autoFocus
                            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                            placeholder="Search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && <button onClick={() => setSearch("")}><X className="h-3 w-3 text-muted-foreground" /></button>}
                    </div>
                    <div className="max-h-52 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <div className="py-6 text-center text-xs text-muted-foreground">No results</div>
                        ) : filtered.map(o => (
                            <button
                                key={o.value}
                                type="button"
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent rounded-sm"
                                onClick={() => toggle(o.value)}
                            >
                                <div className={`h-4 w-4 rounded border flex items-center justify-center ${selected.includes(o.value) ? "bg-primary border-primary" : "border-input"}`}>
                                    {selected.includes(o.value) && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                <span className="flex-1 text-left truncate">{o.label}</span>
                            </button>
                        ))}
                    </div>
                    {selected.length > 0 && (
                        <div className="border-t px-2 py-1.5">
                            <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-destructive w-full text-left"
                                onClick={() => onChange([])}
                            >Clear all</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MarksManager({ apiKey, activeRole: serverRole }) {
    const [batches, setBatches] = useState([]);
    const [classes, setClasses] = useState([]);

    // ── Multi-select filters (for fetching students / creating a new exam)
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [selectedClasses, setSelectedClasses] = useState([]);

    // ── All available students fetched from selected batches/classes
    const [availableStudents, setAvailableStudents] = useState([]);
    // ── Students hand-picked by admin for the new exam
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    // ── Students used in the marks table (locked after "Open Marks Table")
    const [students, setStudents] = useState([]);

    const [examName, setExamName] = useState("");
    const [subjects, setSubjects] = useState([{ name: "", maxMark: 100, passMark: 40, subColumns: [] }]);
    const [marksData, setMarksData] = useState({});

    // ── All saved exams (loaded on mount, always available regardless of class filter)
    const [allExams, setAllExams] = useState([]);

    const [selectedExam, setSelectedExam] = useState(null);
    const [examReady, setExamReady] = useState(false);
    const [savingMarks, setSavingMarks] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [resultExam, setResultExam] = useState(null);
    const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(null);
    const [isAddingNewExam, setIsAddingNewExam] = useState(false);
    const [resultType, setResultType] = useState("class-wise");
    const [selectedStudentForIndividual, setSelectedStudentForIndividual] = useState("");
    const [institutionName, setInstitutionName] = useState("");
    const [institutionData, setInstitutionData] = useState({});
    const [showSavedPopup, setShowSavedPopup] = useState(false);

    const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
    const [editingSubjectIndex, setEditingSubjectIndex] = useState(null);
    const [subjectForm, setSubjectForm] = useState({ name: "", maxMark: 100, passMark: 40, subColumns: [] });
    const [subjectToDeleteIndex, setSubjectToDeleteIndex] = useState(null);

    const [gradingScale, setGradingScale] = useState([]);
    const [isGradingDialogOpen, setIsGradingDialogOpen] = useState(false);

    const printRef = useRef(null);
    const clientRole = Cookies.get("active-role");
    const activeRole = serverRole || clientRole;

    // ── Refresh all exams helper
    const refreshAllExams = useCallback(async () => {
        try {
            const res = await fetch("/api/marks", { cache: "no-store" });
            const d = await res.json();
            setAllExams(d.data || []);
        } catch (e) {
            console.error("Failed to refresh exams", e);
        }
    }, []);

    // ── Initial load: classes, batches, institution settings, all exams
    useEffect(() => {
        if (!apiKey) return;
        const reqHeaders = { "api-key": apiKey };
        Promise.all([
            fetch("/api/classes", { headers: reqHeaders }).then(r => r.json()),
            fetch("/api/batches", { headers: reqHeaders }).then(r => r.json()),
            fetch("/api/settings", { headers: reqHeaders }).then(r => r.json()).catch(() => ({})),
            fetch("/api/marks", { cache: "no-store" }).then(r => r.json()).catch(() => ({ data: [] })),
        ]).then(([classesData, batchesData, settingsData, marksData]) => {
            setClasses(classesData.classes || []);
            setBatches(
                (batchesData.batches || []).sort((a, b) => {
                    const aYear = a.endYear || a.startYear || 0;
                    const bYear = b.endYear || b.startYear || 0;
                    if (aYear !== bYear) return bYear - aYear;
                    return (b.name || "").localeCompare(a.name || "");
                })
            );
            if (settingsData?.settings?.institution) {
                const inst = settingsData.settings.institution;
                setInstitutionName(inst.name || "");
                setInstitutionData(inst);
            }
            setAllExams(marksData.data || []);
        }).catch(err => console.error("Failed to fetch initial data", err));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Fetch students whenever selected batches or classes change
    useEffect(() => {
        if (selectedBatches.length === 0 && selectedClasses.length === 0) {
            if (students.length === 0) {
                setAvailableStudents([]);
                setSelectedStudentIds([]);
            } else {
                setAvailableStudents(students);
            }
            return;
        }

        // Build fetch URLs for each selection
        const promises = [];
        selectedBatches.forEach(batchId => {
            promises.push(
                fetch(`/api/users?roles=Student&batchId=${batchId}`).then(r => r.json())
            );
        });
        selectedClasses.forEach(classId => {
            promises.push(
                fetch(`/api/users?roles=Student&classId=${classId}&status=Active`).then(r => r.json())
            );
        });

        Promise.all(promises).then(results => {
            const map = new Map();
            // Retain students from the loaded exam so they aren't lost
            students.forEach(u => {
                if (u && u._id) map.set(u._id, u);
            });
            results.forEach(d => {
                (d.users || []).forEach(u => map.set(u._id, u));
            });
            const merged = Array.from(map.values());
            setAvailableStudents(prevAvailable => {
                const prevAvailableIds = new Set(prevAvailable.map(u => u._id));
                
                // Mix the previously selected students with the newly fetched ones
                setSelectedStudentIds(prevSelected => {
                    const newIds = new Set(prevSelected);
                    results.forEach(d => {
                        (d.users || []).forEach(u => {
                            if (!prevAvailableIds.has(u._id)) {
                                newIds.add(u._id);
                            }
                        });
                    });
                    return Array.from(newIds);
                });
                
                return merged;
            });
        }).catch(err => console.error("Failed to fetch students", err));
    }, [selectedBatches, selectedClasses, students]);

    const loadExam = (exam) => {
        setSelectedExam(exam);
        setExamName(exam.examName);
        const examSubjects = exam.subjects?.length
            ? exam.subjects.map(s =>
                typeof s === "string"
                    ? { name: s, maxMark: 100, passMark: 40, subColumns: [] }
                    : { ...s, subColumns: s.subColumns || [] }
            )
            : [{ name: "", maxMark: 100, passMark: 40, subColumns: [] }];
        setSubjects(examSubjects);
        setGradingScale(exam.gradingScale || []);

        // Load students from the saved exam (independent of class filter)
        const examStudents = (exam.students || []).map(entry => {
            const sid = entry.studentId;
            if (sid && typeof sid === "object") return sid; // populated
            return { _id: sid, name: sid }; // fallback
        }).filter(Boolean);
        setSelectedBatches([]);
        setSelectedClasses([]);
        setStudents(examStudents);
        setAvailableStudents(examStudents);
        setSelectedStudentIds(examStudents.map(s => s._id));

        const md = {};
        (exam.students || []).forEach(entry => {
            const sid = entry.studentId?._id || entry.studentId;
            let marksObj = {};
            if (entry.marks instanceof Map) {
                marksObj = Object.fromEntries(entry.marks);
            } else if (entry.marks && typeof entry.marks === "object") {
                marksObj = entry.marks;
            }
            md[sid] = {};
            examSubjects.forEach((subj, i) => {
                const key = subj.name || `col${i}`;
                const val = marksObj[key];
                if (subj.subColumns && subj.subColumns.length > 0) {
                    if (val && typeof val === "object") {
                        md[sid][i] = subj.subColumns.reduce((acc, sc, j) => {
                            if (val[sc.name] !== undefined) acc[j] = val[sc.name];
                            return acc;
                        }, {});
                    }
                } else {
                    if (val !== undefined) md[sid][i] = val;
                }
            });
        });
        setMarksData(md);
        setExamReady(true);
        setShowResult(false);
        setSelectedSubjectIndex(null);
        setResultType("class-wise");
        setSelectedStudentForIndividual("");
        setIsAddingNewExam(false);
    };

    const handleOpenTable = () => {
        if (!examName.trim()) {
            alert("Please enter an exam name.");
            return;
        }
        const pickedStudents = availableStudents.filter(s => selectedStudentIds.includes(s._id));
        if (pickedStudents.length === 0) {
            alert("Please select at least one student.");
            return;
        }
        setStudents(pickedStudents);
        const init = {};
        pickedStudents.forEach(st => (init[st._id] = {}));
        setMarksData(init);
        setExamReady(true);
        setShowResult(false);
    };

    const handleDeleteExam = async (examId) => {
        try {
            const res = await fetch(`/api/marks/${examId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                toast.success("Exam deleted successfully!");
                setResultExam(null);
                await refreshAllExams();
            } else {
                toast.error(data.message || "Failed to delete exam");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("An error occurred while deleting");
        }
    };

    const openSubjectDialog = (index = null) => {
        if (index !== null) {
            setEditingSubjectIndex(index);
            setSubjectForm({ ...subjects[index], subColumns: subjects[index].subColumns || [] });
        } else {
            setEditingSubjectIndex(null);
            setSubjectForm({ name: "", maxMark: 100, passMark: 40, subColumns: [] });
        }
        setIsSubjectDialogOpen(true);
    };

    const saveSubject = () => {
        if (!subjectForm.name.trim()) {
            toast.error("Subject name is required");
            return;
        }
        const hasSubs = (subjectForm.subColumns || []).length > 0;
        const finalSubject = hasSubs
            ? {
                ...subjectForm,
                maxMark: subjectForm.subColumns.reduce((s, sc) => s + (Number(sc.maxMark) || 0), 0),
                passMark: subjectForm.subColumns.reduce((s, sc) => s + (Number(sc.passMark) || 0), 0),
              }
            : subjectForm;
        setSubjects(prev => {
            const updated = [...prev];
            if (editingSubjectIndex !== null) {
                updated[editingSubjectIndex] = finalSubject;
            } else {
                updated.push(finalSubject);
            }
            return updated;
        });
        setIsSubjectDialogOpen(false);
    };

    const confirmRemoveSubject = () => {
        if (subjectToDeleteIndex === null) return;
        const index = subjectToDeleteIndex;
        setSubjects(prev => prev.filter((_, i) => i !== index));
        const updated = { ...marksData };
        Object.keys(updated).forEach(id => {
            const newRow = {};
            let offset = 0;
            for (let j = 0; j <= subjects.length; j++) {
                if (j === index) { offset = 1; continue; }
                if (updated[id][j] !== undefined) newRow[j - offset] = updated[id][j];
            }
            updated[id] = newRow;
        });
        setMarksData(updated);
        setSubjectToDeleteIndex(null);
    };

    const handleMarkChange = (studentId, subjIdx, value, subColIdx = null) => {
        if (subColIdx === null) {
            const maxMark = subjects[subjIdx]?.maxMark || 100;
            let finalValue = value === "" ? "" : Number(value);
            if (finalValue !== "" && finalValue > maxMark) finalValue = maxMark;
            setMarksData(prev => ({
                ...prev,
                [studentId]: { ...prev[studentId], [subjIdx]: finalValue },
            }));
        } else {
            const sc = subjects[subjIdx]?.subColumns?.[subColIdx];
            const maxMark = sc?.maxMark || 100;
            let finalValue = value === "" ? "" : Number(value);
            if (finalValue !== "" && finalValue > maxMark) finalValue = maxMark;
            setMarksData(prev => {
                const prevSubj = prev[studentId]?.[subjIdx];
                const prevObj = (prevSubj && typeof prevSubj === "object") ? prevSubj : {};
                return {
                    ...prev,
                    [studentId]: {
                        ...prev[studentId],
                        [subjIdx]: { ...prevObj, [subColIdx]: finalValue },
                    },
                };
            });
        }
    };

    // Combine loaded students (from loaded exam) and fetched availableStudents (from current batch/class selections)
    const studentPool = [];
    const seenIds = new Set();
    students.forEach(s => {
        if (s && s._id && !seenIds.has(s._id)) {
            studentPool.push(s);
            seenIds.add(s._id);
        }
    });
    availableStudents.forEach(s => {
        if (s && s._id && !seenIds.has(s._id)) {
            studentPool.push(s);
            seenIds.add(s._id);
        }
    });
    const activeStudents = studentPool
        .filter(st => selectedStudentIds.includes(st._id))
        .sort((a, b) => {
            const idA = String(a._id || "");
            const idB = String(b._id || "");
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
        });

    const computeStats = () => {
        const currentSubjects = (activeRole === "Teacher" && selectedSubjectIndex !== null)
            ? [subjects[selectedSubjectIndex]]
            : subjects;
        const currentIndices = (activeRole === "Teacher" && selectedSubjectIndex !== null)
            ? [selectedSubjectIndex]
            : subjects.map((_, i) => i);

        const totals = activeStudents.map(st => {
            let total = 0;
            let maxTotal = 0;
            let hasFailed = false;

            currentIndices.forEach((origIdx, i) => {
                const subj = currentSubjects[i];
                const markVal = marksData[st._id]?.[origIdx];

                if (subj.subColumns && subj.subColumns.length > 0) {
                    subj.subColumns.forEach((sc, j) => {
                        const v = (markVal && typeof markVal === "object") ? (Number(markVal[j]) || 0) : 0;
                        total += v;
                        maxTotal += Number(sc.maxMark) || 0;
                        if (v < (Number(sc.passMark) || 0)) hasFailed = true;
                    });
                } else {
                    const v = Number(markVal) || 0;
                    total += v;
                    maxTotal += Number(subj.maxMark) || 0;
                    if (v < (Number(subj.passMark) || 0)) hasFailed = true;
                }
            });

            const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : "0.0";
            let remark = hasFailed ? "Fail" : "Pass";
            if (gradingScale?.length > 0) {
                const matched = gradingScale.find(g => Number(percentage) >= g.min && Number(percentage) <= g.max);
                if (matched) remark = matched.remark;
            }
            return { studentId: st._id, total, percentage, remark };
        });
        const sorted = [...totals].sort((a, b) => Number(b.total) - Number(a.total));
        return totals.map(t => ({
            ...t,
            rank: sorted.findIndex(s => Number(s.total) === Number(t.total)) + 1,
        }));
    };

    const stats = computeStats();
    const hasAnySubCols = subjects.some(s => (s.subColumns || []).length > 0);

    const saveMarks = async () => {
        setSavingMarks(true);
        const validatedSubjects = subjects.map((s, i) => ({
            ...s,
            name: s.name.trim() || `Subject ${i + 1}`,
        }));

        // Build classIds from current selections
        const classIds = [...new Set([...selectedClasses, ...selectedBatches])];
        // Also include class IDs from the existing exam if editing
        if (selectedExam?.classIds?.length) {
            selectedExam.classIds.forEach(id => { if (!classIds.includes(id)) classIds.push(id); });
        }
        if (selectedExam?.classId && !classIds.includes(selectedExam.classId)) {
            classIds.push(selectedExam.classId);
        }

        const payload = {
            examName,
            classIds,
            classId: classIds[0] || selectedExam?.classId || "",
            subjects: validatedSubjects,
            gradingScale,
            students: activeStudents.map(st => ({
                studentId: st._id,
                marks: validatedSubjects.reduce((acc, subj, i) => {
                    if (subj.subColumns && subj.subColumns.length > 0) {
                        const markObj = marksData[st._id]?.[i];
                        if (markObj && typeof markObj === "object") {
                            const scData = subj.subColumns.reduce((scAcc, sc, j) => {
                                const v = markObj[j];
                                if (v !== undefined && v !== "") scAcc[sc.name] = v;
                                return scAcc;
                            }, {});
                            if (Object.keys(scData).length > 0) acc[subj.name] = scData;
                        }
                    } else {
                        const val = marksData[st._id]?.[i];
                        if (val !== undefined && val !== "") acc[subj.name] = val;
                    }
                    return acc;
                }, {}),
            })),
        };

        const method = selectedExam ? "PUT" : "POST";
        const url = selectedExam ? `/api/marks/${selectedExam._id}` : `/api/marks`;

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                setShowSavedPopup(true);
                setTimeout(() => setShowSavedPopup(false), 2500);
                const savedId = data.data?._id || selectedExam?._id;
                await refreshAllExams();
                const updated = await fetch("/api/marks", { cache: "no-store" }).then(r => r.json());
                const exams = updated.data || [];
                const thisExam = exams.find(e => e._id === savedId);
                if (thisExam) {
                    setResultExam(thisExam);
                    setSubjects(thisExam.subjects);
                }
                if (!selectedExam) setSelectedExam(data.data);
            } else {
                toast.error(data.message || "Failed to save marks");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Network error occurred while saving");
        }
        setSavingMarks(false);
    };

    const saveSettings = async () => {
        const activeExamId = showResult ? resultExam?._id : selectedExam?._id;
        if (!activeExamId) return;

        setSavingMarks(true);
        try {
            const res = await fetch(`/api/marks/${activeExamId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gradingScale }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Grading settings saved!");
                await refreshAllExams();
                setIsGradingDialogOpen(false);
            } else {
                toast.error(data.message || "Failed to save settings");
            }
        } catch (error) {
            console.error("Save settings error:", error);
            toast.error("Network error");
        }
        setSavingMarks(false);
    };

    // Derive a display label for the class/batch context of a result exam
    const getExamContextLabel = (exam) => {
        if (!exam) return "";
        const ids = exam.classIds?.length ? exam.classIds : (exam.classId ? [exam.classId] : []);
        const labels = ids.map(id => {
            const cls = classes.find(c => c._id === id);
            if (cls) return cls.name;
            const bat = batches.find(b => b._id === id);
            if (bat) return `${bat.name}${bat.endYear ? ` (${bat.endYear})` : ""}`;
            return null;
        }).filter(Boolean);
        return labels.join(", ");
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `${resultExam?.examName || examName} — Result`,
    });

    const handleExportToExcel = async () => {
        try {
            const XLSX = await import("xlsx");
            const table = printRef.current?.querySelector("table");
            if (!table) return;

            const clonedTable = table.cloneNode(true);
            const originalInputs = table.querySelectorAll("input");
            const clonedInputs = clonedTable.querySelectorAll("input");
            clonedInputs.forEach((input, index) => {
                const val = originalInputs[index]?.value || "";
                input.parentNode.replaceChild(document.createTextNode(val), input);
            });

            const wb = XLSX.utils.table_to_book(clonedTable, { sheet: "Sheet1" });
            const fileName = showResult 
                ? `${resultExam?.examName || "Result"}.xlsx`
                : `${examName || "MarkEntry"}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } catch (error) {
            console.error("Excel export error:", error);
            toast.error("Failed to export to Excel");
        }
    };

    const computeResultStats = (exam) => {
        if (!exam) return [];
        const examStudents = exam.students || [];
        const examSubjects = (exam.subjects || []).map(s =>
            typeof s === "string"
                ? { name: s, maxMark: 100, passMark: 40, subColumns: [] }
                : { ...s, subColumns: s.subColumns || [] }
        );

        const totals = examStudents.map(entry => {
            let marksMap = {};
            if (entry.marks instanceof Map) {
                marksMap = Object.fromEntries(entry.marks);
            } else if (entry.marks && typeof entry.marks === "object") {
                marksMap = entry.marks;
            }

            let total = 0;
            let maxTotal = 0;
            let hasFailed = false;

            examSubjects.forEach(subj => {
                const val = marksMap[subj.name];
                if (subj.subColumns && subj.subColumns.length > 0) {
                    subj.subColumns.forEach(sc => {
                        const scVal = (val && typeof val === "object") ? (Number(val[sc.name]) || 0) : 0;
                        total += scVal;
                        maxTotal += Number(sc.maxMark) || 0;
                        if (scVal < (Number(sc.passMark) || 0)) hasFailed = true;
                    });
                } else {
                    const markVal = Number(val) || 0;
                    total += markVal;
                    maxTotal += Number(subj.maxMark) || 100;
                    if (markVal < (Number(subj.passMark) || 0)) hasFailed = true;
                }
            });

            const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : "0.0";
            let remark = hasFailed ? "Fail" : "Pass";
            if (exam.gradingScale?.length > 0) {
                const matched = exam.gradingScale.find(g => Number(percentage) >= g.min && Number(percentage) <= g.max);
                if (matched) remark = matched.remark;
            }
            return {
                studentId: entry.studentId?._id || entry.studentId,
                studentName: entry.studentId?.name || entry.studentId,
                total,
                percentage,
                marksMap,
                remark,
                examSubjects,
            };
        });
        const sorted = [...totals].sort((a, b) => Number(b.total) - Number(a.total));
        return totals
            .map(t => ({
                ...t,
                rank: sorted.findIndex(s => Number(s.total) === Number(t.total)) + 1,
            }))
            .sort((a, b) => {
                if (a.rank !== b.rank) return a.rank - b.rank;
                const idA = String(a.studentId || "");
                const idB = String(b.studentId || "");
                return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
            });
    };

    const resultViewStats = computeResultStats(resultExam);
    const hasAnySubColsResult = (resultExam?.subjects || []).some(s => (s.subColumns || []).length > 0);

    // ── Class options filtered by selected batches
    const filteredClasses = selectedBatches.length > 0
        ? classes.filter(c => {
            // If class has a batchId field, filter by it
            return selectedBatches.some(bId => c.batchId === bId || (Array.isArray(c.batchIds) && c.batchIds.includes(bId)));
        })
        : classes;

    // Use all classes if none match (fall back to show all)
    const classOptions = (filteredClasses.length > 0 ? filteredClasses : classes).map(c => ({ value: c._id, label: c.name }));
    const batchOptions = batches.map(b => ({ value: b._id, label: `${b.name}${b.endYear ? ` (${b.endYear})` : ""}` }));
    const studentOptions = availableStudents.map(s => ({ value: s._id, label: `${s.name} (${s._id})` }));

    return (
        <div className="space-y-6">
            {/* Centered Save Success Popup */}
            {showSavedPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="bg-background border border-border shadow-2xl rounded-xl px-8 py-5 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <div>
                            <p className="font-semibold text-base text-foreground">Saved Successfully!</p>
                            <p className="text-xs text-muted-foreground">Marks have been saved.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Top Control Bar ────────────────────────────────────────────── */}
            <div className="space-y-3 print:hidden">
                {!showResult ? (
                    // Marks Entry Controls
                    activeRole === "Teacher" ? (
                        // Teacher: mode, exam name, subject
                        <div className={`space-y-3 md:space-y-0 md:grid md:gap-3 md:items-end ${examReady ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                            {/* Row 1 on mobile: Mode + Subject side by side */}
                            <div className={`grid gap-3 md:contents ${examReady ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {/* Mode */}
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Mode</label>
                                    <Select
                                        value="entry"
                                        onValueChange={val => {
                                            if (val === "result") {
                                                setShowResult(true);
                                                setResultExam(null);
                                                setResultType("class-wise");
                                                setSelectedStudentForIndividual("");
                                            }
                                        }}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="entry">Marks Entry</SelectItem>
                                            <SelectItem value="result">Result View</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Subject */}
                                {examReady && (
                                    <div>
                                        <label className="text-sm font-medium mb-1 block">Subject</label>
                                        <Select
                                            disabled={!examReady || subjects.length === 0}
                                            value={selectedSubjectIndex !== null ? selectedSubjectIndex.toString() : ""}
                                            onValueChange={val => setSelectedSubjectIndex(val === "" ? null : Number(val))}
                                        >
                                            <SelectTrigger><SelectValue placeholder={!examReady ? "Select exam first..." : "Select subject..."} /></SelectTrigger>
                                            <SelectContent>
                                                {subjects.map((subj, i) => (
                                                    <SelectItem key={i} value={i.toString()}>{subj.name || `Subject ${i + 1}`}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {/* Exam Name — full width on mobile, middle col on md+ */}
                            <div className="md:order-first">
                                <label className="text-sm font-medium mb-1 block">Exam Name</label>
                                <Select
                                    value={selectedExam?._id || ""}
                                    onValueChange={val => {
                                        const exam = allExams.find(e => e._id === val);
                                        if (exam) { loadExam(exam); }
                                        else { setSelectedExam(null); setExamName(""); setSubjects([{ name: "", maxMark: 100, passMark: 40, subColumns: [] }]); setGradingScale([]); setExamReady(false); }
                                    }}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select exam..." /></SelectTrigger>
                                    <SelectContent>
                                        {allExams.map(exam => (
                                            <SelectItem key={exam._id} value={exam._id}>{exam.examName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ) : (
                        // College Admin: mode, batch, class, students, exam name
                        <div className="space-y-3">
                            {/* Row 1: Mode, Batch, Class */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
                                {/* Mode */}
                                <div className="col-span-1">
                                    <label className="text-sm font-medium mb-1 block">Mode</label>
                                    <Select
                                        value="entry"
                                        onValueChange={val => {
                                            if (val === "result") {
                                                setShowResult(true);
                                                setResultExam(null);
                                                setResultType("class-wise");
                                                setSelectedStudentForIndividual("");
                                            }
                                        }}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="entry">Marks Entry</SelectItem>
                                            <SelectItem value="result">Result View</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Batch */}
                                <div className="col-span-1">
                                    <label className="text-sm font-medium mb-1 block">Batch(es)</label>
                                    <MultiSelect
                                        options={batchOptions}
                                        selected={selectedBatches}
                                        onChange={setSelectedBatches}
                                        placeholder="Select batches..."
                                    />
                                </div>

                                {/* Class */}
                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-sm font-medium mb-1 block">Class(es)</label>
                                    <MultiSelect
                                        options={classOptions}
                                        selected={selectedClasses}
                                        onChange={setSelectedClasses}
                                        placeholder="Select classes..."
                                    />
                                </div>
                            </div>

                            {/* Row 2: Students, Exam Name */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                                {/* Students */}
                                <div>
                                    <label className="text-sm font-medium mb-1 block">
                                        Students
                                        {availableStudents.length > 0 && (
                                            <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                                                ({selectedStudentIds.length}/{availableStudents.length})
                                            </span>
                                        )}
                                    </label>
                                    <MultiSelect
                                        options={studentOptions}
                                        selected={selectedStudentIds}
                                        onChange={setSelectedStudentIds}
                                        placeholder={availableStudents.length === 0 ? "Select class/batch..." : "Select students..."}
                                        disabled={availableStudents.length === 0}
                                    />
                                </div>

                                {/* Exam Name */}
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Exam Name</label>
                                    {!selectedExam ? (
                                        <Select
                                            value={isAddingNewExam ? "NEW_EXAM" : ""}
                                            onValueChange={val => {
                                                if (val === "NEW_EXAM") {
                                                    setIsAddingNewExam(true); setSelectedExam(null); setExamName(""); setGradingScale([]); setExamReady(false); setStudents([]); setMarksData({});
                                                    return;
                                                }
                                                const exam = allExams.find(e => e._id === val);
                                                if (exam) { loadExam(exam); }
                                                else { setSelectedExam(null); setIsAddingNewExam(false); setExamName(""); setSubjects([{ name: "", maxMark: 100, passMark: 40, subColumns: [] }]); setGradingScale([]); setExamReady(false); }
                                            }}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select exam..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NEW_EXAM" className="font-semibold text-primary">+ Add New Exam</SelectItem>
                                                {allExams.map(exam => (
                                                    <SelectItem key={exam._id} value={exam._id}>{exam.examName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={examName}
                                                onChange={e => setExamName(e.target.value)}
                                                placeholder="Edit Exam Name"
                                                autoFocus
                                            />
                                            <Button
                                                size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive border border-input bg-background"
                                                onClick={() => { setSelectedExam(null); setExamName(""); setExamReady(false); setStudents([]); setMarksData({}); }}
                                                title="Clear Selection"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                ) : (
                    // Result View Controls: mode, exam name, result type, select student
                    <div className={`grid grid-cols-2 gap-3 items-end ${resultType === "individual" ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
                        {/* Mode */}
                        <div className="col-span-1 order-1 md:order-1">
                            <label className="text-sm font-medium mb-1 block">Mode</label>
                            <Select
                                value="result"
                                onValueChange={val => {
                                    if (val === "entry") {
                                        setShowResult(false);
                                        setResultExam(null);
                                        setResultType("class-wise");
                                        setSelectedStudentForIndividual("");
                                    }
                                }}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="entry">Marks Entry</SelectItem>
                                    <SelectItem value="result">Result View</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Result Type */}
                        <div className="col-span-1 order-2 md:order-3">
                            <label className="text-sm font-medium mb-1 block">Result Type</label>
                            <Select
                                disabled={!resultExam}
                                value={resultExam ? resultType : ""}
                                onValueChange={val => {
                                    setResultType(val);
                                    if (val === "class-wise") setSelectedStudentForIndividual("");
                                }}
                            >
                                <SelectTrigger><SelectValue placeholder="Type..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="class-wise">Class Wise</SelectItem>
                                    <SelectItem value="individual">Individual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Exam Name */}
                        <div className="col-span-2 md:col-span-1 order-3 md:order-2">
                            <label className="text-sm font-medium mb-1 block">Exam Name</label>
                            <Select
                                value={resultExam?._id || ""}
                                onValueChange={val => {
                                    const exam = allExams.find(e => e._id === val);
                                    setResultExam(exam || null);
                                    if (exam && activeRole !== "Teacher") {
                                        setExamName(exam.examName);
                                        setGradingScale(exam.gradingScale || []);
                                    }
                                    setResultType("class-wise");
                                    setSelectedStudentForIndividual("");
                                }}
                            >
                                <SelectTrigger><SelectValue placeholder="Select exam..." /></SelectTrigger>
                                <SelectContent>
                                    {allExams.map(exam => (
                                        <SelectItem key={exam._id} value={exam._id}>{exam.examName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Select Student */}
                        {resultType === "individual" && (
                            <div className="col-span-2 md:col-span-1 order-4 md:order-4">
                                <label className="text-sm font-medium mb-1 block">Select Student</label>
                                <ComboBox
                                    items={resultViewStats.map(st => ({
                                        value: st.studentId,
                                        label: `${st.studentName} (${st.studentId})`
                                    }))}
                                    value={selectedStudentForIndividual}
                                    onSelect={setSelectedStudentForIndividual}
                                    placeholder="Search student..."
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Extras/Secondary line for adding new exam or result configuration */}
                {/* 1. Add New Exam Extra Inputs (College Admin in Mark Entry mode) */}
                {!showResult && activeRole !== "Teacher" && isAddingNewExam && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end border border-dashed rounded-lg p-3 bg-muted/10">
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium mb-1 block">New Exam Name</label>
                            <div className="flex gap-2 items-center">
                                <Input
                                    autoFocus
                                    placeholder="e.g. First Term Exam"
                                    value={examName}
                                    onChange={e => setExamName(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && examName.trim() && handleOpenTable()}
                                />
                                <Button
                                    size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => { setIsAddingNewExam(false); setExamName(""); setSelectedBatches([]); setSelectedClasses([]); setAvailableStudents([]); setSelectedStudentIds([]); }}
                                    title="Cancel"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div>
                            <Button
                                onClick={handleOpenTable}
                                disabled={!examName.trim() || selectedStudentIds.length === 0}
                                className="w-full gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Open Marks Table
                            </Button>
                        </div>
                    </div>
                )}
            </div>



            {/* ── Results View ──────────────────────────────────────────────── */}
            {showResult && (
                <div className="rounded border overflow-x-auto print:overflow-visible">
                    <div className="bg-muted px-4 py-3 flex items-center justify-between print:hidden">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="font-semibold text-sm">Results</span>
                        </div>
                        {resultExam && (
                            <div className="flex gap-2">
                                {activeRole === "College Admin" && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 py-0 border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                        onClick={handleExportToExcel}
                                    >
                                        <FileSpreadsheet className="w-3.5 h-3.5 sm:mr-1.5" />
                                        <span className="hidden sm:inline">Excel</span>
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="h-8 py-0 bg-foreground text-background hover:bg-foreground/90"
                                    onClick={handlePrint}
                                >
                                    <Printer className="w-3.5 h-3.5 sm:mr-1.5" />
                                    <span className="hidden sm:inline">Print</span>
                                </Button>
                                {activeRole !== "Teacher" && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 py-0"
                                        onClick={() => loadExam(resultExam)}
                                    >
                                        <Edit className="w-3.5 h-3.5 sm:mr-1.5" />
                                        <span className="hidden sm:inline">Edit</span>
                                    </Button>
                                )}
                                {activeRole === "College Admin" && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 py-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 sm:mr-1.5" />
                                                <span className="hidden sm:inline">Delete</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the
                                                    exam <strong>{resultExam.examName}</strong> and all its marks.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDeleteExam(resultExam._id)}
                                                    className="bg-red-500 hover:bg-red-600"
                                                >
                                                    Delete Permanent
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        )}
                    </div>
                    {resultExam ? (
                        resultType === "class-wise" ? (
                            <div ref={printRef} className="p-0 sm:p-4 bg-white dark:bg-transparent">
                                {/* PDF/Print Header */}
                                <div className="hidden print:block mb-4">
                                    <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-300">
                                        <div className="flex items-center gap-4">
                                            {institutionData?.logo?.url && (
                                                <img src={institutionData.logo.url} alt="Logo" className="w-16 h-16 object-contain" />
                                            )}
                                            <div>
                                                <h1 className="text-xl font-bold text-gray-900">{institutionData?.name || institutionName || "INSTITUTION"}</h1>
                                                {institutionData?.tagline && <p className="text-sm text-gray-600 italic">{institutionData.tagline}</p>}
                                            </div>
                                        </div>
                                        <div className="text-right text-xs text-gray-600 space-y-0.5">
                                            {institutionData?.address && <p>{institutionData.address}</p>}
                                            {institutionData?.contact?.primaryPhone && <p>Phone: {institutionData.contact.primaryPhone}{institutionData?.contact?.secondaryPhone ? `, ${institutionData.contact.secondaryPhone}` : ""}</p>}
                                            {institutionData?.contact?.email && <p>Email: {institutionData.contact.email}</p>}
                                        </div>
                                    </div>
                                    <div className="bg-black text-white text-center py-1.5">
                                        <h2 className="text-base font-semibold">Result</h2>
                                    </div>
                                    {getExamContextLabel(resultExam) && (
                                        <div className="bg-gray-100 text-center py-1 border-b border-gray-300">
                                            <p className="text-sm font-medium text-gray-700">{getExamContextLabel(resultExam)}</p>
                                        </div>
                                    )}
                                </div>

                                <table className="w-full text-sm border-collapse">
                                    <thead className="bg-muted/60 print:bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-center border font-bold" rowSpan={hasAnySubColsResult ? 2 : 1}>Rank</th>
                                            <th className="p-3 text-left border font-bold w-20" rowSpan={hasAnySubColsResult ? 2 : 1}>Adm. No</th>
                                            <th className="p-3 text-left border font-bold" rowSpan={hasAnySubColsResult ? 2 : 1}>Student</th>
                                            {(resultExam.subjects || []).map((s, i) => {
                                                const scs = s.subColumns || [];
                                                if (scs.length > 0) {
                                                    return (
                                                        <th key={i} colSpan={scs.length + 1} className="p-2 text-center border font-bold bg-muted/30">
                                                            {s.name || `Col ${i + 1}`}
                                                        </th>
                                                    );
                                                }
                                                return (
                                                    <th key={i} rowSpan={hasAnySubColsResult ? 2 : 1} className="p-3 text-center border font-bold">
                                                        {typeof s === "string" ? s : (s.name || `Col ${i + 1}`)}
                                                        {s.maxMark && <div className="text-[10px] font-normal opacity-70">Max: {s.maxMark}</div>}
                                                    </th>
                                                );
                                            })}
                                            <th className="p-3 text-center border font-bold bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-200 print:text-black" rowSpan={hasAnySubColsResult ? 2 : 1}>Total</th>
                                            <th className="p-3 text-center border font-bold bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-200 print:text-black" rowSpan={hasAnySubColsResult ? 2 : 1}>%</th>
                                            <th className="p-3 text-center border font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 print:text-black" rowSpan={hasAnySubColsResult ? 2 : 1}>Remark</th>
                                        </tr>
                                        {hasAnySubColsResult && (
                                            <tr>
                                                {(resultExam.subjects || []).map((s, i) => {
                                                    const scs = s.subColumns || [];
                                                    if (scs.length > 0) {
                                                        return (
                                                            <React.Fragment key={i}>
                                                                {scs.map((sc, j) => (
                                                                    <th key={`${i}-${j}`} className="p-2 text-center border font-bold text-xs">
                                                                        <div>{sc.name}</div>
                                                                        <div className="text-[9px] font-normal opacity-70">({sc.passMark}/{sc.maxMark})</div>
                                                                    </th>
                                                                ))}
                                                                <th key={`${i}-sub`} className="p-2 text-center border font-bold text-xs bg-blue-50/50 dark:bg-blue-950/50 text-foreground">Total</th>
                                                            </React.Fragment>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody>
                                        {resultViewStats.map(stat => (
                                            <tr
                                                key={stat.studentId}
                                                className={`border ${stat.rank === 1
                                                    ? "bg-yellow-50 dark:bg-yellow-950/30"
                                                    : stat.rank === 2
                                                        ? "bg-slate-50 dark:bg-slate-800/30"
                                                        : stat.rank === 3
                                                            ? "bg-orange-50 dark:bg-orange-950/30"
                                                            : "hover:bg-muted/30"
                                                    }`}
                                            >
                                                <td className="p-2 text-center font-bold text-lg border">
                                                    {stat.rank === 1 ? "🥇" : stat.rank === 2 ? "🥈" : stat.rank === 3 ? "🥉" : stat.rank}
                                                </td>
                                                <td className="p-2 font-medium border">{stat.studentId}</td>
                                                <td className="p-2 font-medium border">{stat.studentName}</td>
                                                {(resultExam.subjects || []).map((subj, i) => {
                                                    const subjName = typeof subj === "string" ? subj : subj.name;
                                                    const scs = subj.subColumns || [];
                                                    const markVal = stat.marksMap[subjName];
                                                    if (scs.length > 0) {
                                                        const subjTotal = scs.reduce((sum, sc) => {
                                                            return sum + ((markVal && typeof markVal === "object") ? (Number(markVal[sc.name]) || 0) : 0);
                                                        }, 0);
                                                        return (
                                                            <React.Fragment key={i}>
                                                                {scs.map((sc, j) => {
                                                                    const val = (markVal && typeof markVal === "object") ? markVal[sc.name] : undefined;
                                                                    const isFailed = val !== undefined && val !== "" && Number(val) < (Number(sc.passMark) || 0);
                                                                    return (
                                                                        <td key={`${i}-${j}`} className={`p-2 text-center border ${isFailed ? "text-red-600 font-bold" : ""}`}>
                                                                            {val ?? "-"}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="p-2 text-center font-semibold text-blue-800 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-950/30 border">{subjTotal || "-"}</td>
                                                            </React.Fragment>
                                                        );
                                                    }
                                                    const isFailed = markVal !== undefined && markVal !== null && typeof markVal !== "object" && Number(markVal) < (Number(subj.passMark) || 0);
                                                    return (
                                                        <td key={i} className={`p-2 text-center border ${isFailed ? "text-red-600 font-bold" : ""}`}>
                                                            {typeof markVal === "object" ? "-" : (markVal ?? "-")}
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-2 text-center font-bold border text-blue-700 dark:text-blue-300 print:text-black">{stat.total}</td>
                                                <td className="p-2 text-center font-bold border text-green-700 dark:text-green-300 print:text-black">{stat.percentage}%</td>
                                                <td className={`p-2 text-center font-bold border ${stat.remark === "Pass" ? "text-green-600 print:text-green-700" : stat.remark === "Fail" || stat.remark === "Failed" ? "text-red-600 print:text-red-700" : "text-blue-600 print:text-blue-700"}`}>
                                                    {stat.remark === "Pass" ? "Passed" : stat.remark === "Fail" ? "Failed" : stat.remark}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <style jsx global>{`
                                    @media print {
                                        @page { size: auto; margin: 10mm; }
                                        html, body { width: 100% !important; max-width: 100% !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; }
                                        * { overflow: visible !important; -webkit-overflow-scrolling: auto !important; }
                                        table { width: 100% !important; border-collapse: collapse !important; border-spacing: 0 !important; font-size: 9pt !important; }
                                        th, td { border: 0.5pt solid black !important; padding: 3px 6px !important; line-height: 1.2 !important; background-color: transparent !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; white-space: normal !important; word-break: break-word !important; }
                                        tr { break-inside: avoid; }
                                    }
                                `}</style>
                            </div>
                        ) : (
                            <div ref={printRef} className="p-2 sm:p-8 bg-white dark:bg-transparent flex justify-center">
                                {selectedStudentForIndividual ? (
                                    (() => {
                                        const stat = resultViewStats.find(s => s.studentId === selectedStudentForIndividual);
                                        if (!stat) return <div>Student not found.</div>;

                                        // Collect all unique sub-column names for this exam
                                        const uniqueSubColNames = [];
                                        (resultExam.subjects || []).forEach(subj => {
                                            if (subj.subColumns && subj.subColumns.length > 0) {
                                                subj.subColumns.forEach(sc => {
                                                    if (!uniqueSubColNames.includes(sc.name)) {
                                                        uniqueSubColNames.push(sc.name);
                                                    }
                                                });
                                            }
                                        });

                                        return (
                                            <div className="border-2 border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-8 w-full max-w-3xl shadow-lg bg-white dark:bg-slate-950 relative print-poster">
                                                <div className="text-center mb-6 border-b pb-4">
                                                    <div className="flex items-center justify-center gap-3 mb-2">
                                                        {institutionData?.logo?.url && (
                                                            <img src={institutionData.logo.url} alt="Institution Logo" className="w-10 h-10 sm:w-16 sm:h-16 object-contain shrink-0" />
                                                        )}
                                                        <div className="text-center min-w-0">
                                                            <h2 className="text-base sm:text-2xl font-bold uppercase tracking-wide text-primary leading-tight break-words">
                                                                {institutionData?.name || institutionName || "INSTITUTION"}
                                                            </h2>
                                                            {institutionData?.tagline && (
                                                                <p className="text-xs sm:text-sm text-muted-foreground italic mt-0.5">{institutionData.tagline}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {getExamContextLabel(resultExam) && (
                                                        <p className="text-muted-foreground text-sm sm:text-base">{getExamContextLabel(resultExam)}</p>
                                                    )}
                                                    <p className="text-xs sm:text-sm font-semibold mt-2 bg-muted inline-block px-3 py-1 rounded-full">
                                                        {resultExam.examName}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 sm:gap-6 mb-6 bg-slate-50 dark:bg-slate-900 p-3 sm:p-6 rounded-lg border">
                                                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-muted border-4 border-white dark:border-slate-800 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                                                        {(() => {
                                                            const studentObj = students.find(s => s._id === selectedStudentForIndividual || s._id === stat.studentId);
                                                            const photoUrl = studentObj?.profilePic?.url || studentObj?.photo?.url;
                                                            if (photoUrl) return <img src={photoUrl} alt="Student" className="w-full h-full object-cover" />;
                                                            return <User className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400" />;
                                                        })()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg sm:text-2xl font-bold break-words">{stat.studentName}</h3>
                                                        <div className="text-muted-foreground flex flex-wrap gap-2 sm:gap-4 mt-1 text-sm">
                                                            <span>ID: <strong>{stat.studentId}</strong></span>
                                                            <span>Rank: <strong>{stat.rank}</strong></span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="overflow-x-auto print:overflow-visible -mx-4 sm:mx-0 print:mx-0">
                                                    {uniqueSubColNames.length > 0 ? (
                                                        <table className="w-full text-left mb-6 border-collapse text-sm">
                                                            <thead>
                                                                <tr className="bg-muted/60">
                                                                    <th className="p-3 border font-bold">Subject</th>
                                                                    {uniqueSubColNames.map(name => (
                                                                        <th key={name} className="p-3 border text-center font-bold">{name}</th>
                                                                    ))}
                                                                    <th className="p-3 border text-center font-bold">Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(resultExam.subjects || []).map((subj, i) => {
                                                                    const subjName = typeof subj === "string" ? subj : subj.name;
                                                                    const scs = subj.subColumns || [];
                                                                    const markVal = stat.marksMap[subjName];
                                                                    let subjTotal = 0;
                                                                    let maxMarkTotal = subj.maxMark || 100;
                                                                    let isFailed = false;

                                                                    if (scs.length > 0) {
                                                                        subjTotal = 0;
                                                                        maxMarkTotal = 0;
                                                                        scs.forEach(sc => {
                                                                            const val = (markVal && typeof markVal === "object") ? (Number(markVal[sc.name]) || 0) : 0;
                                                                            subjTotal += val;
                                                                            maxMarkTotal += Number(sc.maxMark) || 0;
                                                                            if (val < (Number(sc.passMark) || 0)) isFailed = true;
                                                                        });
                                                                    } else {
                                                                        subjTotal = Number(markVal) || 0;
                                                                        if (subjTotal < (Number(subj.passMark) || 40)) isFailed = true;
                                                                    }

                                                                    const displayMark = (markVal === undefined || markVal === null) ? "N/A" : subjTotal;

                                                                    return (
                                                                        <tr key={i}>
                                                                            <td className="p-3 border font-medium">{subjName}</td>
                                                                            {uniqueSubColNames.map(name => {
                                                                                let val = "-";
                                                                                let subFailed = false;
                                                                                if (scs.length > 0) {
                                                                                    const sc = scs.find(col => col.name === name);
                                                                                    if (sc) {
                                                                                        const scVal = (markVal && typeof markVal === "object") ? markVal[sc.name] : undefined;
                                                                                        val = scVal !== undefined ? scVal : "-";
                                                                                        if (scVal !== undefined && Number(scVal) < (Number(sc.passMark) || 0)) {
                                                                                            subFailed = true;
                                                                                        }
                                                                                    }
                                                                                }
                                                                                return (
                                                                                    <td key={name} className={`p-3 border text-center ${subFailed ? "text-red-600 font-bold" : ""}`}>
                                                                                        {val}
                                                                                    </td>
                                                                                );
                                                                            })}
                                                                            <td className={`p-3 border text-center font-bold ${isFailed ? "text-red-600" : ""}`}>
                                                                                {displayMark !== "N/A" ? (
                                                                                    <>
                                                                                        <span className="font-semibold">{displayMark}</span>{" "}
                                                                                        <span className="text-xs text-muted-foreground">/ {maxMarkTotal}</span>
                                                                                    </>
                                                                                ) : "-"}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <table className="w-full text-left mb-6 border-collapse text-sm">
                                                            <thead>
                                                                <tr className="bg-muted/60">
                                                                    <th className="p-3 border font-bold">Subject</th>
                                                                    <th className="p-3 border text-center font-bold">Max Mark</th>
                                                                    <th className="p-3 border text-center font-bold">Marks Obtained</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(resultExam.subjects || []).map((subj, i) => {
                                                                    const subjName = typeof subj === "string" ? subj : subj.name;
                                                                    const markVal = stat.marksMap[subjName];
                                                                    const isFailed = markVal !== undefined && markVal !== null && typeof markVal !== "object" && Number(markVal) < (Number(subj.passMark) || 40);
                                                                    return (
                                                                        <tr key={i}>
                                                                            <td className="p-3 border font-medium">{subjName}</td>
                                                                            <td className="p-3 border text-center">{subj.maxMark || 100}</td>
                                                                            <td className={`p-3 border text-center font-bold ${isFailed ? "text-red-600" : ""}`}>
                                                                                {typeof markVal === "object" ? "-" : (markVal ?? "-")}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                 </div>
                                                <div className="flex flex-wrap justify-between items-center border-t-2 border-slate-200 dark:border-slate-800 pt-4 gap-3 text-sm sm:text-base">
                                                    <div>Total: <strong className="text-lg sm:text-2xl">{stat.total}</strong></div>
                                                    <div>Percentage: <strong className="text-lg sm:text-2xl">{stat.percentage}%</strong></div>
                                                    <div className="flex items-center gap-2">
                                                        Remark:
                                                        <span className={`px-3 py-1 rounded text-white font-bold text-sm ${stat.remark === "Pass" ? "bg-green-600" : stat.remark === "Fail" || stat.remark === "Failed" ? "bg-red-600" : "bg-blue-600"}`}>
                                                            {stat.remark === "Pass" ? "Passed" : stat.remark === "Fail" ? "Failed" : stat.remark}
                                                        </span>
                                                    </div>
                                                </div>

                                                <style jsx global>{`
                                                    @media print {
                                                        @page { size: A4 portrait; margin: 10mm; }
                                                        html, body { width: 100% !important; max-width: 100% !important; min-width: 0 !important; height: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; }
                                                        * { overflow: visible !important; -webkit-overflow-scrolling: auto !important; }
                                                        table { width: 100% !important; border-collapse: collapse !important; }
                                                        th, td { border: 0.5pt solid black !important; padding: 4px 6px !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; white-space: normal !important; word-break: break-word !important; }
                                                        .print-poster { width: 100% !important; max-width: 100% !important; height: auto !important; page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; page-break-before: avoid; box-shadow: none !important; border: 2px solid #e2e8f0 !important; margin: 0 !important; padding: 16px !important; }
                                                    }
                                                `}</style>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="py-20 text-center text-muted-foreground w-full">
                                        Please select a student from the dropdown to view their result.
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            Select an exam above to view results.
                        </div>
                    )}
                </div>
            )}

            {/* ── Marks Entry Table ────────────────────────────────────────── */}
            {examReady && !showResult && activeStudents.length === 0 && (
                <div className="p-10 text-center border rounded bg-muted/20 text-muted-foreground mt-4">
                    <p className="font-medium">No students found for this exam.</p>
                </div>
            )}
            {examReady && !showResult && activeStudents.length > 0 && (
                activeRole !== "Teacher" || selectedSubjectIndex !== null ? (
                    <div className="space-y-3">
                        <div className="overflow-x-auto rounded border" ref={printRef}>
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-3 text-center border w-12" rowSpan={hasAnySubCols ? 2 : 1}>Sl No</th>
                                        <th className="p-1 text-left border w-[50px]" rowSpan={hasAnySubCols ? 2 : 1}>Adm. No</th>
                                        <th className="p-1 text-left border min-w-[80px]" rowSpan={hasAnySubCols ? 2 : 1}>Name</th>
                                        {subjects.map((subj, i) => {
                                            if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;
                                            const scs = subj.subColumns || [];
                                            if (scs.length > 0) {
                                                return (
                                                    <th key={i} colSpan={scs.length + 1} className="p-1 text-center border">
                                                        <div className="flex flex-col items-center gap-1 group">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-semibold truncate max-w-[120px]">{subj.name || `Sub ${i + 1}`}</span>
                                                                {activeRole !== "Teacher" && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Edit className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors" onClick={() => openSubjectDialog(i)} />
                                                                        <Trash2 className="w-3 h-3 cursor-pointer text-red-500 hover:text-red-700 transition-colors" onClick={e => { e.stopPropagation(); if (subjects.length <= 1) { toast.error("At least one subject is required."); return; } setSubjectToDeleteIndex(i); }} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </th>
                                                );
                                            }
                                            return (
                                                <th key={i} rowSpan={hasAnySubCols ? 2 : 1} className="p-1 text-center border w-auto">
                                                    <div className="flex flex-col items-center gap-1 group">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-semibold truncate max-w-[80px]">{subj.name || `Sub ${i + 1}`}</span>
                                                            {activeRole !== "Teacher" && (
                                                                <div className="flex items-center gap-1">
                                                                    <Edit className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors" onClick={() => openSubjectDialog(i)} />
                                                                    <Trash2 className="w-3 h-3 cursor-pointer text-red-500 hover:text-red-700 transition-colors" onClick={e => { e.stopPropagation(); if (subjects.length <= 1) { toast.error("At least one subject is required."); return; } setSubjectToDeleteIndex(i); }} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-[9px] text-muted-foreground leading-none">({subj.passMark}/{subj.maxMark})</div>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                        {activeRole !== "Teacher" && (
                                            <th className="p-2 border w-10" rowSpan={hasAnySubCols ? 2 : 1}>
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openSubjectDialog()} title="Add subject column">
                                                    <Plus className="w-4 h-4 text-primary" />
                                                </Button>
                                            </th>
                                        )}
                                        <th className="p-3 text-center border bg-blue-50 dark:bg-blue-950 min-w-[60px]" rowSpan={hasAnySubCols ? 2 : 1}>Total</th>
                                        <th className="p-3 text-center border bg-green-50 dark:bg-green-950 min-w-[60px]" rowSpan={hasAnySubCols ? 2 : 1}>%</th>
                                        <th className="p-3 text-center border bg-yellow-50 dark:bg-yellow-950 min-w-[60px]" rowSpan={hasAnySubCols ? 2 : 1}>Rank</th>
                                        <th
                                            className={`p-3 text-center border bg-slate-50 dark:bg-slate-900 min-w-[70px] ${activeRole !== "Teacher" ? "cursor-pointer hover:bg-slate-100 transition-colors group" : ""}`}
                                            onClick={() => activeRole !== "Teacher" && setIsGradingDialogOpen(true)}
                                            title={activeRole !== "Teacher" ? "Click to change remark settings" : ""}
                                            rowSpan={hasAnySubCols ? 2 : 1}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                Remark
                                                {activeRole !== "Teacher" && <Settings className="w-3 h-3 text-muted-foreground group-hover:text-primary" />}
                                            </div>
                                        </th>
                                    </tr>
                                    {hasAnySubCols && (
                                        <tr>
                                            {subjects.map((subj, i) => {
                                                if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;
                                                const scs = subj.subColumns || [];
                                                if (scs.length > 0) {
                                                    return (
                                                        <React.Fragment key={i}>
                                                            {scs.map((sc, j) => (
                                                                <th key={`${i}-${j}`} className="p-1 text-center border text-xs font-semibold">
                                                                    <div>{sc.name}</div>
                                                                    <div className="text-[9px] text-muted-foreground">({sc.passMark}/{sc.maxMark})</div>
                                                                </th>
                                                            ))}
                                                            <th key={`${i}-sub`} className="p-1 text-center border text-xs font-semibold bg-blue-50/50 dark:bg-blue-950/50 min-w-[50px]">Total</th>
                                                        </React.Fragment>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {activeStudents.map((st, idx) => {
                                        const stat = stats.find(s => s.studentId === st._id);
                                        return (
                                            <tr key={st._id} className="hover:bg-muted/30 border">
                                                <td className="p-2 text-center text-muted-foreground border">{idx + 1}</td>
                                                <td className="p-1 text-muted-foreground truncate max-w-[50px] border">{st._id}</td>
                                                <td className="p-1 font-medium border">{st.name}</td>
                                                {subjects.map((subj, i) => {
                                                    if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;
                                                    const scs = subj.subColumns || [];
                                                    if (scs.length > 0) {
                                                        const markObj = marksData[st._id]?.[i];
                                                        const subjTotal = scs.reduce((sum, _, j) => sum + ((markObj && typeof markObj === "object") ? (Number(markObj[j]) || 0) : 0), 0);
                                                        return (
                                                            <React.Fragment key={i}>
                                                                {scs.map((sc, j) => {
                                                                    const val = (markObj && typeof markObj === "object") ? markObj[j] : undefined;
                                                                    const isFailed = val !== undefined && val !== "" && Number(val) < (Number(sc.passMark) || 0);
                                                                    return (
                                                                        <td key={`${i}-${j}`} className="p-1 text-center border">
                                                                            <Input
                                                                                id={`mark-${idx}-${i}-${j}`}
                                                                                type="number" min={0} max={sc.maxMark || 100}
                                                                                className={`w-14 mx-auto text-center h-7 text-xs ${isFailed ? "text-red-600 font-bold" : ""}`}
                                                                                value={val ?? ""}
                                                                                onChange={e => handleMarkChange(st._id, i, e.target.value, j)}
                                                                                onKeyDown={e => {
                                                                                    if (e.key === "Enter") {
                                                                                        e.preventDefault();
                                                                                        const nextSub = document.getElementById(`mark-${idx}-${i}-${j + 1}`);
                                                                                        if (nextSub) { nextSub.focus(); return; }
                                                                                        const nextSubj = document.getElementById(`mark-${idx}-${i + 1}-0`);
                                                                                        if (nextSubj) { nextSubj.focus(); return; }
                                                                                        const nextSimple = document.getElementById(`mark-${idx}-${i + 1}`);
                                                                                        if (nextSimple) { nextSimple.focus(); return; }
                                                                                        const nextRow = document.getElementById(`mark-${idx + 1}-${i}-0`);
                                                                                        if (nextRow) nextRow.focus();
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="p-2 text-center font-semibold text-blue-700 dark:text-blue-300 border bg-blue-50/30 dark:bg-blue-950/30">
                                                                    {subjTotal || "-"}
                                                                </td>
                                                            </React.Fragment>
                                                        );
                                                    }
                                                    return (() => {
                                                        const val = marksData[st._id]?.[i];
                                                        const isFailed = val !== undefined && val !== "" && Number(val) < (Number(subj.passMark) || 0);
                                                        return (
                                                            <td key={i} className="p-1 text-center border">
                                                                <Input
                                                                    id={`mark-${idx}-${i}`}
                                                                    type="number" min={0} max={subj.maxMark || 100}
                                                                    className={`w-14 mx-auto text-center h-7 text-xs ${isFailed ? "text-red-600 font-bold" : ""}`}
                                                                    value={val ?? ""}
                                                                    onChange={e => handleMarkChange(st._id, i, e.target.value)}
                                                                    onKeyDown={e => {
                                                                        if (e.key === "Enter") {
                                                                            e.preventDefault();
                                                                            if (activeRole === "Teacher" && selectedSubjectIndex !== null) {
                                                                                const nextRow = document.getElementById(`mark-${idx + 1}-${i}`);
                                                                                if (nextRow) nextRow.focus();
                                                                                return;
                                                                            }
                                                                            const nextCol = document.getElementById(`mark-${idx}-${i + 1}`);
                                                                            if (nextCol) { nextCol.focus(); }
                                                                            else { const nextRow = document.getElementById(`mark-${idx + 1}-0`); if (nextRow) nextRow.focus(); }
                                                                        }
                                                                    }}
                                                                />
                                                            </td>
                                                        );
                                                    })();
                                                })}
                                                {activeRole !== "Teacher" && <td className="border" />}
                                                <td className="p-2 text-center font-semibold text-blue-700 dark:text-blue-300 border">{stat?.total ?? 0}</td>
                                                <td className="p-2 text-center font-semibold text-green-700 dark:text-green-300 border">{stat?.percentage ?? 0}%</td>
                                                <td className="p-2 text-center font-semibold text-yellow-700 dark:text-yellow-300 border">{stat?.rank ?? "-"}</td>
                                                <td className={`p-2 text-center font-bold ${stat?.remark === "Pass" ? "text-green-600" : stat?.remark === "Fail" ? "text-red-600" : "text-blue-600"}`}>{stat?.remark ?? "-"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={saveMarks} disabled={savingMarks}>
                                <Save className="w-4 h-4 mr-2" />
                                {savingMarks ? "Saving..." : "Save Marks"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    activeRole === "Teacher" && !showResult && examReady && (
                        <div className="p-10 text-center border rounded border-dashed bg-muted/20 text-muted-foreground mt-4">
                            <p className="font-medium">Please select a subject to start entering marks.</p>
                            <p className="text-xs">Subject dropdown is available at the top.</p>
                        </div>
                    )
                )
            )}

            {/* ── Subject Dialog ───────────────────────────────────────────── */}
            <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>{editingSubjectIndex !== null ? "Edit Subject" : "Add New Subject"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Subject Name</label>
                            <Input
                                placeholder="e.g. Mathematics"
                                value={subjectForm.name}
                                onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Sub Columns <span className="text-xs text-muted-foreground font-normal">(e.g. CE, TE)</span></label>
                                <Button
                                    type="button" variant="outline" size="sm" className="h-7 text-xs"
                                    onClick={() => setSubjectForm(prev => ({ ...prev, subColumns: [...(prev.subColumns || []), { name: "", maxMark: 50, passMark: 20 }] }))}
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Add
                                </Button>
                            </div>
                            {(subjectForm.subColumns || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground">No sub-columns — single mark input per subject.</p>
                            ) : (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-[1fr_52px_52px_32px] gap-1 text-[10px] text-muted-foreground font-medium px-1">
                                        <span>Name</span><span className="text-center">Max</span><span className="text-center">Pass</span><span />
                                    </div>
                                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                                        {(subjectForm.subColumns || []).map((sc, j) => (
                                            <div key={j} className="grid grid-cols-[1fr_52px_52px_32px] gap-1 items-center">
                                                <Input placeholder="CE" className="h-8 text-xs" value={sc.name}
                                                    onChange={e => { const u = [...(subjectForm.subColumns || [])]; u[j] = { ...u[j], name: e.target.value.toUpperCase() }; setSubjectForm(p => ({ ...p, subColumns: u })); }}
                                                />
                                                <Input type="number" placeholder="Max" className="h-8 text-xs text-center" value={sc.maxMark}
                                                    onChange={e => { const u = [...(subjectForm.subColumns || [])]; u[j] = { ...u[j], maxMark: Number(e.target.value) }; setSubjectForm(p => ({ ...p, subColumns: u })); }}
                                                />
                                                <Input type="number" placeholder="Pass" className="h-8 text-xs text-center" value={sc.passMark}
                                                    onChange={e => { const u = [...(subjectForm.subColumns || [])]; u[j] = { ...u[j], passMark: Number(e.target.value) }; setSubjectForm(p => ({ ...p, subColumns: u })); }}
                                                />
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600"
                                                    onClick={() => { const u = (subjectForm.subColumns || []).filter((_, k) => k !== j); setSubjectForm(p => ({ ...p, subColumns: u })); }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-xs text-muted-foreground border-t pt-1.5 flex gap-4">
                                        <span>Auto Max: <strong>{(subjectForm.subColumns || []).reduce((s, sc) => s + (Number(sc.maxMark) || 0), 0)}</strong></span>
                                        <span>Auto Pass: <strong>{(subjectForm.subColumns || []).reduce((s, sc) => s + (Number(sc.passMark) || 0), 0)}</strong></span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {(subjectForm.subColumns || []).length === 0 && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Maximum Mark</label>
                                    <Input type="number" value={subjectForm.maxMark} onChange={e => setSubjectForm({ ...subjectForm, maxMark: Number(e.target.value) })} />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Pass Mark</label>
                                    <Input type="number" value={subjectForm.passMark} onChange={e => setSubjectForm({ ...subjectForm, passMark: Number(e.target.value) })} />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="flex justify-between items-center sm:justify-between">
                        {editingSubjectIndex !== null && subjects.length > 1 ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to delete <strong>{subjectForm.name}</strong>?
                                            All marks for this subject will be permanently removed.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => { setIsSubjectDialogOpen(false); confirmRemoveSubject(); }}
                                            className="bg-red-500 hover:bg-red-600"
                                        >
                                            Confirm Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : <div />}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsSubjectDialogOpen(false)}>Cancel</Button>
                            <Button onClick={saveSubject}>Save Subject</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Grading Scale Dialog ─────────────────────────────────────── */}
            <Dialog open={isGradingDialogOpen} onOpenChange={setIsGradingDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Remarks Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {gradingScale.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <Input
                                        type="number" className="w-16 h-8 text-xs" placeholder="Min" value={item.min}
                                        onChange={e => { const updated = [...gradingScale]; updated[idx].min = Number(e.target.value); setGradingScale(updated); }}
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <Input
                                        type="number" className="w-16 h-8 text-xs" placeholder="Max" value={item.max}
                                        onChange={e => { const updated = [...gradingScale]; updated[idx].max = Number(e.target.value); setGradingScale(updated); }}
                                    />
                                    <Input
                                        className="flex-1 h-8 text-xs" placeholder="Remark (e.g. Good)" value={item.remark}
                                        onChange={e => { const updated = [...gradingScale]; updated[idx].remark = e.target.value; setGradingScale(updated); }}
                                    />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400"
                                        onClick={() => setGradingScale(prev => prev.filter((_, i) => i !== idx))}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button
                            variant="outline" size="sm" className="w-full h-8 border-dashed"
                            onClick={() => setGradingScale(prev => [...prev, { min: 0, max: 100, remark: "" }])}
                        >
                            <Plus className="w-3 h-3 mr-2" />
                            Add Range
                        </Button>
                    </div>
                    <DialogFooter>
                        {activeRole !== "Teacher" && (selectedExam || resultExam) && (
                            <Button className="w-full" onClick={saveSettings} disabled={savingMarks}>
                                <Save className="w-3.5 h-3.5 mr-2" />
                                {savingMarks ? "Saving..." : "Save Settings"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Global Subject Delete Confirmation ──────────────────────── */}
            <AlertDialog
                open={subjectToDeleteIndex !== null}
                onOpenChange={open => !open && setSubjectToDeleteIndex(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{subjects[subjectToDeleteIndex]?.name || "this subject"}</strong>?
                            This will clear all marks entered for this subject.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSubjectToDeleteIndex(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemoveSubject} className="bg-red-500 hover:bg-red-600">
                            Delete Column
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
