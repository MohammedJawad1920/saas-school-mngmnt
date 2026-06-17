const mockClasses = [
  { _id: "10TH-STD", name: "10th Std" },
  { _id: "8TH-STD", name: "8th Std" },
  { _id: "9TH-STD", name: "9th Std" },
  { _id: "PLUS-ONE-A", name: "Plus One A" },
  { _id: "DEGREE-FIRST-YEAR", name: "Degree First Year" }
];

const sorted = [...mockClasses].sort((a, b) =>
  String(a._id || "").localeCompare(String(b._id || ""), undefined, {
    numeric: true,
  })
);

console.log("Original:", mockClasses.map(c => c._id));
console.log("Sorted:", sorted.map(c => c._id));
