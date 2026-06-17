"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, Trophy, BarChart3, Info, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardTopBar from "./DashboardTopBar";

const getTeamBgColor = (index) => {
  const colors = [
    "from-blue-600/90 to-blue-900/95 border-blue-400 text-blue-50 shadow-blue-500/30",
    "from-emerald-600/90 to-emerald-900/95 border-emerald-400 text-emerald-50 shadow-emerald-500/30",
    "from-rose-600/90 to-rose-900/95 border-rose-400 text-rose-50 shadow-rose-500/30",
    "from-purple-600/90 to-purple-900/95 border-purple-400 text-purple-50 shadow-purple-500/30",
    "from-orange-600/90 to-orange-900/95 border-orange-400 text-orange-50 shadow-orange-500/30",
    "from-cyan-600/90 to-cyan-900/95 border-cyan-400 text-cyan-50 shadow-cyan-500/30",
    "from-fuchsia-600/90 to-fuchsia-900/95 border-fuchsia-400 text-fuchsia-50 shadow-fuchsia-500/30",
    "from-lime-600/90 to-lime-900/95 border-lime-400 text-lime-50 shadow-lime-500/30",
    "from-indigo-600/90 to-indigo-900/95 border-indigo-400 text-indigo-50 shadow-indigo-500/30",
    "from-teal-600/90 to-teal-900/95 border-teal-400 text-teal-50 shadow-teal-500/30"
  ];
  return colors[index % colors.length];
};

const AnimatedCounter = ({ value, isActive, duration = 3000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = null;
    let animationFrameId;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const progressRatio = Math.min(progress / duration, 1);
      
      const easeOutCubic = 1 - Math.pow(1 - progressRatio, 3);
      
      if (isActive) {
        setCount(Math.floor(easeOutCubic * value));
      } else {
        setCount(Math.floor((1 - easeOutCubic) * value));
      }

      if (progress < duration) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(isActive ? value : 0);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isActive, value, duration]);

  return <>{count}</>;
};

export default function TeamPointsViewer({ isOpen, onClose, onNavigate, apiKey, isWhiteTheme, setIsWhiteTheme }) {
  const [teams, setTeams] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [limitInput, setLimitInput] = useState("");
  const [appliedLimit, setAppliedLimit] = useState(null);
  const [teamColors, setTeamColors] = useState({});
  const [loading, setLoading] = useState(true);
  const [revealedTeams, setRevealedTeams] = useState(new Set());
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementValue, setAnnouncementValue] = useState("");
  const [showTrophies, setShowTrophies] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTeamPoints();
    } else {
      setRevealedTeams(new Set());
      setLimitInput("");
    }
  }, [isOpen]);

  const handleApplyLimit = () => {
    if (!limitInput || limitInput === "") {
        fetchTeamPoints("");
        return;
    }

    setAnnouncementValue(limitInput);
    setShowAnnouncement(true);
    fetchTeamPoints(limitInput);
  };

  const closeAnnouncement = () => {
    if (loading) return; 
    setShowAnnouncement(false);
  };

  useEffect(() => {
    if (!showAnnouncement && teams.length > 0) {
        // Only automatically reveal if no limit applied (overall standings)
        if (announcementValue === "") {
          const allIds = new Set(teams.map(t => t._id));
          setRevealedTeams(allIds);
        }
        
        const duration = announcementValue !== "" ? 15000 : 3000;
        setShowTrophies(false);
        const timer = setTimeout(() => {
           setShowTrophies(true);
        }, duration);
        return () => clearTimeout(timer);
    }
  }, [showAnnouncement, teams, announcementValue]);

  // Global Key Listener for 1, 2, 3
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (isOpen && teams.length > 0) {
        if (e.key === '1' && teams[0]) {
          toggleReveal(teams[0]._id);
        } else if (e.key === '2' && teams[1]) {
          toggleReveal(teams[1]._id);
        } else if (e.key === '3' && teams[2]) {
          toggleReveal(teams[2]._id);
        } else if (e.key === 'Enter') {
          if (showAnnouncement) {
            closeAnnouncement();
          }
        }
      } else if (isOpen && e.key === 'Enter' && showAnnouncement) {
        // Even if teams haven't loaded yet, allow closing the announcement overlay
        closeAnnouncement();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, teams]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
        e.target.blur();
        if (showAnnouncement) {
            closeAnnouncement();
        } else {
            handleApplyLimit();
        }
    }
  };

  useEffect(() => {
    setRevealedTeams(new Set());
  }, [loading, teams]);

  const toggleReveal = (teamId) => {
    setRevealedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) newSet.delete(teamId);
      else newSet.add(teamId);
      return newSet;
    });
  };

  const revealAll = () => {
    if (revealedTeams.size === teams.length) {
      setRevealedTeams(new Set());
    } else {
      setRevealedTeams(new Set(teams.map(t => t._id)));
    }
  };

  const fetchTeamPoints = async (customLimit = null) => {
    try {
      setLoading(true);
      setRevealedTeams(new Set());
      
      let url = "/api/team-points-poster";
      if (customLimit && customLimit !== "") {
        url += `?limit=${customLimit}`;
      }
      
      const res = await fetch(url, {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();

      if (data.success) {
        setTeams(data.teams);
        setTeamColors(data.teamColors || {});
        setTotalResults(data.totalResultsAvailable);
        setAppliedLimit(data.appliedLimit);
      }
    } catch (error) {
      console.error("Error fetching team points:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const maxPoints = teams.length > 0 ? Math.max(...teams.map(t => t.points), 1) : 1;
  const highestPoints = teams.length > 0 ? teams[0].points : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-none w-screen h-screen m-0 p-0 rounded-none border-none transition-colors duration-500 overflow-hidden flex flex-col font-sans ${isWhiteTheme ? 'bg-zinc-50' : 'bg-black'}`}>
        <DialogTitle className="sr-only">Team Points Poster</DialogTitle>
        
        {/* Dynamic Background */}
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isWhiteTheme ? 'opacity-10' : 'opacity-30'}`}>
          <div className={`absolute inset-0 ${isWhiteTheme ? 'bg-[radial-gradient(ellipse_at_top,#d4d4d8,transparent_80%)]' : 'bg-[radial-gradient(ellipse_at_top,#27272a,transparent_80%)]'}`} />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          <div className={`absolute top-0 right-1/4 w-[40rem] h-[40rem] rounded-full blur-[120px] animate-pulse ${isWhiteTheme ? 'bg-indigo-300' : 'bg-indigo-500/20'}`} style={{ animationDuration: '6s' }} />
          <div className={`absolute bottom-0 left-1/4 w-[40rem] h-[40rem] rounded-full blur-[120px] animate-pulse ${isWhiteTheme ? 'bg-cyan-300' : 'bg-cyan-500/10'}`} style={{ animationDuration: '8s' }} />
        </div>

        <DashboardTopBar 
          currentView="teams"
          onNavigate={onNavigate}
          isWhiteTheme={isWhiteTheme}
          toggleTheme={() => setIsWhiteTheme(!isWhiteTheme)}
          onClose={onClose}
          leftContent={
            <div className="flex items-center gap-4">
              {/* Limit Selection Input */}
              <div className={`flex flex-row items-center space-x-2 p-1.5 rounded-[1.2rem] backdrop-blur-md shadow-xl border ${isWhiteTheme ? 'bg-white/80 border-zinc-200' : 'bg-zinc-900/80 border-zinc-700/50'}`}>
                <BarChart3 className={`w-5 h-5 ml-3 ${isWhiteTheme ? 'text-zinc-500' : 'text-zinc-400'}`} />
                <span className={`font-bold ml-1 tracking-wide uppercase text-[10px] md:text-sm ${isWhiteTheme ? 'text-zinc-500' : 'text-zinc-300'}`}>After</span>
                <input
                  type="number"
                  min="1"
                  max={totalResults || 999}
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="All"
                  className={`w-16 md:w-20 rounded-lg px-1 md:px-2 py-1 text-center font-black focus:outline-none transition-colors shadow-inner border-2 ${isWhiteTheme ? 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:border-zinc-400' : 'bg-zinc-950 border-zinc-700/80 text-white focus:border-zinc-500'}`}
                />
                <span className={`font-bold mr-2 tracking-wide uppercase text-[10px] md:text-sm ${isWhiteTheme ? 'text-zinc-500' : 'text-zinc-300'}`}>Results</span>
                <Button 
                   onClick={handleApplyLimit}
                   disabled={loading}
                   className={`font-black uppercase rounded-lg tracking-wider px-3 py-1 h-8 md:h-9 border-none transition-transform active:scale-95 ${isWhiteTheme ? 'bg-zinc-900 hover:bg-black text-white' : 'bg-zinc-100 hover:bg-white text-black'}`}
                >
                  Apply
                </Button>
              </div>
              
              {/* Total Results Context */}
              <div className={`text-[10px] md:text-xs px-4 py-2 rounded-xl border backdrop-blur-sm flex items-center gap-2 font-bold tracking-widest uppercase shadow-lg ${isWhiteTheme ? 'bg-white/50 text-zinc-500 border-zinc-200' : 'bg-zinc-900/50 text-zinc-400 border-zinc-800'}`}>
                <Info className="w-3 h-3 md:w-4 md:h-4" />
                <span>Overall Declared: <strong className={`text-base px-2 py-0.5 rounded-md ml-1 ${isWhiteTheme ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-800 text-white'}`}>{totalResults}</strong></span>
              </div>

              <Button
                  onClick={revealAll}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase rounded-xl tracking-wider px-4 py-2 h-8 md:h-10 transition-transform active:scale-95 shadow-[0_0_15px_rgba(234,179,8,0.3)] border-none"
              >
                Reveal All
              </Button>
            </div>
          }
        />

        <div className={`flex flex-col flex-1 w-full transition-all duration-1000 pt-24 ${showAnnouncement ? 'opacity-0 scale-95 pointer-events-none blur-xl' : 'opacity-100 scale-100'}`}>
            {/* Title Area */}
            <div className="shrink-0 w-full text-center z-40 px-4 pointer-events-none">
              <h1 className={`text-4xl md:text-6xl lg:text-[5rem] leading-none font-black uppercase tracking-tight drop-shadow-2xl ${isWhiteTheme ? 'text-zinc-900' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400'}`}>
                Team Points
              </h1>
              <h2 className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-600 uppercase tracking-widest mt-2 md:mt-4">
                {appliedLimit && appliedLimit < totalResults ? `After ${appliedLimit} Results` : 'Overall Standings'}
              </h2>
            </div>

            {/* Main Content Arena */}
            <div className="relative z-30 flex-1 w-full flex flex-col justify-end pt-8 pb-8 px-2 md:px-16 overflow-y-auto overflow-x-auto no-scrollbar scroll-smooth">
              {loading ? 
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 h-full min-h-[50vh]">
                  <div className="w-16 h-16 border-[6px] border-zinc-800 border-t-white rounded-full animate-spin shadow-[0_0_30px_rgba(255,255,255,0.1)]"></div>
                  <p className="text-zinc-500 font-bold tracking-[0.3em] uppercase animate-pulse">Computing Standings...</p>
                </div>
              : teams.length === 0 ? 
                <div className="flex-1 flex items-center justify-center h-full min-h-[50vh]">
                  <p className="text-zinc-600 font-black text-2xl uppercase tracking-[0.3em]">No teams found</p>
                </div>
              : 
                 <div className="flex-1 w-full max-w-[120rem] min-w-max mx-auto flex items-end justify-center gap-8 md:gap-12 lg:gap-20 pt-16 shrink-0">
                    {teams.map((team) => {
                      const heightPercentage = Math.max((team.points / maxPoints) * 90, 1.5);
                      const isLeader = team.points > 0 && team.points === highestPoints;
                      const revealDuration = announcementValue !== "" ? 15000 : 3000;
     
                      return (
                        <div key={team._id} className="flex flex-col items-center justify-end h-full w-24 md:w-32 lg:w-44 group cursor-pointer" onClick={() => toggleReveal(team._id)}>
                          
                          <div className="relative w-full flex-1 flex flex-col justify-end items-center">
                            <div 
                              className={`absolute flex flex-col items-center transition-all ease-out z-20 pointer-events-none drop-shadow-2xl
                                ${revealedTeams.has(team._id) ? 'opacity-100 transform translate-y-[-1rem] md:translate-y-[-2rem]' : 'opacity-0 transform translate-y-10'}`} 
                              style={{ 
                                bottom: `${heightPercentage}%`,
                                transitionDuration: `${revealDuration}ms`
                              }}
                            >
                              <span className={`text-4xl md:text-[4rem] lg:text-[5.5rem] font-black leading-none drop-shadow-2xl ${isWhiteTheme ? 'text-zinc-900' : 'text-white'} ${isLeader && (isWhiteTheme ? 'text-amber-600' : 'text-yellow-100 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]')}`}>
                                <AnimatedCounter value={team.points} isActive={revealedTeams.has(team._id)} duration={revealDuration} />
                              </span>
                            </div>
                            
                            <div 
                              className={`w-full rounded-t-[2rem] md:rounded-t-[3rem] border-t-8 border-l border-r border-b-0 relative overflow-hidden transition-all ease-out shadow-2xl flex-shrink-0 flex flex-col items-center justify-center`}
                              style={{ 
                                height: revealedTeams.has(team._id) ? `${heightPercentage}%` : '0%',
                                transitionDuration: `${revealDuration}ms`,
                                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                                background: `linear-gradient(to top, ${team.color}e6, ${team.color}ff)`,
                                borderColor: team.color
                              }}
                            >
                              {/* Team Name inside the bar */}
                              <div className={`absolute bottom-8 left-0 right-0 flex items-center justify-center transition-opacity duration-1000 ${revealedTeams.has(team._id) ? 'opacity-100' : 'opacity-0'}`}>
                                <span 
                                  className="text-white/90 font-black uppercase tracking-[0.2em] text-xl md:text-3xl lg:text-5xl whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                >
                                  {team.name}
                                </span>
                              </div>

                              <div className="absolute inset-0 bg-white/5 box-border border-x border-white/10 opacity-50 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/30 to-transparent mix-blend-overlay" />
                            </div>
                          </div>
     
                          <div className="mt-8 mb-4 shrink-0 z-10 w-full text-center h-4 md:h-12">
                             {/* Team name moved inside bar */}
                          </div>
                        </div>
                      );
                    })}
                 </div>
              }
            </div>
        </div>

        {showAnnouncement && (
          <div 
            onClick={closeAnnouncement}
            className="absolute inset-0 z-[200] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 cursor-pointer bg-black/10 backdrop-blur-[2px]"
          >
            <div className="flex flex-col items-center justify-center text-center space-y-4 md:space-y-8 animate-[slow-pan_10s_ease-in-out_infinite] px-4 pointer-events-none">
               <h3 className={`text-4xl md:text-6xl font-black uppercase tracking-[0.5em] animate-pulse ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-500'}`}>
                 Declaring Standings
               </h3>
               <h1 className={`text-6xl md:text-8xl lg:text-[12rem] font-black uppercase tracking-tighter leading-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] px-4 animate-[float_10s_ease-in-out_infinite] ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                 Team Points <br className="md:hidden" />
                 <span className={`block mt-4 md:mt-8 ${isWhiteTheme ? 'text-blue-600' : 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-white to-yellow-600'}`}>
                    After {announcementValue} Results
                 </span>
               </h1>

            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-30px) scale(1.05); }
          }
          @keyframes slow-pan {
            0% { transform: translate(-2%, -2%) scale(1); }
            50% { transform: translate(2%, 2%) scale(1.1); }
            100% { transform: translate(-2%, -2%) scale(1); }
          }
        ` }} />
      </DialogContent>
    </Dialog>
  );
}
