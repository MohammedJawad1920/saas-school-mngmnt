"use client";

import React from "react";
import { X, Sun, Moon } from "lucide-react";
import DashboardNavigation from "./DashboardNavigation";

export default function DashboardTopBar({ 
  currentView, 
  onNavigate, 
  isWhiteTheme, 
  toggleTheme, 
  onClose,
  leftContent // Slot for view-specific inputs or info
}) {
  return (
    <div className="absolute top-0 left-0 right-0 z-[100] px-6 py-4 flex items-center justify-between pointer-events-none">
      {/* Left Section: View-specific context/inputs */}
      <div className="flex items-center gap-4 pointer-events-auto">
        {leftContent}
      </div>

      {/* Right Section: Global Controls */}
      <div className="flex items-center gap-4 pointer-events-auto">
        <DashboardNavigation 
          currentView={currentView} 
          onNavigate={onNavigate} 
          isWhiteTheme={isWhiteTheme} 
        />

        {/* Theme Toggle */}
        <button 
          onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
          className={`p-3 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-[1.15] active:scale-95 flex items-center justify-center border cursor-pointer ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
          title={isWhiteTheme ? "Dark Theme" : "White Theme"}
        >
          {isWhiteTheme ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
        </button>

        {/* Close Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className={`p-3 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-[1.15] active:scale-95 flex items-center justify-center border cursor-pointer ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
          title="Close Viewer"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
