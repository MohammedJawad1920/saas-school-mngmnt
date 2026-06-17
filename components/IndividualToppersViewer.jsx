"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Play, Pause, ChevronLeft, ChevronRight, Medal, Star, Sun, Moon } from "lucide-react";
import DashboardTopBar from "./DashboardTopBar";

// Same gradient hash function to sync styles seamlessly with other components
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

export default function IndividualToppersViewer({ isOpen, onClose, onNavigate, apiKey, isWhiteTheme, setIsWhiteTheme }) {
  const [toppers, setToppers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsPlaying(true);
      fetchToppers();
    } else {
      setIsPlaying(false);
    }
  }, [isOpen]);

  // Handle Slideshow
  useEffect(() => {
    let intervalId;
    if (isPlaying && toppers.length > 0) {
      intervalId = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % toppers.length);
      }, 5000);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, toppers.length]);

  const fetchToppers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/individual-toppers", {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      if (data.success) {
        setToppers(data.data);
      } else {
        setError(data.message || "Failed to load toppers metrics");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % toppers.length);
    setIsPlaying(false);
  };
  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + toppers.length) % toppers.length);
    setIsPlaying(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-none w-screen h-screen m-0 p-0 rounded-none border-none transition-colors duration-500 overflow-hidden flex flex-col data-[state=open]:duration-500 [&>button]:hidden ${isWhiteTheme ? 'bg-zinc-50' : 'bg-black'}`}>
        <DialogTitle className="sr-only">Individual Toppers Viewer</DialogTitle>
        <DialogDescription className="sr-only">Displays full screen posters spotlighting individual high-scorers across all active categories.</DialogDescription>
        
        <DashboardTopBar 
          currentView="toppers"
          onNavigate={onNavigate}
          isWhiteTheme={isWhiteTheme}
          toggleTheme={() => setIsWhiteTheme(!isWhiteTheme)}
          onClose={onClose}
          leftContent={toppers.length > 0 && (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-3 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-[1.15] active:scale-95 flex items-center justify-center border cursor-pointer ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
                title={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </button>
              <div className={`px-4 py-2 rounded-xl backdrop-blur-sm border font-bold text-sm tracking-widest uppercase ${isWhiteTheme ? 'bg-white/50 text-zinc-500 border-zinc-200' : 'bg-zinc-900/50 text-zinc-400 border-zinc-800'}`}>
                Toppers Slideshow 
              </div>
            </div>
          )}
        />

        {loading && (
          <div className={`flex flex-col items-center justify-center space-y-4 h-full ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
            <div className={`w-16 h-16 border-4 rounded-full animate-spin shadow-[0_0_30px_rgba(245,158,11,0.3)] ${isWhiteTheme ? 'border-zinc-200 border-t-amber-500' : 'border-zinc-800 border-t-amber-500'}`}></div>
            <p className="text-xl font-medium tracking-widest uppercase opacity-60 animate-pulse">Calculating Top Metrics...</p>
          </div>
        )}

        {error && (
          <div className={`flex flex-col items-center justify-center space-y-4 h-full ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
            <p className="text-xl font-medium text-red-500">{error}</p>
            <button onClick={onClose} className={`px-6 py-2 font-bold uppercase tracking-wider rounded-md transition ${isWhiteTheme ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}>Close</button>
          </div>
        )}

        {!loading && !error && toppers.length === 0 && (
          <div className={`flex flex-col items-center justify-center space-y-4 h-full ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
            <p className="text-2xl font-medium opacity-60">No designated top-scorers acquired yet.</p>
            <button onClick={onClose} className={`px-6 py-2 font-bold uppercase tracking-wider rounded-md transition ${isWhiteTheme ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}>Close</button>
          </div>
        )}

        {!loading && !error && toppers.length > 0 && (
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
               {toppers.map((topper, idx) => {
                 if (idx !== currentIndex) return null;
                 const themeColor = topper.teamColor || "#808080";
                 const darkerColor = getDarkerColor(themeColor, 40);
                 const contrastText = getContrastColor(themeColor);
                 const gradientStyle = {
                    background: `linear-gradient(135deg, ${themeColor} 0%, ${darkerColor} 100%)`,
                    borderColor: `${themeColor}40`
                 };

                 return (
                   <div key={topper.name + idx} className="w-full h-full flex flex-col items-center justify-center p-8 px-6 md:px-12 animate-in fade-in zoom-in-95 duration-[1s]">
                     
                      {/* The Huge Decorative Categorical Ranking Title */}
                      <div className="w-full text-center shrink-0 z-20 flex flex-col items-center justify-center mb-8">
                        <h2 className={`text-4xl md:text-6xl lg:text-[7.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-6 md:gap-12 drop-shadow-2xl leading-none px-4 ${isWhiteTheme ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-800' : 'text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-200 to-amber-600'}`}>
                          <Star className={`w-12 h-12 md:w-24 md:h-24 lg:w-32 lg:h-32 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] fill-amber-400 ${isWhiteTheme ? 'text-amber-600' : 'text-amber-400'}`} />
                          {topper.divisionName} TOPPER
                          <Star className={`w-12 h-12 md:w-24 md:h-24 lg:w-32 lg:h-32 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] fill-amber-400 ${isWhiteTheme ? 'text-amber-600' : 'text-amber-400'}`} />
                        </h2>
                      </div>

                      {/* The Centerpiece Poster Stack - Side-by-Side Typography */}
                      <div 
                        className={`relative w-full max-w-[95rem] h-auto flex flex-col items-center justify-center p-8 md:p-16 mt-0 md:mt-2 rounded-[4rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden shrink-0 z-10 mx-auto transition-all duration-700 border-none ${isWhiteTheme ? 'ring-8 ring-white shadow-xl' : ''}`}
                        style={gradientStyle}
                      >
                         <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity" />
                         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                        
                        {/* Content Grid Wrapper - Massive Side-by-Side Flex */}
                        <div className="relative w-full flex flex-col xl:flex-row items-center justify-center gap-8 lg:gap-12 z-20">
                           
                           {/* LEFT: Participant Photo & Chest Number Container */}
                           <div className="flex flex-col items-center justify-center gap-6 lg:gap-8 shrink-0 mb-4 xl:mb-0">
                             {/* Photo Hero */}
                             <div className="relative w-64 h-64 md:w-[24rem] md:h-[24rem] lg:w-[30rem] lg:h-[30rem] shrink-0">
                               <div className={`absolute inset-0 rounded-full flex items-center justify-center ${!topper.photo ? 'bg-zinc-800' : 'bg-black'} shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden`}>
                                 {topper.photo ? (
                                   <img src={topper.photo} alt="Individual Topper" className="w-full h-full object-cover" />
                                 ) : (
                                   <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${topper.name}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`} alt="Default Avatar" className="w-full h-full object-cover opacity-90" />
                                 )}
                               </div>
                             </div>

                              {/* Chest Badge cleanly under photo */}
                              <span className={`px-8 py-4 rounded-3xl border-2 text-3xl lg:text-5xl font-mono font-black tracking-[0.3em] uppercase shadow-[0_20px_40px_rgba(0,0,0,0.5)] text-center w-max block ${isWhiteTheme ? 'bg-white/90 text-zinc-900 border-white' : 'bg-zinc-950/50 text-white border-white/20'}`}>
                                CHEST: {topper.chestNumber}
                              </span>
                           </div>

                           {/* RIGHT: Typography Block */}
                           <div className="flex flex-col items-center xl:items-start text-center xl:text-left justify-center w-full max-w-[50rem]">
                             
                             {/* Individual Name */}
                             <span className={`${contrastText} text-6xl md:text-7xl lg:text-[8rem] font-black uppercase tracking-tighter drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] text-balance leading-none`}>
                               {topper.name}
                             </span>

                             {/* Bigger Team Name Tag */}
                             <span className={`${contrastText} opacity-80 font-mono text-3xl md:text-5xl lg:text-7xl font-black uppercase tracking-[0.2em] mt-8 mb-4 drop-shadow-lg leading-none`}>
                               {topper.teamName}
                             </span>

                             {/* Reduced Points Values */}
                             <div className="flex w-full items-baseline justify-center xl:justify-start gap-3 lg:gap-6 mt-6">
                               <span className={`font-normal text-5xl md:text-7xl lg:text-[7rem] leading-[0.9] drop-shadow-2xl ${isWhiteTheme ? 'text-zinc-900' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70'}`}>
                                 {topper.points}
                               </span>
                               <span className={`font-normal text-4xl md:text-6xl lg:text-[6rem] uppercase tracking-tighter leading-[0.9] ml-2 ${contrastText} opacity-90 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]`}>
                                 POINTS
                               </span>
                             </div>

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
