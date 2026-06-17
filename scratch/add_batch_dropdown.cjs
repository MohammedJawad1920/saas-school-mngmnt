const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/MarksManager.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add Batches state
content = content.replace(
    'const [classes, setClasses] = useState([]);',
    `const [batches, setBatches] = useState([]);\n    const [selectedBatch, setSelectedBatch] = useState("");\n    const [classes, setClasses] = useState([]);`
);

// 2. Update useEffect to fetch batches and classes
const oldUseEffect = `    useEffect(() => {
        fetch("/api/classes")
            .then((r) => r.json())
            .then((d) => setClasses(d.classes || []));
    }, []);`;

const newUseEffect = `    useEffect(() => {
        Promise.all([
            fetch("/api/classes").then((r) => r.json()),
            fetch("/api/batches").then((r) => r.json())
        ]).then(([classesData, batchesData]) => {
            setClasses(classesData.classes || []);
            setBatches(batchesData.batches || []);
        }).catch(err => console.error("Failed to fetch initial data", err));
    }, []);`;

content = content.replace(oldUseEffect, newUseEffect);

// 3. Add filteredClasses logic before return
const filteredClassesLogic = `
    const filteredClasses = selectedBatch
        ? classes.filter(c => {
            const bId = c.batchId && typeof c.batchId === 'object' ? c.batchId._id : c.batchId;
            return bId === selectedBatch;
          })
        : classes;
`;

content = content.replace(
    'const resultViewStats = computeResultStats(resultExam);',
    `const resultViewStats = computeResultStats(resultExam);\n${filteredClassesLogic}`
);

// 4. Replace Select Class with Batch + Class Selects
const selectClassRegex = /\{\/\* Select Class \*\/\}\s*<div className="flex-1 sm:w-48">\s*<label className="text-sm font-medium mb-1 block">Select Class<\/label>\s*<Select\s*onValueChange=\{\(val\) => \{\s*setSelectedClass\(val\);\s*const cls = classes\.find\(\(c\) => c\._id === val\);\s*setSelectedClassName\(cls\?\.name \|\| ""\);\s*\}\}\s*>\s*<SelectTrigger>\s*<SelectValue placeholder="Choose class\.\.\." \/>\s*<\/SelectTrigger>\s*<SelectContent>\s*\{classes\.map\(\(cls\) => \(\s*<SelectItem key=\{cls\._id\} value=\{cls\._id\}>\s*\{cls\.name\}\s*<\/SelectItem>\s*\)\)\}\s*<\/SelectContent>\s*<\/Select>/;

const newSelectBlock = `{/* Select Batch */}
                    <div className="flex-1 sm:w-40">
                        <label className="text-sm font-medium mb-1 block">Select Batch</label>
                        <Select
                            value={selectedBatch || "none"}
                            onValueChange={(val) => {
                                setSelectedBatch(val === "none" ? "" : val);
                                setSelectedClass(""); // reset class when batch changes
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Batch" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">All/No Batch</SelectItem>
                                {batches.map(b => (
                                    <SelectItem key={b._id} value={b._id}>
                                        {b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Select Class */}
                    <div className="flex-1 sm:w-48">
                        <label className="text-sm font-medium mb-1 block">Select Class</label>
                        <Select
                            value={selectedClass || undefined}
                            onValueChange={(val) => {
                                setSelectedClass(val);
                                const cls = classes.find((c) => c._id === val);
                                setSelectedClassName(cls?.name || "");
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose class..." />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredClasses.map((cls) => (
                                    <SelectItem key={cls._id} value={cls._id}>
                                        {cls.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>`;

if (selectClassRegex.test(content)) {
    content = content.replace(selectClassRegex, newSelectBlock);
    fs.writeFileSync(file, content);
    console.log("Successfully added batch dropdown logic");
} else {
    console.log("Failed to find select class regex");
    // Fallback: Using indexOf and substring if regex fails
    const startStr = '{/* Select Class */}';
    const endStr = '</Select>';
    const startIndex = content.indexOf(startStr, content.indexOf('{/* Mode */}')); // make sure we find the right one
    if (startIndex !== -1) {
        let endIndex = content.indexOf(endStr, startIndex);
        if (endIndex !== -1) {
            endIndex += endStr.length;
            const originalBlock = content.substring(startIndex, endIndex);
            content = content.replace(originalBlock, newSelectBlock);
            fs.writeFileSync(file, content);
            console.log("Successfully added batch dropdown logic via fallback!");
        }
    } else {
        console.log("Fallback failed too.");
    }
}
