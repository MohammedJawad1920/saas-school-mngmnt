"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Play, Pause, ChevronLeft, ChevronRight, Trophy, Crown, Medal, User as UserIcon, Sun, Moon } from "lucide-react";
import DashboardTopBar from "./DashboardTopBar";

// Same gradient hash function as others
const getDarkerColor = (hex, percent = 30) => {
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

export default function ChampionsPostersViewer({ isOpen, onClose, onNavigate, apiKey, isWhiteTheme, setIsWhiteTheme }) {
  const [champions, setChampions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreReveal, setIsPreReveal] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsPlaying(false);
      setIsPreReveal(true);
      fetchChampions();
    } else {
      setIsPlaying(false);
    }
  }, [isOpen]);

  // Handle Enter to Reveal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Enter" && isPreReveal && !loading && !error) {
        setIsPreReveal(false);
        setIsPlaying(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPreReveal, loading, error]);

  // Slideshow interval
  useEffect(() => {
    let intervalId;
    if (isPlaying && champions.length > 0 && !isPreReveal) {
      intervalId = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % champions.length);
      }, 5000);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, champions.length, isPreReveal]);

  const fetchChampions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/champions-posters", {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      if (data.success) {
        setChampions(data.data);
      } else {
        setError(data.message || "Failed to load champions");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % champions.length);
    setIsPlaying(false);
  };
  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + champions.length) % champions.length);
    setIsPlaying(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-none w-screen h-screen m-0 p-0 rounded-none border-none transition-colors duration-500 overflow-hidden flex flex-col data-[state=open]:duration-500 [&>button]:hidden ${isWhiteTheme ? 'bg-zinc-50' : 'bg-black'}`}>
        <DialogTitle className="sr-only">Champions Posters Viewer</DialogTitle>
        <DialogDescription className="sr-only">Displays full screen posters with champions and leader photos</DialogDescription>
        
        <DashboardTopBar 
          currentView="champions"
          onNavigate={onNavigate}
          isWhiteTheme={isWhiteTheme}
          toggleTheme={() => setIsWhiteTheme(!isWhiteTheme)}
          onClose={onClose}
          leftContent={champions.length > 0 && !isPreReveal && (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-3 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-[1.15] active:scale-95 flex items-center justify-center border cursor-pointer ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
                title={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </button>
              <div className={`px-4 py-2 rounded-xl backdrop-blur-sm border font-bold text-sm tracking-widest uppercase ${isWhiteTheme ? 'bg-white/50 text-zinc-500 border-zinc-200' : 'bg-zinc-900/50 text-zinc-400 border-zinc-800'}`}>
                Champions Slideshow 
              </div>
            </div>
          )}
        />

        {error && (
          <div className={`flex flex-col items-center justify-center space-y-4 h-full ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
            <p className="text-xl font-medium text-red-500">{error}</p>
            <button onClick={onClose} className={`px-6 py-2 font-bold uppercase tracking-wider rounded-md transition ${isWhiteTheme ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}>Close</button>
          </div>
        )}

        {!error && isPreReveal && (
          <div className={`flex-1 relative z-10 flex flex-col items-center justify-center p-6 text-center pt-24 overflow-hidden ${isWhiteTheme ? 'bg-zinc-50' : 'bg-black text-white'}`}>
              {/* Background Effects */}
              <div className="absolute inset-0 pointer-events-none opacity-30">
                <div className="absolute top-0 right-1/4 w-[50rem] h-[50rem] rounded-full blur-[150px] animate-pulse bg-yellow-500/20" style={{ animationDuration: '10s' }} />
                <div className="absolute bottom-0 left-1/4 w-[50rem] h-[50rem] rounded-full blur-[150px] animate-pulse bg-amber-500/20" style={{ animationDuration: '12s' }} />
              </div>

              <div className="relative space-y-4 md:space-y-6 max-w-7xl mx-auto flex flex-col items-center">
                  {/* Subtle Loading Spinner if data is still fetching */}
                  {loading && (
                    <div className="absolute -top-24 flex items-center gap-4 animate-pulse opacity-40">
                      <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-bold uppercase tracking-[0.4em]">Finalizing Scores...</p>
                    </div>
                  )}

                  <div className={`p-8 rounded-full mb-8 animate-[float_8s_ease-in-out_infinite] ${isWhiteTheme ? 'bg-yellow-50 text-yellow-600' : 'bg-yellow-900/40 text-yellow-500 shadow-[0_0_80px_rgba(234,179,8,0.3)]'}`}>
                      <Crown className="w-24 h-24 md:w-32 md:h-32" />
                  </div>
                  
                  <div className="space-y-2 md:space-y-4 animate-[shimmer-float_12s_ease-in-out_infinite]">
                    <h2 className={`text-4xl md:text-6xl lg:text-[6rem] font-bold uppercase tracking-[0.5em] opacity-40 ${isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      IT IS TIME TO
                    </h2>
                    <h1 className={`text-7xl md:text-[10rem] lg:text-[14rem] font-black uppercase tracking-tighter leading-[0.8] drop-shadow-2xl ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                      DECLARE
                    </h1>
                    <h1 className={`text-7xl md:text-[10rem] lg:text-[14rem] font-black uppercase tracking-tighter leading-[0.8] drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700`}>
                      CHAMPIONS
                    </h1>
                  </div>

                  {!loading && (
                    <div className="mt-12 animate-bounce">
                      <div className={`px-8 py-4 rounded-2xl border-2 font-black tracking-[0.3em] uppercase text-xl md:text-3xl shadow-2xl ${isWhiteTheme ? 'bg-zinc-900 text-white border-zinc-700' : 'bg-white text-black border-zinc-200'}`}>
                        Press [ ENTER ] to Reveal
                      </div>
                    </div>
                  )}
              </div>

              <style jsx global>{`
                @keyframes float {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-30px); }
                }
                @keyframes shimmer-float {
                  0%, 100% { transform: translateY(0) scale(1); filter: brightness(1); }
                  50% { transform: translateY(-15px) scale(1.02); filter: brightness(1.3); }
                }
              `}</style>
          </div>
        )}

        {!loading && !error && !isPreReveal && champions.length > 0 && (
          <div className={`relative w-full h-full flex items-center justify-center overflow-hidden group transition-colors duration-500 pt-20 ${isWhiteTheme ? 'bg-zinc-50 bg-[radial-gradient(ellipse_at_center,_#ffffff_0%,_#f4f4f5_100%)]' : 'bg-zinc-950 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black'}`}>
            
            {/* Navigation Buttons */}
            <button
              onClick={handlePrev}
              className={`absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-full backdrop-blur-md transition-all opacity-0 flex group-hover:opacity-100 hover:scale-110 z-50 border ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              onClick={handleNext}
              className={`absolute right-6 top-1/2 -translate-y-1/2 p-4 rounded-full backdrop-blur-md transition-all opacity-0 flex group-hover:opacity-100 hover:scale-110 z-50 border ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
            >
              <ChevronRight className="h-8 w-8" />
            </button>

            {/* Content Container (Fixed structure avoiding layout shifts) */}
            <div className="relative w-full h-full flex flex-col items-center justify-center overflow-y-auto no-scrollbar scroll-smooth">
                {champions.map((team, idx) => {
                  if (idx !== currentIndex) return null;
                  const teamColor = team.color || "#808080";
                  const darkerColor = getDarkerColor(teamColor, 40);
                  const contrastText = getContrastColor(teamColor);
                  const gradientStyle = {
                     background: `linear-gradient(135deg, ${teamColor} 0%, ${darkerColor} 100%)`,
                     borderColor: `${teamColor}40`
                  };
                  
                  // Ranking visual logic
                  let RankIcon = Trophy;
                  let rankColor = "text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]";
                  if (team.rank === 1) {
                    RankIcon = Crown;
                  } else if (team.rank === 2) {
                    RankIcon = Medal;
                    rankColor = "text-zinc-300 drop-shadow-[0_0_15px_rgba(212,212,216,0.5)]";
                  } else {
                    RankIcon = Medal;
                    rankColor = "text-amber-600 drop-shadow-[0_0_15px_rgba(217,119,6,0.5)]";
                  }

                  return (
                    <div key={team._id} className="w-full h-full flex flex-col items-center justify-center p-8 px-6 md:px-12 animate-in fade-in zoom-in-95 duration-[1s]">
                      
                      {/* The Huge Decorative Ranking Title & Team Name */}
                      <div className="w-full text-center shrink-0 z-20 flex flex-col items-center justify-center">
                        <h2 className={`text-4xl md:text-7xl lg:text-[8rem] font-black uppercase tracking-widest flex items-center justify-center gap-6 md:gap-12 drop-shadow-2xl leading-none ${isWhiteTheme ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-800' : 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-600'}`}>
                          <RankIcon className={`w-16 h-16 md:w-32 md:h-32 lg:w-40 lg:h-40 ${rankColor}`} />
                          {team.title}
                          <RankIcon className={`w-16 h-16 md:w-32 md:h-32 lg:w-40 lg:h-40 ${rankColor}`} />
                        </h2>
                        
                        {/* Team Name Title Moved Here */}
                        <h1 className={`text-6xl md:text-[8rem] lg:text-[10rem] font-black uppercase tracking-tighter drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] leading-[0.9] mt-2 md:mt-4 ${isWhiteTheme ? 'text-zinc-900 drop-shadow-sm' : 'text-white'}`}>
                          {team.name}
                        </h1>
                      </div>

                      {/* The Centerpiece Card - Now Ultra Wide for Side-By-Side layout */}
                      <div 
                        className={`relative w-full max-w-[95rem] h-auto flex flex-col items-center justify-center p-8 md:p-16 mt-0 md:mt-2 rounded-[4rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden shrink-0 z-10 mx-auto transition-all duration-700 border-none ${isWhiteTheme ? 'ring-8 ring-white shadow-xl' : ''}`}
                        style={gradientStyle}
                      >
                         <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity" />
                         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                         
                         {/* Content Grid Wrapper - Vertically Stacked */}
                         <div className="relative w-full flex flex-col items-center justify-center gap-6 lg:gap-12 z-20">
                            
                            {/* TOP: Leader Photo & Name (Side-by-Side) */}
                            <div className="flex flex-col md:flex-row items-center justify-center gap-4 lg:gap-8 shrink-0">
                              
                              {/* Photo */}
                              <div className="relative w-56 h-56 lg:w-[22rem] lg:h-[22rem] shrink-0">
                                <div className={`absolute inset-0 rounded-full flex items-center justify-center ${!team.leaderPhoto ? 'bg-zinc-800' : 'bg-black'} shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden ${isWhiteTheme ? 'ring-4 ring-white/50' : ''}`}>
                                  {team.leaderPhoto ? (
                                    <img src={team.leaderPhoto} alt="Team Leader" className="w-full h-full object-cover" />
                                  ) : (
                                    <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${team.leaderName}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`} alt="Default Leader Avatar" className="w-full h-full object-cover opacity-90" />
                                  )}
                                </div>
                              </div>
                              
                              {/* Leader Name Text */}
                              <div className="flex flex-col items-center md:items-start text-center md:text-left justify-center">
                                <span className={`font-mono text-xl lg:text-3xl font-bold uppercase tracking-widest mb-1 lg:mb-2 ${contrastText} opacity-60`}>Team Leader</span>
                                <span className={`text-5xl md:text-6xl lg:text-[7rem] font-black uppercase tracking-tighter drop-shadow-2xl leading-[0.9] ${contrastText}`}>
                                  {team.leaderName.split(" ").length > 1 ? (
                                    <>
                                      {team.leaderName.split(" ")[0]}
                                      <br />
                                      {team.leaderName.split(" ").slice(1).join(" ")}
                                    </>
                                  ) : (
                                    team.leaderName
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* BOTTOM: Un-bolded, Team-Name Sized Points Text */}
                            <div className="flex w-full items-baseline justify-center gap-4 lg:gap-8 mt-4 md:mt-2">
                              <span className={`font-normal text-6xl md:text-[8rem] lg:text-[10rem] text-transparent bg-clip-text bg-gradient-to-b drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)] leading-[0.9] ${isWhiteTheme ? 'from-zinc-900 to-zinc-700' : 'from-white to-white/80'}`}>
                                {team.points}
                              </span>
                              <span className={`font-normal text-6xl md:text-[8rem] lg:text-[10rem] uppercase tracking-tighter drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] leading-[0.9] ${contrastText} opacity-90`}>
                                POINTS
                              </span>
                            </div>
                         </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
