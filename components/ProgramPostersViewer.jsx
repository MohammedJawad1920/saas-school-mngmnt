"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, X, ChevronLeft, ChevronRight, Play, Pause, Sun, Moon } from "lucide-react";
import DashboardTopBar from "./DashboardTopBar";

export default function ProgramPostersViewer({ isOpen, onClose, onNavigate, apiKey, isWhiteTheme, setIsWhiteTheme }) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchPrograms();
      setCurrentIndex(0);
      setIsPlaying(true);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval;
    if (isPlaying && isOpen && programs.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % programs.length);
      }, 5000); // Auto-advance every 5 seconds
    }
    return () => clearInterval(interval);
  }, [isPlaying, isOpen, programs.length]);

  const handleOpenChange = (open) => {
    if (!open) onClose();
  };

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/program-posters", {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      if (data.success) {
        setPrograms(data.programs || []);
      } else {
        setError(data.message || "Failed to fetch programs");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % programs.length);
    setIsPlaying(false); // Pause on manual navigation
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + programs.length) % programs.length);
    setIsPlaying(false); // Pause on manual navigation
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={`max-w-none w-screen h-screen m-0 p-0 rounded-none border-none transition-colors duration-500 overflow-hidden flex flex-col data-[state=open]:duration-500 [&>button]:hidden ${isWhiteTheme ? 'bg-zinc-50' : 'bg-black'}`}>
        <DialogTitle className="sr-only">Program Posters Viewer</DialogTitle>
        <DialogDescription className="sr-only">Displays full screen posters with participant photos</DialogDescription>
        
        <DashboardTopBar 
          currentView="programs"
          onNavigate={onNavigate}
          isWhiteTheme={isWhiteTheme}
          toggleTheme={() => setIsWhiteTheme(!isWhiteTheme)}
          onClose={onClose}
          leftContent={programs.length > 0 && (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-3 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-[1.15] active:scale-95 flex items-center justify-center border cursor-pointer ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
                title={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </button>
              <div className={`px-4 py-2 rounded-xl backdrop-blur-sm border font-bold text-sm tracking-widest uppercase ${isWhiteTheme ? 'bg-white/50 text-zinc-500 border-zinc-200' : 'bg-zinc-900/50 text-zinc-400 border-zinc-800'}`}>
                Auto Slideshow 
              </div>
            </div>
          )}
        />

        {loading && (
          <div className={`flex flex-col items-center justify-center space-y-4 h-full ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
            <Loader2 className="h-12 w-12 animate-spin text-yellow-500" />
            <p className="text-xl font-medium tracking-widest uppercase opacity-60">Loading Posters...</p>
          </div>
        )}

        {error && (
          <div className={`flex flex-col items-center justify-center space-y-4 h-full ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
            <p className="text-xl text-red-500 font-medium">{error}</p>
            <button onClick={onClose} className={`px-6 py-2 font-bold uppercase tracking-wider rounded-md transition ${isWhiteTheme ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}>Close</button>
          </div>
        )}

        {!loading && !error && programs.length === 0 && (
          <div className={`flex flex-col items-center justify-center space-y-4 h-full ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
            <p className="text-xl font-medium">No active programs with participants found.</p>
            <button onClick={onClose} className={`px-6 py-2 font-bold uppercase tracking-wider rounded-md transition ${isWhiteTheme ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}>Close</button>
          </div>
        )}

        {!loading && !error && programs.length > 0 && (
          <div className={`relative w-full h-full flex items-center justify-center overflow-hidden group transition-colors duration-500 pt-20 ${isWhiteTheme ? 'bg-zinc-50 bg-[radial-gradient(ellipse_at_center,_#ffffff_0%,_#f4f4f5_100%)]' : 'bg-zinc-950 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black'}`}>
            
            {/* Navigation Buttons */}
            <button 
              onClick={handlePrev}
              className={`absolute left-6 z-50 p-4 rounded-full backdrop-blur-md transition-all border shadow-2xl hover:scale-110 hover:-translate-x-1 opacity-0 group-hover:opacity-100 ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>

            <button 
              onClick={handleNext}
              className={`absolute right-6 z-50 p-4 rounded-full backdrop-blur-md transition-all border shadow-2xl hover:scale-110 hover:translate-x-1 opacity-0 group-hover:opacity-100 ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
            >
              <ChevronRight className="h-8 w-8" />
            </button>

            {/* Current Poster Content Container (Animated Key) */}
            <div 
              key={currentIndex} 
              className="w-full h-full p-8 md:px-24 flex flex-col items-center justify-start overflow-y-auto no-scrollbar scroll-smooth animate-in fade-in slide-in-from-right-16 zoom-in-95 duration-700 mt-4"
            >
               {/* Poster Header */}
               <div className="w-full text-center space-y-6 mb-16 md:max-w-4xl mx-auto">
                  <div className={`flex items-center justify-center gap-4 text-sm md:text-lg font-bold font-sans uppercase tracking-[0.2em] ${isWhiteTheme ? 'text-zinc-500' : 'text-zinc-400'}`}>
                     <span>{programs[currentIndex].division}</span>
                     <span className={`w-1.5 h-1.5 rounded-full ${isWhiteTheme ? 'bg-zinc-300' : 'bg-zinc-600'}`}></span>
                     <span className={`${isWhiteTheme ? 'text-amber-600' : 'text-yellow-500/90'}`}>{programs[currentIndex].category}</span>
                     <span className={`w-1.5 h-1.5 rounded-full ${isWhiteTheme ? 'bg-zinc-300' : 'bg-zinc-600'}`}></span>
                     <span>{programs[currentIndex].type}</span>
                  </div>
                  <h1 className="text-5xl md:text-7xl lg:text-[5rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 uppercase tracking-tight drop-shadow-sm">
                     {programs[currentIndex].name}
                  </h1>
                  <div className="h-1 w-32 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mx-auto rounded-full opacity-50"></div>
               </div>

                {/* Participants Grid */}
                <div className="w-full max-w-7xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8 mb-24 pb-12">
                   {programs[currentIndex].participants.map((p, idx) => (
                     <div key={p._id || idx} className={`group/card relative flex flex-col items-center rounded-[2rem] p-6 border transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_20px_40px_-15px_rgba(234,179,8,0.15)] overflow-visible animate-in fade-in zoom-in-90 fill-mode-both ${isWhiteTheme ? 'bg-white/80 border-zinc-200' : 'bg-zinc-900/40 border-zinc-800/60 hover:border-yellow-500/30'}`} style={{ animationDelay: `${idx * 50}ms`, animationDuration: '600ms' }}>
                        
                        {/* Chest Number Badge */}
                        <div className={`absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 text-black font-black text-lg rounded-full flex items-center justify-center shadow-xl transform group-hover/card:scale-110 transition-transform duration-300 z-10 border-4 ${isWhiteTheme ? 'border-zinc-50' : 'border-zinc-950'}`}>
                          {p.chestNumber}
                        </div>
 
                        {/* Profile Picture */}
                        <div className={`w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 mb-5 shadow-inner transition-colors duration-300 relative ${isWhiteTheme ? 'border-zinc-100 bg-zinc-50 group-hover/card:border-yellow-500/20' : 'border-zinc-800/80 bg-zinc-800 group-hover/card:border-yellow-500/50'}`}>
                          {p.profilePic ? (
                            <img src={p.profilePic} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center font-bold text-4xl uppercase ${isWhiteTheme ? 'bg-zinc-100 text-zinc-400' : 'bg-zinc-800/50 text-zinc-600'}`}>
                              {p.name.charAt(0)}
                            </div>
                          )}
                        </div>
 
                        {/* Participant Details */}
                        <div className="text-center w-full space-y-1">
                          <h3 className={`font-bold text-lg leading-tight truncate w-full transition-colors ${isWhiteTheme ? 'text-zinc-900' : 'text-zinc-100 group-hover/card:text-white'}`} title={p.name}>
                            {p.name}
                          </h3>
                          <p className={`text-xs font-bold tracking-widest uppercase truncate w-full ${isWhiteTheme ? 'text-amber-600' : 'text-yellow-500/80'}`} title={p.teamName}>
                            {p.teamName}
                          </p>
                        </div>
                     </div>
                   ))}
                </div>
            </div>
            
            {/* Dynamic Progress Indicator */}
            {isPlaying && programs.length > 1 && (
              <div className="absolute bottom-0 left-0 h-1 bg-yellow-500/50 animate-[pulse_5s_ease-in-out_infinite] w-full origin-left" style={{ animation: 'progress linear 5s infinite' }}>
                <style>{`
                  @keyframes progress {
                    0% { transform: scaleX(0); }
                    100% { transform: scaleX(1); }
                  }
                `}</style>
              </div>
            )}

            {/* Footer Progress & Info */}
            <div className="absolute bottom-6 w-full px-12 flex justify-between items-center pointer-events-none z-50">
              <div className={`font-mono text-sm font-bold tracking-[0.2em] uppercase ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {programs[currentIndex].participants.length} Participants
              </div>
              <div className={`font-mono text-xs md:text-sm font-bold tracking-widest px-4 py-2 rounded-full border shadow-lg backdrop-blur-md pointer-events-auto flex items-center gap-2 transition-all ${isWhiteTheme ? 'bg-white/80 text-zinc-600 border-zinc-200' : 'bg-zinc-900/80 text-zinc-400 border-zinc-800'}`}>
                {isPlaying && <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse hidden md:inline-block"></span>}
                PROGRAM {currentIndex + 1} OF {programs.length}
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
