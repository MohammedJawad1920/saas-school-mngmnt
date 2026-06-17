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
import { Book, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function MostReadBookCard() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const [year, setYear] = useState(currentYear.toString());
    const [month, setMonth] = useState(currentMonth.toString());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchMostReadBook = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/library/stats/most-read-book?year=${year}&month=${month}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json.data);
                } else {
                    setData(null);
                }
            } catch (error) {
                console.error(error);
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchMostReadBook();
    }, [year, month]);

    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Most Read Book</CardTitle>
                <Star className="w-4 h-4 text-purple-500" />
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
                        <div className="h-12 w-12 flex items-center justify-center bg-secondary rounded-md border text-purple-600">
                            <Book className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium leading-none line-clamp-1" title={data.book?.name}>{data.book?.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                                {data.book?.author || "Unknown Author"}
                            </p>
                            <div className="flex items-center pt-1 text-xs text-muted-foreground">
                                <Star className="mr-1 h-3 w-3 text-yellow-500 fill-yellow-500" />
                                {data.count} Rentals
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
