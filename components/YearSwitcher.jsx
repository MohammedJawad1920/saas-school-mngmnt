"use client";

import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Edit2, Trash2, Settings2 } from "lucide-react";
import Cookies from "js-cookie";
import axios from "axios";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const YearSwitcher = () => {
  const [years, setYears] = useState([]);
  const [activeYear, setActiveYear] = useState("");
  const [newYear, setNewYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get("/api/settings");
      const settings = response.data.settings;
      setYears(settings.years || ["2025 november"]);

      const currentYear =
        Cookies.get("active-year") || settings.activeYear || "2025 november";
      setActiveYear(currentYear);

      if (!Cookies.get("active-year")) {
        Cookies.set("active-year", currentYear, { expires: 365, path: "/" });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (value) => {
    setActiveYear(value);
    Cookies.set("active-year", value, { expires: 365, path: "/" });
    window.location.reload();
  };

  const handleAddYear = async () => {
    if (!newYear.trim()) return;
    if (years.includes(newYear.trim())) {
      toast.error("Year already exists");
      return;
    }

    try {
      const updatedYears = [...years, newYear.trim()];
      await axios.put("/api/settings", { years: updatedYears });
      setYears(updatedYears);
      setNewYear("");
      toast.success("Year added successfully");
    } catch (error) {
      toast.error("Failed to add year");
    }
  };

  const handleRenameYear = async (oldName) => {
    if (!editValue.trim() || oldName === editValue.trim()) {
      setEditingYear(null);
      return;
    }

    if (years.includes(editValue.trim())) {
      toast.error("Year name already exists");
      return;
    }

    try {
      toast.loading("Renaming year and updating data...", { id: "rename" });
      await axios.put("/api/settings/rename-year", {
        oldName,
        newName: editValue.trim(),
      });

      const updatedYears = years.map((y) =>
        y === oldName ? editValue.trim() : y
      );
      setYears(updatedYears);
      if (activeYear === oldName) {
        setActiveYear(editValue.trim());
        Cookies.set("active-year", editValue.trim(), {
          expires: 365,
          path: "/",
        });
      }
      setEditingYear(null);
      toast.success("Year renamed successfully", { id: "rename" });
      window.location.reload();
    } catch (error) {
      toast.error("Failed to rename year", { id: "rename" });
    }
  };

  const handleDeleteYear = async (yearToDelete) => {
    if (years.length <= 1) {
      toast.error("At least one year must remain");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete "${yearToDelete}"? This will NOT delete the associated data, but the year will no longer be selectable.`
      )
    ) {
      return;
    }

    try {
      const updatedYears = years.filter((y) => y !== yearToDelete);
      const updatePayload = { years: updatedYears };

      if (activeYear === yearToDelete) {
        updatePayload.activeYear = updatedYears[0];
        Cookies.set("active-year", updatedYears[0], {
          expires: 365,
          path: "/",
        });
      }

      await axios.put("/api/settings", updatePayload);
      setYears(updatedYears);
      toast.success("Year removed from list");
      if (activeYear === yearToDelete) window.location.reload();
    } catch (error) {
      toast.error("Failed to delete year");
    }
  };

  if (loading)
    return <div className="h-10 animate-pulse bg-muted rounded-md mx-4 my-4" />;

  return (
    <div className="space-y-3 pb-4 border-b">
      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Festival Session
          </label>
          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-primary"
              >
                <Settings2 className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Manage Festival Sessions</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {years.map((year) => (
                  <div
                    key={year}
                    className="flex items-center justify-between gap-4 p-2 rounded-lg border bg-muted/30"
                  >
                    {editingYear === year ? (
                      <div className="flex flex-1 gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleRenameYear(year)
                          }
                        />
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => handleRenameYear(year)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => setEditingYear(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-sm">{year}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingYear(year);
                              setEditValue(year);
                            }}
                          >
                            <Edit2 className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteYear(year)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Select value={activeYear} onValueChange={handleYearChange}>
          <SelectTrigger className="w-full bg-background border-muted-foreground/20 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-2 overflow-hidden">
              <Calendar className="h-4 w-4 shrink-0 text-primary" />
              <SelectValue placeholder="Select Year" />
            </div>
          </SelectTrigger>
          <SelectContent className="z-[10000]">
            {years.map((year) => (
              <SelectItem key={year} value={year} className="cursor-pointer">
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="px-4 flex gap-2">
        <Input
          placeholder="New Year (e.g. 2026)"
          value={newYear}
          onChange={(e) => setNewYear(e.target.value)}
          className="h-8 text-xs bg-background border-muted-foreground/20"
          onKeyDown={(e) => e.key === "Enter" && handleAddYear()}
        />
        <Button
          size="icon"
          variant="secondary"
          className="h-8 w-8 shrink-0 hover:bg-primary hover:text-primary-foreground transition-all"
          onClick={handleAddYear}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default YearSwitcher;
