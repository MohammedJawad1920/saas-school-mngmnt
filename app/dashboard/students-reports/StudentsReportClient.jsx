"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ComboBox } from "@/components/ui/combobox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Header from "@/components/Header";
import { Users, Loader2, Search, ScanBarcode, X } from "lucide-react";
import StudentDashboard from "@/components/StudentDashboard";
import { formatOptions, sortClasses } from "@/lib/utils";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), {
    ssr: false,
    loading: () => (
        <div className="flex flex-col items-center justify-center p-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading scanner...</p>
        </div>
    ),
});

export default function StudentsReportClient({ batches = [], classes = [], apiKey, updates = [] }) {
    const [selectedBatch, setSelectedBatch] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [selectedStudentData, setSelectedStudentData] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [lookupSearchTerm, setLookupSearchTerm] = useState("");
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [lookupError, setLookupError] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const [debtBalances, setDebtBalances] = useState([]);

    const filteredClasses = useMemo(() => {
        if (!Array.isArray(classes)) return [];
        if (!selectedBatch) return classes;
        return classes.filter((c) => {
            const bId = (c.batchId && typeof c.batchId === 'object') ? c.batchId._id : c.batchId;
            return String(bId) === String(selectedBatch);
        });
    }, [selectedBatch, classes]);

    // Fetch students when filters change
    useEffect(() => {
        const fetchStudents = async () => {
            setLoadingStudents(true);
            try {
                const params = new URLSearchParams();
                params.append("roles", "Student");
                params.append("limit", "1000");
                params.append("projection", "_id,name,batchId,classId,studentSpecificField,profilePic,contactNumber,email,dateOfBirth,address");

                if (selectedClass && selectedClass !== "none") {
                    params.append("classId", selectedClass);
                    params.append("status", "Active");
                } else if (selectedBatch && selectedBatch !== "none") {
                    params.append("batchId", selectedBatch);
                }

                const response = await fetch(`/api/users?${params.toString()}`, {
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": apiKey,
                    },
                    cache: "no-store"
                });
                const data = await response.json();
                setStudents(data.users || []);
            } catch (error) {
                console.error("Error fetching students:", error);
                toast.error("Failed to load students");
            } finally {
                setLoadingStudents(false);
            }
        };

        fetchStudents();
    }, [selectedClass, selectedBatch, apiKey]);

    // Debounced suggestion fetch
    useEffect(() => {
        const fetchSuggestions = async () => {
            const term = lookupSearchTerm.trim();
            if (term.length < 1) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            // Don't search if the search term exactly matches current selected student name
            if (selectedStudentData && selectedStudentData.name === term) {
                setShowSuggestions(false);
                return;
            }

            setIsSearchingSuggestions(true);
            try {
                const response = await fetch(
                    `/api/users?roles=Student&lookup=${encodeURIComponent(term)}&limit=1000&projection=_id,name,batchId,classId,studentSpecificField,profilePic`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "api-key": apiKey,
                        },
                    }
                );
                const data = await response.json();
                setSuggestions(data.users || []);
                if (data.users?.length > 0 && searchFocused) {
                    setShowSuggestions(true);
                } else {
                    setShowSuggestions(false);
                }
            } catch (error) {
                console.error("Suggestion fetch error:", error);
            } finally {
                setIsSearchingSuggestions(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchSuggestions();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [lookupSearchTerm, apiKey, searchFocused, selectedStudentData]);

    // Fetch full student profile when student changes
    useEffect(() => {
        const fetchFullProfile = async () => {
            if (!selectedStudentId) {
                setSelectedStudentData(null);
                setDebtBalances([]);
                return;
            }

            setLoadingProfile(true);
            try {
                const profilePromise = fetch(`/api/users/profile`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": apiKey,
                    },
                    body: JSON.stringify({ userId: selectedStudentId }),
                });

                const debtsPromise = fetch(`/api/debtors?studentId=${selectedStudentId}`, {
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": apiKey,
                    }
                });

                const [profileRes, debtsRes] = await Promise.all([profilePromise, debtsPromise]);
                
                let debts = [];
                if (debtsRes.ok) {
                    const debtsData = await debtsRes.json();
                    debts = (debtsData.debts || [])
                      .filter(d => (d.totalAmount - (d.payments || []).reduce((s, p) => s + p.amount, 0)) > 0)
                      .map(d => ({
                        category: d.category,
                        year: d.year,
                        balance: d.totalAmount - (d.payments || []).reduce((s, p) => s + p.amount, 0),
                      }));
                }
                setDebtBalances(debts);

                const data = await profileRes.json();
                if (data.user) {
                    setSelectedStudentData(data.user);
                } else {
                    toast.error("Student profile not found");
                }
            } catch (error) {
                console.error("Error fetching student profile:", error);
                toast.error("Failed to load student profile");
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchFullProfile();
    }, [selectedStudentId, apiKey]);

    const handleBatchChange = (value) => {
        setSelectedBatch(value === "none" ? "" : value);
        setSelectedClass("");
        setSelectedStudentId("");
        setSelectedStudentData(null);
    };

    const handleClassChange = (value) => {
        const val = value === "none" ? "" : value;
        setSelectedClass(val);
        setSelectedStudentId("");
        setSelectedStudentData(null);
    };

    const handleStudentChange = (value) => {
        const student = students.find(s => s._id === value);
        if (student) {
            const batchId = student.batchId || student.studentSpecificField?.batchId;
            const classId = student.classId || student.studentSpecificField?.classId;

            if (batchId && !selectedBatch) setSelectedBatch(batchId);
            if (classId && !selectedClass) setSelectedClass(classId);
        }
        setSelectedStudentData(null);
        setLoadingProfile(true);
        setSelectedStudentId(value);
    };

    const handleStudentLookup = async (overrideSearchTerm) => {
        const term = (typeof overrideSearchTerm === "string" ? overrideSearchTerm : lookupSearchTerm).trim();

        if (!term) {
            toast.error("Please enter a student ID or name to search.");
            return;
        }

        setIsLookingUp(true);
        setLookupError(false);

        // Add a small artificial delay for better UX and to ensure state is caught up
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            const response = await fetch(
                `/api/users?roles=Student&global=${encodeURIComponent(term)}&limit=1000&projection=_id,name,batchId,classId,studentSpecificField,profilePic`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": apiKey,
                    },
                }
            );
            const data = await response.json();
            const foundUsers = data.users || [];
            console.log("API Lookup Results:", foundUsers);

            if (foundUsers.length > 0) {
                const searchLower = term.toLowerCase();

                // 1. Prioritize Exact ID Match (robust check)
                let matchedUser = foundUsers.find(u =>
                    String(u._id).toLowerCase().trim() === searchLower
                );

                // 2. Prioritize Exact Admission Number Match
                if (!matchedUser) {
                    matchedUser = foundUsers.find(u =>
                        String(u.studentSpecificField?.admissionNumber || "").toLowerCase().trim() === searchLower
                    );
                }

                // 3. Prioritize Exact Name Match
                if (!matchedUser) {
                    matchedUser = foundUsers.find(u => String(u.name).toLowerCase().trim() === searchLower);
                }

                // 4. Fallback: Select the first result but notify if there are multiple
                if (!matchedUser) {
                    matchedUser = foundUsers[0];
                    if (foundUsers.length > 1) {
                        toast.info(`Showing best match: ${matchedUser.name}`);
                    }
                }

                if (matchedUser) {
                    setSelectedStudentData(null);
                    setLoadingProfile(true);
                    selectStudent(matchedUser);
                } else {
                    // This case should ideally not be reached if foundUsers.length > 0
                    // but added for robustness.
                    setSelectedBatch("");
                    setSelectedClass("");
                    setSelectedStudentId("");
                    setSelectedStudentData(null);
                    setLookupError(true);
                    toast.error(`Student "${term}" not found.`);
                }
            } else {
                setSelectedBatch("");
                setSelectedClass("");
                setSelectedStudentId("");
                setSelectedStudentData(null);
                setLookupError(true);
                toast.error(`Student "${term}" not found.`);
            }
        } catch (error) {
            console.error("Lookup error:", error);
            toast.error("An error occurred during student lookup.");
        } finally {
            setIsLookingUp(false);
        }
    };

    const selectStudent = (student) => {
        // Robust ID extraction
        const getID = (val) => (val && typeof val === 'object' ? val._id : val);
        const bId = getID(student.batchId || student.studentSpecificField?.batchId);
        const cId = getID(student.classId || student.studentSpecificField?.classId);

        // Ensure searched student is in the current dropdown list
        setStudents(prev => {
            const exists = prev.find(s => s._id === student._id);
            if (exists) return prev;
            return [student, ...prev];
        });

        // Update filters if data exists
        if (bId) setSelectedBatch(bId);
        if (cId) setSelectedClass(cId);

        // Always select the student ID to trigger profile fetch
        setSelectedStudentId(student._id);
        setLookupSearchTerm(student.name);
        setLookupError(false);
        setShowSuggestions(false);
        toast.success(`Selected student: ${student.name}`);
    };

    const handleBarcodeScan = (result) => {
        setLookupSearchTerm(result);
        setShowScanner(false);
        handleStudentLookup(result);
    };

    return (
        <div className="flex flex-col space-y-2">
            <div className="no-print">
                <Header
                    title="STUDENTS REPORTS"
                    subTitle="Analyze and View Student Dashboard Data"
                    icon={<Users className="h-5 w-5 text-muted-foreground" />}
                />
            </div>

            <Card className="w-full border-primary/20 shadow-sm relative bg-card no-print">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <CardHeader className="bg-muted/10 pb-4 pt-4 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="w-5 h-5 text-primary" />
                        Student Lookup
                    </CardTitle>
                    <CardDescription>
                        Search for a student by ID or Name
                    </CardDescription>
                    <div className="flex gap-2 mt-4 w-full relative">
                        <div className="relative flex-1">
                            <Input
                                placeholder="Search by Student ID or Name..."
                                value={lookupSearchTerm}
                                onChange={(e) => {
                                    setLookupSearchTerm(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleStudentLookup();
                                        setShowSuggestions(false);
                                    }
                                }}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => {
                                    // Delay to allow clicking on suggestions
                                    setTimeout(() => setSearchFocused(false), 200);
                                }}
                                className="w-full pr-10"
                            />
                            {lookupSearchTerm && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-transparent"
                                    onClick={() => {
                                        setLookupSearchTerm("");
                                        setSelectedBatch("");
                                        setSelectedClass("");
                                        setSelectedStudentId("");
                                        setSelectedStudentData(null);
                                        setLookupError(false);
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                            {showSuggestions && searchFocused && suggestions.length > 0 && (
                                <div className="absolute z-[999] left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-lg max-h-[400px] overflow-y-auto">
                                    {suggestions.map((student) => {
                                        const batch = batches.find(b => b._id === (student.batchId || student.studentSpecificField?.batchId));
                                        const cls = classes.find(c => c._id === (student.classId || student.studentSpecificField?.classId));
                                        const batchName = batch?.name || "No Batch";
                                        const className = cls?.name || "No Class";
                                        
                                        return (
                                            <div
                                                key={student._id}
                                                className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-0 transition-colors"
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); // Prevent blur
                                                    selectStudent(student);
                                                }}
                                            >
                                                <Avatar className="h-10 w-10 border">
                                                    <AvatarImage src={student.profilePic?.url} />
                                                    <AvatarFallback>{student.name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0 text-sm">
                                                    <div className="font-medium truncate">{student.name}</div>
                                                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                                                        <span>ID: {student._id}</span>
                                                    </div>
                                                    <div className="text-[11px] text-primary/70 font-semibold truncate">
                                                        {className} • {batchName}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <Button
                            onClick={() => {
                                if (lookupSearchTerm.trim()) {
                                    handleStudentLookup();
                                } else {
                                    setShowScanner(true);
                                }
                            }}
                            disabled={isLookingUp}
                            variant={lookupSearchTerm.trim() ? "default" : "outline"}
                            className={!lookupSearchTerm.trim() ? "bg-foreground text-background hover:opacity-90 transition-all border-none shrink-0 shadow-sm" : ""}
                            size={!lookupSearchTerm.trim() ? "icon" : "default"}
                        >
                            {isLookingUp ? (
                                <Loader2 className={`h-4 w-4 animate-spin ${lookupSearchTerm.trim() ? "sm:mr-2" : ""}`} />
                            ) : lookupSearchTerm.trim() ? (
                                <Search className="h-4 w-4 sm:mr-2" />
                            ) : (
                                <ScanBarcode className="h-5 w-5" />
                            )}
                            {lookupSearchTerm.trim() && (
                                <span className="hidden sm:inline">Search</span>
                            )}
                        </Button>
                    </div>
                </CardHeader>

                {showScanner && (
                    <CardContent className="p-4 border-t">
                        <div className="relative aspect-video max-w-sm mx-auto overflow-hidden rounded-lg bg-black">
                            <BarcodeScanner
                                onScan={handleBarcodeScan}
                                onError={(err) => {
                                    console.error(err);
                                    toast.error("Scanner error");
                                    setShowScanner(false);
                                }}
                            />
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 z-50 h-8 w-8 rounded-full"
                                onClick={() => setShowScanner(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-1 no-print">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Select Batch</label>
                    <Select onValueChange={handleBatchChange} value={selectedBatch}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Batch" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {Array.isArray(batches) && batches.map((batch) => (
                                <SelectItem key={batch._id} value={batch._id}>
                                    {batch.name} ({batch.startYear})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Select Class</label>
                    <ComboBox
                        items={[
                            { value: "", label: "None" },
                            ...formatOptions([...filteredClasses].sort(sortClasses)).map(c => ({
                                value: c._id,
                                label: c.shortname ? `${c.name} (${c.shortname})` : c.name
                            }))
                        ]}
                        value={selectedClass}
                        onSelect={handleClassChange}
                        placeholder="Select Class"
                    />
                </div>

                <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="text-sm font-medium">Select Student</label>
                    {loadingStudents ? (
                        <div className="h-9 w-full flex items-center gap-2 px-3 py-2 border rounded-md text-sm text-muted-foreground shadow-sm bg-background">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading...</span>
                        </div>
                    ) : (
                        <ComboBox
                            items={students.map((student) => ({
                                value: student._id,
                                label: `${student.name} (${student._id})`,
                            }))}
                            value={selectedStudentId}
                            onSelect={handleStudentChange}
                            placeholder="Select Student"
                        />
                    )}
                </div>
            </div>

            <div className="mt-6">
                {loadingProfile ? (
                    <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
                        <div className="relative">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse"></div>
                        </div>
                        <p className="mt-6 text-base font-medium text-muted-foreground animate-pulse tracking-wide italic">
                            Preparing student dashboard...
                        </p>
                    </div>
                ) : selectedStudentData ? (
                    <div className="animate-in fade-in duration-500">
                        <StudentDashboard
                            user={selectedStudentData}
                            apiKey={apiKey}
                            classes={classes}
                            batches={batches}
                            updates={updates}
                            hideHeader={true}
                            showKinship={true}
                            debtBalances={debtBalances}
                        />
                    </div>
                ) : lookupError ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl border-red-200 bg-red-50/30">
                        <Users className="h-12 w-12 text-red-300 mb-4" />
                        <h3 className="text-lg font-medium text-red-800">Student Not Found</h3>
                        <p className="text-sm text-red-600/70 max-w-xs text-center">
                            We couldn't find any student matching "{lookupSearchTerm}". Please check the ID or name and try again.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl border-muted bg-muted/5">
                        <Users className="h-12 w-12 text-muted mb-4" />
                        <h3 className="text-lg font-medium text-muted-foreground">No Student Selected</h3>
                        <p className="text-sm text-muted-foreground/70 max-w-xs text-center">
                            Please select a batch, class, and student from the dropdowns above or use the search bar to view their dashboard reports.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
