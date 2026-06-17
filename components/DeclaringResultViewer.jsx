"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, Sparkles, Trophy, Sun, Moon, RotateCcw, Layout, Search, Loader2, Award, User, Users, TrendingUp, Star, Crown, BarChart3, MonitorPlay } from "lucide-react";
import DashboardTopBar from "./DashboardTopBar";

const STEPS = {
  INPUT: "INPUT",
  ANNOUNCEMENT: "ANNOUNCEMENT",
  PROGRAM_HEADER: "PROGRAM_HEADER",
  FIRST_PLACE: "FIRST_PLACE",
  SECOND_PLACE: "SECOND_PLACE",
  THIRD_PLACE: "THIRD_PLACE",
  OTHERS: "OTHERS",
  PODIUM: "PODIUM"
};

const REVEAL_STAGES = {
  CHEST: "CHEST",
  PHOTO: "PHOTO",
  NAME: "NAME",
  TEAM: "TEAM",
  POINTS: "POINTS",
  LABEL: "LABEL"
};

// Robust rank parser
const parseRank = (r) => {
    if (typeof r === 'number') return r;
    if (!r) return 0;
    const match = r.toString().match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
};

const getRankTheme = (rank, isWhiteTheme) => {
  switch (rank) {
    case 1:
      return {
        text: "text-amber-500",
        bg: "from-yellow-400 to-yellow-600",
        border: "border-yellow-400",
        shadow: "shadow-[0_0_50px_rgba(250,204,21,0.3)]",
        label: "1st Prize"
      };
    case 2:
      return {
        text: "text-slate-300",
        bg: "from-slate-300 to-slate-500",
        border: "border-slate-300",
        shadow: "shadow-[0_0_50px_rgba(203,213,225,0.3)]",
        label: "2nd Prize"
      };
    case 3:
      return {
        text: "text-amber-700",
        bg: "from-amber-600 to-amber-800",
        border: "border-amber-600",
        shadow: "shadow-[0_0_50px_rgba(217,119,6,0.3)]",
        label: "3rd Prize"
      };
    default:
      return {
        text: isWhiteTheme ? "text-zinc-500" : "text-zinc-400",
        bg: "from-zinc-400 to-zinc-600",
        border: "border-zinc-500",
        shadow: "shadow-none",
        label: "Consolation"
      };
  }
};

const getDarkerColor = (hex, percent = 30) => {
  if (!hex || hex === "transparent") return "#404040";
  const num = parseInt(hex.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) - amt,
    G = ((num >> 8) & 0x00ff) - amt,
    B = (num & 0x0000ff) - amt;
  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
};

const getContrastColor = (hexcolor) => {
  if (!hexcolor || hexcolor === "transparent") return "text-white";
  const hex = hexcolor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "text-zinc-950" : "text-white";
};

const getTeamBgColor = (teamColor) => {
  return teamColor || "#808080";
};

export default function DeclaringResultViewer({ isOpen, onClose, apiKey, onNavigate, isWhiteTheme, setIsWhiteTheme }) {
  const [step, setStep] = useState(STEPS.INPUT);
  const [resultNumber, setResultNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState("");
  const inputRef = React.useRef(null);

  useEffect(() => {
    if (step === STEPS.INPUT && isOpen && inputRef.current) {
        inputRef.current.focus();
    }
  }, [step, isOpen]);

  const reset = useCallback(() => {
    setStep(STEPS.INPUT);
    setResultNumber("");
    setResultData(null);
    setError("");
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const fetchResult = async () => {
    if (!resultNumber) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/results?resultNumber=${resultNumber}`, {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      
      if (data.success && data.results && data.results.length > 0) {
        setResultData(data.results[0]);
        setStep(STEPS.ANNOUNCEMENT);
      } else {
        setError("Result not found. Please check the number.");
      }
    } catch (err) {
      setError("Failed to fetch result. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = useCallback(() => {
    if (step === STEPS.INPUT) {
        fetchResult();
        return;
    }

    const sequence = [
      STEPS.ANNOUNCEMENT,
      STEPS.PROGRAM_HEADER,
      STEPS.FIRST_PLACE,
      STEPS.SECOND_PLACE,
      STEPS.THIRD_PLACE,
      STEPS.OTHERS,
      STEPS.PODIUM
    ];

    const currentIndex = sequence.indexOf(step);
    if (currentIndex === -1) return;

    // Custom jump: After 1st Prize, go directly to Consolation Prizes (Others)
    let nextStepIndex;
    if (step === STEPS.FIRST_PLACE) {
        nextStepIndex = sequence.indexOf(STEPS.OTHERS);
    } else {
        nextStepIndex = currentIndex + 1;
    }

    const participants = resultData?.participants || [];
    
    // Check if a step has valid data to show
    const checkHasData = (s) => {
        if (s === STEPS.ANNOUNCEMENT || s === STEPS.PROGRAM_HEADER || s === STEPS.PODIUM) return true;
        
        const participantRanks = participants.map(p => parseRank(p.rank));
        
        if (s === STEPS.FIRST_PLACE) return participantRanks.includes(1);
        if (s === STEPS.SECOND_PLACE) return participantRanks.includes(2);
        if (s === STEPS.THIRD_PLACE) return participantRanks.includes(3);
        if (s === STEPS.OTHERS) return participants.some((p, i) => ! [1, 2, 3].includes(participantRanks[i]) && (Number(p.points) || 0) > 0);
        return false;
    };

    while (nextStepIndex < sequence.length) {
      const next = sequence[nextStepIndex];
      if (checkHasData(next)) {
        setStep(next);
        return;
      }
      nextStepIndex++;
    }

    // If we've reached the end, reset to input
    setStep(STEPS.INPUT);
  }, [step, resultData, resultNumber]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      // Enter key for sequential navigation
      if (e.key === "Enter") {
        nextStep();
        return;
      }

      // Shortcut keys (1-5) for direct jumps if a result is already loaded
      if (step !== STEPS.INPUT && resultData) {
        const participants = resultData.participants || [];
        const participantRanks = participants.map(p => parseRank(p.rank));

        if (e.key === "1" && participantRanks.includes(1)) {
          setStep(STEPS.FIRST_PLACE);
        } else if (e.key === "2" && participantRanks.includes(2)) {
          setStep(STEPS.SECOND_PLACE);
        } else if (e.key === "3" && participantRanks.includes(3)) {
          setStep(STEPS.THIRD_PLACE);
        } else if ((e.key === "4" || e.key.toLowerCase() === "c") && participants.some((p, i) => ![1, 2, 3].includes(participantRanks[i]) && (Number(p.points) || 0) > 0)) {
          setStep(STEPS.OTHERS);
        } else if (e.key === "5" || e.key.toLowerCase() === "h") {
          setStep(STEPS.PODIUM);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, nextStep, step, resultData]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`max-w-none w-screen h-screen m-0 p-0 rounded-none border-none overflow-hidden flex flex-col font-sans transition-colors duration-500 cursor-pointer ${isWhiteTheme ? 'bg-zinc-50' : 'bg-black text-white'}`}
        onClick={() => step !== STEPS.INPUT && nextStep()}
      >
        <DialogTitle className="sr-only">Declaring Result</DialogTitle>
        
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay`} />
          <div className={`absolute top-0 right-1/4 w-[40rem] h-[40rem] rounded-full blur-[120px] animate-pulse ${isWhiteTheme ? 'bg-indigo-200' : 'bg-indigo-500/10'}`} style={{ animationDuration: '6s' }} />
          <div className={`absolute bottom-0 left-1/4 w-[40rem] h-[40rem] rounded-full blur-[120px] animate-pulse ${isWhiteTheme ? 'bg-amber-200' : 'bg-amber-500/10'}`} style={{ animationDuration: '8s' }} />
        </div>

        <DashboardTopBar 
            currentView="results"
            onNavigate={onNavigate}
            isWhiteTheme={isWhiteTheme}
            toggleTheme={() => setIsWhiteTheme(!isWhiteTheme)}
            onClose={onClose}
            leftContent={step === STEPS.INPUT ? (
                <div className="w-64 px-2 translate-y-1 group" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={resultNumber}
                            onChange={(e) => setResultNumber(e.target.value)}
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') {
                                    fetchResult();
                                    e.target.blur();
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            placeholder="Result No..."
                            className={`w-full bg-transparent border-b-2 text-left text-xl font-black focus:outline-none py-1 transition-all opacity-40 focus:opacity-100 cursor-text ${isWhiteTheme ? 'border-zinc-200 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-300' : 'border-zinc-800 focus:border-white text-white placeholder:text-zinc-700'}`}
                        />
                        <div className="absolute right-0 bottom-1.5 opacity-30 group-hover:opacity-60 transition-opacity">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-[10px] font-bold mt-1 text-left animate-pulse">{error}</p>}
                </div>
            ) : (
                <button 
                   onClick={(e) => { e.stopPropagation(); setStep(STEPS.INPUT); }}
                   className={`flex items-center gap-3 px-6 py-2.5 rounded-full backdrop-blur-md transition-all border shadow-lg hover:scale-105 active:scale-95 group hover:border-yellow-500/50 ${isWhiteTheme ? 'bg-white/80 border-zinc-200 text-zinc-900' : 'bg-zinc-900/80 border-zinc-700 text-white'}`}
               >
                   <RotateCcw className="h-5 w-5 group-hover:rotate-[-45deg] transition-transform" />
                   <span className="text-xs font-black uppercase tracking-widest leading-none">Declare Another</span>
               </button>
            )}
        />

        {/* Content Arena */}
        <div className={`flex-1 relative z-10 flex flex-col items-center px-2 py-6 text-center pt-24 ${ (step === STEPS.OTHERS) ? 'justify-start mt-8' : (step === STEPS.PODIUM) ? 'justify-start' : 'justify-center' }`}>
            
            {step === STEPS.INPUT && (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in zoom-in-95 duration-700" onClick={(e) => e.stopPropagation()}>
                    <Announcement isWhiteTheme={isWhiteTheme} />
                    <p className={`absolute bottom-20 text-sm font-bold uppercase tracking-[0.3em] animate-bounce ${isWhiteTheme ? 'text-zinc-300' : 'text-zinc-800'}`}>
                        Type No. & Press Enter
                    </p>
                </div>
            )}

            {step === STEPS.ANNOUNCEMENT && (
                <div className="space-y-6 animate-in fade-in zoom-in-75 slide-in-from-bottom-10 duration-100">
                    <h3 className={`text-4xl md:text-6xl font-black uppercase tracking-[0.5em] animate-pulse ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        NOW DECLARING
                    </h3>
                    <h1 className={`text-[10rem] md:text-[15rem] leading-none font-black uppercase tracking-tighter animate-[float_6s_ease-in-out_infinite] ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                        Result <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-600 drop-shadow-2xl">
                            No {resultNumber}
                        </span>
                    </h1>
                </div>
            )}

            {step === STEPS.PROGRAM_HEADER && resultData && (
                <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-20 duration-1000">
                    <div className="flex flex-col items-center gap-2 md:gap-4">
                        <div className={`px-12 py-4 rounded-full border-4 font-black text-2xl md:text-6xl lg:text-7xl uppercase tracking-[0.5em] mb-6 shadow-2xl ${isWhiteTheme ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
                            {resultData.divisionName || "SUPERZONE"}
                        </div>
                        <div className={`text-lg md:text-2xl font-bold uppercase tracking-[0.5em] opacity-60 ${isWhiteTheme ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {resultData.programCategory}
                        </div>
                    </div>
                    
                    <h1 className={`text-5xl md:text-8xl lg:text-9xl font-black uppercase tracking-tight text-balance max-w-6xl mx-auto leading-tight drop-shadow-2xl ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                        {resultData.programName}
                    </h1>
                    
                    <div className="flex justify-center pt-8">
                        <div className="h-1.5 w-48 bg-gradient-to-r from-transparent via-yellow-500 to-transparent rounded-full animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
                    </div>
                </div>
            )}

            {(step === STEPS.FIRST_PLACE || step === STEPS.SECOND_PLACE || step === STEPS.THIRD_PLACE) && resultData && (
                <div className="w-full h-full flex flex-col items-start justify-center pl-4 md:pl-12 lg:pl-24">
                    <div className={`mb-6 flex items-center justify-start gap-4 text-xl md:text-5xl font-black uppercase tracking-[0.4em] opacity-60 ${isWhiteTheme ? 'text-black' : 'text-white'}`}>
                        <span>{resultData.divisionName}</span>
                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-current" />
                        <span>{resultData.programName}</span>
                    </div>
                    <div className="w-full max-w-none lg:px-12">
                        {resultData.participants
                            .filter(p => parseRank(p.rank) === (step === STEPS.FIRST_PLACE ? 1 : step === STEPS.SECOND_PLACE ? 2 : 3))
                            .map((p, idx) => (
                                <SequentialWinnerCard key={p._id || idx} p={p} rank={p.rank} isWhiteTheme={isWhiteTheme} />
                            ))
                        }
                    </div>
                </div>
            )}

            {step === STEPS.OTHERS && resultData && (
                <div className="w-full max-w-[95vw] space-y-12 animate-in fade-in zoom-in-95 duration-1000">
                    <div className={`mb-8 flex items-center justify-center gap-4 text-xl md:text-5xl font-black uppercase tracking-[0.4em] opacity-60 ${isWhiteTheme ? 'text-black' : 'text-white'}`}>
                        <span>{resultData.divisionName}</span>
                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-current" />
                        <span>{resultData.programName}</span>
                    </div>
                    <h2 className={`text-4xl md:text-[6vw] font-black uppercase tracking-tighter animate-pulse whitespace-nowrap ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                        Consolation Prizes
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-40 px-4">
                        {resultData.participants
                            .filter(p => ! [1, 2, 3].includes(parseRank(p.rank)) && (Number(p.points) || 0) > 0)
                            .map((p, idx) => (
                                <div key={p._id || idx} className={`p-4 md:p-6 rounded-[1.5rem] border-2 flex items-center gap-6 transition-all hover:scale-105 ${isWhiteTheme ? 'bg-white border-zinc-200' : 'bg-zinc-900/40 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.3)]'}`}>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-16 h-16 md:w-28 md:h-28 rounded-full overflow-hidden flex-shrink-0 border-2 border-zinc-500/50 shadow-xl">
                                            {p.participantDetails?.profilePic ? (
                                                <img src={p.participantDetails.profilePic} alt={p.participantDetails.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500 font-bold text-4xl">
                                                    {p.participantDetails?.name?.charAt(0) || "?"}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`px-4 py-1 rounded-lg border-2 font-mono font-bold text-sm md:text-xl ${isWhiteTheme ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-black/40 border-zinc-700 text-zinc-400'}`}>
                                            #{p.participantDetails?.chestNumber}
                                        </div>
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <h4 className={`font-black text-xl md:text-4xl leading-tight uppercase tracking-tight truncate ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                                            {p.participantDetails?.name}
                                        </h4>
                                        <p className="text-xs md:text-2xl text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1 truncate">
                                            {p.participantDetails?.teamId?.name}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Grade</span>
                                                <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">/</span>
                                                <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">PTS</span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <span className={`text-2xl md:text-4xl font-black italic ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                                    {p.grade}
                                                </span>
                                                <span className="text-3xl md:text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                                                    {p.points}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}

            {step === STEPS.PODIUM && resultData && (
                <div className="w-full h-full max-w-[95vw] flex flex-col justify-between pt-4 pb-8">
                    <div className="mb-4">
                        <h2 className="text-4xl md:text-8xl lg:text-[7.5rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-600 uppercase tracking-widest leading-none mb-6 whitespace-nowrap">
                            Top Honor Roll
                        </h2>
                        <div className={`flex items-center justify-center gap-4 text-3xl md:text-6xl font-black uppercase tracking-[0.2em] opacity-40 whitespace-nowrap ${isWhiteTheme ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            <span>{resultData.divisionName}</span>
                            <div className="w-3 h-3 rounded-full bg-current" />
                            <span>{resultData.programName}</span>
                        </div>
                    </div>
                    <div className="flex-1 flex w-full items-end justify-center gap-4 md:gap-8 pb-4">
                        {/* 2nd Place */}
                        <PodiumCard rank={2} data={resultData.participants.find(p => parseRank(p.rank) === 2)} isWhiteTheme={isWhiteTheme} />
                        {/* 1st Place */}
                        <PodiumCard rank={1} data={resultData.participants.find(p => parseRank(p.rank) === 1)} isWhiteTheme={isWhiteTheme} isLarge />
                        {/* 3rd Place */}
                        <PodiumCard rank={3} data={resultData.participants.find(p => parseRank(p.rank) === 3)} isWhiteTheme={isWhiteTheme} />
                    </div>

                    {/* Program footer */}
                    <div className={`w-full text-center ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-500'} font-black uppercase tracking-widest text-2xl md:text-4xl pb-4`}>
                         Congratulations to all participants!
                    </div>
                </div>
            )}
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
            @keyframes float {
                0%, 100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-30px) scale(1.05); }
            }
            .scrollbar-hide::-webkit-scrollbar { display: none; }
            .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        ` }} />
      </DialogContent>
    </Dialog>
  );
}

function PodiumCard({ rank, data, isWhiteTheme, isLarge = false }) {
    if (!data) return <div className={`flex-1 ${isLarge ? 'h-[70%]' : 'h-[50%]'} max-w-[18rem] opacity-0`} />;
    const theme = getRankTheme(rank, isWhiteTheme);
    
    return (
        <div className={`relative flex flex-col items-center flex-1 max-w-[12rem] md:max-w-[22rem] animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-${rank === 1 ? '500' : rank === 2 ? '200' : '700'}`}>
            <div className={`w-full flex flex-col items-center mb-4 transition-transform hover:scale-105 group`}>
                <div className="flex flex-col items-center gap-3 mb-4">
                    <div className={`relative rounded-full overflow-hidden border-4 shadow-2xl transition-all duration-500 group-hover:border-white ${isLarge ? 'w-32 h-32 md:w-64 md:h-64' : 'w-24 h-24 md:w-48 md:h-48'} ${theme.border}`}>
                        {data.participantDetails?.profilePic ? (
                            <img src={data.participantDetails.profilePic} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center font-black ${isLarge ? 'text-4xl' : 'text-2xl'} uppercase ${isWhiteTheme ? 'bg-zinc-100 text-zinc-300' : 'bg-zinc-800 text-zinc-700'}`}>
                                {data.participantDetails?.name?.charAt(0)}
                            </div>
                        )}
                    </div>
                    {data.participantDetails?.chestNumber && (
                        <div className={`px-4 py-1 rounded-lg border-2 font-mono font-bold text-sm md:text-xl shadow-lg transition-all group-hover:border-yellow-500/50 ${isWhiteTheme ? 'bg-white border-zinc-200 text-zinc-600' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}>
                            #{data.participantDetails.chestNumber}
                        </div>
                    )}
                </div>
                <h4 className={`font-black text-center uppercase tracking-tight line-clamp-2 px-2 text-xs md:text-xl drop-shadow-md ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                    {data.participantDetails?.name}
                </h4>
            </div>

            <div className={`w-full rounded-t-3xl border-t-8 border-x bg-gradient-to-b shadow-2xl relative flex flex-col items-center justify-start pt-6 ${theme.bg} ${theme.border} ${isLarge ? 'h-72 md:h-[28rem]' : rank === 2 ? 'h-52 md:h-[22rem]' : 'h-40 md:h-[18rem]'}`}>
                <span className="text-5xl md:text-9xl font-black text-black/20">{rank}</span>
                <span className="absolute bottom-4 font-black text-black/40 text-sm md:text-3xl tracking-widest uppercase">
                    {data.grade} <span className="mx-1 opacity-50">/</span> {data.points} PTS
                </span>
            </div>
        </div>
    );
}

const SequentialWinnerCard = ({ p, rank, isWhiteTheme }) => {
    const [revealStage, setRevealStage] = useState(REVEAL_STAGES.CHEST);
    const theme = getRankTheme(rank, isWhiteTheme);

    useEffect(() => {
        const timers = [
            setTimeout(() => setRevealStage(REVEAL_STAGES.PHOTO), 1000),
            setTimeout(() => setRevealStage(REVEAL_STAGES.NAME), 2000),
            setTimeout(() => setRevealStage(REVEAL_STAGES.TEAM), 3000),
            setTimeout(() => setRevealStage(REVEAL_STAGES.POINTS), 4000),
            setTimeout(() => setRevealStage(REVEAL_STAGES.LABEL), 4800)
        ];
        return () => timers.forEach(t => clearTimeout(t));
    }, []);

    const showStage = (stage) => {
        const stages = Object.values(REVEAL_STAGES);
        return stages.indexOf(revealStage) >= stages.indexOf(stage);
    };

    return (
      <div className={`w-full flex flex-col items-start justify-center pb-12 transition-all duration-1000 space-y-4 md:space-y-8`}>
        
        {/* Placeholder removed from top - now moved to right column */}

        {/* Side-by-Side Container */}
        <div className="w-full max-w-none flex flex-col md:flex-row items-start justify-start gap-4 md:gap-10 animate-in fade-in duration-1000">
            
            {/* LEFT SIDE: Cinematic Toss Coin (Combined Photo & Chest Number) */}
            <div className="flex flex-col items-center shrink-0 mt-8 md:mt-20 perspective-2000">
                <div className={`relative w-64 h-64 md:w-[32rem] md:h-[32rem] preserve-3d transition-all duration-1000 ${showStage(REVEAL_STAGES.PHOTO) ? 'animate-[coin-toss_5s_ease-out_forwards]' : ''}`}>
                    
                    {/* FRONT FACE: Chest Number */}
                    <div className={`absolute inset-0 backface-hidden rounded-full border-[12px] flex flex-col items-center justify-center shadow-2xl ${isWhiteTheme ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900 border-zinc-700'} ${theme.border}`}>
                        <div className={`text-xl md:text-5xl font-bold uppercase tracking-[0.2em] mb-2 ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-500'}`}>Chest No</div>
                        <div className={`text-6xl md:text-[12rem] font-black ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                            {p.participantDetails?.chestNumber || "---"}
                        </div>
                        {/* Decorative coin ridges */}
                        <div className="absolute inset-2 rounded-full border-4 border-dashed opacity-20 animate-spin-slow" />
                    </div>

                    {/* BACK FACE: Participant Photo */}
                    <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-full overflow-hidden border-[12px] shadow-2xl ${theme.border}`}>
                        {p.participantDetails?.profilePic ? (
                            <img src={p.participantDetails.profilePic} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10rem] font-black bg-zinc-800 text-zinc-600">
                                {p.participantDetails?.name?.charAt(0)}
                            </div>
                        )}
                        {/* Shimmer overlay that appears during toss */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_5s_infinite] pointer-events-none" />
                    </div>
                </div>

                {/* Optional: Static Chest Number indicator after landing */}
                {showStage(REVEAL_STAGES.PHOTO) && (
                    <div className="mt-12 animate-in fade-in slide-in-from-top-10 duration-1000" style={{ animationDelay: '5s' }}>
                        <div className={`px-16 py-4 rounded-[2.5rem] border-4 font-black text-5xl md:text-9xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform ${isWhiteTheme ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-black/80 border-zinc-700 text-white'}`}>
                            <span className="text-2xl md:text-5xl opacity-40 mr-4">NO.</span>
                            {p.participantDetails?.chestNumber}
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT SIDE: Rank, Name, Team, Points */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left gap-6 md:gap-10 flex-1 min-w-0 max-w-[1500px]">
                
                {/* 1. Rank Label (Revealed Last, Aligned with Name) */}
                <div className={`transition-all duration-1000 ease-in-out transform min-h-[5rem] md:min-h-[10rem] flex items-center justify-start`}>
                  {showStage(REVEAL_STAGES.LABEL) ? (
                    <div className="animate-in fade-in zoom-in duration-1000 text-5xl md:text-[8rem]">
                        <span className={`font-black tracking-tighter ${theme.text} drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]`}>
                            {theme.label}
                        </span>
                    </div>
                  ) : (
                    <div className={`text-2xl md:text-4xl font-black uppercase tracking-[0.4em] opacity-10 ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Wait for the Rank...
                    </div>
                  )}
                </div>

                {/* Name */}
                {showStage(REVEAL_STAGES.NAME) && (
                    <h2 className={`text-5xl md:text-8xl lg:text-[10rem] font-black uppercase tracking-tighter leading-[0.85] animate-in fade-in slide-in-from-left-20 duration-1000 ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                        {p.participantDetails?.name}
                    </h2>
                )}

                {/* Team Name */}
                {showStage(REVEAL_STAGES.TEAM) && (
                    <div className="animate-in fade-in zoom-in slide-in-from-bottom-20 duration-1000">
                        <div 
                           className={`px-16 py-6 rounded-full font-black text-3xl md:text-6xl uppercase tracking-[0.4em] shadow-2xl ${getContrastColor(p.participantDetails?.teamId?.color)}`}
                           style={{
                              background: `linear-gradient(135deg, ${p.participantDetails?.teamId?.color || '#808080'} 0%, ${getDarkerColor(p.participantDetails?.teamId?.color || '#808080', 40)} 100%)`,
                              border: `2px solid ${p.participantDetails?.teamId?.color || '#808080'}40`
                           }}
                        >
                            {p.participantDetails?.teamId?.name || "Independent"}
                        </div>
                    </div>
                )}

                {/* Grade and Points */}
                {showStage(REVEAL_STAGES.POINTS) && (
                    <div className="animate-in fade-in zoom-in slide-in-from-top-32 duration-1000">
                        <div className={`flex items-center gap-10 text-6xl md:text-[9rem] font-black italic tracking-tighter ${theme.text}`}>
                            <Sparkles className="w-16 h-16 md:w-24 md:h-24 animate-spin text-yellow-400" />
                            <div className="flex flex-col items-center md:items-start">
                                <span className="text-xl md:text-3xl not-italic font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">Grade</span>
                                <span className="leading-none">{p.grade}</span>
                            </div>
                            <div className="h-20 md:h-32 w-1.5 md:w-2 bg-zinc-800/50 rounded-full mx-2 md:mx-4" />
                            <div className="flex flex-col items-center md:items-start">
                                <span className="text-xl md:text-3xl not-italic font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">Points</span>
                                <span className="leading-none">{p.points}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
      </div>
    );
};

// Extracted Announcement Component to avoid re-rendering parent's input states
const Announcement = ({ isWhiteTheme }) => {
    const [animKey, setAnimKey] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimKey(prev => prev + 1);
        }, 12000); // Re-trigger every 12 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div key={animKey} className="space-y-4 animate-[float_6s_ease-in-out_infinite]">
            <h3 className={`text-2xl md:text-5xl font-black uppercase tracking-[0.5em] opacity-40 ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {"READY FOR THE MOMENT?".split("").map((char, i) => (
                    <span key={i} className="inline-block animate-in fade-in fill-mode-both" style={{ animationDelay: `${i * 40}ms`, animationDuration: '0.4s' }}>
                        {char === " " ? "\u00A0" : char}
                    </span>
                ))}
            </h3>
            <h1 className={`text-6xl md:text-[8rem] lg:text-[10rem] leading-none font-black uppercase tracking-tighter drop-shadow-2xl ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                <div className="flex flex-wrap justify-center overflow-hidden">
                    {"now declaring".split("").map((char, i) => (
                        <span key={i} className="inline-block animate-in fade-in slide-in-from-bottom-10 fill-mode-both" style={{ animationDelay: `${200 + i * 30}ms`, animationDuration: '0.3s' }}>
                            {char === " " ? "\u00A0" : char}
                        </span>
                    ))}
                </div>
                <div className="flex flex-wrap justify-center animate-[pulse_3s_ease-in-out_infinite]">
                    {"results...".split("").map((char, i) => (
                        <span key={i} className="inline-block animate-in fade-in zoom-in fill-mode-both text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-600" style={{ animationDelay: `${600 + i * 40}ms`, animationDuration: '0.4s' }}>
                            {char === " " ? "\u00A0" : char}
                        </span>
                    ))}
                </div>
            </h1>
        </div>
    );
};

// Add global animations
const styles = `
  @keyframes float {
    0%, 100% { transform: translateY(0) translateX(0); }
    33% { transform: translateY(-20px) translateX(10px); }
    66% { transform: translateY(-10px) translateX(-10px); }
  }
  @keyframes coin-toss {
    0% { transform: translateY(0) rotateY(0) scale(1); }
    30% { transform: translateY(-400px) rotateY(1080deg) scale(1.2); }
    60% { transform: translateY(-200px) rotateY(2160deg) scale(1.1); }
    100% { transform: translateY(0) rotateY(3780deg) scale(1); }
  }
  @keyframes shimmer {
    0% { transform: translateX(-100%) rotate(45deg); }
    100% { transform: translateX(100%) rotate(45deg); }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin-slow { animation: spin-slow 8s linear infinite; }
  .perspective-2000 { perspective: 2000px; }
  .preserve-3d { transform-style: preserve-3d; }
  .backface-hidden { backface-visibility: hidden; }
  .rotate-y-180 { transform: rotateY(180deg); }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

