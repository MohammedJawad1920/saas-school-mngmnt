"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy } from "lucide-react";
import { formatOptions } from "@/lib/utils";
import ResultPostersSection from "@/components/ResultPostersSection";
import { Input } from "@/components/ui/input";

/* ---------------------- helper utils ---------------------- */
async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}

/* -------------------- main component ---------------------- */
export default function PublicResultsPage() {
  /* --------------- state --------------- */
  const [divisions, setDivisions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [settings, setSettings] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [resultNo, setResultNo] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);

  /* --------------- fetch divisions on mount --------------- */
  useEffect(() => {
    fetchJSON("/api/divisions?projection=_id,name")
      .then((d) => setDivisions(d.divisions ?? []))
      .catch(() => setError("Unable to load divisions"));
  }, []);

  /* --------------- fetch settings on mount --------------- */
  useEffect(() => {
    fetchJSON("/api/settings")
      .then((data) => setSettings(data.settings || null))
      .catch(() => console.error("Unable to load settings"));
  }, []);

  /* --------------- fetch programs when division changes --------------- */
  useEffect(() => {
    if (!selectedDivision) {
      setPrograms([]);
      setSelectedProgram("");
      return;
    }
    fetchJSON(
      `/api/programs?divisionId=${selectedDivision}&projection=_id,name`
    )
      .then((p) => setPrograms(p.programs ?? []))
      .catch(() => setError("Unable to load programs"));
  }, [selectedDivision]);

  /* --------------- fetch results --------------- */
  useEffect(() => {
    setResults(null);
    setResultData(null);
    setShowResults(false);
    setError("");

    if (!resultNo) {
      return;
    }

    setLoading(true);

    fetchJSON(
      `/api/results?programId=${selectedProgram}&isResultDeclared=true&resultNumber=${resultNo}`
    )
      .then((r) => {
        const result = r.results?.[0];
        if (!result) {
          setError("No results found");
          return;
        }
        setResultData(result);

        const top = (result.participants ?? [])
          .filter((p) => p.rank <= 3)
          .sort((a, b) => a.rank - b.rank);

        setResults(top);
        setTimeout(() => setShowResults(true), 100);
      })
      .catch(() => setError("Unable to load results"))
      .finally(() => setLoading(false));
  }, [selectedProgram, resultNo]);

  /* --------------- memoized options --------------- */
  const divisionOptions = useMemo(
    () => divisions.map((d) => ({ value: d._id, label: d.name })),
    [divisions]
  );

  const programOptions = useMemo(
    () => programs.map((p) => ({ value: p._id, label: p.name })),
    [programs]
  );

  /* --------------- medal config --------------- */
  const getMedalConfig = useCallback((rank) => {
    if (rank === 1)
      return {
        emoji: "🥇",
        bg: "bg-yellow-100",
        border: "border-yellow-400",
        text: "text-yellow-700",
      };
    if (rank === 2)
      return {
        emoji: "🥈",
        bg: "bg-gray-100",
        border: "border-gray-400",
        text: "text-gray-700",
      };
    return {
      emoji: "🥉",
      bg: "bg-orange-100",
      border: "border-orange-400",
      text: "text-orange-700",
    };
  }, []);

  /* --------------- render winner card --------------- */
  const renderWinnerCard = useCallback(
    (participant) => {
      const rank = participant.rank;
      const name = participant.participantDetails?.name || "Unknown";
      const team = participant.participantDetails?.teamId?.name || "Unknown";
      const chest = participant.participantDetails?.chestNumber;
      const grade = participant.participantDetails?.grade;
      const points = participant.points;

      const medal = getMedalConfig(rank);

      return (
        <Card
          key={participant._id}
          className={`${medal.bg} ${medal.border} border-2 transition-all duration-500 transform ${
            showResults
              ? "translate-y-0 opacity-100"
              : "translate-y-10 opacity-0"
          } hover:scale-105 hover:shadow-xl`}
          style={{ transitionDelay: `${rank * 100}ms` }}
        >
          <CardContent className="p-6">
            <div className="text-center space-y-3">
              {/* Medal */}
              <div className="text-5xl">{medal.emoji}</div>

              {/* Rank */}
              <div className={`text-xl font-bold ${medal.text}`}>
                {rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"} Place
              </div>

              {/* Name */}
              <h3 className="text-lg font-semibold text-gray-800">{name}</h3>

              {/* Team */}
              <p className="text-sm text-gray-600">{team}</p>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 justify-center">
                {chest && (
                  <Badge variant="outline" className="text-xs">
                    Chest #{chest}
                  </Badge>
                )}
                {grade && (
                  <Badge variant="outline" className="text-xs">
                    {grade}
                  </Badge>
                )}
                {points > 0 && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                    {points} pts
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    },
    [showResults, getMedalConfig]
  );

  // 🆕 Extract festival info with defaults
  const festivalInfo = settings?.festival?.festivalInfo || {};
  const festivalName = festivalInfo.name || "esperanza";
  const festivalTheme =
    festivalInfo.theme || "Recall the legacy, Reignite the light";
  const festivalYear = festivalInfo.year || new Date().getFullYear();
  const festivalVenue = festivalInfo.venue || "Sa-adiya Da-awa College";
  const startDate = festivalInfo.dates?.startDate;
  const endDate = festivalInfo.dates?.endDate;

  // 🆕 Format dates
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fbfaf7] via-[#f5f3f0] to-[#e8e6e3]">
      {/* 🆕 DYNAMIC HEADER */}
      <div className="relative overflow-hidden bg-[#fbfaf7] border-b-2 border-[#9e623720]">
        <div className="relative z-10 py-8 px-4">
          <div className="max-w-6xl mx-auto text-center">
            {/* Theme/Tagline */}
            <p className="text-lg text-[#3f2720] mb-2 font-medium tracking-wide">
              {festivalTheme}
            </p>

            {/* Festival Name with Year */}
            <h1 className="text-6xl md:text-8xl font-black mb-4">
              <span className="text-[#3f2720]">{festivalName}</span>
              <sup className="text-3xl md:text-4xl text-[#9e6237] ml-2">
                '{festivalYear.toString().slice(-2)}
              </sup>
            </h1>

            {/* Venue/Subtitle */}
            <p className="text-xl text-[#3f2720] mb-4 font-medium">
              {festivalVenue}
            </p>

            {/* Dates */}
            {startDate && (
              <div className="flex items-center justify-center gap-4 text-[#fbfaf7]">
                <div className="bg-[#3f2720] px-4 py-2 rounded font-bold text-lg">
                  {formatDate(startDate)}
                </div>
                {endDate && (
                  <>
                    <div className="bg-[#9e6237] px-4 py-2 rounded font-bold text-lg">
                      {formatDate(endDate)}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Fallback if no dates */}
            {!startDate && (
              <p className="text-sm text-[#4b4f57] mt-2">{festivalVenue}</p>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/60 border-b border-white/20 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto p-4 h-full flex items-center justify-center">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full max-w-2xl">
            {/* Result No. */}
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Result No."
                value={resultNo}
                onChange={(e) => setResultNo(e.target.value)}
              />
            </div>

            {/* Division */}
            <div className="flex-1">
              <MultiSelect
                options={formatOptions(divisionOptions)}
                value={selectedDivision}
                onValueChange={setSelectedDivision}
                multiSelect={false}
                placeholder="Select Division"
              />
            </div>

            {/* Program */}
            <div className="flex-1">
              <MultiSelect
                options={formatOptions(programOptions)}
                value={selectedProgram}
                onValueChange={setSelectedProgram}
                multiSelect={false}
                placeholder="Select Program"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-600 font-medium">⚠️ {error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
              <Loader2 className="animate-spin text-[#9e6237]" size={24} />
              <span className="text-[#3f2720] font-medium">
                Loading results...
              </span>
            </div>
          </div>
        )}

        {/* Empty State - No Selection */}
        {!loading && !error && !selectedProgram && !results && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#9e623720] to-[#f0c76e20] rounded-full flex items-center justify-center">
                <Trophy size={48} className="text-[#9e6237]" />
              </div>
              <h3 className="text-2xl font-bold text-[#3f2720] mb-4">
                Ready to Reveal Champions
              </h3>
              <p className="text-[#4b4f57] leading-relaxed">
                Select a division and program above to see the podium winners.
              </p>
            </div>
          </div>
        )}

        {/* Empty State - No Results */}
        {!loading &&
          !error &&
          selectedProgram &&
          results &&
          results.length === 0 && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <h3 className="text-2xl font-bold text-[#3f2720] mb-4">
                  Results Coming Soon
                </h3>
                <p className="text-[#4b4f57] leading-relaxed">
                  The competition results haven't been declared yet. Check back
                  soon!
                </p>
              </div>
            </div>
          )}

        {/* Winners Display */}
        {!loading && !error && results && results.length > 0 && (
          <div className="space-y-12">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-4xl font-black text-[#3f2720] mb-4">
                🏆 Champions Podium
              </h2>
              <p className="text-[#4b4f57] text-lg">
                Congratulations to our winners!
              </p>
            </div>

            {/* Winner Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {results.map((participant) => renderWinnerCard(participant))}
            </div>
          </div>
        )}

        {/* Result Posters */}
        {resultData && settings && (
          <ResultPostersSection resultData={resultData} settings={settings} />
        )}
      </div>
    </div>
  );
}
