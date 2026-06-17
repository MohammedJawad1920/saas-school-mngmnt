"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import useCrud from "@/hooks/use-crud";
import { formatDate } from "@/lib/utils";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const PrayerSection = ({ prayer, classes, date, apiKey, sessionCategory }) => {
    const searchParams = useSearchParams();
    const shouldBeOpen = searchParams.get("expanded") === prayer;
    const [isOpen, setIsOpen] = useState(shouldBeOpen);
    const [absenteesDialogOpen, setAbsenteesDialogOpen] = useState(false);
    const [currentAbsentees, setCurrentAbsentees] = useState([]);
    const [currentClassName, setCurrentClassName] = useState("");

    const formattedDate = formatDate(date);

    // Fetch attendance status for this prayer
    const { useFetchItems } = useCrud("masjid/attendance", apiKey);
    const { data: attendanceData, isLoading } = useFetchItems(
        0,
        0,
        {
            date: formattedDate,
            prayer,
        },
        {
            refetchOnWindowFocus: true,
            staleTime: 1000 * 60 * 5, // 5 minutes
            enabled: !!formattedDate && !!prayer,
        }
    );

    const markedClassIds = new Set(
        attendanceData?.attendances?.map((att) => att.classId._id) || []
    );

    const markedCount = markedClassIds.size;
    const totalClasses = classes.length;
    const isComplete = markedCount === totalClasses && totalClasses > 0;

    const handleShowAbsentees = (e, absentees, className) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentAbsentees(absentees);
        setCurrentClassName(className);
        setAbsenteesDialogOpen(true);
    };

    return (
        <>
            <Card className="border-l-4 border-l-primary">
                <CardHeader className="py-4 px-6 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <CardTitle className="text-lg font-bold">{prayer}</CardTitle>
                            <Badge variant={isComplete ? "success" : "secondary"}>
                                {markedCount}/{totalClasses} Marked
                            </Badge>
                        </div>
                        <Button variant="ghost" size="sm">
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardHeader>
                {isOpen && (
                    <CardContent className="pt-0 pb-4 px-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {classes.map((cls) => {
                                // Find the specific attendance record for this class
                                const attendanceRecord = attendanceData?.attendances?.find(
                                    (att) => att.classId._id === cls._id
                                );
                                const isMarked = !!attendanceRecord;

                                // Calculate absentees if marked
                                let absentees = [];
                                if (isMarked && attendanceRecord.attendanceData) {
                                    // Count both 'ABSENT' and 'LEAVE' as absentees for the dashboard summary
                                    absentees = attendanceRecord.attendanceData.filter(
                                        (record) => record.status === "ABSENT" || record.status === "LEAVE"
                                    );
                                }

                                const absenteeCount = absentees.length;

                                return (
                                    <Link
                                        key={cls._id}
                                        href={`/dashboard/masjid-attendance/mark?classId=${cls._id}&className=${cls.name}&batchId=${cls.batchId}&prayer=${prayer}&date=${formattedDate}&apiKey=${apiKey}&sessionLabel=${encodeURIComponent(sessionCategory || "General")}`}
                                        prefetch={false}
                                    >
                                        <div
                                            className={`p-4 border rounded-lg flex items-center justify-between hover:bg-accent transition-colors ${isMarked ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : ""
                                                }`}
                                        >
                                            <div>
                                                <h4 className="font-medium">
                                                    {cls.name}
                                                </h4>
                                                {isMarked ? (
                                                    <div
                                                        className="text-xs text-red-500 font-medium hover:underline cursor-pointer z-10 relative"
                                                        onClick={(e) => handleShowAbsentees(e, absentees, cls.name)}
                                                    >
                                                        {absenteeCount} Absent
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground">
                                                        Pending
                                                    </p>
                                                )}
                                            </div>
                                            {isMarked ? (
                                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 dark:bg-green-900">
                                                    <span className="text-sm font-bold text-green-700 dark:text-green-300">
                                                        {attendanceRecord?.attendanceData?.length - absenteeCount}
                                                    </span>
                                                </div>
                                            ) : (
                                                <Clock className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </CardContent>
                )}
            </Card>

            <Dialog open={absenteesDialogOpen} onOpenChange={setAbsenteesDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Absentees - {currentClassName}</DialogTitle>
                        <DialogDescription>
                            List of students marked absent (or on leave) for {prayer}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {currentAbsentees.length > 0 ? (
                            <ul className="space-y-2">
                                {currentAbsentees.map((record, idx) => (
                                    <li key={idx} className="flex items-center gap-3 p-2 rounded-md border text-sm">
                                        <span className="font-medium text-muted-foreground w-6 text-center">{idx + 1}</span>
                                        <span>
                                            {record.studentId?.name || "Unknown Student"}
                                            {record.status === "LEAVE" && (
                                                <span className="ml-2 text-xs text-yellow-600 bg-yellow-100 px-1 py-0.5 rounded border border-yellow-200">
                                                    On Leave
                                                </span>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-muted-foreground py-4">No students absent.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default PrayerSection;
