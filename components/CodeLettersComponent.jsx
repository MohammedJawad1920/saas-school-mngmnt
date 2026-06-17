"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Save, Printer, Filter, X, Loader, Users, Trash2 } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import useCrud from "@/hooks/use-crud";
import PrintHeader from "./PrintHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { MultiSelect } from "./ui/multi-select";
import { formatOptions } from "@/lib/utils";

const CodeLettersComponent = ({
  divisions = [],
  apiKey,
  additionalProps = {},
}) => {
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [status, setStatus] = useState("both");
  const [category, setCategory] = useState("both");
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});
  const [page, setPage] = useState(0);

  const printRef = useRef();

  // Use CRUD operations
  const { useFetchItems } = useCrud("program-registration", apiKey);
  const { useUpdateItem: useCodeLetterUpdate, useDeleteItem } = useCrud(
    "code-letters",
    apiKey
  );

  const updateCodeLetters = useCodeLetterUpdate();
  const deleteCodeLetter = useDeleteItem();

  // Fetch registrations with program details
  const fetchRegistrationsQuery = useFetchItems(
    page,
    1000,
    {
      ...(selectedDivision && { divisionId: selectedDivision }),
    },
    {
      retry: 2,
      retryDelay: 1000,
    }
  );

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
        teamName,
        teamId,
        participantsDetails = [],
        status,
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
          hasEvaluatedParticipants: status === "Evaluated",
        });
      }

      const program = programMap.get(programId);

      // Add participants with additional info
      participantsDetails.forEach((participant, index) => {
        program.participants.push({
          ...participant,
          registrationId,
          teamId,
          teamName,
          participantIndex: index,
          uniqueId: `${registrationId}-${index}`, // Unique identifier for each participant
          isEvaluated: (participant.totalMarks || 0) > 0,
        });
      });

      // Check if any participant is evaluated
      if (participantsDetails.some((p) => (p.totalMarks || 0) > 0)) {
        program.hasEvaluatedParticipants = true;
      }
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
      setPrograms(processedPrograms);
      setFilteredPrograms(processedPrograms);
    }
  }, [fetchRegistrationsQuery.data, processRegistrationsToPrograms]);

  const programsData = useMemo(() => {
    if (!fetchRegistrationsQuery?.data?.registrations) return [];

    const seen = new Set();
    return fetchRegistrationsQuery.data.registrations
      .map((program) => ({
        _id: program.programId,
        name: program.programName,
        divisionId: program.divisionId,
        programCategory: program.programCategory,
      }))
      .sort((a, b) => a.name?.localeCompare(b.name))
      .filter(
        (program) =>
          program.divisionId === selectedDivision &&
          !seen.has(program._id) &&
          seen.add(program._id) &&
          (category === "both" || program.programCategory === category)
      );
  }, [fetchRegistrationsQuery.data, selectedDivision, category]);

  // Filter programs by division
  useEffect(() => {
    if (selectedDivision || selectedProgram || status || category) {
      setFilteredPrograms(
        programs
          ?.sort((a, b) => a.programName.localeCompare(b.programName))
          .filter(
            (program) =>
              (!selectedDivision || program.divisionId === selectedDivision) &&
              (!selectedProgram || program._id === selectedProgram) &&
              (status === "both" ||
                (status === "assigned" &&
                  program.participants?.some(
                    (p) => p.codeLetter?.trim() !== ""
                  )) ||
                (status === "not-assigned" &&
                  !program.participants?.some(
                    (p) => p.codeLetter?.trim() !== ""
                  ))) &&
              (category === "both" || program.programCategory === category)
          )
      );
    } else {
      setFilteredPrograms(programs);
    }
  }, [selectedDivision, selectedProgram, programs, status, category]);

  // Handle code letter change for individual participant
  const handleCodeLetterChange = (participantUniqueId, value) => {
    const updatedPrograms = programs.map((program) => ({
      ...program,
      participants: program.participants.map((participant) =>
        participant.uniqueId === participantUniqueId
          ? { ...participant, codeLetter: value }
          : participant
      ),
    }));

    setPrograms(updatedPrograms);

    // Update filtered programs as well
    const updatedFilteredPrograms = filteredPrograms.map((program) => ({
      ...program,
      participants: program.participants.map((participant) =>
        participant.uniqueId === participantUniqueId
          ? { ...participant, codeLetter: value }
          : participant
      ),
    }));
    setFilteredPrograms(updatedFilteredPrograms);

    setChanges((prev) => ({
      ...prev,
      [participantUniqueId]: value,
    }));
  };

  // Save changes
  const handleSave = async () => {
    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      setSaving(true);

      // Group changes by registration and participant
      const updatesByRegistration = {};

      Object.entries(changes).forEach(([participantUniqueId, codeLetter]) => {
        const [registrationId, participantIndex] =
          participantUniqueId.split("-");

        if (!updatesByRegistration[registrationId]) {
          updatesByRegistration[registrationId] = {};
        }

        updatesByRegistration[registrationId][participantIndex] = codeLetter
          .trim()
          .toUpperCase();
      });

      const updates = Object.entries(updatesByRegistration).map(
        ([registrationId, participantUpdates]) => ({
          registrationId,
          participantUpdates,
        })
      );

      await updateCodeLetters.mutateAsync({
        data: {
          updates,
          ...additionalProps,
        },
      });

      setChanges({});
      await fetchRegistrationsQuery.refetch();

      toast.success("Code letters updated successfully!");
    } catch (error) {
      console.error("Error saving code letters:", error);
      toast.error(error.message || "Failed to save code letters");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (programId) => {
    try {
      await deleteCodeLetter.mutateAsync({
        data: {
          programId,
        },
      });

      await fetchRegistrationsQuery.refetch();
      toast.success("Code letters deleted successfully!");
    } catch (error) {
      console.error("Error deleting code letters:", error);
      toast.error(error.message || "Failed to delete code letters");
    }
  };

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Participant Code Letters - ${
      selectedDivision && selectedProgram
        ? divisions.find((d) => d._id === selectedDivision)?.name +
          " - " +
          programs.find((p) => p._id === selectedProgram)?.programName
        : "All Divisions"
    }`,
    pageStyle: `
      @page { 
        size: A4 portrait; 
        margin: 0.5in;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          font-size: 12px;
          line-height: 1.2;
        }
        .no-print {
          display: none !important;
        }
        
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
          font-size: 10px !important;
        }
        
        /* Table container - flexible height */
        .table-container {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        
        /* Compact table for participants */
        table {
          border-collapse: collapse !important;
          border: 1px solid #000 !important;
          width: 100% !important;
        }
        
        table th, table td {
          border: 1px solid #000 !important;
          padding: 2px 4px !important;
          text-align: left;
          vertical-align: middle;
          line-height: 1.1 !important;
          height: 25px !important;
          overflow: hidden;
          font-size: 10px !important;
        }
        
        
        table th {
          background-color: #f5f5f5 !important;
          height: 16px !important;
          font-weight: bold !important;
          color: #000 !important;
        }
        table td {
          
          font-weight: semibold !important;
        }
        
        
        /* Code letter cell - center alignment for print */
        .code-letter-cell {
          text-align: center !important;
          font-weight: bold !important;
          font-size: 10px !important;
        }
        
        /* Sign column width */
        .sign-column {
          width: 60px !important;
        }
        
       
      }
    `,
  });

  const clearFilter = () => {
    setSelectedDivision("");
    setSelectedProgram("");
  };

  const hasUnsavedChanges = Object.keys(changes).length > 0;
  const isLoading = fetchRegistrationsQuery.isLoading;

  return (
    <div className="space-y-6 ">
      {/* Controls */}
      <div className="no-print">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4 w-full">
            <div className="grid grid-cols-12 w-full gap-2">
              <div className="col-span-12 xs:col-span-6 lg:col-span-3 xl:col-span-4">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={"both"}>Both</SelectItem>
                    <SelectItem value={"assigned"}>Assigned</SelectItem>
                    <SelectItem value={"not-assigned"}>Not Assigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-12 xs:col-span-6 lg:col-span-3 xl:col-span-4">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={"both"}>Both</SelectItem>
                    <SelectItem value={"Stage"}>Stage</SelectItem>
                    <SelectItem value={"Off-Stage"}>Off-Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-12 xs:col-span-6 lg:col-span-3 xl:col-span-4">
                <Select
                  value={selectedDivision}
                  onValueChange={setSelectedDivision}
                >
                  <SelectTrigger>
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
                options={formatOptions(programsData)}
                value={selectedProgram}
                onValueChange={setSelectedProgram}
                placeholder="All Programs"
                multiSelect={false}
                className="col-span-12 xs:col-span-6 lg:col-span-6 xl:col-span-4"
              />
              {(selectedDivision || selectedProgram) && (
                <Button variant="outline" size="sm" onClick={clearFilter}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="text-sm text-muted-foreground flex items-center min-w-fit py-2 gap-1">
              <Users className="h-4 w-4" />
              {filteredPrograms.length} programs
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={handlePrint}
              disabled={filteredPrograms.length === 0}
              className="flex-1 sm:flex-none"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            {hasUnsavedChanges && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
              >
                <Save className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">
                  {saving
                    ? "Saving..."
                    : `Save (${Object.keys(changes).length})`}
                </span>
                <span className="sm:hidden">
                  {saving ? "Saving..." : "Save"}
                </span>
              </Button>
            )}
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
              <span>Loading programs and participants...</span>
            </div>
          </div>
        ) : filteredPrograms.length > 0 ? (
          <div className="space-y-8 print:space-y-0">
            {filteredPrograms.map((program, programIndex) => (
              <div key={program._id} className="program-section">
                {/* Header */}
                <PrintHeader
                  apiKey={apiKey}
                  isFestival={true}
                  title="CodeLetter"
                />
                {/* Program Header */}
                <div className="program-info mb-4 p-3 sm:p-4 bg-muted rounded-lg border print:bg-transparent print:border-none print:p-1 print:mb-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap justify-center w-full gap-2 sm:gap-4 text-xs sm:text-sm text-foreground print:text-black print:text-xs">
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

                    {!program?.hasEvaluatedParticipants && (
                      <div className="flex items-center gap-2 no-print">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deleteCodeLetter.isPending}
                            >
                              {deleteCodeLetter.isPending ? (
                                <Loader className="animate-spin h-4 w-4" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Are you sure you want to delete this?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(program.programId)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>

                {/* Participants Table with Horizontal Scroll */}
                <div className="table-container border rounded-lg overflow-hidden print:rounded-none print:border-none">
                  <div className="overflow-x-auto print:overflow-visible h-full">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center whitespace-nowrap border-t border-r border-border print:border-black">
                            Sl.
                          </TableHead>
                          <TableHead className="w-24 text-center whitespace-nowrap border-t border-r border-border print:border-black">
                            Chest No.
                          </TableHead>
                          <TableHead className="min-w-[150px] whitespace-nowrap border-t border-r border-border print:border-black">
                            Participant Name
                          </TableHead>
                          <TableHead className="min-w-[120px] whitespace-nowrap border-t border-r border-border print:border-black">
                            Team
                          </TableHead>
                          <TableHead className="w-32 text-center whitespace-nowrap border-t border-r border-border print:border-black">
                            Code Letter
                          </TableHead>
                          <TableHead className="w-20 text-center whitespace-nowrap border-t border-r border-border hidden print:table-cell print:border-black sign-column">
                            Sign
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {program.participants.length > 0 ? (
                          program.participants
                            ?.sort((a, b) => a.chestNumber - b.chestNumber)
                            .map((participant, index) => (
                              <TableRow key={participant.uniqueId}>
                                <TableCell className="text-center font-medium border-t border-r border-border print:border-black">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="text-center border-t border-r border-border print:border-black">
                                  {participant.chestNumber || "-"}
                                </TableCell>
                                <TableCell className="font-medium border-t border-r whitespace-nowrap border-border print:border-black">
                                  {participant.name || "N/A"}
                                </TableCell>
                                <TableCell className="border-t border-r border-border print:border-black">
                                  {participant.teamName || "N/A"}
                                </TableCell>

                                <TableCell className="text-center border-t border-r border-border p-0 print:border-black code-letter-cell">
                                  <div className="hidden print:block text-center font-bold text-lg p-2 whitespace-nowrap">
                                    {participant.codeLetter || ""}
                                  </div>
                                  {participant.isEvaluated ? (
                                    <span className="no-print font-medium p-2 text-red-600 whitespace-nowrap">
                                      {participant.codeLetter || "-"}
                                    </span>
                                  ) : (
                                    <Input
                                      value={participant.codeLetter || ""}
                                      onChange={(e) =>
                                        handleCodeLetterChange(
                                          participant.uniqueId,
                                          e.target.value.toUpperCase()
                                        )
                                      }
                                      className="no-print min-w-full min-h-full rounded-none border-none m-0 p-0 text-center text-sm mx-auto"
                                      maxLength={5}
                                      placeholder="Code"
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="text-center hidden print:table-cell whitespace-nowrap border-t border-r border-border print:border-black">
                                  <div className="h-6 w-16 mx-auto"></div>
                                </TableCell>
                              </TableRow>
                            ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-6 text-muted-foreground print:border-black"
                            >
                              No participants found for this program
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold">No Programs Found</h3>
            <p className="text-muted-foreground">
              {selectedDivision
                ? "No programs with participants found for the selected division."
                : "No programs with registered participants available."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeLettersComponent;
