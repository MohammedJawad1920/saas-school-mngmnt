// components/ResultPostersSection.jsx
"use client";

import { useState, useEffect } from "react";
import ResultPoster from "./ResultPoster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ImageIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResultPostersSection({ resultData, settings }) {
  const [winners, setWinners] = useState([]);

  useEffect(() => {
    if (resultData?.participants) {
      // Get top 3 winners
      const topWinners = resultData.participants
        .filter((p) => p.rank <= 3)
        .sort((a, b) => a.rank - b.rank)
        .map((p) => ({
          rank: p.rank,
          name: p.participantDetails?.name || "Unknown",
          teamName: p.participantDetails?.teamId?.name || "NA",
          codeLetter: p.codeLetter,
          chestNumber: p.participantDetails?.chestNumber,
        }));

      setWinners(topWinners);
    }
  }, [resultData]);

  // Don't show if result is not declared or no settings
  if (!settings?.festival || !resultData?.isResultDeclared) {
    return null;
  }

  // Get poster configurations
  const posterConfigs = settings.festival.resultPosters || [];

  if (posterConfigs.length === 0) {
    return null;
  }

  // Prepare result data for posters
  const posterResult = {
    programName: resultData.programName,
    divisionName: resultData.divisionName,
    resultNumber: resultData.resultNumber,
    winners: winners,
  };

  // Download poster as image
  const downloadPoster = async (posterNumber) => {
    try {
      const element = document.getElementById(`poster-${posterNumber}`);
      if (!element) return;

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `Result-${resultData.resultNumber}-Poster-${posterNumber}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to download poster:", error);
    }
  };

  return (
    <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
      {/* Header - Mobile Optimized */}
      <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-2">
          <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
          <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800">
            Result Posters
          </CardTitle>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <Badge
            variant="outline"
            className="bg-yellow-100 text-yellow-800 border-yellow-300 px-3 py-1 text-xs sm:text-sm"
          >
            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Result #{resultData.resultNumber || "NA"}
          </Badge>
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-800 border-blue-300 text-xs sm:text-sm"
          >
            {resultData.programName}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-3 sm:px-4 md:px-6">
        {/* Posters Grid - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
          {posterConfigs.map((posterConfig, index) => (
            <div key={index} className="flex-1 relative group">
              <div id={`poster-${index + 1}`}>
                <ResultPoster
                  result={posterResult}
                  posterConfig={posterConfig}
                  posterNumber={index + 1}
                />
              </div>

              {/* Download Button Overlay - Mobile Optimized */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
                <Button
                  onClick={() => downloadPoster(index + 1)}
                  variant="secondary"
                  size="sm"
                  className="shadow-xl text-xs sm:text-sm"
                >
                  <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Download
                </Button>
              </div>

              {/* Poster Number Badge - Mobile Optimized */}
              <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-white/90 backdrop-blur-sm px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold text-gray-800 shadow-lg">
                Poster {index + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Winners List  */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 sm:p-6 border border-yellow-200">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
            Winners
          </h3>

          <div className="space-y-2 sm:space-y-3">
            {winners.map((winner, index) => (
              <div
                key={index}
                className="flex items-center gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-lg shadow-sm"
              >
                {/* Rank Badge */}
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold shadow-md text-sm sm:text-base flex-shrink-0">
                  {winner.rank}
                </div>

                {/* Winner Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                    {winner.name}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <p className="text-xs sm:text-sm text-gray-600">
                      {winner.teamName}
                    </p>
                    {winner.chestNumber && (
                      <>
                        <span className="text-gray-400">•</span>
                        <Badge variant="outline" className="text-xs px-2 py-0">
                          Chest #{winner.chestNumber}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
