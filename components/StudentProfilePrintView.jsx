"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateShort } from "@/lib/utils";
import PrintHeader from "@/components/PrintHeader";

const InfoField = ({ label, value, fullWidth = false }) => {
  if (!value) return null;
  return (
    <div className={`flex border-b border-gray-100 last:border-0 py-1.5 print:py-2 items-start text-sm print:text-[13px] leading-tight ${fullWidth ? 'sm:col-span-2' : ''}`}>
      <span className="font-semibold text-gray-500 min-w-[120px] print:min-w-[110px] uppercase tracking-tighter text-[11px] print:text-[11px]">{label}</span>
      <span className="text-gray-400 mr-2">:</span>
      <span className="text-gray-900 break-words font-normal flex-1">{value}</span>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="mb-4 print:mb-3 break-inside-avoid shadow-sm print:shadow-none border border-gray-100 print:border-gray-200 rounded-lg overflow-hidden">
    <div className="bg-gray-50/50 print:bg-gray-50 px-4 py-2 print:py-1 border-b border-gray-100 print:border-gray-200">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider print:text-[13px]">
        {title}
        </h3>
    </div>
    <div className="px-4 py-2 print:py-1 grid grid-cols-1 sm:grid-cols-2 gap-x-12 print:gap-x-8">
      {children}
    </div>
  </div>
);

export default function StudentProfilePrintView({ student, classes, batches, apiKey }) {
  if (!student) return null;

  const getInitials = (name) => {
    return name
      ? name
          .split(" ")
          .map((word) => word.charAt(0))
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "ST";
  };

  return (
    <div 
      className="bg-white mx-auto print:font-sans w-full max-w-[210mm] print:shadow-none print:border-none print:leading-none relative"
      style={{
        padding: "0mm 8mm",
        minHeight: "auto",
      }}
    >
      <style>{`
        @media print {
            @page {
                size: A4;
                margin: 0;
            }
            body {
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .no-print,
            button.absolute.right-4.top-4, /* Hide shadcn dialog close icon */
            [data-state="open"] > button.absolute { 
                display: none !important;
            }
            /* Force the container to start at the absolute top */
            html, body {
                height: 100%;
            }
            /* Narrow down the PrintHeader padding for this view */
            .print-header-compact div {
                padding-top: 0 !important;
                padding-bottom: 0 !important;
                margin-bottom: 4px !important;
            }
        }
      `}</style>

      {/* College Header - Compact in Print */}
      <div className="mb-2 print:mb-1 print-header-compact">
        <PrintHeader title="STUDENT PROFILE SUMMARY" apiKey={apiKey} displayOnScreen={true} />
      </div>

      {/* Personal Info with Photo - Ultra Compact */}
      <div className="relative mb-4 print:mb-3 break-inside-avoid shadow-sm print:shadow-none border border-gray-100 print:border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50/50 print:bg-gray-50 px-4 py-2 print:py-1 border-b border-gray-100 print:border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider print:text-[13px]">
            PERSONAL DETAILS
            </h3>
        </div>
        <div className="px-4 py-2 print:py-1 flex gap-8 justify-between relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 grow gap-x-12 print:gap-x-8 pr-32 print:pr-24">
                <InfoField label="Full Name" value={student.name} fullWidth={true} />
                <InfoField label="Email" value={student?.email} fullWidth={true} />
                
                <InfoField label="Student ID" value={student._id} />
                <InfoField label="Date of Birth" value={formatDateShort(student?.dateOfBirth)} />
                <InfoField label="Blood Group" value={student?.bloodGroup} />
                <InfoField label="Aadhar No" value={student?.aadharNo} />
                <InfoField label="Contact No" value={student.contactNumber} />
                <InfoField label="Alt. Contact" value={student.alternativeNumber} />
            </div>
            {/* Absolute Photo Area */}
            <div className="absolute right-4 top-2">
                <Avatar className="h-28 w-28 print:h-24 print:w-24 border-2 border-slate-100 rounded-lg shadow-inner overflow-hidden">
                    <AvatarImage src={student?.profilePic?.url} alt={student?.name} className="object-cover" />
                    <AvatarFallback className="bg-slate-50 text-slate-300 font-black text-2xl">
                        {getInitials(student.name)}
                    </AvatarFallback>
                </Avatar>
            </div>
        </div>
      </div>

      {/* Academic Info */}
      <Section title="ACADEMIC RECORDS">
        {/* Using flattened fields directly provided by API */}
        <InfoField label="Current Class" value={student.className} />
        <InfoField label="Current Batch" value={student.batchName} />
        <InfoField label="Admission Class" value={student.admissionClassName} />
        <InfoField label="Admission Date" value={formatDateShort(student?.admissionDate)} />
        <InfoField label="Islamic Qualif." value={student?.islamicQualification} />
        <InfoField label="Academic Qualif." value={student?.academicQualification} />
        <InfoField label="Graduated Year" value={student?.graduatedYear} />
        <InfoField label="Current Status" value={student?.status} />
      </Section>

      {/* Guardian Details */}
      <Section title="GUARDIAN INFORMATION">
        <InfoField label="Guardian Name" value={student?.guardianName} />
        <InfoField label="Relationship" value={student?.relationship} />
        <InfoField label="Guardian Phone" value={student?.guardianContactNumber} />
        <InfoField label="G. Alt Phone" value={student?.guardianAlternativeNumber} />
      </Section>

      {/* Address - Redesigned with individual labels */}
      <Section title="RESIDENTIAL ADDRESS">
        <InfoField label="House Name" value={student?.houseName || student?.address?.houseName} />
        <InfoField label="Place" value={student?.place || student?.address?.place} />
        <InfoField label="Location Point" value={student?.locationPoint || student?.address?.locationPoint} />
        <InfoField label="Post Office" value={student?.postOffice || student?.address?.postOffice} />
        <InfoField label="District" value={student?.district || student?.address?.district} />
        <InfoField label="State" value={student?.state || student?.address?.state} />
        <InfoField label="Pin Code" value={student?.pin || student?.address?.pin} />
      </Section>

      {/* Dropout Info if applicable */}
      {student?.status === "Dropped Out" && (
        <Section title="WITHDRAWAL DETAILS">
            <InfoField label="Dropout Date" value={formatDateShort(student?.droppedOutDate)} />
            <InfoField label="Dropout Class" value={student.droppedOutClass} />
            <InfoField label="Dropout Reason" value={student?.droppedOutReason} />
        </Section>
      )}

      {/* Verification footer - REMOVE ON PRINT as requested */}
      <div className="mt-8 pt-4 border-t border-gray-100 print:hidden no-print">
        <div className="flex justify-between items-end opacity-50 grayscale">
            <div className="text-[10px] font-medium text-gray-400">
                Generated: {new Date().toLocaleString()}
            </div>
            <div className="flex flex-col items-center">
                <div className="w-40 h-px bg-gray-300 mb-1"></div>
                <span className="text-[9px] font-bold uppercase text-gray-400">Office Scan Verified</span>
            </div>
        </div>
      </div>

      <div className="hidden print:block pt-4 text-center mt-2 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 font-medium">
            Electronic Profile Summary | Scofist Institutional System
          </p>
      </div>
    </div>
  );
}
