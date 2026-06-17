"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, Monitor, Loader2 } from "lucide-react";
import DashboardTopBar from "./DashboardTopBar";

/**
 * GeneralDisplayViewer
 * A cinematic full-screen display for custom text announcements.
 * Idle State: Shows Festival Logo.
 * Active State: Each word on a new line (Line 1-2 White, 3+ Golden).
 */
export default function GeneralDisplayViewer({ isOpen, onClose, apiKey, onNavigate, isWhiteTheme, setIsWhiteTheme, initialText = "" }) {
  const [displayText, setDisplayText] = useState(initialText);
  const [inputValue, setInputValue] = useState(initialText);
  const [festivalSettings, setFestivalSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Sync internal display text with prop
  useEffect(() => {
    if (isOpen) {
      setDisplayText(initialText);
      setInputValue(initialText);
      fetchSettings();
      // Auto-focus input when opened
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, initialText]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/settings`, {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      if (data.settings && data.settings.festival) {
        setFestivalSettings(data.settings.festival);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  };

  // Global key listener
  useEffect(() => {
    const handleKey = (e) => {
      const key = e.key.toLowerCase();
      
      if (key === 'x' && isOpen) {
        onClose();
      }

      if (key === 'b' && isOpen && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const words = displayText.trim() ? displayText.split(/\s+/) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-none w-screen h-screen m-0 p-0 rounded-none border-none overflow-hidden flex flex-col font-sans transition-colors duration-500 ${isWhiteTheme ? 'bg-zinc-50' : 'bg-black text-white'}`}>
        <DialogTitle className="sr-only">Live Display</DialogTitle>
        
        <DashboardTopBar 
          currentView="display"
          onNavigate={onNavigate}
          isWhiteTheme={isWhiteTheme}
          toggleTheme={() => setIsWhiteTheme(!isWhiteTheme)}
          onClose={onClose}
        />

        <div className="flex-1 relative flex flex-col items-center justify-start p-8 overflow-y-auto overflow-x-hidden pt-12 md:pt-24 pb-24 custom-scrollbar">
          
          {/* TOP LEFT INPUT AREA */}
          <div className="absolute top-6 left-6 z-[100] flex animate-in fade-in slide-in-from-left-10 duration-700">
            <div className={`w-80 md:w-[30rem] p-1 rounded-xl backdrop-blur-md border shadow-2xl transition-all ${isWhiteTheme ? 'bg-white/70 border-zinc-200' : 'bg-zinc-900/70 border-zinc-700/50 focus-within:border-indigo-500'}`}>
              <input 
                ref={inputRef}
                type="text"
                placeholder="Declare message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setDisplayText(inputValue);
                    e.currentTarget.blur();
                  }
                }}
                className="w-full bg-transparent px-4 py-2 text-sm md:text-lg font-black uppercase tracking-widest focus:outline-none"
              />
            </div>
          </div>

          {/* BACKGROUND DECORATION */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            <div className={`absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full blur-[100px] ${isWhiteTheme ? 'bg-zinc-200' : 'bg-zinc-800'}`} />
            <div className={`absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full blur-[100px] ${isWhiteTheme ? 'bg-zinc-200' : 'bg-zinc-800'}`} />
          </div>

          {/* CONTENT AREA */}
          <div className="relative z-10 w-full min-h-full flex items-center justify-center">
            
            {words.length === 0 ? (
              /* IDLE STATE: Full Size Festival Logo */
              <div className="animate-in fade-in zoom-in duration-1000 flex items-center justify-center w-full h-full p-0">
                {festivalSettings?.festivalNameImage?.url ? (
                  <img 
                    src={festivalSettings.festivalNameImage.url} 
                    alt={festivalSettings.name || "Festival Logo"} 
                    className="w-full h-full object-contain drop-shadow-[0_0_100px_rgba(0,0,0,0.2)] animate-breathing-zoom"
                  />
                ) : festivalSettings?.name ? (
                   <h1 className={`text-6xl md:text-9xl font-black uppercase tracking-[0.5em] text-center ${isWhiteTheme ? 'text-zinc-300' : 'text-zinc-800'}`}>
                     {festivalSettings.name}
                   </h1>
                ) : (
                  <div className="p-12 rounded-full border-4 border-dashed border-zinc-800 animate-spin-slow">
                    <Monitor className="w-24 h-24 text-zinc-800" />
                  </div>
                )}
              </div>
            ) : (
              /* ACTIVE STATE: Words Display */
              <div className="flex flex-col items-center justify-center text-center space-y-4 md:space-y-8 animate-in fade-in duration-700">
                {words.map((word, wordIdx) => {
                  const isGold = wordIdx >= 2;
                  const previousWordsLength = words.slice(0, wordIdx).reduce((acc, w) => acc + w.length, 0);
                  
                  // Extreme dynamic font size based on word count
                  let fontSizeClass = "text-[10rem] md:text-[18rem] lg:text-[22rem]";
                  if (words.length > 2) fontSizeClass = "text-[8rem] md:text-[14rem] lg:text-[18rem]";
                  if (words.length > 4) fontSizeClass = "text-[6rem] md:text-[10rem] lg:text-[14rem]";
                  if (words.length > 6) fontSizeClass = "text-[4.5rem] md:text-[8rem] lg:text-[11rem]";
                  if (words.length > 10) fontSizeClass = "text-[3rem] md:text-[6rem] lg:text-[8rem]";

                  return (
                    <div 
                      key={wordIdx}
                      className={`
                        flex flex-wrap justify-center gap-[0.05em]
                        ${fontSizeClass} font-black uppercase tracking-tighter leading-[0.85]
                        ${!isGold ? (isWhiteTheme ? 'text-zinc-900' : 'text-white') : ''}
                      `}
                    >
                      {word.split("").map((char, charIdx) => {
                        const globalIdx = previousWordsLength + charIdx;
                        return (
                          <span 
                            key={charIdx}
                            className={`inline-block animate-[letter-reveal_0.8s_ease-out_both,letter-float_4s_ease-in-out_infinite] ${isGold ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 via-yellow-200 to-yellow-600' : ''}`}
                            style={{ 
                              animationDelay: `${globalIdx * 0.1}s, ${globalIdx * 0.1 + 0.8}s`,
                              filter: isGold ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' : 'none',
                              WebkitBackgroundClip: isGold ? 'text' : 'none'
                            }}
                          >
                            {char}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes shimmer {
            0% { filter: brightness(1); }
            50% { filter: brightness(1.5); }
            100% { filter: brightness(1); }
          }
          @keyframes breathing-zoom {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
          @keyframes letter-reveal {
            0% { opacity: 0; transform: translateY(40px) scale(0.5) rotateX(-90deg); filter: blur(10px); }
            100% { opacity: 1; transform: translateY(0) scale(1) rotateX(0deg); filter: blur(0); }
          }
          @keyframes letter-float {
            0%, 100% { transform: translateY(0) scale(1); filter: brightness(1); }
            50% { transform: translateY(-20px) scale(1.05); filter: brightness(1.2); }
          }
          .animate-breathing-zoom {
            animation: breathing-zoom 10s ease-in-out infinite;
          }
          .animate-spin-slow {
            animation: spin 20s linear infinite;
          }
          @keyframes spin {
             from { transform: rotate(0deg); }
             to { transform: rotate(360deg); }
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(155, 155, 155, 0.2);
            border-radius: 10px;
          }
        ` }} />
      </DialogContent>
    </Dialog>
  );
}
