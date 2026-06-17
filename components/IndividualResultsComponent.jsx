"use client";
import { useState, useEffect, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Trophy,
  Printer,
  Search,
  FileText,
  User,
  Award,
  Target,
  Calendar,
  Users,
  Loader,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import useCrud from "@/hooks/use-crud";
import PrintHeader from "./PrintHeader";
import { MultiSelect } from "./ui/multi-select";
import { formatOptions } from "@/lib/utils";

const IndividualResultsComponent = ({ divisions = [], apiKey }) => {
  const [participants, setParticipants] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [chestNumberSearch, setChestNumberSearch] = useState("");
  const [participantResults, setParticipantResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchByChestNumber, setSearchByChestNumber] = useState(false);

  const printRef = useRef();

  // Use CRUD operations
  const { useFetchItems: useFetchParticipants } = useCrud(
    "participants",
    apiKey
  );

  // Create query parameters based on search type
  const getQueryParams = () => {
    if (searchByChestNumber && chestNumberSearch.trim()) {
      return { chestNumber: chestNumberSearch.trim() };
    }
    if (selectedDivision) {
      return { divisionId: selectedDivision };
    }
    return {};
  };

  // Fetch participants based on division or chest number
  const fetchParticipantsQuery = useFetchParticipants(
    0,
    1000,
    getQueryParams(),
    {
      retry: 2,
      retryDelay: 1000,
      enabled: !!selectedDivision,
    }
  );

  // Process fetched participants
  useEffect(() => {
    if (fetchParticipantsQuery.data) {
      const fetchedParticipants =
        fetchParticipantsQuery.data.participants || [];
      setParticipants(fetchedParticipants);

      // If searching by chest number and found exactly one participant, auto-select it
      if (searchByChestNumber && fetchedParticipants.length === 1) {
        const participant = fetchedParticipants[0];
        setSelectedParticipant(participant._id);
        setParticipantResults(participant);
        setSelectedDivision(participant.divisionId);
        toast.success(`Found participant: ${participant.name}`);
        setSearchByChestNumber(false);
        setLoading(false);
      } else if (searchByChestNumber && fetchedParticipants.length === 0) {
        toast.error("No participant found with this chest number");
        setSearchByChestNumber(false);
        setLoading(false);
      } else if (searchByChestNumber && fetchedParticipants.length > 1) {
        // Multiple participants found (shouldn't happen with unique chest numbers)
        toast.error("Multiple participants found with this chest number");
        setSearchByChestNumber(false);
        setLoading(false);
      }
    }
  }, [fetchParticipantsQuery.data, searchByChestNumber]);

  // Handle participant selection
  const handleParticipantSelect = (participantId) => {
    setSelectedParticipant(participantId);
    const participant = participants.find((p) => p._id === participantId);
    if (participant) {
      setParticipantResults(participant);
    }
  };

  // Handle chest number search
  const handleChestNumberSearch = () => {
    if (!chestNumberSearch.trim()) {
      toast.error("Please enter a chest number");
      return;
    }

    setLoading(true);
    setSearchByChestNumber(true);

    // Clear previous selections
    setSelectedDivision("");
    setSelectedParticipant("");
    setParticipantResults(null);

    // The useEffect will handle the rest when the query completes
  };

  // Reset search state when chest number is cleared
  useEffect(() => {
    if (!chestNumberSearch.trim()) {
      setSearchByChestNumber(false);
    }
  }, [chestNumberSearch]);

  // Handle division change - clear chest number search
  const handleDivisionChange = (divisionId) => {
    setSelectedDivision(divisionId);
    setSelectedParticipant("");
    setParticipantResults(null);
    setChestNumberSearch("");
    setSearchByChestNumber(false);
  };

  // Get programs with points > 0
  const getParticipantPrograms = (participant) => {
    if (!participant || !participant.programs) return [];

    return participant.programs
      .filter((program) => program.points > 0)
      .map((program, index) => ({
        slNo: index + 1,
        programName: program.name || "Unknown Program",
        divisionName: participant.divisionName || "Unknown Division",
        category: program.category || "Unknown Category",
        points: program.points,
        rank: program.rank,
        type: program.type || "Unknown Type",
      }));
  };

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: participantResults
      ? `Individual Result - ${participantResults.chestNumber} - ${participantResults.name}`
      : "Individual Result",
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 0.5in;
      }
      @media print {
        body { 
          -webkit-print-color-adjust: exact; 
          font-size: 12px;
          line-height: 1.3;
        }
        .no-print { display: none !important; }
        
        .print-container {
          width: 100%;
        }
        
        .participant-header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        
        .participant-title {
          font-size: 16px !important;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .participant-info {
          font-size: 14px;
          margin-bottom: 10px;
        }
        
        table {
          border-collapse: collapse !important;
          border: 2px solid #000 !important;
          width: 100% !important;
          margin-top: 10px;
        }
        
        table th, table td {
          border: 1px solid #000 !important;
          padding: 8px !important;
          text-align: left;
          vertical-align: middle;
          font-size: 12px !important;
        }
        
        table th {
          background-color: #f5f5f5 !important;
          font-weight: bold !important;
          text-align: center !important;
        }
        
        .rank-cell {
          text-align: center !important;
          font-weight: bold;
        }
        
        .points-cell {
          text-align: center !important;
          font-weight: bold;
        }
        
        .summary-section {
          margin-top: 20px;
          border-top: 1px solid #000;
          padding-top: 10px;
        }

        .mobile-card { display: none !important; }
        .desktop-table { display: table !important; }
      }
    `,
  });

  const programsWithPoints = participantResults
    ? getParticipantPrograms(participantResults)
    : [];
  const totalPoints = participantResults
    ? (participantResults.stagePoints || 0) +
      (participantResults.offStagePoints || 0)
    : 0;

  // Get position variant for badges
  const getPositionVariant = (rank) => {
    switch (rank) {
      case 1:
        return "default"; // Gold
      case 2:
        return "secondary"; // Silver
      case 3:
        return "outline"; // Bronze
      default:
        return "destructive";
    }
  };

  const getPositionIcon = (rank) => {
    if (rank <= 3) return <Trophy className="h-3 w-3" />;
    return null;
  };

  return (
    <div className="space-y-4 sm:space-y-6 ">
      {/* Controls */}
      <div className="no-print">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-12 gap-2 sm:gap-3">
            {/* Division Filter */}
            <div className="col-span-12 xs:col-span-6 sm:col-span-3">
              <Select
                value={selectedDivision}
                onValueChange={handleDivisionChange}
              >
                <SelectTrigger className="h-9 sm:h-10 text-sm">
                  <SelectValue placeholder="Select Division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((division) => (
                    <SelectItem key={division._id} value={division._id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Participant Selector */}
            <div className="col-span-12 xs:col-span-6 sm:col-span-5">
              <MultiSelect
                options={formatOptions(participants)}
                value={selectedParticipant}
                onValueChange={handleParticipantSelect}
                placeholder="Select Participant"
                multiSelect={false}
              />
            </div>

            {/* Chest Number Search */}
            <Input
              placeholder="Chest number"
              value={chestNumberSearch}
              onChange={(e) => setChestNumberSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChestNumberSearch()}
              className="h-9 sm:h-10 text-sm col-span-12 xs:col-span-6 sm:col-span-3"
            />

            <Button
              onClick={handleChestNumberSearch}
              disabled={loading || !chestNumberSearch.trim()}
              variant="default"
              className="h-9 sm:h-10 text-sm col-span-12 xs:col-span-6 sm:col-span-1"
            >
              {loading ? (
                <Loader className="animate-spin h-3 w-3 sm:h-4 sm:w-4 " />
              ) : (
                <Search className="h-3 w-3 sm:h-4 sm:w-4 " />
              )}
            </Button>
          </div>

          {/* Stats and Print Button */}
          {participantResults && (
            <div className="flex flex-col gap-3 p-3 sm:p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1 sm:gap-2">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                  <span className="font-medium truncate">
                    {participantResults.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Target className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                  <span className="truncate">
                    {programsWithPoints.length} programs
                  </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Award className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
                  <span className="truncate">{totalPoints} points</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0" />
                  <span className="truncate">
                    {participantResults.teamName}
                  </span>
                </div>
              </div>

              <Button
                onClick={handlePrint}
                disabled={programsWithPoints.length === 0}
                className="w-full h-8 sm:h-10 text-sm"
                size="sm"
              >
                <Printer className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Print Result
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="print-container">
        {participantResults ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Print Header */}
            <PrintHeader apiKey={apiKey} isFestival={true} />

            {/* Participant Header */}
            <div className="participant-header text-center">
              <div className="participant-title text-lg sm:text-xl font-bold mb-2">
                {participantResults.chestNumber} - {participantResults.name}
              </div>
              <div className="participant-info text-sm">
                <strong>Team:</strong> {participantResults.teamName} |{" "}
                <strong>Total Points:</strong> {totalPoints}
              </div>
            </div>

            {/* Results - Mobile Cards (hidden on print) */}
            {programsWithPoints.length > 0 && (
              <div className="mobile-card block sm:hidden space-y-3">
                {programsWithPoints.map((program) => (
                  <div
                    key={program.slNo}
                    className="border rounded-lg p-3 bg-card"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm leading-tight mb-1">
                          {program.programName}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {program.divisionName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {getPositionIcon(program.rank)}
                        <Badge
                          variant={getPositionVariant(program.rank)}
                          className="text-xs h-5"
                        >
                          #{program.rank}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <Badge variant="outline" className="text-xs h-5">
                        {program.category}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-xs h-5 font-medium"
                      >
                        {program.points} pts
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results Table - Desktop (visible on print) */}
            {programsWithPoints.length > 0 && (
              <div className="desktop-table hidden sm:block border rounded-lg overflow-hidden print:border-2 print:border-black print:rounded-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 sm:w-16 text-center border-r border-border print:border-black text-xs sm:text-sm">
                        Sl No.
                      </TableHead>
                      <TableHead className="border-r border-border print:border-black text-xs sm:text-sm">
                        Program
                      </TableHead>
                      <TableHead className="border-r border-border print:border-black text-xs sm:text-sm">
                        Division
                      </TableHead>
                      <TableHead className="border-r border-border print:border-black text-xs sm:text-sm">
                        Category
                      </TableHead>
                      <TableHead className="w-16 sm:w-20 text-center border-r border-border print:border-black text-xs sm:text-sm">
                        Points
                      </TableHead>
                      <TableHead className="w-12 sm:w-16 text-center border-r border-border print:border-black text-xs sm:text-sm">
                        Rank
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programsWithPoints.map((program) => (
                      <TableRow key={program.slNo}>
                        <TableCell className="text-center font-medium border-r border-border print:border-black text-xs sm:text-sm">
                          {program.slNo}
                        </TableCell>
                        <TableCell className="font-medium border-r border-border print:border-black text-xs sm:text-sm">
                          {program.programName}
                        </TableCell>
                        <TableCell className="border-r border-border print:border-black text-xs sm:text-sm">
                          {program.divisionName}
                        </TableCell>
                        <TableCell className="capitalize border-r border-border print:border-black text-xs sm:text-sm">
                          <Badge
                            variant="outline"
                            className="print:hidden text-xs"
                          >
                            {program.category}
                          </Badge>
                          <span className="hidden print:inline">
                            {program.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-center points-cell border-r border-border print:border-black text-xs sm:text-sm">
                          <Badge
                            variant="secondary"
                            className="print:hidden text-xs"
                          >
                            {program.points}
                          </Badge>
                          <span className="hidden print:inline font-bold">
                            {program.points}
                          </span>
                        </TableCell>
                        <TableCell className="text-center rank-cell border-r border-border print:border-black text-xs sm:text-sm">
                          <div className="flex items-center justify-center gap-1">
                            {getPositionIcon(program.rank)}
                            <Badge
                              variant={getPositionVariant(program.rank)}
                              className="print:hidden text-xs"
                            >
                              {program.rank}
                            </Badge>
                            <span className="hidden print:inline font-bold">
                              {program.rank}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* No Results */}
            {programsWithPoints.length === 0 && (
              <div className="text-center py-6 sm:py-8 border rounded-lg bg-muted print:border-black">
                <FileText className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4 print:hidden" />
                <h3 className="text-base sm:text-lg font-semibold mb-1">
                  No Results Found
                </h3>
                <p className="text-muted-foreground text-sm">
                  This participant has no programs with points greater than 0.
                </p>
              </div>
            )}

            {/* Summary Section for Print */}
            {programsWithPoints.length > 0 && (
              <div className="summary-section hidden print:block">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <strong>Total Programs:</strong> {programsWithPoints.length}
                  </div>
                  <div>
                    <strong>Total Points:</strong> {totalPoints}
                  </div>
                  <div>
                    <strong>Winning Programs:</strong>{" "}
                    {programsWithPoints.filter((p) => p.rank <= 3).length}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <User className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              Select a Participant
            </h3>
            <p className="text-muted-foreground text-sm">
              Choose a division and participant, or search by chest number to
              view individual results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndividualResultsComponent;
