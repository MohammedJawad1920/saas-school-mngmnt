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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Save,
  Printer,
  Filter,
  X,
  Loader,
  Users,
  FileText,
  Trash2,
} from "lucide-react";
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

const EvaluationComponent = ({
  programs = [],
  divisions = [],
  gradeSchemes = [],
  url,
  apiKey,
  additionalProps = {},
}) => {
  const [programRegistrations, setProgramRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [status, setStatus] = useState("both");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});
  const [page, setPage] = useState(0);
  const [judgeNumber, setJudgeNumber] = useState(1);

  const printRef = useRef();

  // Use CRUD operations
  const { useFetchItems } = useCrud("program-registration", apiKey);
  const { useUpdateItem: useMarksUpdate, useDeleteItem } = useCrud(
    "evaluation",
    apiKey
  );

  const updateMarks = useMarksUpdate();
  const deleteEvaluation = useDeleteItem();

  // Fetch registrations with program details
  const fetchRegistrationsQuery = useFetchItems(
    page,
    1000,
    {
      ...(selectedDivision && { divisionId: selectedDivision }),
      ...(selectedProgram && { programId: selectedProgram }),
      isCodeLetter: true,
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
        pointScheme,
        divisionId,
        divisionName,
        teamName,
        teamId,
        participantsDetails = [],
        status,
        isResultDeclared,
      } = registration;

      if (!programMap.has(programId)) {
        programMap.set(programId, {
          _id: programId,
          programId,
          programName,
          programType,
          programCategory,
          pointScheme,
          divisionId,
          divisionName,
          participants: [],
          isResultDeclared,
        });
      }

      const program = programMap.get(programId);

      // CRITICAL FIX: Use participant ID as unique identifier instead of index
      participantsDetails.forEach((participant, originalIndex) => {
        const participantData = {
          ...participant,
          registrationId,
          teamId,
          teamName,
          participantIndex: originalIndex, // Store original index for reference
          participantId: participant.id, // Use participant ID as the key
          uniqueId: `${registrationId}-${participant.id}`, // Use participant ID for uniqueId
          participantDetails: participant.participantDetails || {
            name: participant.name || "Unknown",
            chestNumber: participant.chestNumber || "N/A",
            age: participant.age || "N/A",
          },
          marksByJudges: participant.marksByJudges || [],
          totalMarks: participant.totalMarks || 0,
          averageMarks: participant.averageMarks || 0,
          isEvaluated: (participant.totalMarks || 0) > 0,
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

    filtered = filtered.filter((program) => {
      const hasMarks = program.participants?.some((p) => p.totalMarks > 0);

      if (status === "assigned") return hasMarks;
      if (status === "not-assigned") return !hasMarks;
      return true; // for "both"
    });

    setFilteredRegistrations(filtered);
  }, [selectedDivision, selectedProgram, programRegistrations, status]);

  const filteredPrograms = useMemo(() => {
    const programIds = new Set(
      filteredRegistrations.flatMap((registration) => registration.programId)
    );
    return programs?.filter(
      (program) =>
        program.divisionId === selectedDivision && programIds.has(program._id)
    );
  }, [selectedDivision, programs, filteredRegistrations]);

  // Handle marks change for individual participant
  const handleMarksChange = (participantUniqueId, marks) => {
    const marksValue = Math.max(0, Math.min(100, parseInt(marks) || 0));

    const updatedPrograms = programRegistrations.map((program) => ({
      ...program,
      participants: program.participants.map((participant) => {
        if (participant.uniqueId === participantUniqueId) {
          const updatedMarksByJudges = [...(participant.marksByJudges || [])];
          updatedMarksByJudges[judgeNumber - 1] = marksValue;

          // Calculate average marks
          const validMarks = updatedMarksByJudges.filter(
            (m) => m !== undefined && m !== null
          );
          const averageMarks =
            validMarks.length > 0
              ? Math.round(
                  validMarks.reduce((sum, mark) => sum + mark, 0) /
                    validMarks.length
                )
              : 0;

          return {
            ...participant,
            marksByJudges: updatedMarksByJudges,
            averageMarks,
            totalMarks: averageMarks,
            isEvaluated: averageMarks > 0,
          };
        }
        return participant;
      }),
    }));

    setProgramRegistrations(updatedPrograms);

    // Update filtered programs as well
    const updatedFilteredPrograms = filteredRegistrations.map((program) => ({
      ...program,
      participants: program.participants.map((participant) => {
        if (participant.uniqueId === participantUniqueId) {
          const updatedMarksByJudges = [...(participant.marksByJudges || [])];
          updatedMarksByJudges[judgeNumber - 1] = marksValue;

          const validMarks = updatedMarksByJudges.filter(
            (m) => m !== undefined && m !== null
          );
          const averageMarks =
            validMarks.length > 0
              ? Math.round(
                  validMarks.reduce((sum, mark) => sum + mark, 0) /
                    validMarks.length
                )
              : 0;

          return {
            ...participant,
            marksByJudges: updatedMarksByJudges,
            averageMarks,
            totalMarks: averageMarks,
            isEvaluated: averageMarks > 0,
          };
        }
        return participant;
      }),
    }));

    setFilteredRegistrations(updatedFilteredPrograms);

    // CRITICAL FIX: Store participant ID and registration info for backend matching
    const [registrationId, participantId] = participantUniqueId.split("-");
    setChanges((prev) => ({
      ...prev,
      [participantUniqueId]: {
        registrationId,
        participantId,
        marks: marksValue,
        judgeIndex: judgeNumber - 1,
      },
    }));
  };

  // Get grade for marks (kept for potential future use but not displayed)
  const getGradeForMarks = (marks) => {
    for (const scheme of gradeSchemes) {
      const [min, max] = scheme.markRange.split("-").map(Number);
      if (marks >= min && marks <= max) {
        return { grade: scheme.grade, points: scheme.points };
      }
    }
    return { grade: "-", points: 0 };
  };

  // handleSave function that properly handles multiple judge marks
  const handleSave = async () => {
    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      setSaving(true);

      // Group changes by registration ID AND participant ID (not just registration)
      const updatesByRegistrationAndParticipant = {};

      Object.entries(changes).forEach(([uniqueId, markData]) => {
        const { registrationId, participantId, marks, judgeIndex } = markData;

        // Create a key that combines registration and participant
        const key = `${registrationId}-${participantId}`;

        if (!updatesByRegistrationAndParticipant[key]) {
          updatesByRegistrationAndParticipant[key] = {
            registrationId,
            participantId,
            marksByJudges: {}, // Store marks by judge index
          };
        }

        // Store the marks for this specific judge
        updatesByRegistrationAndParticipant[key].marksByJudges[judgeIndex] =
          marks;
      });

      // Convert to the format expected by backend, but merge all judge marks per participant
      const updatesByRegistration = {};

      Object.values(updatesByRegistrationAndParticipant).forEach(
        ({ registrationId, participantId, marksByJudges }) => {
          if (!updatesByRegistration[registrationId]) {
            updatesByRegistration[registrationId] = [];
          }

          // Find the current participant data to get existing marks
          let existingMarksByJudges = [];

          // Find the participant in current state to get their existing marks
          for (const program of programRegistrations) {
            const participant = program.participants.find(
              (p) =>
                p.registrationId === registrationId &&
                p.participantId === participantId
            );
            if (participant) {
              existingMarksByJudges = [...(participant.marksByJudges || [])];
              break;
            }
          }

          // Merge the new marks with existing marks
          Object.entries(marksByJudges).forEach(([judgeIndex, marks]) => {
            existingMarksByJudges[parseInt(judgeIndex)] = marks;
          });

          updatesByRegistration[registrationId].push({
            participantId,
            marksByJudges: existingMarksByJudges, // Send complete marks array
          });
        }
      );

      // Convert to the format expected by backend
      const updates = Object.entries(updatesByRegistration).map(
        ([registrationId, participantUpdates]) => ({
          registrationId,
          participantUpdates,
        })
      );

      console.log("Sending updates:", JSON.stringify(updates, null, 2));

      await updateMarks.mutateAsync({
        data: {
          updates,
          ...additionalProps,
        },
      });

      setChanges({});
      await fetchRegistrationsQuery.refetch();

      toast.success("Marks updated successfully!");
    } catch (error) {
      console.error("Error saving marks:", error);
      toast.error(error.message || "Failed to save marks");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (programId) => {
    try {
      await deleteEvaluation.mutateAsync({
        data: {
          programId,
        },
      });

      await fetchRegistrationsQuery.refetch();
      toast.success("Marks deleted successfully!");
    } catch (error) {
      console.error("Error deleting marks:", error);
      toast.error(error.message || "Failed to delete marks");
    }
  };

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Marks Sheet - ${
      selectedProgram
        ? programs.find((p) => p._id === selectedProgram)?.name
        : selectedDivision
          ? divisions.find((d) => d._id === selectedDivision)?.name
          : "All Programs"
    }`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 0.5in;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
        table { page-break-inside: auto; margin-bottom: 20px; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        .program-section { page-break-inside: avoid; margin-bottom: 30px; }
      }
    `,
  });

  const clearFilters = () => {
    setSelectedDivision("");
    setSelectedProgram("");
  };

  const hasUnsavedChanges = Object.keys(changes).length > 0;
  const isLoading = fetchRegistrationsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="no-print">
        <div className="flex flex-col gap-4">
          {/* Filters Row */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 xs:col-span-6 lg:col-span-2">
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
            <div className="col-span-12 xs:col-span-6 lg:col-span-3">
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
              className="col-span-12 xs:col-span-8 lg:col-span-4"
            />

            <div className="flex items-center gap-2 col-span-10 xs:col-span-3 lg:col-span-2">
              <span className="text-sm font-medium whitespace-nowrap ">
                Judge:
              </span>
              <Select
                value={judgeNumber.toString()}
                onValueChange={(v) => setJudgeNumber(parseInt(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(selectedDivision || selectedProgram) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="w-full h-full col-span-2 xs:col-span-1 lg:col-span-1"
              >
                <X className="h-3 w-3" />
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
      </div>

      {/* Printable Content */}
      <div ref={printRef}>
        {/* Print Header */}
        <PrintHeader apiKey={apiKey} isFestival={true} />
        {/* Program Tables */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader className="animate-spin h-6 w-6" />
              <span>Loading programs and participants...</span>
            </div>
          </div>
        ) : filteredRegistrations.length > 0 ? (
          <div className="space-y-8">
            {filteredRegistrations.map((program, programIndex) => (
              <div key={program._id} className="program-section">
                {/* Program Header */}
                <div className="mb-4 p-3 sm:p-4 bg-muted rounded-lg border">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="mb-2 sm:mb-0">
                      <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-foreground">
                        <span className="whitespace-nowrap">
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

                    {!program?.isResultDeclared && (
                      <div className="flex items-center gap-2 no-print">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deleteEvaluation.isPending}
                            >
                              {deleteEvaluation.isPending ? (
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
                <div className="border rounded-lg overflow-hidden border-collapse">
                  <div className="overflow-x-auto ">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 print:w-1/12 text-center whitespace-nowrap border-t border-r border-border">
                            Sl.
                          </TableHead>

                          <TableHead className="w-20 print:w-1/12 text-center whitespace-nowrap border-t border-r border-border">
                            Code Letter
                          </TableHead>

                          <TableHead className="w-28 text-center whitespace-nowrap border-t border-r border-border no-print">
                            Judge{judgeNumber} Marks
                          </TableHead>
                          <TableHead className="w-20 text-center whitespace-nowrap border-t border-r border-border no-print">
                            Average
                          </TableHead>
                          <TableHead className="w-9/12 text-center whitespace-nowrap border-t border-r border-border hidden print:table-cell">
                            Marks
                          </TableHead>
                          <TableHead className="w-1/12 text-center whitespace-nowrap border-t border-r border-border hidden print:table-cell">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {program.participants.length > 0 ? (
                          program.participants
                            .sort((a, b) =>
                              a.codeLetter.localeCompare(b.codeLetter)
                            )
                            .map((participant, displayIndex) => {
                              const currentJudgeMarks =
                                participant.marksByJudges?.[judgeNumber - 1] ||
                                "";
                              const { grade, points } = getGradeForMarks(
                                participant.averageMarks
                              );

                              return (
                                <TableRow key={participant.uniqueId}>
                                  <TableCell className="text-center font-medium whitespace-nowrap border-t border-r border-border">
                                    {displayIndex + 1}
                                  </TableCell>

                                  <TableCell className="text-center  whitespace-nowrap border-t border-r border-border">
                                    {participant.codeLetter || "-"}
                                  </TableCell>

                                  <TableCell className="text-center border-t border-r border-border no-print">
                                    {program.isResultDeclared ? (
                                      <div className="font-bold whitespace-nowrap  ">
                                        {currentJudgeMarks || "___"}
                                      </div>
                                    ) : (
                                      <>
                                        <div className="hidden print:block font-bold whitespace-nowrap  ">
                                          {currentJudgeMarks || "___"}
                                        </div>
                                        <Input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={currentJudgeMarks}
                                          onChange={(e) =>
                                            handleMarksChange(
                                              participant.uniqueId,
                                              e.target.value
                                            )
                                          }
                                          className="no-print w-16 sm:w-20 text-center text-sm mx-auto"
                                          placeholder="0-100"
                                        />
                                      </>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center font-medium whitespace-nowrap border-t border-r border-border no-print">
                                    {participant.averageMarks > 0 ? (
                                      <Badge
                                        variant={
                                          participant.averageMarks >= 75
                                            ? "default"
                                            : participant.averageMarks >= 50
                                              ? "secondary"
                                              : "destructive"
                                        }
                                      >
                                        {participant.averageMarks}
                                      </Badge>
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center hidden print:table-cell whitespace-nowrap border-t border-r border-border"></TableCell>
                                  <TableCell className="text-center hidden print:table-cell whitespace-nowrap border-t border-r border-border"></TableCell>
                                </TableRow>
                              );
                            })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center py-6 text-muted-foreground"
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
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No Programs Found</h3>
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
          .program-section {
            page-break-inside: avoid;
            margin-bottom: 30px;
          }
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

export default EvaluationComponent;
