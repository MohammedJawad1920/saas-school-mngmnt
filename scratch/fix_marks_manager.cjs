const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/MarksManager.jsx');
let content = fs.readFileSync(file, 'utf8');

// The file currently jumps from `const [subjectToDeleteIndex, setSubjectToDeleteIndex] = useState(null);`
// straight to:
//             .then((r) => r.json())
//             .then((d) => {
//                 const s = d.users || [];

// I need to find `const [subjectToDeleteIndex, setSubjectToDeleteIndex] = useState(null);`
// and replace up to `.then((r) => r.json())` with the proper restored block.

const searchString = `    const [subjectToDeleteIndex, setSubjectToDeleteIndex] = useState(null);

            .then((r) => r.json())
            .then((d) => {
                const s = d.users || [];`;

const restoreString = `    const [subjectToDeleteIndex, setSubjectToDeleteIndex] = useState(null);

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

if (content.includes(searchString)) {
    content = content.replace(searchString, restoreString);
    fs.writeFileSync(file, content);
    console.log("File restored successfully with correct useEffect!");
} else {
    // try regex
    const regex = /const \[subjectToDeleteIndex, setSubjectToDeleteIndex\] = useState\(null\);[\s\S]*?\.then\(\(r\) => r\.json\(\)\)\s*\.then\(\(d\) => \{\s*const s = d\.users \|\| \[\];/;
    if (regex.test(content)) {
        content = content.replace(regex, restoreString);
        fs.writeFileSync(file, content);
        console.log("File restored using regex!");
    } else {
        console.log("Could not find block to restore.");
    }
}
