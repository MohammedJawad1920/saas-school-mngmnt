"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Calendar as CalendarIcon, Users, BookOpen, Presentation, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";

export default function LiterarySummaryCard({ apiKey }) {
    // Default to All Time so it strictly matches the History default view
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);

    // Fetch Total Groups
    // Assuming 'literary/groups' returns an array of groups
    const { useFetchItems: useFetchGroups } = useCrud("literary/groups", apiKey);
    const groupsQuery = useFetchGroups(0, 0, {}, {
        staleTime: 1000 * 60 * 5 // Cache for 5 mins
    });

    const totalGroups = useMemo(() => {
        return groupsQuery.data?.groups?.length || 0;
    }, [groupsQuery.data]);

    // Fetch Attendances for the date range
    // Convert dates to YYYY-MM-DD for the API if necessary, or just rely on API date filtering
    // Depending on the API, it might support fromDate and toDate query params.
    // Let's pass them as strings formatted properly, or fetch all and filter client-side if the API doesn't support range natively

    const formattedFromDate = fromDate ? format(fromDate, "yyyy-MM-dd") : undefined;
    const formattedToDate = toDate ? format(toDate, "yyyy-MM-dd") : undefined;

    const { useFetchItems: useFetchAttendances } = useCrud("literary/attendances", apiKey);

    // We pass the dates for caching keys. If API supports range filtering:
    const queryParams = { trackHistory: true };
    if (formattedFromDate) queryParams.startDate = formattedFromDate;
    if (formattedToDate) queryParams.endDate = formattedToDate;

    const attendancesQuery = useFetchAttendances(0, 0, queryParams, {
        staleTime: 1000 * 60 * 5
    });

    const attendanceStats = useMemo(() => {
        let groupMeetings = 0;
        let generalMeetings = 0;

        const history = attendancesQuery.data?.history || [];

        // Filter client-side just in case the API doesn't support startDate/endDate params
        const fromTime = formattedFromDate ? new Date(formattedFromDate).getTime() : 0;
        const toTime = formattedToDate ? new Date(formattedToDate).setHours(23, 59, 59, 999) : Infinity;

        history.forEach(record => {
            const recordTime = new Date(record.date).getTime();

            if (recordTime >= fromTime && recordTime <= toTime) {
                if (record.category === "GROUP") {
                    groupMeetings++;
                } else if (record.category === "ALL") {
                    generalMeetings++;
                }
            }
        });

        return {
            groupMeetings,
            generalMeetings
        };
    }, [attendancesQuery.data, formattedFromDate, formattedToDate]);

    const isLoading = groupsQuery.isLoading || attendancesQuery.isLoading;

    return (
        <Card className="">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 pb-2 bg-muted/30 border-b gap-4">
                <CardTitle className="text-lg font-bold">Literary Overview</CardTitle>

                {/* Date Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[140px] justify-start text-left font-normal bg-background h-8",
                                        !fromDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {fromDate ? format(fromDate, "dd MMM yyyy") : <span>From</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={fromDate}
                                    onSelect={(date) => date && setFromDate(date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <span className="text-muted-foreground text-sm">to</span>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[140px] justify-start text-left font-normal bg-background h-8",
                                        !toDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {toDate ? format(toDate, "dd MMM yyyy") : <span>To</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={toDate}
                                    onSelect={(date) => date && setToDate(date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Total Groups */}
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card/50 shadow-sm">
                        <div className="p-3 bg-primary/10 text-primary rounded-full">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Groups</p>
                            <h3 className="text-2xl font-bold mt-1">
                                {groupsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" /> : totalGroups}
                            </h3>
                        </div>
                    </div>

                    {/* Group Meetings */}
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card/50 shadow-sm">
                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Group <span className="hidden sm:inline">Meetings</span></p>
                            <h3 className="text-2xl font-bold mt-1">
                                {attendancesQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" /> : attendanceStats.groupMeetings}
                            </h3>
                        </div>
                    </div>

                    {/* General Meetings */}
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card/50 shadow-sm">
                        <div className="p-3 bg-green-500/10 text-green-500 rounded-full">
                            <Presentation className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">General <span className="hidden sm:inline">Meetings</span></p>
                            <h3 className="text-2xl font-bold mt-1">
                                {attendancesQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" /> : attendanceStats.generalMeetings}
                            </h3>
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
