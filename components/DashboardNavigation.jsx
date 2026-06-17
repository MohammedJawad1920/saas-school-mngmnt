"use client";

import React from "react";
import { 
  Award, 
  TrendingUp, 
  Star, 
  Crown, 
  BarChart3, 
  MonitorPlay, 
  Trophy,
  Layout,
  Monitor
} from "lucide-react";

export default function DashboardNavigation({ currentView, onNavigate, isWhiteTheme }) {
  const navItems = [
    { id: "display", label: "Display", icon: Monitor },
    { id: "code-letters", label: "Code Letters", icon: Layout },
    { id: "results", label: "Results", icon: Award },
    { id: "winners", label: "Winners", icon: Trophy },
    { id: "programs", label: "Programs", icon: MonitorPlay },
    { id: "teams", label: "Teams", icon: BarChart3 },
    { id: "graph", label: "Graph", icon: TrendingUp },
    { id: "toppers", label: "Toppers", icon: Star },
    { id: "champions", label: "Champions", icon: Crown },
  ];

  return (
    <div className={`flex items-center gap-1 md:gap-2 px-3 py-2 rounded-full backdrop-blur-md border shadow-xl transition-all duration-500 ${isWhiteTheme ? 'bg-white/80 border-zinc-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        
        return (
          <button
            key={item.id}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(item.id);
            }}
            title={item.label}
            className={`p-2.5 rounded-full transition-all duration-300 relative group
              ${isActive 
                ? 'bg-yellow-500 text-black scale-110 shadow-lg' 
                : isWhiteTheme 
                  ? 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100' 
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'
              }`}
          >
            <Icon className={`w-5 h-5 transition-transform duration-300 ${!isActive && 'group-hover:scale-110'}`} />
            
            {/* Tooltip on hover (desktop) */}
            <span className={`absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[200] border shadow-2xl
              ${isWhiteTheme ? 'bg-white border-zinc-100 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'}`}>
              {item.label}
            </span>

            {/* Active Indicator Dot */}
            {isActive && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
}
