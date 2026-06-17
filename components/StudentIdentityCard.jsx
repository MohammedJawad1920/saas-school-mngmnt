"use client";
import { useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Printer, User, Shield } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Barcode from "react-barcode";
import Header from "@/components/Header";
import { formatDateForDisplay, formatDateMonthYear } from "@/lib/utils";
import { useRouter } from "next/navigation";

const StudentIdentityCard = ({ student, institution = {}, idCardBackgroundImageUrl = "" }) => {
    const pageRef = useRef(null);
    const router = useRouter();

    const handlePrint = useReactToPrint({
        contentRef: pageRef,
        documentTitle: `${student.name} ID Card`,
    });

    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh();
        }, 60000);
        return () => clearInterval(interval);
    }, [router]);

    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    return (
        <div>
            <Header
                title="MY IDENTITY CARD"
                subTitle="View and Download your Official Student ID"
            />

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <Button
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2"
                    aria-label="Print/Download ID Card"
                >
                    <Printer size={16} />
                    Print / Download
                </Button>
            </div>

            {/* Screen Preview (Larger view for the student) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:hidden max-w-4xl mx-auto">
                {/* Front Side */}
                <Card className="shadow-lg overflow-hidden border-none max-w-[340px] mx-auto w-full">
                    <CardContent className="p-0 h-full flex flex-col">
                        <div
                            style={{ backgroundImage: `url(${idCardBackgroundImageUrl})` }}
                            className="bg-cover bg-center w-full min-h-[400px] flex-1 p-5 shadow flex flex-col"
                        >
                            <div className="text-center mb-4">
                                <h2 className="font-bold text-lg uppercase tracking-wider">
                                    {institution.name || "Educational Institution"}
                                </h2>
                                <p className="text-sm opacity-90">
                                    {institution.tagline || "Excellence in Education"}
                                </p>
                            </div>

                            <div className="flex justify-center mb-4">
                                <div className="h-16 w-16 bg-white rounded-full relative overflow-hidden shadow-md">
                                    {institution.logo ? (
                                        <div className="relative h-full w-full">
                                            <Image
                                                src={institution.logo.url || ""}
                                                alt="Institution Logo"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <Shield className="text-indigo-700" size={32} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-center flex-1">
                                <div className="mb-4">
                                    <div className="w-28 h-32 bg-white border-2 border-white rounded-md relative overflow-hidden shadow-md">
                                        {student.profilePic?.url ? (
                                            <div className="relative h-full w-full">
                                                <Image
                                                    src={student?.profilePic?.url || ""}
                                                    alt={`${student.name}'s photo`}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center">
                                                <User size={40} className="text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-center space-y-2">
                                    <h2 className="text-lg font-bold mt-1 bg-white/20 inline-block px-3 py-1 rounded">
                                        {`Admn No: ${student._id?.substring(0, 8).toUpperCase()}`}
                                    </h2>
                                    <h3 className="font-bold text-lg">{student.name}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="p-3">
                            <div className="text-sm text-center font-medium text-indigo-800 mb-2 bg-white/80 rounded-md py-1 px-3 inline-block shadow-sm">
                                OFFICIAL STUDENT IDENTIFICATION
                            </div>
                            <div className="flex justify-center mt-2 p-2 bg-white rounded shadow-sm overflow-hidden h-16">
                                <Barcode
                                    value={student._id?.substring(0, 8).toUpperCase()}
                                    width={2}
                                    height={40}
                                    format="CODE128"
                                    displayValue={false}
                                    background="#ffffff"
                                    renderer="svg"
                                    margin={0}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Back Side */}
                <Card className="shadow-lg overflow-hidden border border-gray-200 max-w-[340px] mx-auto w-full">
                    <CardContent className="p-6 flex flex-col h-full">
                        <div className="border-b border-gray-200 pb-3 mb-4">
                            <h3 className="text-base font-semibold text-gray-800 text-center">
                                Contact Information
                            </h3>
                        </div>

                        <div className="relative flex-1">
                            <div
                                className="absolute inset-0 bg-center bg-no-repeat z-0"
                                style={{
                                    backgroundImage: 'url("/sdc_seal.png")',
                                    opacity: 0.2,
                                    backgroundPosition: "center",
                                    backgroundSize: "200px",
                                }}
                            ></div>
                            <div className="relative text-sm z-10 font-medium grid grid-cols-[max-content_auto_1fr] gap-x-1 gap-y-3 w-full">
                                <span className="font-semibold">Class</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">{student.className}</span>

                                <span className="font-semibold">Batch</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">{student.batchName}</span>

                                <span className="font-semibold">Dob</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">
                                    {formatDateMonthYear(student.dateOfBirth) || "No DOB provided"}
                                </span>

                                <span className="font-semibold">Phone No</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">
                                    {student.contactNumber || "No phone provided"}
                                </span>

                                <span className="font-semibold">Email</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">
                                    {student.email || "No email provided"}
                                </span>

                                <span className="font-semibold">S/o</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">
                                    {student.guardianName || "No guardian provided"}
                                </span>

                                <span className="font-semibold whitespace-nowrap">
                                    Contact No
                                </span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">
                                    {student.guardianContactNumber || "No contact provided"}
                                </span>

                                <span className="font-semibold">Address</span>
                                <span>:</span>
                                <span className="text-gray-700 text-[0.8rem] break-words leading-tight whitespace-normal min-w-0">
                                    {Object.values(student.address || {})
                                        .filter(Boolean)
                                        .join(", ") || "No address provided"}
                                </span>

                                <span className="font-semibold">Validity</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">{academicYear}</span>
                            </div>
                        </div>

                        <div className="mt-6 bg-indigo-50 p-3 rounded-md">
                            <div className="text-sm text-center text-gray-700">
                                <p className="font-bold text-indigo-700 mb-1">
                                    {institution.name || "Educational Institution"}
                                </p>
                                <p className="text-xs text-gray-700 mb-1">
                                    {institution.tagline && <span>({institution.tagline})</span>}
                                </p>
                                <p className="text-xs text-gray-700">
                                    Sa-adabad, Deli, P.O Kalanad, Kasaragod
                                </p>
                                <p className="text-xs text-gray-700 mt-1">
                                    {institution.contact?.primaryPhone &&
                                        `Phone: ${institution.contact.primaryPhone}`}
                                    {institution.contact?.secondaryPhone &&
                                        `, ${institution.contact.secondaryPhone}`}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Hidden Print Layout (A4 Landscape, single card view or side-by-side depending on requirements) */}
            {/* We replicate exactly what the admin sees, but just for this one student! */}
            <div ref={pageRef} className="hidden print:block space-y-4">
                <div
                    className="print-page w-full p-4 flex flex-wrap"
                    style={{ width: "297mm", height: "210mm" }}
                    aria-hidden="true"
                >
                    <StudentPrintableCard
                        person={student}
                        institution={institution}
                        academicYear={academicYear}
                        idCardBackgroundImageUrl={idCardBackgroundImageUrl}
                        showFront={true}
                        showBack={true}
                    />
                </div>
            </div>

            <style jsx>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
        </div>
    );
};

// Internal Printable Component matching admin styles
const StudentPrintableCard = ({
    person,
    institution,
    academicYear,
    idCardBackgroundImageUrl,
    showFront,
    showBack,
}) => {
    const innerClass = "border rounded shadow w-1/2 overflow-hidden mx-auto print:max-w-sm shrink-0";
    return (
        <div className="w-1/2 h-1/2 p-2 flex space-x-2" style={{ pageBreakInside: "avoid" }}>
            {showFront && (
                <div className={innerClass}>
                    <div
                        style={{ backgroundImage: `url(${idCardBackgroundImageUrl})` }}
                        className="bg-cover bg-center w-full h-full p-4 rounded shadow flex flex-col"
                    >
                        <div className="text-center mb-1">
                            <h2 className="font-bold text-xs uppercase tracking-wider">
                                {institution.name || "Educational Institution"}
                            </h2>
                            <p className="text-xxs opacity-90">
                                {institution.tagline || "Excellence in Education"}
                            </p>
                        </div>

                        <div className="flex justify-center mb-1">
                            <div className="h-8 w-8 bg-white rounded-full relative overflow-hidden">
                                {institution.logo ? (
                                    <div className="relative h-full w-full">
                                        <Image
                                            src={institution.logo.url || ""}
                                            alt="Institution Logo"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                        <Shield className="text-indigo-700" size={16} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-center flex-grow">
                            <div className="mb-1">
                                <div className="w-28 h-28 bg-white border border-white rounded relative overflow-hidden">
                                    {person.profilePic?.url ? (
                                        <div className="relative h-full w-full">
                                            <Image
                                                src={person?.profilePic?.url || ""}
                                                alt={`${person.name}'s photo`}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <User size={20} className="text-gray-400" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="text-center">
                                <h3 className="text-base font-bold mt-0.5 bg-white/20 inline-block px-1 py-0.5 rounded">
                                    {`Admn No: ${person._id?.substring(0, 8).toUpperCase()}`}
                                </h3>
                                <h3 className="font-bold text-xs">{person.name}</h3>
                            </div>
                        </div>

                        <div className="text-xs font-bold text-center mt-auto p-1 flex flex-col items-center">
                            <span className="mb-1 mt-1 bg-white/80 rounded-md py-0.5 px-2 shadow-sm text-indigo-900">OFFICIAL STUDENT ID</span>
                            <div className="p-1 mb-1 bg-white rounded overflow-hidden h-12 flex items-center">
                                <Barcode
                                    value={person._id?.substring(0, 8).toUpperCase()}
                                    width={1.5}
                                    height={30}
                                    format="CODE128"
                                    displayValue={false}
                                    background="#ffffff"
                                    renderer="svg"
                                    margin={0}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showBack && (
                <div className={innerClass}>
                    <div className="p-2 bg-white h-full flex flex-col">
                        <div className="border-b border-gray-200 pb-1 mb-1">
                            <h3 className="text-xs font-semibold text-gray-800 text-center">
                                Contact Information
                            </h3>
                        </div>

                        <div className="relative">
                            <div
                                className="absolute inset-0 bg-center bg-no-repeat z-0"
                                style={{
                                    backgroundImage: 'url("/sdc_seal.png")',
                                    opacity: 0.4,
                                    backgroundSize: "250px",
                                }}
                            ></div>
                            <div className="relative text-xs z-10 grid grid-cols-[max-content_auto_1fr] gap-x-1 gap-y-1 w-full">
                                <span className="font-semibold">Class</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">{person.className}</span>

                                <span className="font-semibold">Batch</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">{person.batchName}</span>

                                <span className="font-semibold">Dob</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">
                                    {formatDateMonthYear(person.dateOfBirth) ||
                                        "No DOB provided"}
                                </span>

                                <span className="font-semibold">Phone No</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">
                                    {person.contactNumber || "No phone provided"}
                                </span>

                                <span className="font-semibold">Email</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">
                                    {person.email || "No email provided"}
                                </span>

                                <span className="font-semibold">S/o</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">
                                    {person.guardianName || "No guardian provided"}
                                </span>

                                <span className="font-semibold whitespace-nowrap">
                                    Contact No
                                </span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">
                                    {person.guardianContactNumber || "No contact provided"}
                                </span>

                                <span className="font-semibold">Address</span>
                                <span>:</span>
                                <span className="text-gray-700 text-[0.65rem] break-words leading-tight whitespace-normal min-w-0">
                                    {Object.values(person.address || {})
                                        .filter(Boolean)
                                        .join(", ") || "No address provided"}
                                </span>

                                <span className="font-semibold">Validity</span>
                                <span>:</span>
                                <span className="text-gray-700 min-w-0">{academicYear}</span>
                            </div>
                        </div>

                        <div className="bg-indigo-50 p-1 rounded text-center text-xs mt-auto">
                            <p className="font-bold text-indigo-700 text-xs px-8">
                                {institution.name || "Educational Institution"}
                            </p>
                            <p className="text-xxs text-gray-700">
                                {institution.tagline && <span>({institution.tagline})</span>}
                            </p>
                            <p className="text-xxs text-gray-700">
                                Sa-adabad, Deli, P.O Kalanad, Kasaragod
                            </p>
                            <p className="text-xxs text-gray-700">
                                {institution.contact?.primaryPhone &&
                                    `Phone: ${institution.contact.primaryPhone}`}
                                {institution.contact?.secondaryPhone &&
                                    `, ${institution.contact.secondaryPhone}`}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentIdentityCard;
