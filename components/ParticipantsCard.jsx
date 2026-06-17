"use client";
import { useRef, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, CreditCard, ListTodo } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Header from "./Header";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { MultiSelect } from "./ui/multi-select";
import { formatOptions } from "@/lib/utils";

const ParticipantsCard = ({
  participants = [],
  divisions = [],
  teams = [],
  festivalSettings = {},
}) => {
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [viewMode, setViewMode] = useState("both"); // New state for view mode

  const pageRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: pageRef,
    documentTitle: "Participants Cards",
  });

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  // Memoize filtered participants to prevent recalculation on every render
  const filteredParticipants = useMemo(() => {
    return participants
      .filter(
        (participant) =>
          (!selectedDivision || participant.divisionId === selectedDivision) &&
          (!selectedTeam || participant.teamId === selectedTeam) &&
          (!selectedParticipant || participant._id === selectedParticipant)
      )
      .map((participant) => ({
        ...participant,
        programs: participant?.programs?.filter(
          (program) =>
            program?.type === "Individual" &&
            program?.divisionType === "Primary"
        ),
      }));
  }, [participants, selectedDivision, selectedTeam, selectedParticipant]);

  // Memoize filtered teams based on selected division
  const teamsInSelectedDivision = useMemo(() => {
    if (!selectedDivision) return teams;
    const participantsInDivision = participants.filter(
      (p) => p.divisionId === selectedDivision
    );
    const teamIds = [...new Set(participantsInDivision.map((p) => p.teamId))];
    return teams.filter((team) => teamIds.includes(team._id));
  }, [teams, participants, selectedDivision]);

  // Memoize filtered participants based on selected team
  const filteredOptions = useMemo(() => {
    return participants.filter(
      (participant) =>
        (!selectedDivision || participant.divisionId === selectedDivision) &&
        (!selectedTeam || participant.teamId === selectedTeam)
    );
  }, [participants, selectedDivision, selectedTeam]);

  if (!participants.length) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
          No participant records available
        </p>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="PARTICIPANTS CARD"
        subTitle="Official Identity for Festival Participants"
      />

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/4">
          <label htmlFor="division-select" className="sr-only">
            Select a Division
          </label>
          <Select value={selectedDivision} onValueChange={setSelectedDivision}>
            <SelectTrigger className="w-full" id="division-select">
              <SelectValue placeholder="Select a Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={null}>All Divisions</SelectItem>
                {divisions.map((division) => (
                  <SelectItem key={division._id} value={division._id}>
                    {division.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-1/4">
          <label htmlFor="team-select" className="sr-only">
            Select a Team
          </label>
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-full" id="team-select">
              <SelectValue placeholder="Select a Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={null}>All Teams</SelectItem>
                {teamsInSelectedDivision.map((team) => (
                  <SelectItem key={team._id} value={team._id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {selectedTeam && (
          <div className="w-full md:w-1/4">
            <MultiSelect
              options={formatOptions(filteredOptions)}
              value={selectedParticipant}
              onValueChange={setSelectedParticipant}
              multiSelect={false}
              placeholder="Select a Participant"
            />
          </div>
        )}
      </div>

      {/* View Mode Filter and Print Button Row */}
      <div className="flex flex-row justify-between items-center gap-4 mb-8">
        {/* View Mode Filter */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">
            View:
          </span>
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "both" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("both")}
              className="rounded-r-none text-xs sm:text-sm px-2 sm:px-3"
            >
              <span className="hidden sm:inline">Both</span>
              <span className="sm:hidden">All</span>
            </Button>
            <Button
              variant={viewMode === "front" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("front")}
              className="rounded-none border-x-0 text-xs sm:text-sm px-2 sm:px-3"
            >
              <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
              <span className="hidden sm:inline">Front</span>
            </Button>
            <Button
              variant={viewMode === "back" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("back")}
              className="rounded-l-none text-xs sm:text-sm px-2 sm:px-3"
            >
              <ListTodo className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </div>
        </div>
        {/* Print Button */}
        <Button
          onClick={handlePrint}
          aria-label="Print Participant Cards"
          variant="default"
        >
          <Printer size={16} />
          Print
        </Button>
      </div>

      {/* Screen Preview */}
      <div className="grid grid-cols-12 gap-4 print:hidden">
        {filteredParticipants.map((participant) => (
          <ParticipantCard
            key={participant._id}
            participant={participant}
            festivalSettings={festivalSettings}
            viewMode={viewMode}
          />
        ))}
      </div>

      {/* Print Layout - A4 Landscape with Front-Back-Front-Back pattern */}
      <div ref={pageRef} className="hidden print:block">
        {Array.from({
          length: Math.ceil(
            filteredParticipants.length / (viewMode === "both" ? 4 : 8)
          ),
        }).map((_, pageIndex) => (
          <div
            key={`page-${pageIndex}`}
            className="print-page w-full p-4 flex flex-wrap"
            style={{
              width: "297mm",
              height: "210mm",
              pageBreakAfter: "always",
              pageBreakInside: "avoid",
              breakAfter: "page",
            }}
            aria-hidden="true"
          >
            <div className="print:hidden text-xs text-gray-400 dark:text-gray-500">
              Page {pageIndex + 1}
            </div>

            {filteredParticipants
              .slice(
                pageIndex * (viewMode === "both" ? 4 : 8),
                (pageIndex + 1) * (viewMode === "both" ? 4 : 8)
              )
              .map((participant) => (
                <PrintableParticipantCard
                  key={`print-${participant._id}`}
                  participant={participant}
                  festivalSettings={festivalSettings}
                  viewMode={viewMode}
                />
              ))}
          </div>
        ))}
      </div>

      {/* Enhanced CSS for print and display */}
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

          .preview-container {
            display: none;
          }

          .print-page {
            page-break-after: always;
            break-after: page;
          }
        }

        .preview-container {
          transition: all 0.3s ease;
        }

        .preview-container:hover {
          transform: translateY(-4px);
        }

        .text-shadow-strong {
          text-shadow:
            -2px -2px 0 rgba(0, 0, 0, 0.8),
            2px -2px 0 rgba(0, 0, 0, 0.8),
            -2px 2px 0 rgba(0, 0, 0, 0.8),
            2px 2px 0 rgba(0, 0, 0, 0.8),
            0 0 4px rgba(0, 0, 0, 0.8);
        }

        .backdrop-enhanced {
          backdrop-filter: blur(4px) saturate(180%);
          -webkit-backdrop-filter: blur(4px) saturate(180%);
        }
      `}</style>
    </div>
  );
};

export default ParticipantsCard;

// Extracted component for participant card preview
const ParticipantCard = ({ participant, festivalSettings, viewMode }) => {
  const participantsCardSettings = festivalSettings?.participantsCard || {};
  const participantsCardBackgroundUrl =
    participantsCardSettings?.backgroundImage?.url || "";

  // Single text color for all elements
  const textColor = participantsCardSettings?.textColor || "#000000";

  // Determine grid columns based on view mode

  return (
    <div
      className={`preview-container col-span-12 xs:col-span-6 md:col-span-4 xl:col-span-3 gap-4`}
    >
      {/* Front Side Preview */}
      {(viewMode === "both" || viewMode === "front") && (
        <Card className="border-border border overflow-hidden border-none mb-4">
          <CardContent className="p-0">
            <div
              style={{
                backgroundImage: participantsCardBackgroundUrl
                  ? `url(${participantsCardBackgroundUrl})`
                  : undefined,
                backgroundColor: participantsCardBackgroundUrl
                  ? undefined
                  : "#f8f9fa",
              }}
              className={`relative bg-cover bg-center w-full aspect-[1/1.4] p-3 rounded shadow ${
                !participantsCardBackgroundUrl ? "bg-card" : ""
              }`}
            >
              {/* Participant Details */}
              <div
                className="absolute text-center"
                style={{
                  left: `${participantsCardSettings?.textPositions?.left || 0}%`,
                  right: `${participantsCardSettings?.textPositions?.right || 0}%`,
                  bottom: `${participantsCardSettings?.textPositions?.bottom || 0}%`,
                }}
              >
                {/* Chest Number with enhanced visibility */}
                <div className="backdrop-enhanced">
                  <h2
                    className="text-lg font-bold text-shadow-strong"
                    style={{ color: textColor }}
                  >
                    {participant.chestNumber || "N/A"}
                  </h2>
                </div>

                {/* Participant Name with enhanced visibility */}
                <div className="backdrop-enhanced">
                  <h3
                    className="font-bold text-base text-shadow-strong"
                    style={{ color: textColor }}
                  >
                    {participant.name}
                  </h3>
                </div>

                {/* Team and Division with enhanced visibility */}
                <div className="text-xs text-center">
                  <div className="backdrop-enhanced">
                    <p
                      className="font-semibold text-shadow-strong"
                      style={{ color: textColor }}
                    >
                      TEAM: {participant.teamName}
                    </p>
                  </div>
                  <div className="backdrop-enhanced">
                    <p
                      className="font-semibold text-shadow-strong"
                      style={{ color: textColor }}
                    >
                      DIVISION: {participant.divisionName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back Side Preview */}
      {(viewMode === "both" || viewMode === "back") && (
        <Card className="overflow-hidden border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 flex flex-col h-full md:aspect-[1/1.4] bg-white dark:bg-gray-800">
            <div className="border-b border-gray-200 dark:border-gray-600 pb-2 mb-3">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 text-center">
                {participant.chestNumber} - Individual Programs
              </h3>
            </div>

            <ParticipantPrograms participant={participant} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Extracted component for participant programs
const ParticipantPrograms = ({ participant }) => {
  const programs = participant.programs || [];
  const stagePrograms = programs.filter(
    (program) => program.category === "Stage"
  );
  const offStagePrograms = programs.filter(
    (program) => program.category !== "Stage"
  );

  return (
    <div className="relative flex-grow">
      <div className="relative z-10">
        {programs.length > 0 ? (
          <div>
            {stagePrograms?.length > 0 && (
              <>
                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  Stage Programs
                </h2>
                {stagePrograms.map((program, index) => (
                  <div key={index}>
                    <div className="font-semibold text-gray-800 text-xs dark:text-gray-200">
                      {index + 1}. {program.name || "Unknown Program"}
                    </div>
                  </div>
                ))}
              </>
            )}
            {offStagePrograms?.length > 0 && (
              <>
                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-3">
                  Off Stage Programs
                </h2>
                {offStagePrograms.map((program, index) => (
                  <div key={index}>
                    <div className="font-semibold text-gray-800 text-xs dark:text-gray-200">
                      {index + 1}. {program.name || "Unknown Program"}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
            No programs registered
          </div>
        )}
      </div>
    </div>
  );
};

// Extracted component for printable participant card
const PrintableParticipantCard = ({
  participant,
  festivalSettings,
  viewMode,
}) => {
  const participantsCardSettings = festivalSettings?.participantsCard || {};
  const participantsCardBackgroundUrl =
    participantsCardSettings?.backgroundImage?.url || "";

  // Single text color for all elements
  const textColor = participantsCardSettings?.textColor || "#000000";

  // Calculate card width and layout based on view mode
  const getCardLayout = () => {
    if (viewMode === "both") {
      return {
        containerClass: "w-1/2 h-1/2 p-2 flex space-x-2",
        cardClass: "w-full",
      };
    } else {
      return {
        containerClass: "w-1/4 h-1/2 p-2 flex",
        cardClass: "w-full",
      };
    }
  };

  const { containerClass, cardClass } = getCardLayout();

  return (
    <div className={containerClass} style={{ pageBreakInside: "avoid" }}>
      {/* Front Side Card */}
      {(viewMode === "both" || viewMode === "front") && (
        <div
          className={`border rounded shadow ${cardClass} overflow-hidden ${viewMode === "both" ? "mr-2" : ""}`}
        >
          <div
            style={{
              backgroundImage: participantsCardBackgroundUrl
                ? `url(${participantsCardBackgroundUrl})`
                : undefined,
              backgroundColor: participantsCardBackgroundUrl
                ? undefined
                : "#ffffff",
            }}
            className="relative bg-cover bg-center w-full aspect-[1/1.4] p-3 rounded shadow flex flex-col"
          >
            {/* Participant Details */}
            <div
              className="absolute text-center"
              style={{
                left: `${participantsCardSettings?.textPositions?.left || 0}%`,
                right: `${participantsCardSettings?.textPositions?.right || 0}%`,
                bottom: `${participantsCardSettings?.textPositions?.bottom || 0}%`,
              }}
            >
              {/* Chest Number - Print Version */}
              <div className="">
                <h2
                  className="font-bold text-lg"
                  style={{
                    color: textColor,
                  }}
                >
                  {participant.chestNumber || "N/A"}
                </h2>
              </div>

              {/* Name - Print Version */}
              <div className="">
                <h3
                  className="font-bold text-base"
                  style={{
                    color: textColor,
                  }}
                >
                  {participant.name}
                </h3>
              </div>

              {/* Team and Division - Print Version */}
              <div className="text-xs">
                <div className="">
                  <p
                    className="font-semibold"
                    style={{
                      color: textColor,
                    }}
                  >
                    TEAM: {participant.teamName}
                  </p>
                </div>
                <div className="">
                  <p
                    className="font-semibold"
                    style={{
                      color: textColor,
                    }}
                  >
                    DIV: {participant.divisionName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back Side Card */}
      {(viewMode === "both" || viewMode === "back") && (
        <div className={`border rounded shadow ${cardClass} overflow-hidden`}>
          <div className="p-2 bg-white aspect-[1/1.4] flex flex-col">
            <div className="border-b border-gray-200 pb-1 mb-2">
              <h3 className="text-xs font-bold text-gray-800 text-center">
                {participant.chestNumber} - Individual Programs
              </h3>
            </div>

            <ParticipantPrograms participant={participant} />
          </div>
        </div>
      )}
    </div>
  );
};
