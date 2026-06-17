"use client";

import { useState, useEffect } from "react";
import { Menu, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTheme } from "next-themes";

export function Topbar({ user }) {
  const { toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [institution, setInstitution] = useState(null);

  // Handle client-side mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);

    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();
        if (data.settings?.institution) {
          setInstitution(data.settings.institution);
        }
      } catch (error) {
        console.error("Error fetching institution settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout");
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Render theme toggle only after component is mounted
  const renderThemeToggle = () => {
    if (!mounted) {
      // Return empty placeholder with same dimensions to maintain layout
      return <div className="w-5 h-5" />;
    }

    return theme === "light" ? (
      <Moon className="w-5 h-5" />
    ) : (
      <Sun className="w-5 h-5" />
    );
  };

  return (
    <header className="fixed top-0 left-0 w-full z-10 h-14 bg-background border-b shadow-sm flex items-center px-4 justify-between no-print">
      {/* Sidebar Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* User Profile / Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            mounted && setTheme(theme === "dark" ? "light" : "dark")
          }
          aria-label="Toggle theme"
          disabled={!mounted}
        >
          {renderThemeToggle()}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="User menu">
              <User className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0 rounded-xl mr-4 mt-4 overflow-hidden">
            <Card className="border-none shadow-none">
              <CardHeader className="flex flex-col items-center space-y-3 pb-6 border-b bg-muted/30">
                {institution?.logo?.url && (
                  <img
                    src={institution.logo.url}
                    alt="Institution Logo"
                    className="h-12 w-auto object-contain"
                  />
                )}
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {institution?.name || "Institution"}
                  </p>
                </div>
              </CardHeader>
              <CardHeader className="flex items-center space-x-4 pt-6">
                <Avatar className="h-12 w-12 border-2 border-primary/10">
                  <AvatarImage src={user.profilePic?.url} alt={user.name} />
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <CardTitle className="text-base truncate">
                    {user.name}
                  </CardTitle>
                  <CardDescription className="text-xs truncate">
                    {user.email}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </CardFooter>
            </Card>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
