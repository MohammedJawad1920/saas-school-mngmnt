const fs = require('fs');
const path = require('path');

// 1. Fix MarksManager.jsx
const marksFile = path.join(__dirname, '../components/MarksManager.jsx');
let marksContent = fs.readFileSync(marksFile, 'utf8');

// Fix API key headers
const marksUseEffectRegex = /useEffect\(\(\) => \{\s*fetch\("\/api\/classes"\)\s*\.then\(\(r\) => r\.json\(\)\)\s*\.then\(\(d\) => setClasses\(d\.classes \|\| \[\]\)\);\s*\}, \[\]\);/;

const marksNewUseEffect = `useEffect(() => {
        const headers = { "api-key": Cookies.get("api-key") || "" };
        Promise.all([
            fetch("/api/classes", { headers }).then((r) => r.json()),
            fetch("/api/batches", { headers }).then((r) => r.json())
        ]).then(([classesData, batchesData]) => {
            setClasses(classesData.classes || []);
            setBatches(batchesData.batches || []);
        }).catch(err => console.error("Failed to fetch initial data", err));
    }, []);`;

if (marksUseEffectRegex.test(marksContent)) {
    marksContent = marksContent.replace(marksUseEffectRegex, marksNewUseEffect);
} else {
    // If add_batch_dropdown.cjs already updated it
    const oldPromiseAll = `useEffect(() => {
        Promise.all([
            fetch("/api/classes").then((r) => r.json()),
            fetch("/api/batches").then((r) => r.json())
        ]).then(([classesData, batchesData]) => {
            setClasses(classesData.classes || []);
            setBatches(batchesData.batches || []);
        }).catch(err => console.error("Failed to fetch initial data", err));
    }, []);`;
    marksContent = marksContent.replace(oldPromiseAll, marksNewUseEffect);
}

// Add All/No Class and use filteredClasses if not already done
const marksClassSelectRegex = /<Select\s*value=\{selectedClass \|\| undefined\}\s*onValueChange=\{\(val\) => \{\s*setSelectedClass\(val\);\s*const cls = classes\.find\(\(c\) => c\._id === val\);\s*setSelectedClassName\(cls\?\.name \|\| ""\);\s*\}\}\s*>\s*<SelectTrigger>\s*<SelectValue placeholder="Choose class\.\.\." \/>\s*<\/SelectTrigger>\s*<SelectContent>\s*\{filteredClasses\.map\(\(cls\) => \(\s*<SelectItem key=\{cls\._id\} value=\{cls\._id\}>\s*\{cls\.name\}\s*<\/SelectItem>\s*\)\)\}\s*<\/SelectContent>\s*<\/Select>/;

const marksNewClassSelect = `<Select
                            value={selectedClass || "none"}
                            onValueChange={(val) => {
                                const targetClass = val === "none" ? "" : val;
                                setSelectedClass(targetClass);
                                const cls = classes.find((c) => c._id === targetClass);
                                setSelectedClassName(cls?.name || "");
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose class..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">All/No Class</SelectItem>
                                {filteredClasses.map((cls) => (
                                    <SelectItem key={cls._id} value={cls._id}>
                                        {cls.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>`;

if (marksClassSelectRegex.test(marksContent)) {
    marksContent = marksContent.replace(marksClassSelectRegex, marksNewClassSelect);
}

fs.writeFileSync(marksFile, marksContent);
console.log("MarksManager fixed!");

// 2. Fix AttendanceSheet.jsx
const attendanceFile = path.join(__dirname, '../components/AttendanceSheet.jsx');
let attendanceContent = fs.readFileSync(attendanceFile, 'utf8');

const attClassSelectRegex = /<SelectContent>\s*<SelectItem value="none">All\/No Class<\/SelectItem>\s*\{classes\.map\(c => <SelectItem key=\{c\._id\} value=\{c\._id\}>\{c\.name\}<\/SelectItem>\)\}\s*<\/SelectContent>/;

const attNewClassSelect = `<SelectContent>
                        <SelectItem value="none">All/No Class</SelectItem>
                        {filteredClasses.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                    </SelectContent>`;

if (attClassSelectRegex.test(attendanceContent)) {
    attendanceContent = attendanceContent.replace(attClassSelectRegex, attNewClassSelect);
    fs.writeFileSync(attendanceFile, attendanceContent);
    console.log("AttendanceSheet fixed!");
} else {
    console.log("Could not find class select in AttendanceSheet!");
}
