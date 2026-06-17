const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/MarksManager.jsx');
let content = fs.readFileSync(file, 'utf8');

const search = `    useEffect(() => {
        Promise.all([
            fetch("/api/classes").then((r) => r.json()),
            fetch("/api/batches").then((r) => r.json())
        ]).then(([classesData, batchesData]) => {
            setClasses(classesData.classes || []);
            setBatches(batchesData.batches || []);
        }).catch(err => console.error("Failed to fetch initial data", err));
    }, []);`;

const replace = `    useEffect(() => {
        const headers = { "api-key": Cookies.get("api-key") || "" };
        Promise.all([
            fetch("/api/classes", { headers }).then((r) => r.json()),
            fetch("/api/batches", { headers }).then((r) => r.json())
        ]).then(([classesData, batchesData]) => {
            setClasses(classesData.classes || []);
            setBatches(batchesData.batches || []);
        }).catch(err => console.error("Failed to fetch initial data", err));
    }, []);`;

if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(file, content);
    console.log("Updated useEffect with API key headers!");
} else {
    console.log("Could not find useEffect block to update!");
}
