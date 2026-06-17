
import { formatOptions } from "@/lib/utils";

export const getStudentFormFields = (batches, classes, lastStudentId) => [
    // Personal Details Section
    {
        section: "Personal Details",
        name: "profilePic",
        label: "Add Profile",
        type: "object",
        inputType: "image",
        placeholder: "Profile Pic",
        defaultValue: {},
        className: "md:col-span-2",
        maxFileSize: 2 * 1024 * 1024, // 2MB in bytes
    },
    {
        section: "Personal Details",
        name: "_id",
        label: "Student ID",
        type: "text",
        placeholder: `Last Student ID : ${lastStudentId || 'None'}`,
        required: true,
        validators: {
            pattern: "^[A-Z0-9-]+$",
            patternMessage:
                "Student ID can only contain letters, numbers, and hyphens",
        },
        hideOnEdit: true,
    },
    {
        section: "Personal Details",
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Student name",
        required: true,
        validators: {
            minLength: 3,
            minLengthMessage: "Name must be at least 3 characters long",
        },
    },
    {
        section: "Personal Details",
        name: "dateOfBirth",
        label: "Date Of Birth",
        type: "date",
        placeholder: "Date Of Birth",
        required: true,
        validators: {
            maxDate: new Date().toISOString().split("T")[0],
            maxDateMessage: "Date of birth cannot be in the future",
        },
    },
    {
        section: "Personal Details",
        name: "bloodGroup",
        label: "Blood Group",
        type: "text",
        inputType: "select",
        options: [
            { label: "A+", value: "A+" },
            { label: "A-", value: "A-" },
            { label: "B+", value: "B+" },
            { label: "B-", value: "B-" },
            { label: "O+", value: "O+" },
            { label: "O-", value: "O-" },
            { label: "AB+", value: "AB+" },
            { label: "AB-", value: "AB-" },
        ],
    },
    {
        section: "Personal Details",
        name: "aadharNo",
        label: "Aadhar Number",
        type: "text",
        placeholder: "Aadhar Number",
        validators: {
            pattern: "^[0-9]{12}$",
            patternMessage: "Invalid Aadhar number format",
        },
    },
    {
        section: "Personal Details",
        name: "roles",
        label: "Roles",
        type: "text",
        inputType: "multiSelect",
        defaultValue: ["Student"],
        required: true,
        options: [
            { label: "Student", value: "Student" },
            { label: "Literary Leader", value: "Literary Leader" },
            { label: "Librarian", value: "Librarian" },
            { label: "Program Committee", value: "Program Committee" },
            { label: "Program Leader", value: "Program Leader" },
            { label: "Spark Admin", value: "Spark Admin" },
            { label: "Org Admin", value: "Org Admin" },
        ],
        validators: {
            minLength: 1,
            minLengthMessage: "Please select at least one role",
        },
    },

    // Contact Details Section
    {
        section: "Contact Details",
        name: "email",
        label: "Email",
        type: "email",
        placeholder: "abcd@gmaill.com",
    },
    {
        section: "Contact Details",
        name: "contactNumber",
        label: "Contact Number",
        type: "text",
        placeholder: "Contact Number",
        required: true,
        validators: {
            pattern: "^(\\+?\\d{1,3}[-.\\s]?)?\\d{10,15}$",
            patternMessage: "Invalid contact number format",
        },
    },
    {
        section: "Contact Details",
        name: "alternativeNumber",
        label: "Alternative Number",
        type: "text",
        placeholder: "Alternative Number",
        validators: {
            pattern: "^(\\+?\\d{1,3}[-.\\s]?)?\\d{10,15}$",
            patternMessage: "Invalid contact number format",
        },
    },

    {
        section: "Contact Details",
        name: "guardianName",
        label: "Guardian Name",
        type: "text",
        placeholder: "Guardian Name",
        required: true,
        validators: {
            minLength: 3,
            minLengthMessage: "Guardian name must be at least 3 characters long",
        },
    },
    {
        section: "Contact Details",
        name: "relationship",
        label: "Guardian Relationship",
        type: "text",
        placeholder: "Guardian Relationship",
        required: true,
        validators: {
            minLength: 3,
            minLengthMessage:
                "Guardian relationship must be at least 3 characters long",
        },
    },
    {
        section: "Contact Details",
        name: "guardianContactNumber",
        label: "Guardian Contact Number",
        type: "text",
        placeholder: "Guardian Contact Number",
        required: true,
        validators: {
            pattern: "^(\\+?\\d{1,3}[-.\\s]?)?\\d{10,15}$",
            patternMessage: "Invalid contact number format",
        },
    },
    {
        section: "Contact Details",
        name: "guardianAlternativeNumber",
        label: "Guardian Alternative Number",
        type: "text",
        placeholder: "Guardian Alternative Number",
        validators: {
            pattern: "^(\\+?\\d{1,3}[-.\\s]?)?\\d{10,15}$",
            patternMessage: "Invalid alternative number format",
        },
    },

    // Address Details Section
    {
        section: "Address Details",
        name: "houseName",
        label: "House Name",
        type: "text",
        placeholder: "House Name",
    },
    {
        section: "Address Details",
        name: "place",
        label: "Place",
        type: "text",
        placeholder: "Place",
        required: true,
    },
    {
        section: "Address Details",
        name: "locationPoint",
        label: "Location Point",
        type: "text",
        placeholder: "Location Point",
    },
    {
        section: "Address Details",
        name: "postOffice",
        label: "Post Office",
        type: "text",
        placeholder: "Post Office",
    },
    {
        section: "Address Details",
        name: "district",
        label: "District",
        type: "text",
        placeholder: "District",
        required: true,
    },
    {
        section: "Address Details",
        name: "state",
        label: "State",
        type: "text",
        placeholder: "State",
        required: true,
    },
    {
        section: "Address Details",
        name: "pin",
        label: "Pin Code",
        type: "text",
        placeholder: "Pin Code",
        validators: {
            pattern: "^\\d{6}$",
            patternMessage: "Pin Code must be a 6-digit number",
        },
    },

    // Academic Details Section
    {
        section: "Academic Details",
        name: "batchId",
        label: "Assign Batch",
        type: "text",
        inputType: "select",
        options: formatOptions(
            [...(batches || [])].sort((a, b) => {
                const yearA = a.startYear || a.endYear || 0;
                const yearB = b.startYear || b.endYear || 0;
                if (yearA !== yearB) return yearB - yearA;
                return (b.name || "").localeCompare(a.name || "");
            })
        ),
        validators: {
            minLength: 1,
            minLengthMessage: "Please select at least one batch",
        },
        required: true,
    },
    {
        section: "Academic Details",
        name: "classId",
        label: "Assign Class",
        type: "text",
        inputType: "select",
        options: formatOptions((classes || []).filter(cls => cls.status !== "Closed")),
        validators: {
            minLength: 1,
            minLengthMessage: "Please select at least one class",
        },
    },
    {
        section: "Academic Details",
        name: "stream",
        label: "Stream (Optional)",
        type: "text",
        inputType: "select",
        freeSolo: true,
        options: [
            { label: "Science", value: "Science" },
            { label: "Commerce", value: "Commerce" },
            { label: "Humanities", value: "Humanities" },
            { label: "B.Com", value: "B.Com" },
            { label: "B.A Arabic", value: "B.A Arabic" }
        ],
        placeholder: "Select or type stream...",
    },
    {
        section: "Academic Details",
        name: "subjectTypeAssignments",
        label: "Subject Type Assignments",
        inputType: "multiSelect",
        options: classes.flatMap(cls => [
            { label: `${cls.name} CORE`, value: `${cls._id}:CORE` },
            { label: `${cls.name} MAJOR`, value: `${cls._id}:MAJOR` }
        ]),
        defaultValue: [], 
        autoSelectFrom: "classId",
    },

    {
        section: "Academic Details",
        name: "admissionClassId",
        label: "Admission Class",
        type: "text",
        inputType: "select",
        options: formatOptions(classes),
        validators: {
            minLength: 1,
            minLengthMessage: "Please select at least one class",
        },
    },
    {
        section: "Academic Details",
        name: "admissionDate",
        label: "Admission Date",
        type: "date",
        placeholder: "Admission Date",
        validators: {
            maxDate: new Date().toISOString().split("T")[0],
            maxDateMessage: "Admission date cannot be in the future",
        },
    },
    {
        section: "Academic Details",
        name: "status",
        label: "Status",
        type: "text",
        inputType: "select",
        defaultValue: "Active",
        required: true,
        options: [
            { label: "Active", value: "Active" },
            { label: "Graduated", value: "Graduated" },
            { label: "Dropped Out", value: "Dropped Out" },
        ],
    },
    {
        section: "Academic Details",
        name: "droppedOutDate",
        label: "Dropped Out Date",
        type: "date",
        placeholder: "Dropped Out Date",
        validators: {
            maxDate: new Date().toISOString().split("T")[0],
            maxDateMessage: "Dropped out date cannot be in the future",
        },
        conditionalRender: {
            dependentField: "status",
            expectedValue: "Dropped Out",
        },
    },
    {
        section: "Academic Details",
        name: "droppedOutClass",
        label: "Dropped Out Class",
        type: "array",
        inputType: "select",
        options: formatOptions(classes),
        validators: {
            minLength: 1,
            minLengthMessage: "Please select at least one class",
        },
        conditionalRender: {
            dependentField: "status",
            expectedValue: "Dropped Out",
        },
    },
    {
        section: "Academic Details",
        name: "droppedOutReason",
        label: "Dropped Out Reason",
        type: "text",
        placeholder: "Dropped Out Reason",
        validators: {
            minLength: 3,
            minLengthMessage:
                "Dropped out reason must be at least 3 characters long",
        },
        conditionalRender: {
            dependentField: "status",
            expectedValue: "Dropped Out",
        },
    },
    {
        section: "Academic Details",
        name: "graduatedYear",
        label: "Graduated Year",
        type: "number",
        placeholder: "Graduated Year",
        validators: {
            pattern: "^\\d{4}$",
            patternMessage: "Graduation year must be a 4-digit number",
            max: new Date().getFullYear(),
            maxMessage: "Graduation year cannot be in the future",
            min: 2000,
            minMessage: "Graduation year must be at least 2000",
        },
        conditionalRender: {
            dependentField: "status",
            expectedValue: "Graduated",
        },
    },
    {
        section: "Academic Details",
        name: "islamicQualification",
        label: "Islamic Qualification",
        type: "text",
        placeholder: "Islamic Qualification",
        conditionalRender: {
            dependentField: "status",
            expectedValue: "Graduated",
        },
    },
    {
        section: "Academic Details",
        name: "academicQualification",
        label: "Academic Qualification",
        type: "text",
        placeholder: "Academic Qualification",
        conditionalRender: {
            dependentField: "status",
            expectedValue: "Graduated",
        },
    },
];
