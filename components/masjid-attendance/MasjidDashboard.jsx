"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { formatDate, formatDateForDisplay } from "@/lib/utils";
import Header from "@/components/Header";
import PrayerSection from "./PrayerSection";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronsUpDown, Plus, X, CheckCircle2 } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import { useRouter } from "next/navigation";

const prayers = ["ZUHR", "ASAR", "MAGRIB", "ISHA", "SUBH"];

const DEFAULT_CATEGORIES = ["Masjid", "Haddad", "Programs", "Spot"];
const STORAGE_KEY = "masjid_attendance_categories";

// ── Combobox ───────────────────────────────────────────────────────────────
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
        const exists = categories.some((c) => c.toLowerCase() === trimmed.toLowerCase());
        if (!exists) onAddCategory(trimmed);
        onChange(trimmed);
        setInputValue("");
        setOpen(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (filtered.length === 1) {
                onChange(filtered[0]);
                setInputValue("");
                setOpen(false);
            } else {
                handleAdd();
            }
        }
        if (e.key === "Escape") setOpen(false);
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
            <PopoverContent className="w-[220px] p-0" align="start" style={{ zIndex: 9999 }}>
                <div className="flex flex-col">
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

// ── Classwise view (for non-Masjid categories) ────────────────────────────
const ClasswiseSection = ({ classes, apiKey, selectedCategory, formattedDate, today }) => {
    const router = useRouter();

    // Use category name (uppercased) as the "prayer" value to store/query
    const categoryKey = selectedCategory.toUpperCase().replace(/\s+/g, "_");

    const { useFetchItems } = useCrud("masjid/attendance", apiKey);
    const { data: attendanceData } = useFetchItems(
        0, 0,
        { date: formattedDate, prayer: categoryKey },
        { refetchOnWindowFocus: true, refetchOnMount: true }
    );

    const markedClassIds = useMemo(() => {
        return new Set(
            attendanceData?.attendances?.map((att) => att.classId._id) || []
        );
    }, [attendanceData]);

    return (
        <div className="overflow-x-auto border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {classes.map((cls) => {
                        const isMarked = markedClassIds.has(cls._id);
                        return (
                            <TableRow
                                key={cls._id}
                                className="hover:bg-accent/50 cursor-pointer"
                                onClick={() =>
                                    router.push(
                                        `/dashboard/masjid-attendance/mark?classId=${cls._id}&className=${encodeURIComponent(cls.name)}&batchId=${cls.batchId || ""}&prayer=${categoryKey}&date=${formattedDate}&apiKey=${apiKey}&sessionLabel=${encodeURIComponent(selectedCategory)}`
                                    )
                                }
                            >
                                <TableCell className="whitespace-nowrap">
                                    <div className="text-xs md:text-base">{cls.name}</div>
                                    {isMarked && (
                                        <div className="flex items-center gap-1 text-xxs text-muted-foreground mt-0.5">
                                            <CheckCircle2 className="text-green-500 h-3 w-3" />
                                            <span>Attendance Marked</span>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className="text-muted-foreground text-sm">
                                        {isMarked ? "✓" : "–"}
                                    </span>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {classes.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                No active classes found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

// ── Main dashboard ─────────────────────────────────────────────────────────
const MasjidDashboard = ({ classes, apiKey }) => {
    const [selectedDate] = useState(new Date());

    const formattedDate = useMemo(() => formatDateForDisplay(selectedDate), [selectedDate]);
    const isoDate = useMemo(() => formatDate(selectedDate), [selectedDate]);
    const today = useMemo(() => {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return days[selectedDate.getDay()];
    }, [selectedDate]);

    // Category state – persisted in localStorage
    const [categories, setCategories] = useState(() => {
        if (typeof window === "undefined") return DEFAULT_CATEGORIES;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                const merged = [...DEFAULT_CATEGORIES];
                parsed.forEach((c) => { if (!merged.includes(c)) merged.push(c); });
                return merged;
            }
        } catch (_) {}
        return DEFAULT_CATEGORIES;
    });

    const [selectedCategory, setSelectedCategory] = useState("Masjid");

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
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

    const isMasjid = selectedCategory === "Masjid";

    return (
        <div className="space-y-2">
            <Header
                title="GENERAL ATTENDANCE"
                subTitle={isMasjid ? "Manage Daily Prayer Attendance" : `Manage ${selectedCategory} Attendance`}
            />

            <div className="flex items-center justify-between">
                <div className="px-4 py-1 border rounded-md bg-background">
                    <span className="font-medium">{formattedDate}</span>
                </div>
                <Link href="/dashboard/masjid-attendance/history">
                    <Button className="bg-black hover:bg-black/90 text-white shadow-md">
                        History
                    </Button>
                </Link>
            </div>

            {/* ── Session Type ── */}
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

            {/* ── Content: prayer sections OR class list ── */}
            {isMasjid ? (
                <div className="grid gap-4 mt-4">
                    {prayers.map((prayer) => (
                        <PrayerSection
                            key={prayer}
                            prayer={prayer}
                            classes={classes}
                            date={selectedDate}
                            apiKey={apiKey}
                            sessionCategory={selectedCategory}
                        />
                    ))}
                </div>
            ) : (
                <ClasswiseSection
                    classes={classes}
                    apiKey={apiKey}
                    selectedCategory={selectedCategory}
                    formattedDate={isoDate}
                    today={today}
                />
            )}
        </div>
    );
};

export default MasjidDashboard;
