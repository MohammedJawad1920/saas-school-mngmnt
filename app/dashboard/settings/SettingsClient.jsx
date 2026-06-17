"use client";
import dynamic from "next/dynamic";
import CommitteePostersSettings from "@/components/CommitteePostersSettings";

const FormComponent = dynamic(() => import("@/components/FormComponent"), {
  ssr: false,
});

const generalFormField = [
  {
    name: "isWorkingDay",
    label: "Working Day",
    required: true,
    type: "boolean",
    inputType: "toggle",
    defaultValue: true,
    hideLabel: true,
    className: "col-span-2",
  },
  {
    name: "occasion",
    label: "Occasion",
    required: true,
    conditionalRender: {
      dependentField: "isWorkingDay",
      expectedValue: false,
    },
  },
];

const institutionFormField = [
  {
    name: "logo",
    label: "Institution Logo",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/svg+xml"],
    defaultValue: {},
  },
  {
    name: "institutionPhoto",
    label: "Institution Photo",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/svg+xml"],
    defaultValue: {},
  },
  {
    name: "name",
    label: "Institution Name",
    placeholder: "Enter institution name",
    required: true,
  },
  {
    name: "fullName",
    label: "Full Name",
    placeholder: "Enter full name",
  },
  {
    name: "tagline",
    label: "Tagline",
    placeholder: "Enter institution tagline",
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "address",
    label: "Address",
    placeholder: "Enter address",
  },
  {
    name: "primaryPhone",
    label: "Primary Phone",
    placeholder: "Enter primary phone",
  },
  {
    name: "secondaryPhone",
    label: "Secondary Phone",
    placeholder: "Enter secondary phone",
  },
  {
    name: "email",
    label: "Email",
    placeholder: "Enter email address",
    type: "email",
  },
  {
    name: "website",
    label: "Website",
    placeholder: "Enter website URL",
  },
  {
    name: "whatsappChannel",
    label: "WhatsApp Channel URL",
    placeholder: "Enter WhatsApp Channel URL",
  },
  {
    name: "youtube",
    label: "YouTube URL",
    placeholder: "Enter YouTube URL",
  },
  {
    name: "instagram",
    label: "Instagram URL",
    placeholder: "Enter Instagram URL",
  },
];

const festivalFormField = [
  {
    name: "festival_name",
    label: "Festival Name",
    placeholder: "e.g., esperanza",
    required: true,
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "festival_theme",
    label: "Festival Theme/Tagline",
    placeholder: "e.g., Recall the legacy, Reignite the light",
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "festival_year",
    label: "Festival Year",
    type: "number",
    placeholder: new Date().getFullYear().toString(),
    required: true,
    validators: {
      min: 2020,
      max: 2100,
    },
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "festival_venue",
    label: "Venue",
    placeholder: "e.g., Sa-adiya Da-awa College",
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "festival_startDate",
    label: "Start Date",
    type: "date",
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "festival_endDate",
    label: "End Date",
    type: "date",
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "festivalNameImage",
    label: "Festival Name Image",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/svg"],
    defaultValue: {},
  },
  {
    name: "printHeader",
    label: "Print Header",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/png"],
    defaultValue: {},
    minWidth: 2480,
    minHeight: 310,
  },
  {
    name: "participantsCard",
    label: "Participants Card",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/svg+xml", "image/png", "image/jpeg", "image/jpg"],
    defaultValue: {},
    aspectRatio: "1:1.4",
    minWidth: 600,
    minHeight: 840,
  },
  {
    name: "textColor",
    label: "Text Color",
    type: "color",
    className: "col-span-1",
  },
  {
    name: "right",
    label: "Right Position",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },
  {
    name: "bottom",
    label: "Bottom Position",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },
  {
    name: "left",
    label: "Left Position",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },
  {
    name: "registrationDeadline",
    label: "Registration Deadline",
    type: "date",
    required: true,
  },
];

const sparkFormField = [
  {
    name: "spark_logo",
    label: "Organisation Logo",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/svg+xml"],
    defaultValue: {},
  },
  {
    name: "spark_name",
    label: "Organisation Name",
    placeholder: "Enter organisation name",
    required: true,
  },
  {
    name: "spark_fullName",
    label: "Full Name",
    placeholder: "Enter full name",
  },
  {
    name: "spark_tagline",
    label: "Tagline",
    placeholder: "Enter organisation tagline",
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "spark_address",
    label: "Address",
    placeholder: "Enter address",
  },
  {
    name: "spark_primaryPhone",
    label: "Primary Phone",
    placeholder: "Enter primary phone",
  },
  {
    name: "spark_secondaryPhone",
    label: "Secondary Phone",
    placeholder: "Enter secondary phone",
  },
  {
    name: "spark_email",
    label: "Email",
    placeholder: "Enter email address",
    type: "email",
  },
  {
    name: "spark_website",
    label: "Website",
    placeholder: "Enter website URL",
  },
];

const orgFormField = [
  {
    name: "org_logo",
    label: "Organisation Logo",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/svg+xml"],
    defaultValue: {},
  },
  {
    name: "org_name",
    label: "Organisation Name",
    placeholder: "Enter organisation name",
    required: true,
  },
  {
    name: "org_fullName",
    label: "Full Name",
    placeholder: "Enter full name",
  },
  {
    name: "org_tagline",
    label: "Tagline",
    placeholder: "Enter organisation tagline",
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "org_address",
    label: "Address",
    placeholder: "Enter address",
  },
  {
    name: "org_primaryPhone",
    label: "Primary Phone",
    placeholder: "Enter primary phone",
  },
  {
    name: "org_secondaryPhone",
    label: "Secondary Phone",
    placeholder: "Enter secondary phone",
  },
  {
    name: "org_email",
    label: "Email",
    placeholder: "Enter email address",
    type: "email",
  },
  {
    name: "org_website",
    label: "Website",
    placeholder: "Enter website URL",
  },
];

export default function SettingsClient({
  activeRole,
  apiKey,
  general,
  institution,
  festival,
  idCard,
  spark,
  org,
}) {
  return (
    <div className="space-y-8">
      {activeRole === "College Admin" && (
        <>
          <FormComponent
            formFields={generalFormField}
            apiKey={apiKey}
            data={general}
            resource="settings"
            title="General"
            description="Customize Your System Settings"
          />
          <FormComponent
            formFields={institutionFormField}
            apiKey={apiKey}
            data={institution}
            resource="settings"
            title="Institution Profile"
            description="Configure Your Institution Details"
          />
        </>
      )}
      {activeRole === "Program Committee" && (
        <FormComponent
          formFields={festivalFormField}
          apiKey={apiKey}
          data={festival}
          resource="settings"
          title="Festival Settings"
          description="Configure Festival Details"
        />
      )}
      {activeRole === "Spark Admin" && (
        <>
          <FormComponent
            data={spark}
            formFields={sparkFormField}
            title="Institution Profile"
            description="Manage your institution details"
            loading={false}
            apiKey={apiKey}
            resource="settings"
          />
          <div className="mt-8">
            <CommitteePostersSettings
              initialPosters={spark.committeePosters}
              apiKey={apiKey}
              type="spark"
            />
          </div>
        </>
      )}
      {activeRole === "Org Admin" && (
        <>
          <FormComponent
            formFields={orgFormField}
            apiKey={apiKey}
            data={org}
            resource="settings"
            title="Institution Profile"
            description="Configure Your Institution Details"
          />
          <div className="mt-8">
            <CommitteePostersSettings
              initialPosters={org.committeePosters}
              apiKey={apiKey}
            />
          </div>
        </>
      )}
    </div>
  );
}
