const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/MarksManager.jsx');
let content = fs.readFileSync(file, 'utf8');

const searchRegex = /const \[subjectToDeleteIndex, setSubjectToDeleteIndex\] = useState\(null\);[\s\S]*?\.then\(\(r\) => r\.json\(\)\)\s*\.then\(\(d\) => \{\s*const s = d\.users \|\| \[\];/;

const restore = `const [subjectToDeleteIndex, setSubjectToDeleteIndex] = useState(null);

    const [gradingScale, setGradingScale] = useState([]);
    const [isGradingDialogOpen, setIsGradingDialogOpen] = useState(false);

    const printRef = useRef(null);
    const activeRole = Cookies.get("active-role");

    useEffect(() => {
        const headers = { "api-key": Cookies.get("api-key") || "" };
        Promise.all([
            fetch("/api/classes", { headers }).then((r) => r.json()),
            fetch("/api/batches", { headers }).then((r) => r.json())
        ]).then(([classesData, batchesData]) => {
            setClasses(classesData.classes || []);
            setBatches(batchesData.batches || []);
        }).catch(err => console.error("Failed to fetch initial data", err));
    }, []);

    useEffect(() => {
        if (!selectedClass) return;
        fetch(\`/api/users?roles=Student&classId=\${selectedClass}&status=Active\`)
            .then((r) => r.json())
            .then((d) => {
                const s = d.users || [];`;

if (searchRegex.test(content)) {
    content = content.replace(searchRegex, restore);
    fs.writeFileSync(file, content);
    console.log("Restored properly!");
} else {
    console.log("Could not find broken chunk!");
}
