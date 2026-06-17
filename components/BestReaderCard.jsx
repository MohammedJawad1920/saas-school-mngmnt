"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, BookOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function BestReaderCard() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const [year, setYear] = useState(currentYear.toString());
    const [month, setMonth] = useState(currentMonth.toString());
    const [data, setData] = useState(null);
    const [debugInfo, setDebugInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchBestReader = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/library/stats/best-reader?year=${year}&month=${month}`);
                const json = await res.json();

                if (res.ok) {
                    if (json.success && json.data) {
                        setData(json.data);
                        setDebugInfo(null);
                    } else {
                        setData(null);
                        setDebugInfo(json.debug || null);
                    }
                } else {
                    setData(null);
                    setDebugInfo({ error: json.msg || "Fetch failed" });
                }
            } catch (error) {
                console.error(error);
                setData(null);
                setDebugInfo({ error: error.message });
            } finally {
                setLoading(false);
            }
        };

        fetchBestReader();
    }, [year, month]);

    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Best Reader</CardTitle>
                <Trophy className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-4">
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[80px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((y) => (
                                <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[110px]">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((m, i) => (
                                <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {loading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : data ? (
                    <div className="flex items-center space-x-4">
                        <div className="flex flex-col items-center">
                            <Avatar className="h-12 w-12 border-2 border-yellow-500">
                                <AvatarImage src={data.student?.profilePic?.url} />
                                <AvatarFallback>{data.student?.name?.substring(0, 2) || "BR"}</AvatarFallback>
                            </Avatar>
                            <p className="text-[10px] text-muted-foreground mt-1">{data.student?._id}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">{data.student?.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {data.student?.studentSpecificField?.classId?.name || "Unknown Class"}
                            </p>
                            <div className="flex items-center pt-1 text-xs text-muted-foreground">
                                <BookOpen className="mr-1 h-3 w-3" />
                                {data.count} Books
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-center text-muted-foreground py-4">
                        No data for this period
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
