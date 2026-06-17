"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Printer, Filter, X, Loader, Users, FileText } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import useCrud from "@/hooks/use-crud";
import PrintHeader from "./PrintHeader";
import { MultiSelect } from "./ui/multi-select";
import { formatOptions } from "@/lib/utils";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const EvaluationSheetsComponent = ({
  programs = [],
  divisions = [],
  apiKey,
}) => {
  const [programRegistrations, setProgramRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [category, setCategory] = useState("both");
  const [page, setPage] = useState(0);

  const printRef = useRef();

  // Use CRUD operations
  const { useFetchItems } = useCrud("program-registration", apiKey);

  // Fetch registrations with program details
  const fetchRegistrationsQuery = useFetchItems(
    page,
    1000,
    {
      ...(selectedDivision && { divisionId: selectedDivision }),
      ...(selectedProgram && { programId: selectedProgram }),
    },
    {
      retry: 2,
      retryDelay: 1000,
    }
  );

  const filteredPrograms = useMemo(() => {
    return programs.filter(
      (program) =>
        ((!selectedDivision || program.divisionId === selectedDivision) &&
          category === "both") ||
        program.category === category
    );
  }, [selectedDivision, programs, category]);

  // Process registrations data into programs with participants
  const processRegistrationsToPrograms = useCallback((registrations) => {
    if (!registrations || !registrations.length) return [];

    // Group registrations by program
    const programMap = new Map();

    registrations.forEach((registration) => {
      const {
        _id: registrationId,
        programId,
        programName,
        programType,
        programCategory,
        divisionId,
        divisionName,
        participantsDetails = [],
      } = registration;

      if (!programMap.has(programId)) {
        programMap.set(programId, {
          _id: programId,
          programId,
          programName,
          programType,
          programCategory,
          divisionId,
          divisionName,
          participants: [],
        });
      }

      const program = programMap.get(programId);

      // Add participants with code letter
      participantsDetails.forEach((participant, index) => {
        const participantData = {
          ...participant,
          registrationId,
          participantIndex: index,
          uniqueId: `${registrationId}-${index}`,
          participantDetails: participant.participantDetails || {
            name: participant.name || "Unknown",
            chestNumber: participant.chestNumber || "N/A",
          },
        };

        program.participants.push(participantData);
      });
    });

    return Array.from(programMap.values()).sort((a, b) =>
      a.programName.localeCompare(b.programName)
    );
  }, []);

  // Handle fetch errors
  useEffect(() => {
    if (fetchRegistrationsQuery.error) {
      toast.error(
        fetchRegistrationsQuery.error.message ||
          "Failed to fetch program registrations. Please try again."
      );
    }
  }, [fetchRegistrationsQuery.error]);

  // Process fetched data
  useEffect(() => {
    if (fetchRegistrationsQuery.data) {
      const registrations = fetchRegistrationsQuery.data.registrations || [];
      const processedPrograms = processRegistrationsToPrograms(registrations);
      setProgramRegistrations(processedPrograms);
      setFilteredRegistrations(processedPrograms);
    }
  }, [fetchRegistrationsQuery.data, processRegistrationsToPrograms]);

  // Filter programs by division and program
  useEffect(() => {
    let filtered = programRegistrations;

    if (selectedDivision) {
      filtered = filtered.filter(
        (program) => program.divisionId === selectedDivision
      );
    }

    if (selectedProgram) {
      filtered = filtered.filter(
        (program) => program.programId === selectedProgram
      );
    }

    if (category !== "both") {
      filtered = filtered.filter(
        (program) => program.programCategory === category
      );
    }

    setFilteredRegistrations(filtered);
  }, [selectedDivision, selectedProgram, programRegistrations, category]);

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Evaluation Sheets - ${
      selectedProgram
        ? programs.find((p) => p._id === selectedProgram)?.name
        : selectedDivision
          ? divisions.find((d) => d._id === selectedDivision)?.name
          : "All Programs"
    }`,
    pageStyle: `
      @page {
        size: A4 portrait;
      }
      @media print {
        body { 
          -webkit-print-color-adjust: exact; 
          font-size: 12px;
          line-height: 1.2;
        }
        .no-print { display: none !important; }
        
        /* Main print container */
        .print-container {
          width: 100%;
          height: 100vh;
        }
        
        /* Program section - exactly half page height */
        .program-section {
          height: 50vh !important;
          max-height: 50vh !important;
          overflow: hidden;
          page-break-inside: avoid;
          margin-bottom: 0 !important;
          padding-bottom: 5px;
          display: flex;
          flex-direction: column;
        }
        
        /* Every two program sections should be on a new page */
        .program-section:nth-child(odd) {
          page-break-before: avoid;
        }
        
        .program-section:nth-child(2n+1):not(:first-child) {
          page-break-before: always;
        }
        
        /* Program info header */
        .program-info {
          height: auto !important;
          flex-shrink: 0;
          overflow: hidden;
        }
        
        /* Table container - flexible height */
        .table-container {
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
        
        /* Evaluation table */
        .evaluation-table {
          border-collapse: collapse !important;
          border: 1px solid #000 !important;
          width: 100% !important;
          height: 100%;
          font-size: 11px !important;
        }
        
        .evaluation-table th,
        .evaluation-table td {
          border: 1px solid #000 !important;
          padding: 2px 4px !important;
          text-align: center !important;
          vertical-align: middle !important;
          line-height: 1.1 !important;
          overflow: hidden;
        }
        
        .evaluation-table th {
          background-color: #f5f5f5 !important;
          font-weight: bold !important;
          color: #000 !important;
          height: 20px !important;
          font-size: 10px !important;
        }
        

        
        .evaluation-table tbody td {
          height: 25px !important;
          font-size: 10px !important;
        }
        
        /* Signature section */
        .signature-section {
         
          margin-top: 5px !important;
          flex-shrink: 0;
          font-size: 9px !important;
        }
        
        .signature-section .signature-line {
          border-top: 1px solid #333 !important;
          margin-top: 20px !important;
          padding-top: 3px !important;
        }
      }
    `,
  });

  const clearFilters = () => {
    setSelectedDivision("");
    setSelectedProgram("");
  };

  const isLoading = fetchRegistrationsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="no-print">
        <div className="flex flex-col gap-4">
          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"both"}>Both</SelectItem>
                  <SelectItem value="Stage">Stage</SelectItem>
                  <SelectItem value="off-Stage">Off Stage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedDivision}
                onValueChange={setSelectedDivision}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Divisions</SelectItem>
                  {divisions.map((division) => (
                    <SelectItem key={division._id} value={division._id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <MultiSelect
              options={formatOptions(filteredPrograms)}
              value={selectedProgram}
              onValueChange={setSelectedProgram}
              placeholder="All Programs"
              multiSelect={false}
            />

            {(selectedDivision || selectedProgram) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="w-full"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Stats and Actions */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{filteredRegistrations.length} programs</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="default"
                onClick={handlePrint}
                disabled={filteredRegistrations.length === 0}
                className="flex-1 sm:flex-none"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Sheets
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="print-container">
        {/* Program Tables */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 print:py-0">
            <div className="flex items-center space-x-2">
              <Loader className="animate-spin h-6 w-6" />
              <span>Loading evaluation sheets...</span>
            </div>
          </div>
        ) : filteredRegistrations.length > 0 ? (
          <div className="space-y-8 print:space-y-0">
            {filteredRegistrations.map((program, programIndex) => (
              <div key={program._id} className="program-section">
                {/* Print Header for each sheet */}
                <PrintHeader
                  title="Evaluation Sheet"
                  apiKey={apiKey}
                  isFestival={true}
                />

                {/* Program Header */}
                <div className="program-info mb-4 p-3 sm:p-4 bg-muted rounded-lg border print:bg-transparent print:border-none print:p-1 print:mb-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="mb-2 sm:mb-0 text-center w-full">
                      <div className="flex flex-wrap w-full justify-center gap-2 sm:gap-4 mt-1 print:mt-0 text-xs sm:text-sm text-foreground print:text-black print:text-xs">
                        <span className="capitalize whitespace-nowrap">
                          <strong>Program:</strong> {program.programName}
                        </span>
                        <span className="whitespace-nowrap">
                          <strong>Division:</strong> {program.divisionName}
                        </span>
                        <span className="capitalize whitespace-nowrap">
                          <strong>Type:</strong> {program.programType}
                        </span>
                        <span className="capitalize whitespace-nowrap">
                          <strong>Category:</strong> {program.programCategory}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evaluation Sheet Table */}
                <div className="table-container border rounded-lg overflow-hidden print:rounded-none print:border print:border-black">
                  <div className="overflow-x-auto print:overflow-visible h-full">
                    <Table className="min-w-full evaluation-table border-collapse h-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16 text-center whitespace-nowrap border border-border p-2 h-5 print:border-black print:font-bold print:bg-gray-100">
                            Sl.
                          </TableHead>
                          <TableHead className="w-32 text-center whitespace-nowrap border border-border p-2 h-5 print:border-black print:font-bold print:bg-gray-100">
                            Code Letter
                          </TableHead>
                          <TableHead className="w-auto text-center whitespace-nowrap border border-border p-2 h-5 print:border-black print:font-bold print:bg-gray-100">
                            Marks
                          </TableHead>
                          <TableHead className="w-32 text-center whitespace-nowrap border border-border p-2 h-5 print:border-black print:font-bold print:bg-gray-100">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {program.participants.length > 0 ? (
                          program.participants.map((participant, index) => (
                            <TableRow key={participant.uniqueId}>
                              <TableCell className="text-center font-medium whitespace-nowrap border border-border p-2 h-5 print:border-black">
                                {index + 1}
                              </TableCell>
                              <TableCell className="text-center font-bold whitespace-nowrap border border-border p-2 h-5 print:border-black">
                                {alphabet[index]}
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap border border-border p-2 h-5 print:border-black"></TableCell>
                              <TableCell className="text-center whitespace-nowrap border border-border p-2 h-5 print:border-black"></TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center py-6 text-muted-foreground border border-border print:border-black print:py-2"
                            >
                              No participants found for this program
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Judge Signature Section */}
                <div className="signature-section mt-8 grid grid-cols-2 gap-8 print:mt-2 print:gap-4">
                  <div className="text-center">
                    <div className="signature-line border-t border-gray-400 pt-2 mt-12 print:mt-4">
                      <p className="text-sm font-medium print:text-xs">
                        Judge Signature
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="signature-line border-t border-gray-400 pt-2 mt-12 print:mt-4">
                      <p className="text-sm font-medium print:text-xs">Date</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="font-semibold">No Programs Found</h3>
            <p className="text-muted-foreground">
              {selectedDivision || selectedProgram
                ? "No programs with participants found for the selected filters."
                : "No programs with registered participants available."}
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }

          /* Ensure exactly two sheets per page */
          .program-section {
            height: 50vh !important;
            max-height: 50vh !important;
            overflow: hidden;
            page-break-inside: avoid;
            margin-bottom: 0 !important;
            display: flex;
            flex-direction: column;
          }

          /* Page breaks for every two sheets */
          .program-section:nth-child(2n + 1):not(:first-child) {
            page-break-before: always;
          }

          .evaluation-table {
            border-collapse: collapse !important;
            border: 1px solid #000 !important;
            width: 100% !important;
          }

          .evaluation-table th,
          .evaluation-table td {
            border: 1px solid #000 !important;
            padding: 2px 4px !important;
            text-align: center !important;
            vertical-align: middle !important;
            line-height: 1.2 !important;
          }

          .evaluation-table th {
            background-color: #f5f5f5 !important;
            font-weight: bold !important;
            color: #000 !important;
            height: 20px !important;
            font-size: 10px !important;
          }

          .evaluation-table tbody td {
            font-size: 10px !important;
          }
        }

        /* Screen styles for better border collapse */
        .evaluation-table {
          border-collapse: collapse !important;
        }

        .evaluation-table th,
        .evaluation-table td {
          border-collapse: collapse !important;
        }

        /* Mobile table scrolling styles */
        @media (max-width: 768px) {
          .overflow-x-auto {
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  );
};

export default EvaluationSheetsComponent;
