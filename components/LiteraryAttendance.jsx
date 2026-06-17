"use client";

import { formatDate, formatDateForDisplay } from "@/lib/utils";
import Header from "./Header";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { AlertTriangle, CheckCircle2, ChevronsUpDown, Plus, X } from "lucide-react";
import useCrud from "@/hooks/use-crud";
import { useRouter } from "next/navigation";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { cn } from "@/lib/utils";

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Default attendance categories – "Literary" means existing ALL behaviour
const DEFAULT_CATEGORIES = ["Literary", "Haddad", "Programs", "Spot"];
const LITERARY_STORAGE_KEY = "literary_attendance_categories";

const AbsenteesDialog = ({ open, setOpen, date, absentees }) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Literary Absentees</DialogTitle>
          <DialogDescription>
            The following students were absent on {date}.
          </DialogDescription>
        </DialogHeader>
        {absentees.length > 0 ? (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">
              Absent Students ({absentees.length})
            </h4>
            <div className="max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Student Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absentees.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell>{student.studentId || "Unknown"}</TableCell>
                      <TableCell>{student.studentName || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-6">
            <p>Full attendance for this period</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/** Combobox with ability to add custom items */
const CategoryCombobox = ({ value, onChange, categories, onAddCategory, onRemoveCategory }) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!inputValue.trim()) return categories;
    return categories.filter((c) =>
      c.toLowerCase().includes(inputValue.trim().toLowerCase())
    );
  }, [categories, inputValue]);

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const exists = categories.some(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      onAddCategory(trimmed);
    }
    onChange(trimmed);
    setInputValue("");
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If exact match in filtered list, select it
      if (filtered.length === 1) {
        onChange(filtered[0]);
        setInputValue("");
        setOpen(false);
      } else {
        handleAdd();
      }
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-sm font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value || "Select category…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-0"
        align="start"
        style={{ zIndex: 9999 }}
      >
        <div className="flex flex-col">
          {/* Search / Add Input */}
          <div className="flex items-center gap-1 px-2 py-2 border-b">
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search or add…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button
              type="button"
              onClick={handleAdd}
              className="flex items-center justify-center h-6 w-6 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Add custom category"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* List */}
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Press Enter or + to add
              </div>
            ) : (
              filtered.map((cat) => (
                <div
                  key={cat}
                  className={cn(
                    "group flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground rounded-sm mx-1",
                    value === cat && "bg-accent text-accent-foreground font-medium"
                  )}
                >
                  <span
                    className="flex-1"
                    onClick={() => {
                      onChange(cat);
                      setInputValue("");
                      setOpen(false);
                    }}
                  >
                    {cat}
                  </span>
                  {/* Only allow removing custom (non-default) categories */}
                  {!DEFAULT_CATEGORIES.includes(cat) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveCategory(cat);
                        if (value === cat) onChange("");
                      }}
                      className="opacity-0 group-hover:opacity-100 ml-1 text-muted-foreground hover:text-destructive transition-all"
                      title="Remove category"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const LiteraryAttendance = ({
  students = [],
  classes = [],
  apiKey,
  groups = [],
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [attendance, setAttendance] = useState({});
  const [absenteesDialogOpen, setAbsenteesDialogOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");

  // ─── Category state ───────────────────────────────────────────────────────
  const [categories, setCategories] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_CATEGORIES;
    try {
      const stored = localStorage.getItem(LITERARY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge defaults (preserve order, add any new defaults first)
        const merged = [...DEFAULT_CATEGORIES];
        parsed.forEach((c) => {
          if (!merged.includes(c)) merged.push(c);
        });
        return merged;
      }
    } catch (_) {}
    return DEFAULT_CATEGORIES;
  });

  const [selectedCategory, setSelectedCategory] = useState("Literary");

  // Persist custom categories to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LITERARY_STORAGE_KEY, JSON.stringify(categories));
    } catch (_) {}
  }, [categories]);

  const handleAddCategory = useCallback((cat) => {
    setCategories((prev) => {
      if (prev.find((c) => c.toLowerCase() === cat.toLowerCase())) return prev;
      return [...prev, cat];
    });
  }, []);

  const handleRemoveCategory = useCallback((cat) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
  }, []);

  // ─── Derived attendance category value sent to the API ────────────────────
  // "Literary" → use existing "ALL" category value (no change to existing behavior)
  // Others → use uppercased label (e.g. "HADDAD", "PROGRAMS", "SPOT")
  const apiCategory = useMemo(() => {
    if (!selectedCategory || selectedCategory === "Literary") return "ALL";
    return selectedCategory.toUpperCase().replace(/\s+/g, "_");
  }, [selectedCategory]);

  const router = useRouter();

  const today = useMemo(() => days[new Date().getDay()], [days]);
  const date = useMemo(() => formatDateForDisplay(new Date()), []);
  const formattedDate = useMemo(() => formatDate(new Date()), []);

  useEffect(() => {
    router.refresh();
  }, []);

  const { useFetchItems: useFetch } = useCrud("literary/attendances", apiKey);

  const attendanceQuery = useFetch(
    0,
    0,
    {
      date: formattedDate,
      trackAbsentees: true,
    },
    {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }
  );

  const attendanceData = useMemo(() => {
    return attendanceQuery.data?.attendances || [];
  }, [attendanceQuery.data]);

  const absentees = useMemo(() => {
    return attendanceQuery.data?.absentees || [];
  }, [attendanceQuery.data]);

  const classBasedAbsentees = useMemo(() => {
    return absentees
      .filter((student) => student.category === apiCategory)
      .reduce((acc, student) => {
        if (!acc[student.classId]) {
          acc[student.classId] = [];
        }
        acc[student.classId].push(student);
        return acc;
      }, {});
  }, [absentees, apiCategory]);

  const groupBasedAbsentees = useMemo(() => {
    return absentees
      .filter((student) => student.category === "GROUP")
      .reduce((acc, student) => {
        if (!acc[student.groupId]) {
          acc[student.groupId] = [];
        }
        acc[student.groupId].push(student);
        return acc;
      }, {});
  }, [absentees]);

  useEffect(() => {
    if (students?.length > 0) {
      const initialAttendance = {};
      students.forEach((student) => {
        initialAttendance[student._id] = true;
      });
      if (Object.keys(attendance).length === 0) {
        setAttendance(initialAttendance);
      }
    }
  }, [students, attendance]);

  const isAttendanceMarked = useCallback(
    (id) => {
      if (activeTab === "group") {
        return attendanceData.some(
          (att) =>
            att.groupId === id &&
            att.date === formattedDate &&
            att.category === "GROUP"
        );
      }
      return attendanceData.some(
        (att) =>
          att.classId === id &&
          att.date === formattedDate &&
          att.category === apiCategory
      );
    },
    [attendanceData, activeTab, formattedDate, apiCategory]
  );

  // Reset to "all" tab whenever session type is not Literary
  useEffect(() => {
    if (selectedCategory !== "Literary") {
      setActiveTab("all");
    }
  }, [selectedCategory]);

  const isLiterary = selectedCategory === "Literary";

  return (
    <div className="space-y-3">
      <Header
        title="LITERARY ATTENDANCE"
        subTitle="Manage Literary Attendance"
      />
      <div className="mb-4 py-1 px-8 border border-border rounded-lg max-w-fit text-sm">
        {date}
      </div>

      {/* ── Session Type selector – above the tab bar ── */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Session Type
        </span>
        <div className="w-52">
          <CategoryCombobox
            value={selectedCategory}
            onChange={setSelectedCategory}
            categories={categories}
            onAddCategory={handleAddCategory}
            onRemoveCategory={handleRemoveCategory}
          />
        </div>

      </div>

      <Tabs value={activeTab} defaultValue="all" onValueChange={setActiveTab}>
        {isLiterary && (
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="all">General</TabsTrigger>
            <TabsTrigger value="group">Group</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="all">

          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Absentees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow
                    key={cls._id}
                    className="hover:bg-accent/50 cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/dashboard/literary-attendance/mark-attendance?classId=${cls?._id}&className=${cls?.name}&category=${apiCategory}&sessionLabel=${encodeURIComponent(selectedCategory)}&apiKey=${apiKey}&date=${formattedDate}&day=${today}&batchId=${cls.batchId?._id || cls.batchId}`
                      )
                    }
                  >
                    <TableCell className="whitespace-nowrap">
                      <div className="text-xs md:text-base">{cls?.name}</div>
                      {isAttendanceMarked(cls._id) && (
                        <div className="flex items-center gap-1 text-xxs text-muted-foreground mt-0.5">
                          <CheckCircle2 className="text-green-500 h-3 w-3" />
                          <span>Attendance Marked</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {classBasedAbsentees[cls._id] &&
                        classBasedAbsentees[cls._id].length > 0 ? (
                        <div
                          className={`flex items-center ml-auto max-w-fit gap-2 rounded-full px-2 py-1 border hover:bg-muted transition-colors`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAbsenteesDialogOpen(true);
                            setSelectedClassId(cls._id);
                          }}
                        >
                          <AlertTriangle className="text-red-500 h-4 w-4" />
                          <Badge
                            variant="destructive"
                            className="text-xs whitespace-nowrap"
                          >
                            {classBasedAbsentees[cls._id].length}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {isAttendanceMarked(cls._id) ? "0" : "-"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="group">
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Absentees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow
                    key={group._id}
                    className="hover:bg-accent/50 cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/dashboard/literary-attendance/mark-attendance?groupId=${group?._id}&groupName=${group?.name}&category=GROUP&apiKey=${apiKey}&date=${formattedDate}&day=${today}`
                      )
                    }
                  >
                    <TableCell className="whitespace-nowrap">
                      <div className="text-xs md:text-base">{group?.name}</div>
                      {group.leaderName && (
                        <div className="text-xxs text-muted-foreground mt-0.5">
                          Leader: {group.leaderName}
                        </div>
                      )}
                      {isAttendanceMarked(group._id) && (
                        <div className="flex items-center gap-1 text-xxs text-muted-foreground mt-0.5">
                          <CheckCircle2 className="text-green-500 h-3 w-3" />
                          <span>Attendance Marked</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {groupBasedAbsentees[group._id] &&
                        groupBasedAbsentees[group._id].length > 0 ? (
                        <div
                          className={`flex items-center ml-auto max-w-fit gap-2 rounded-full px-2 py-1 border hover:bg-muted transition-colors`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAbsenteesDialogOpen(true);
                            setSelectedGroupId(group._id);
                          }}
                        >
                          <AlertTriangle className="text-red-500 h-4 w-4" />
                          <Badge
                            variant="destructive"
                            className="text-xs whitespace-nowrap"
                          >
                            {groupBasedAbsentees[group._id].length}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {isAttendanceMarked(group._id) ? "0" : "-"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <AbsenteesDialog
        open={absenteesDialogOpen}
        setOpen={setAbsenteesDialogOpen}
        date={date}
        absentees={
          activeTab === "all"
            ? classBasedAbsentees[selectedClassId] || []
            : groupBasedAbsentees[selectedGroupId] || []
        }
      />
    </div>
  );
};

export default LiteraryAttendance;
