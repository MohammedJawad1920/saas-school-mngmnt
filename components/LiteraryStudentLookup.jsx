"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, CalendarX2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import useCrud from "@/hooks/use-crud";
import { formatDateForDisplay } from "@/lib/utils";
import { toast } from "sonner";
import { ScanBarcode } from "lucide-react";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BarcodeScanner = dynamic(() => import("./BarcodeScanner"), { ssr: false });

export default function LiteraryStudentLookup({ apiKey }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [student, setStudent] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);

    const { useFetchItems: useFetchUsers } = useCrud("users", apiKey);
    const { useFetchItems: useFetchAttendance } = useCrud(
        "literary/attendance-records",
        apiKey
    );

    const [isSearching, setIsSearching] = useState(false);
    const [currentStudentId, setCurrentStudentId] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const searchInputRef = useRef(null);

    // Focus input on mount
    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    // Use the hook for fetching students
    const usersQuery = useFetchUsers(
        0,
        50, // Increase limit to find exact matches
        {
            global: searchTerm ? encodeURIComponent(searchTerm) : "",
            roles: ["Student"], // "Student" to get students only
        },
        {
            enabled: false, // We'll trigger this manually via refetch
        }
    );

    // Use the hook for fetching attendance
    const attendanceQuery = useFetchAttendance(
        0,
        100,
        { studentId: currentStudentId },
        {
            enabled: !!currentStudentId,
        }
    );

    // Automatically map attendance query data when it changes
    useEffect(() => {
        if (attendanceQuery.isSuccess && attendanceQuery.data) {
            const data = attendanceQuery.data;
            if (data?.attendanceRecords?.length > 0 && data.attendanceRecords[0].attendanceRecords) {
                // Sort records by date descending
                const sortedRecords = [...data.attendanceRecords[0].attendanceRecords].sort(
                    (a, b) => new Date(b.date) - new Date(a.date)
                );
                setAttendanceRecords(sortedRecords);
            } else {
                setAttendanceRecords([]);
            }
        }
    }, [attendanceQuery.isSuccess, attendanceQuery.data]);

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            toast.error("Please enter a student ID or Name to search.");
            return;
        }
        setHasSearched(true);
        setIsSearching(true);
        setAttendanceRecords([]);
        setStudent(null);
        setCurrentStudentId(null);

        try {
            const result = await usersQuery.refetch();
            if (result.isSuccess && result.data?.users?.length > 0) {
                const searchLower = searchTerm.trim().toLowerCase();
                const foundUsers = result.data.users;

                // 1. Prioritize Exact ID Match
                let matchedUser = foundUsers.find(u => u._id.toLowerCase() === searchLower);

                // 2. Prioritize Exact Admission Number Match
                if (!matchedUser) {
                    matchedUser = foundUsers.find(u =>
                        u.studentSpecificField?.admissionNumber?.toLowerCase() === searchLower
                    );
                }

                // 3. Prioritize Exact Name Match
                if (!matchedUser) {
                    matchedUser = foundUsers.find(u => u.name.toLowerCase() === searchLower);
                }

                // 4. Fallback: Select the first result but notify if there are multiple
                if (!matchedUser) {
                    matchedUser = foundUsers[0];
                    if (foundUsers.length > 1) {
                        toast.info(`Showing best match: ${matchedUser.name}`);
                    }
                }

                if (matchedUser) {
                    setStudent(matchedUser);
                    setCurrentStudentId(matchedUser._id);
                    toast.success(`Found student: ${matchedUser.name}`);
                }
            } else {
                toast.error("No student found with that ID or Name.");
            }
        } catch (error) {
            toast.error("Failed to search student.");
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const isLoading = usersQuery.isFetching || attendanceQuery.isFetching;

    // Render status badge
    const renderStatus = (record) => {
        const isPresent = record.present;

        if (isPresent) {
            return (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Present
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1.5">
                <CalendarX2 className="w-3.5 h-3.5" /> Absent
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            <Card className="w-full flex flex-col md:flex-row overflow-hidden">
                <div className={`transition-all duration-300 ${hasSearched ? 'md:w-1/2 lg:w-[40%] md:border-r border-b md:border-b-0' : 'w-full'}`}>
                    <CardHeader className="bg-muted/30 pb-6 pt-5 h-full justify-center">
                        <CardTitle className="text-lg">Student Literary Lookup</CardTitle>
                        <CardDescription>
                            Search for students literary attendance history
                        </CardDescription>
                        <div className="flex gap-2 mt-4 w-full max-w-md mx-auto md:mx-0">
                            <Input
                                ref={searchInputRef}
                                placeholder="Search by Student ID or Name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="flex-1"
                            />
                            <Button
                                size="icon"
                                variant={searchTerm ? "default" : "outline"}
                                onClick={() => searchTerm ? handleSearch() : setShowScanner(true)}
                                disabled={isLoading}
                                className={!searchTerm ? "bg-foreground text-background hover:bg-foreground/90 border-none" : "px-3 w-auto"}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                                ) : searchTerm ? (
                                    <Search className="h-4 w-4 sm:mr-2" />
                                ) : (
                                    <ScanBarcode className="h-4 w-4" />
                                )}
                                {searchTerm && <span className="hidden sm:inline">Search</span>}
                            </Button>
                        </div>
                    </CardHeader>
                </div>

                {hasSearched && (
                    <div className="flex-1 bg-background flex flex-col justify-center">
                        <CardContent className="p-5">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                    <p>Gathering student records...</p>
                                </div>
                            ) : student ? (
                                <div className="space-y-6">
                                    {/* Profile Section */}
                                    <div className="flex flex-col">
                                        <h3 className="text-xl font-bold tracking-tight text-center sm:text-left mb-2 sm:mb-0 sm:hidden">{student.name}</h3>
                                        <div className="flex flex-row items-center sm:items-start gap-4">
                                            <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                                <Avatar className="h-24 w-24 sm:h-20 sm:w-20 border shadow-sm">
                                                    <AvatarImage src={student.profilePic?.url} />
                                                    <AvatarFallback className="text-lg font-medium text-primary bg-primary/10">
                                                        {student.name?.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="text-xs text-muted-foreground text-center break-all max-w-[6rem]">
                                                    {student._id}
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <h3 className="text-xl font-bold tracking-tight hidden sm:block">{student.name}</h3>
                                                <div className="text-sm text-muted-foreground flex flex-col gap-y-1.5 items-start mt-1 w-full">
                                                    {student.className && (
                                                        <div className="grid grid-cols-[max-content_12px_1fr] items-center w-full">
                                                            <span className="font-medium text-muted-foreground">Class</span>
                                                            <span>:</span>
                                                            <span className="text-foreground">{student.className}</span>
                                                        </div>
                                                    )}
                                                    {student.batchName && (
                                                        <div className="grid grid-cols-[max-content_12px_1fr] items-center w-full">
                                                            <span className="font-medium text-muted-foreground">Batch</span>
                                                            <span>:</span>
                                                            <span className="text-foreground">{student.batchName}</span>
                                                        </div>
                                                    )}
                                                    <div className="mt-1">
                                                        <Badge variant={student.status === "Active" ? "outline" : "secondary"} className={student.status === "Active" ? "bg-green-50 text-green-700" : ""}>
                                                            {student.status || "Unknown"}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No student found.
                                </div>
                            )}
                        </CardContent>
                    </div>
                )}
            </Card>

            {/* Attendance History separate card */}
            {hasSearched && !isLoading && student && (
                <Card className="w-full">
                    <CardHeader className="bg-muted/30 pb-4 pt-4 sm:pt-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            Literary Attendance History
                        </CardTitle>

                        {(() => {
                            const total = attendanceRecords.length;
                            const present = attendanceRecords.filter(r => r.present).length;
                            const absent = total - present;
                            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

                            return (
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Badge variant="outline" className="bg-background shadow-sm">Total: {total}</Badge>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shadow-sm">Present: {present}</Badge>
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 shadow-sm">Absent: {absent}</Badge>
                                    <Badge
                                        variant="secondary"
                                        className={
                                            percentage >= 75 ? "bg-green-100 text-green-800 hover:bg-green-100" :
                                                percentage >= 50 ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" :
                                                    "bg-red-100 text-red-800 hover:bg-red-100"
                                        }
                                    >
                                        {percentage}%
                                    </Badge>
                                </div>
                            );
                        })()}
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-hidden">
                            <div className="max-h-[300px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                        <TableRow className="border-t-0">
                                            <TableHead className="w-[60px] pl-4 sm:pl-6">Sl No</TableHead>
                                            <TableHead className="w-[150px]">Date</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right pr-4 sm:pr-6">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attendanceRecords.length > 0 ? (
                                            attendanceRecords.map((record, index) => (
                                                <TableRow key={record._id}>
                                                    <TableCell className="text-muted-foreground pl-4 sm:pl-6">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {formatDateForDisplay(record.date)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="font-normal">
                                                            {record.category === "ALL" ? "General" : "Group"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-4 sm:pr-6">
                                                        {renderStatus(record)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                    No literary attendance records found for this student.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Barcode Scanner Dialog */}
            <Dialog open={showScanner} onOpenChange={setShowScanner}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background">
                    <DialogHeader className="p-4 pb-0">
                        <DialogTitle>Scan Student Barcode</DialogTitle>
                    </DialogHeader>
                    <div className="w-full relative z-50">
                        <BarcodeScanner
                            onScan={(data) => {
                                setSearchTerm(data);
                                setShowScanner(false);
                            }}
                            onClose={() => setShowScanner(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
