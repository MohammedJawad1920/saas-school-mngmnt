"use client";

// components/scratch/ScratchCards.jsx
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScratchCard } from "@/components/ScratchCard";
import { generateRandomLetters } from "@/lib/utils";

export default function ScratchCards() {
  const [cardCount, setCardCount] = useState(6);
  const [letters, setLetters] = useState([]);
  const [revealedCounts, setRevealedCounts] = useState({});
  const [generation, setGeneration] = useState(0);

  /**
   * Generate new set of scratch cards with random letters
   */
  const handleGenerate = useCallback(() => {
    const newLetters = generateRandomLetters(cardCount);
    setLetters(newLetters);
    setRevealedCounts({}); // Reset reveal tracking
    setGeneration((prev) => prev + 1);
  }, [cardCount]);

  /**
   * Handle reveal percentage changes for individual cards
   */
  const handleRevealChange = useCallback((index, percent) => {
    setRevealedCounts((prev) => ({
      ...prev,
      [index]: percent,
    }));
  }, []);

  /**
   * Handle input change with validation
   */
  const handleCountChange = (e) => {
    const value = e.target.value;

    // Allow empty string (user is clearing the input)
    if (value === "") {
      setCardCount(""); // Temporarily allow empty state
      return;
    }

    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setCardCount(Math.max(1, Math.min(26, numValue)));
    }
  };

  // Also add onBlur handler to ensure valid value when user leaves the field
  const handleInputBlur = () => {
    if (cardCount === "" || cardCount < 1) {
      setCardCount(1); // Default to 1 if invalid
    }
  };

  const totalCards = letters.length;
  const revealedCards = Object.values(revealedCounts).filter(
    (percent) => percent >= 40
  ).length;

  return (
    <div className="w-full space-y-6">
      {/* Control Panel */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 max-w-xs">
            <label
              htmlFor="card-count"
              className="block text-sm font-medium mb-2"
            >
              Number of Participants
            </label>
            <Input
              type="number"
              min="1"
              max="26"
              value={cardCount}
              onChange={handleCountChange}
              onBlur={handleInputBlur}
              className="w-full"
              placeholder="1-26"
            />
          </div>

          <Button onClick={handleGenerate} size="default" className="px-8">
            Generate Cards
          </Button>
        </div>

        {/* Stats Display */}
        {totalCards > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              Participants:{" "}
              <span className="font-semibold text-foreground">
                {totalCards}
              </span>
              {" • "}
              Codes Revealed:{" "}
              <span className="font-semibold text-foreground">
                {revealedCards}
              </span>
              {" • "}
              Remaining:{" "}
              <span className="font-semibold text-foreground">
                {totalCards - revealedCards}
              </span>
            </p>
          </div>
        )}
      </Card>

      {/* Instructions */}
      {letters.length === 0 && (
        <Card className="p-6 text-center">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Ready to Start?</h3>
            <p className="text-muted-foreground">
              Enter the number of participants (1-26), and get sequential
              letters (a,b,c...) in random order for code picking!
            </p>
            <div className="text-sm text-muted-foreground mt-4 space-y-1">
              <p>
                <strong>Example:</strong> Type "5" → Get letters A,B,C,D,E in
                random positions
              </p>
              <p>
                <strong>Mouse/Touch:</strong> Click and drag to scratch
              </p>
              <p>
                <strong>Keyboard:</strong> Space/Enter to toggle scratch mode,
                arrow keys to scratch, R to reveal
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Scratch Cards Grid */}
      {letters.length > 0 && (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {letters.map((letter, index) => (
            <div
              key={`${letter}-${index}-${generation}`}
              className="flex justify-center"
            >
              <ScratchCard
                letter={letter}
                size={200}
                brushRadius={16}
                onRevealChange={(percent) => handleRevealChange(index, percent)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Completion Message */}
      {totalCards > 0 && revealedCards === totalCards && (
        <Card className="p-6 text-center bg-green-50 border-green-200">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-green-800">
              🎉 All Codes Revealed!
            </h3>
            <p className="text-green-700">
              All {totalCards} participant codes have been revealed. Everyone
              now has their assigned letter!
            </p>

            <Button
              onClick={handleGenerate}
              variant="outline"
              className="mt-4 border-green-300 text-green-700 hover:bg-green-100"
            >
              Generate New Participant Cards
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
