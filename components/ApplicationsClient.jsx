"use client";

import React, { useState, useCallback, useMemo } from "react";
import DataTableComponent from "@/components/DataTableComponent";
import PopupForm from "@/components/PopupForm";
import { getStudentFormFields } from "@/lib/studentFormConfig";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const columnsConfig = [
  {
    id: "select",
    header: "Select",
    type: ["checkbox"],
    width: 50,
    maxWidth: 50,
    minWidth: 50,
  },
  {
    accessorKey: "serialNo",
    header: "Sl.No",
    type: ["serialNo"],
    width: 60,
    maxWidth: 60,
    minWidth: 60,
  },
  { 
    accessorKey: "name", 
    header: "Name",
    type: ["clickableApprovedName"]
  },
  {
    accessorKey: "createdAt",
    header: "Application Date",
    type: ["date"],
  },
  { 
    accessorKey: "status", 
    header: "Status", 
    type: ["badge", "clickableBadge"] 
  },
  {
    accessorKey: "decisionDate",
    header: "Status Date",
    type: ["date", "decisionDate"],
  },
];

const statusMessages = {
  create: "Application submitted successfully!",
  edit: "Application Updated successfully!",
  delete: "Application deleted successfully!",
};

export default function ApplicationsClient({ batches, classes, apiKey, lastStudentId }) {
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [preadmittedData, setPreadmittedData] = useState(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  const filterConfig = useMemo(() => [
    { id: "name", label: "Name" },
    {
      id: "status",
      label: "Status",
      inputType: "select",
      options: [
        { label: "Pending", value: "Pending" },
        { label: "Approved", value: "Approved" },
        { label: "Rejected", value: "Rejected" },
        { label: "Admitted", value: "Admitted" },
      ],
    },
  ], []);

  const formFields = useMemo(() => [
    {
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
      name: "name",
      label: "Name",
      type: "text",
      placeholder: "Applicant name",
      required: true,
      validators: {
        minLength: 3,
        minLengthMessage: "Name must be at least 3 characters long",
      },
    },
    {
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
      name: "aadharNumber",
      label: "Aadhar Number",
      type: "text",
      placeholder: "12-digit Aadhar Number",
      validators: {
        pattern: "^\\d{12}$",
        patternMessage: "Aadhar Number must be exactly 12 digits",
      },
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      placeholder: "Email address",
    },
    {
      name: "bloodGroup",
      label: "Blood Group",
      inputType: "select",
      placeholder: "Select Blood Group",
      options: [
        { label: "A+", value: "A+" },
        { label: "A-", value: "A-" },
        { label: "B+", value: "B+" },
        { label: "B-", value: "B-" },
        { label: "AB+", value: "AB+" },
        { label: "AB-", value: "AB-" },
        { label: "O+", value: "O+" },
        { label: "O-", value: "O-" },
      ],
    },
    {
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
      name: "guardianContactNumber",
      label: "Contact Number",
      type: "text",
      placeholder: "Contact Number",
      required: true,
      validators: {
        pattern: "^(\\+?\\d{1,3}[-.\\s]?)?\\d{10}$",
        patternMessage: "Invalid contact number format",
      },
    },
    {
      name: "guardianAlternativeNumber",
      label: "Alternative Number",
      type: "text",
      placeholder: "Alternative Number",
      validators: {
        pattern: "^(\\+?\\d{1,3}[-.\\s]?)?\\d{10}$",
        patternMessage: "Invalid alternative number format",
      },
    },

    // Address Details Section
    {
      name: "houseName",
      label: "House Name",
      type: "text",
      placeholder: "House Name",
    },
    {
      name: "place",
      label: "Place",
      type: "text",
      placeholder: "Place",
      required: true,
    },
    {
      name: "postOffice",
      label: "Post Office",
      type: "text",
      placeholder: "Post Office",
    },
    {
      name: "district",
      label: "District",
      type: "text",
      placeholder: "District",
      required: true,
    },
    {
      name: "state",
      label: "State",
      type: "text",
      placeholder: "State",
      required: true,
    },
    {
      name: "pin",
      label: "Pin Code",
      type: "text",
      placeholder: "Pin Code",
      validators: {
        pattern: "^\\d{6}$",
        patternMessage: "Pin Code must be a 6-digit number",
      },
    },

    // Academic Information Section
    {
      name: "admissionClass",
      label: "Admission Class",
      type: "text",
      placeholder: "Admission Class",
      inputType: "select",
      required: true,
      freeSolo: true,
      options: [
        { label: "8", value: "8" },
        { label: "+1", value: "+1" },
      ],
    },
    {
      name: "sslcRegistrationNumber",
      label: "SSLC Registration Number",
      type: "number",
      placeholder: "Registration Number",
      conditionalRender: {
        dependentField: "admissionClass",
        expectedValue: "+1",
      },
    },
    {
      name: "sslcGraduationYear",
      label: "SSLC Graduation Year",
      type: "number",
      placeholder: "Graduation Year",
      conditionalRender: {
        dependentField: "admissionClass",
        expectedValue: "+1",
      },
    },
    {
      name: "academicStream",
      label: "Academic Stream",
      type: "text",
      placeholder: "Academic Stream",
      inputType: "select",
      options: [
        { label: "Commerce", value: "Commerce" },
        { label: "Science", value: "Science" },
        { label: "Humanities", value: "Humanities" },
      ],
      conditionalRender: {
        dependentField: "admissionClass",
        expectedValue: "+1",
      },
    },

    {
      name: "islamicEducationQualification",
      label: "Islamic Qualification",
      type: "text",
      placeholder: "Islamic Qualification",
    },
    {
      name: "academicEducationQualification",
      label: "Academic Qualification",
      type: "text",
      placeholder: "Academic Qualification",
    },
  ], []);

  const mapApplicationToStudent = useCallback((app) => {
    // Attempt class matching
    let classId = "";
    if (app.admissionClass) {
      const normalizedAppName = app.admissionClass.trim().toUpperCase().replace(/\s/g, "");
      // Direct match or partial match
      const matchedClass = classes.find(c => {
        const normalizedClassName = c.name.trim().toUpperCase().replace(/\s/g, "");
        return normalizedClassName.includes(normalizedAppName) || normalizedAppName.includes(normalizedClassName);
      });
      if (matchedClass) {
        classId = matchedClass._id;
      }
    }

    return {
      name: app.name,
      email: app.email,
      dateOfBirth: app.dateOfBirth,
      profilePic: app.profilePic,
      aadharNo: app.aadharNumber,
      bloodGroup: app.bloodGroup,
      houseName: app.address?.houseName,
      place: app.address?.place,
      postOffice: app.address?.postOffice,
      district: app.address?.district,
      state: app.address?.state,
      pin: app.address?.pin,
      guardianName: app.guardianName,
      relationship: app.relationship,
      guardianContactNumber: app.guardianContactNumber,
      guardianAlternativeNumber: app.guardianAlternativeNumber,
      contactNumber: app.guardianContactNumber || "", // Pre-fill student contact with guardian's
      alternativeNumber: app.guardianAlternativeNumber || "",
      admissionClassId: classId,
      islamicQualification: app.islamicEducationQualification,
      academicQualification: app.academicEducationQualification,
      status: "Active",
      roles: ["Student"], 
    };
  }, [classes]);

  const handleCellClick = useCallback((app, col) => {
    if (col.accessorKey === "name") {
      if (app.status !== "Approved") {
        if (app.status === "Admitted") {
          toast.info("This applicant has already been admitted.");
        }
        return;
      }
      const studentData = mapApplicationToStudent(app);
      setPreadmittedData(studentData);
      setSelectedApplicationId(app._id);
      setIsStudentFormOpen(true);
    } else if (col.accessorKey === "status") {
      const params = apiKey ? `?apiKey=${apiKey}` : "";
      router.push(`/dashboard/applications/${app._id}${params}`);
    }
  }, [mapApplicationToStudent, router, apiKey]);

  const handleStudentSubmit = async (values) => {
    try {
      // 1. Create the student
      const filteredValues = Object.fromEntries(
        Object.entries(values).filter(([_, value]) => value !== "")
      );

      const userRes = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filteredValues),
      });

      if (!userRes.ok) {
        const error = await userRes.json();
        let errorMessage = error.error || error.message || "Failed to create student";
        
        // If there are detailed validation errors, append them
        if (error.details?.errors) {
          const detailMessages = error.details.errors
            .map(e => `${e.field}: ${e.message}`)
            .join(", ");
          errorMessage = `${errorMessage} (${detailMessages})`;
        }
        
        throw new Error(errorMessage);
      }

      // 2. Update application status to "Admitted"
      const appRes = await fetch(`/api/applications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [selectedApplicationId],
          status: "Admitted"
        }),
      });

      if (!appRes.ok) {
        const error = await appRes.json();
        const errorMessage = error.error || error.message || "Failed to update application status";
        toast.warning(`Student created, but: ${errorMessage}`);
      } else {
        toast.success("Student created and application marked as Admitted!");
      }

      setIsStudentFormOpen(false);
      setRefreshKey((prev) => prev + 1);
      router.refresh();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const studentFormFields = useMemo(() => getStudentFormFields(batches, classes, lastStudentId), [batches, classes, lastStudentId]);

  return (
    <>
      <DataTableComponent
        resource="applications"
        initialData={[]}
        columnsConfig={columnsConfig}
        formFields={formFields}
        apiKey={apiKey}
        apiFilters={{ refreshKey }}
        createFormTitle="Add New Application"
        editFormTitle="Edit Application"
        deleteFormTitle="Delete Application"
        createSuccessMessage={statusMessages.create}
        editSuccessMessage={statusMessages.edit}
        deleteSuccessMessage={statusMessages.delete}
        filterConfig={filterConfig}
        limit={20}
        enableDelete={true}
        formClassName="sm:max-w-4xl"
        onCellClick={handleCellClick}
      />

      <PopupForm
        title="Add New Student (From Application)"
        description="Verify and complete the student details below."
        open={isStudentFormOpen}
        onOpenChange={setIsStudentFormOpen}
        formFields={studentFormFields}
        onSubmit={handleStudentSubmit}
        data={preadmittedData}
        apiKey={apiKey}
        hideButton={true}
        className="sm:max-w-4xl"
        capitalizeInputs={true}
      />
    </>
  );
}
