"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Loader, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchItems } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

const MyAttendanceClient = ({ user, apiKey }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // State for detail modal
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    monthName: "",
    type: "", // 'Present' or 'Absent'
    records: [],
  });

  // Calculate year range based on joining date or fallback to 2016
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2025;
    
    const years = [];
    // Show from start year to current year
    for (let y = currentYear; y >= startYear; y--) {
      years.push(y.toString());
    }
    return years;
  }, [user]);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch for the entire selected year
        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear}-12-31`;

        const response = await fetchItems(
          "teacherAttendances",
          apiKey,
          0,
          0,
          {
            teacherId: user._id,
            startDate,
            endDate,
            limit: 0
          }
        );

        if (response && response.teacherAttendances && response.teacherAttendances.length > 0) {
          const teacherRecord = response.teacherAttendances[0];
          setAttendanceData(teacherRecord.attendanceRecords || []);
        } else {
          setAttendanceData([]);
        }
      } catch (err) {
        console.error("Error fetching attendance:", err);
        setError("Failed to load attendance records for the selected year.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user?._id) {
      fetchAttendance();
    }
  }, [user?._id, apiKey, selectedYear]);

  const monthlyStats = useMemo(() => {
    const stats = {};

    attendanceData.forEach((record) => {
      if (!record.date) return;
      
      const date = new Date(record.date);
      const year = date.getFullYear();
      
      // Ensure we only process records for the selected year
      if (year.toString() !== selectedYear) return;

      const month = date.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleString("default", { month: "long" });

      if (!stats[monthKey]) {
        stats[monthKey] = {
          monthKey,
          monthName: monthName,
          total: 0,
          present: 0,
          absent: 0,
          presentRecords: [],
          absentRecords: [],
        };
      }

      stats[monthKey].total++;
      if (record.present) {
        stats[monthKey].present++;
        stats[monthKey].presentRecords.push(record);
      } else {
        stats[monthKey].absent++;
        stats[monthKey].absentRecords.push(record);
      }
    });

    return Object.values(stats).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [attendanceData, selectedYear]);

  const handleShowDetails = (monthName, type, records) => {
    if (records.length === 0) return;
    setDetailModal({
      isOpen: true,
      monthName,
      type,
      records: [...records].sort((a, b) => new Date(b.date) - new Date(a.date) || b.periodNumber - a.periodNumber),
    });
  };

  if (isLoading && attendanceData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl font-bold">Attendance Summary</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[130px] bg-background border shadow-sm h-8">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      Year {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="border-0 sm:border rounded-none sm:rounded-md bg-card overflow-x-auto relative">
            {isLoading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <Loader className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Sl No</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-center font-semibold">Total Classes</TableHead>
                  <TableHead className="text-center font-semibold">Present</TableHead>
                  <TableHead className="text-center font-semibold">Absent</TableHead>
                  <TableHead className="text-right font-bold">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      No attendance records found for {selectedYear}.
                    </TableCell>
                  </TableRow>
                ) : (
                  monthlyStats.map((stat, index) => (
                    <TableRow key={stat.monthKey} className="hover:bg-muted/30 transition-colors">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {stat.monthName}
                      </TableCell>
                      <TableCell className="text-center">{stat.total}</TableCell>
                      <TableCell 
                        className="text-center text-green-600 font-bold cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        onClick={() => handleShowDetails(stat.monthName, "Present", stat.presentRecords)}
                        title="Click to view details"
                      >
                        {stat.present}
                      </TableCell>
                      <TableCell 
                        className="text-center text-red-500 font-bold cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        onClick={() => handleShowDetails(stat.monthName, "Absent", stat.absentRecords)}
                        title="Click to view details"
                      >
                        {stat.absent}
                      </TableCell>
                      <TableCell className="text-right font-black tabular-nums">
                        <span className={parseFloat((stat.present / stat.total * 100)) >= 75 ? "text-green-600" : "text-orange-600"}>
                          {stat.total > 0
                            ? ((stat.present / stat.total) * 100).toFixed(2)
                            : "0.00"}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog 
        open={detailModal.isOpen} 
        onOpenChange={(open) => setDetailModal(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <span className={detailModal.type === "Present" ? "text-green-600" : "text-red-500"}>
                    {detailModal.type} Records
                </span>
                <span className="text-muted-foreground font-normal text-lg">
                    - {detailModal.monthName}
                </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-4">
              <div className="rounded-md border">
                  <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-20">
                          <TableRow>
                              <TableHead className="w-[50px] px-2 text-center text-xs">Sl No</TableHead>
                              <TableHead className="w-[100px] sm:w-[120px] px-2 text-xs">Date</TableHead>
                              <TableHead className="hidden md:table-cell text-center w-[70px] text-xs">Period</TableHead>
                              <TableHead className="hidden sm:table-cell w-[140px] text-xs">Class</TableHead>
                              <TableHead className="hidden sm:table-cell px-2 text-xs">Subject</TableHead>
                              <TableHead className="sm:hidden px-2 text-xs">Details</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {detailModal.records.map((rec, i) => (
                               <TableRow key={i} className="hover:bg-muted/30">
                                   <TableCell className="px-2 text-center text-xs text-muted-foreground">{i + 1}</TableCell>
                                   <TableCell className="px-2 py-3">
                                       <div className="flex flex-col">
                                           <span className="text-sm font-medium whitespace-nowrap">
                                               {format(new Date(rec.date), "dd MMM yy")}
                                           </span>
                                           <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                                               {format(new Date(rec.date), "EEEE")}
                                           </span>
                                       </div>
                                   </TableCell>
                                   <TableCell className="hidden md:table-cell text-center font-bold text-muted-foreground">
                                       #{rec.periodNumber}
                                   </TableCell>
                                   <TableCell className="hidden sm:table-cell font-semibold text-primary">
                                       <div className="flex flex-col gap-0.5">
                                           <span className="whitespace-nowrap">{rec.className || "N/A"}</span>
                                           {rec.leaveReason && (
                                               <span className="text-[10px] text-orange-500 font-medium leading-tight">
                                                   {rec.leaveReason}
                                               </span>
                                           )}
                                       </div>
                                   </TableCell>
                                   <TableCell className="hidden sm:table-cell font-medium text-foreground px-2">
                                       {rec.subjectName || "N/A"}
                                   </TableCell>
                                   <TableCell className="sm:hidden px-2 py-3">
                                       <div className="flex flex-col gap-0.5">
                                           <div className="font-bold text-primary leading-tight line-clamp-1">
                                               {rec.className || "N/A"}
                                           </div>
                                           <div className="flex items-center gap-1.5 mt-0.5">
                                               <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black">
                                                   P#{rec.periodNumber}
                                               </span>
                                               <span className="text-[11px] text-muted-foreground font-semibold line-clamp-1">
                                                   {rec.subjectName || "N/A"}
                                               </span>
                                           </div>
                                           {rec.leaveReason && (
                                               <div className="text-[10px] text-orange-500 font-medium leading-tight mt-0.5">
                                                   {rec.leaveReason}
                                               </div>
                                           )}
                                       </div>
                                   </TableCell>
                               </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </div>
          </div>
        </DialogContent>
      </Dialog>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MyAttendanceClient;
