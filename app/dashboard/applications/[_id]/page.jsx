"use client";
import React, { useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import PrintHeader from "@/components/PrintHeader";
import { useReactToPrint } from "react-to-print";
import { useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";
import useCrud from "@/hooks/use-crud";
import { Loader, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ApplicationDisplayPage = () => {
  const printRef = useRef();

  const params = useParams();
  const searchParams = useSearchParams();

  const _id = params._id;

  const queryParams = useMemo(
    () => ({
      apiKey: searchParams.get("apiKey"),
    }),
    [searchParams]
  );

  const { useFetchItemById, useUpdateItem } = useCrud(
    "applications",
    queryParams.apiKey
  );
  const fetchApplicationQuery = useFetchItemById(_id);

  const updateApplication = useUpdateItem();

  const applicationData = React.useMemo(
    () => fetchApplicationQuery.data?.applicationForm || fetchApplicationQuery.data,
    [fetchApplicationQuery.data]
  );

  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");

  React.useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Application_${applicationData?.name || "Unknown"}`,
  });

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
    }
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

   const handleApprove = async () => {
    await updateApplication.mutateAsync({ data: { id: _id, status: "Approved" } });
    setSuccessMsg("Application has been approved successfully!");
    setShowSuccess(true);
  };

  const handleReject = async () => {
    await updateApplication.mutateAsync({ data: { id: _id, status: "Rejected" } });
    setSuccessMsg("Application has been rejected.");
    setShowSuccess(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-2 px-2 sm:py-4 sm:px-4">
      {/* A4 Container - Responsive */}
      {applicationData ? (
        <div
          className="bg-white shadow-lg print:font-montserrat border border-gray-200 print:shadow-none print:border-none w-full max-w-[210mm] mx-auto text-xxs md:text-xs lg:text-sm print:text-[12px] print:leading-snug"
          style={{
            minHeight: "297mm",
            padding: "5mm 15mm",
            lineHeight: "1.2",
          }}
          ref={printRef}
        >
          {/* College Header Section */}
          <div className="hidden md:block print:block">
            <PrintHeader apiKey={queryParams.apiKey} displayOnScreen={true} />
          </div>

          {/* Application Content */}
          <div className="space-y-6 print:space-y-3">
            <div className="mb-5">
              {/* Personal Information Header with Photo */}
              <div className="flex relative justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm md:text-base lg:text-xl print:text-base font-bold text-gray-800 border-b border-gray-400 pb-1">
                      PERSONAL INFORMATION
                    </h3>
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(applicationData?.status)} print:hidden text-xs md:text-sm lg:text-base print:text-base px-2 py-1`}
                    >
                      {applicationData?.status}
                    </Badge>
                  </div>
                </div>
                <Avatar className="h-14 w-14 border-2 sm:absolute sm:right-0 border-gray-300 flex-shrink-0">
                  <AvatarImage
                    src={applicationData?.profilePic?.url}
                    alt={applicationData?.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gray-100 text-gray-700 font-semibold text-xs md:text-sm lg:text-base print:text-base">
                    {getInitials(applicationData?.name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Personal Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div className="flex flex-wrap">
                <span className="font-semibold text-gray-700 min-w-fit">
                  Full Name:
                </span>
                <span className="ml-2 text-gray-900 break-words">
                  {applicationData?.name}
                </span>
              </div>
              <div className="flex flex-wrap">
                <span className="font-semibold text-gray-700 min-w-fit">
                  Date of Birth:
                </span>
                <span className="ml-2 text-gray-900">
                  {formatDate(applicationData?.dateOfBirth)}
                </span>
              </div>
              <div className="flex flex-wrap">
                <span className="font-semibold text-gray-700 min-w-fit">
                  Guardian Name:
                </span>
                <span className="ml-2 text-gray-900 break-words">
                  {applicationData?.guardianName || "N/A"}
                </span>
              </div>
              <div className="flex flex-wrap">
                <span className="font-semibold text-gray-700 min-w-fit">
                  Relationship:
                </span>
                <span className="ml-2 text-gray-900">
                  {applicationData?.relationship || "N/A"}
                </span>
              </div>
              <div className="flex flex-wrap">
                <span className="font-semibold text-gray-700 min-w-fit">
                  Primary Contact:
                </span>
                <span className="ml-2 text-gray-900">
                  {applicationData?.guardianContactNumber || "N/A"}
                </span>
              </div>
              <div className="flex flex-wrap">
                <span className="font-semibold text-gray-700 min-w-fit">
                  Alternative Contact:
                </span>
                <span className="ml-2 text-gray-900">
                  {applicationData?.guardianAlternativeNumber || "N/A"}
                </span>
              </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="mb-5">
              <h3 className="text-sm md:text-base lg:text-xl print:text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-3">
                ADDRESS DETAILS
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    House Name:
                  </span>
                  <span className="ml-2 text-gray-900 break-words">
                    {applicationData?.address.houseName || "N/A"}
                  </span>
                </div>
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    Place:
                  </span>
                  <span className="ml-2 text-gray-900 break-words">
                    {applicationData?.address.place}
                  </span>
                </div>
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    Post Office:
                  </span>
                  <span className="ml-2 text-gray-900 break-words">
                    {applicationData?.address.postOffice || "N/A"}
                  </span>
                </div>
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    District:
                  </span>
                  <span className="ml-2 text-gray-900">
                    {applicationData?.address.district}
                  </span>
                </div>
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    State:
                  </span>
                  <span className="ml-2 text-gray-900">
                    {applicationData?.address.state}
                  </span>
                </div>
                <div className="flex flex-wrap">
                  <span className="font-semibold text-gray-700 min-w-fit">
                    PIN Code:
                  </span>
                  <span className="ml-2 text-gray-900">
                    {applicationData?.address.pin || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="mb-5">
              <h3 className="text-sm md:text-base lg:text-xl print:text-base font-bold text-gray-800 border-b border-gray-400 pb-1 mb-3">
                ACADEMIC EDUCATION
              </h3>
              <div className="flex flex-col space-y-4">
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-[180px] md:w-[250px] shrink-0 flex justify-between pr-3 md:pr-6">
                    <span>Admission Class</span>
                    <span>:</span>
                  </span>
                  <span className="text-gray-900 flex-1 break-words">
                    {applicationData?.admissionClass || "N/A"}
                  </span>
                </div>
                {applicationData?.admissionClass === "+1" && (
                  <div className="flex items-start">
                    <span className="font-semibold text-gray-700 w-[180px] md:w-[250px] shrink-0 flex justify-between pr-3 md:pr-6">
                      <span>Academic Stream</span>
                      <span>:</span>
                    </span>
                    <span className="text-gray-900 flex-1 break-words">
                      {applicationData?.academicStream || "N/A"}
                    </span>
                  </div>
                )}
                {applicationData?.admissionClass === "+1" && (
                  <>
                    <div className="flex items-start">
                      <span className="font-semibold text-gray-700 w-[180px] md:w-[250px] shrink-0 flex justify-between pr-3 md:pr-6">
                        <span>SSLC Registration No</span>
                        <span>:</span>
                      </span>
                      <span className="text-gray-900 flex-1 break-all">
                        {applicationData?.sslcRegistrationNumber || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="font-semibold text-gray-700 w-[180px] md:w-[250px] shrink-0 flex justify-between pr-3 md:pr-6">
                        <span>SSLC Graduation Year</span>
                        <span>:</span>
                      </span>
                      <span className="text-gray-900 flex-1 break-words">
                        {applicationData?.sslcGraduationYear || "N/A"}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-[180px] md:w-[250px] shrink-0 flex justify-between pr-3 md:pr-6">
                    <span>Islamic Education Qualif.</span>
                    <span>:</span>
                  </span>
                  <span className="text-gray-900 leading-relaxed flex-1 break-words">
                    {applicationData?.islamicEducationQualification || "N/A"}
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-[180px] md:w-[250px] shrink-0 flex justify-between pr-3 md:pr-6">
                    <span>Academic Education Qualif.</span>
                    <span>:</span>
                  </span>
                  <span className="text-gray-900 leading-relaxed flex-1 break-words">
                    {applicationData?.academicEducationQualification || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div className="mt-10 pt-6 border-t border-gray-300">
              <h3 className="text-center text-base md:text-lg lg:text-xl print:text-base font-bold text-gray-800 mb-4">
                Declaration
              </h3>
              <p className="text-justify mb-10 leading-relaxed">
                I do hereby declare that the details given above are correct and
                that I shall abide by the rules and regulations of the
                institution.
              </p>
              <div className="flex mb-6">
                <div className="flex w-1/2 justify-between font-bold">
                  <span>Date</span> <span>:</span>
                </div>
              </div>
              <div className="flex mb-6">
                <div className="flex w-1/2 justify-between font-bold">
                  <span>Name and Signature of the Applicant</span>{" "}
                  <span>:</span>
                </div>
              </div>
              <div className="flex mb-8">
                <div className="flex w-1/2 justify-between font-bold">
                  <span>Name and Signature of the Guardian</span> <span>:</span>
                </div>
              </div>
              
              <div className="pt-6 border-t border-dashed border-gray-400 print:pt-4">
                <h3 className="text-center text-base md:text-lg lg:text-xl print:text-base font-bold text-gray-800 mb-4">
                  Approval
                </h3>
                <p className="mb-8">
                  The Applicant have been given provisional admission to this
                  Institution
                </p>
                <div className="flex justify-between w-full mt-4">
                  <div className="font-bold w-1/3">Admission No:</div>
                  <div className="font-bold w-1/3 text-right sm:text-left">Principal:</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : fetchApplicationQuery.isLoading ? (
        <Loader />
      ) : (
        <div className="flex justify-center items-center h-full">
          <h1 className="text-2xl font-bold">Application Not Found</h1>
        </div>
      )}

      {/* Action Buttons - Hidden during print */}
      {applicationData && (
        <div className="flex flex-col sm:flex-row gap-3 mt-4 justify-center print:hidden w-full max-w-[210mm]">
          <Button
            variant="default"
            onClick={handlePrint}
            className="order-2 sm:order-1"
          >
            Print Application
          </Button>

          {applicationData?.status === "Pending" ? (
            <>
              <Button
                disabled={updateApplication.isPending}
                className="bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
              >
                Approve Application
              </Button>
              <Button
                variant="destructive"
                disabled={updateApplication.isPending}
                onClick={handleReject}
              >
                Reject Application
              </Button>
            </>
          ) : applicationData?.status === "Approved" ? (
            <Button
              variant="destructive"
              disabled={updateApplication.isPending}
              onClick={handleReject}
            >
              Reject Application
            </Button>
          ) : applicationData?.status === "Rejected" ? (
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={updateApplication.isPending}
              onClick={handleApprove}
            >
              Approve Application
            </Button>
          ) : (
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={updateApplication.isPending}
              onClick={handleApprove}
            >
              Approve Application
            </Button>
          )}
        </div>
      )}

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          @page {
            size: A4;
            margin: 0;
          }

          .print\\:shadow-none {
            box-shadow: none !important;
          }

          .print\\:border-none {
            border: none !important;
          }

          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Success Popup */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
            <div className="rounded-full bg-emerald-100 p-3 animate-in zoom-in duration-300">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold text-emerald-900">Success!</DialogTitle>
              <p className="text-muted-foreground">
                {successMsg}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationDisplayPage;
