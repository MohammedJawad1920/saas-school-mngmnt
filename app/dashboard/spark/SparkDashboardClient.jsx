"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import { Briefcase } from "lucide-react";
import Image from "next/image";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LabelList,
} from "recharts";

const CustomBar = (props) => {
    const { fill, x, y, width, height } = props;
    return <rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={fill} />;
};

const BatchBarChart = ({ title, count, data, color = "#10b981" }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title} ({count})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto pb-4">
                    <div
                        className="h-[350px]"
                        style={{
                            minWidth: "100%",
                            width: Math.max(1000, data.length * 60),
                        }}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data}
                                margin={{
                                    top: 20,
                                    right: 30,
                                    left: 20,
                                    bottom: 40,
                                }}
                                barCategoryGap={10}
                                barSize={30}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="academicYear"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                    angle={-45}
                                    textAnchor="end"
                                    dy={10}
                                    interval={0}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                />
                                <Tooltip
                                    cursor={{ fill: "transparent" }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                                                    <p className="font-semibold text-gray-700">{label}</p>
                                                    <p className="font-medium" style={{ color: color }}>
                                                        Members : {payload[0].value}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill={color}
                                    radius={[4, 4, 0, 0]}
                                >
                                    <LabelList
                                        dataKey="count"
                                        position="top"
                                        fill="#6b7280"
                                        fontSize={14}
                                        offset={10}
                                    />
                                    <LabelList
                                        dataKey="name"
                                        position="insideBottom"
                                        fill="#ffffff"
                                        fontSize={11}
                                        angle={-90}
                                        offset={25}
                                        style={{
                                            fontWeight: "bold",
                                            textShadow: "0px 1px 2px rgba(0,0,0,0.3)",
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default function SparkDashboardClient({
    totalAlumnies,
    totalGBMembers,
    batchDistribution,
    alumniBatchDistribution,
    sparkLogo,
}) {
    return (
        <div className="flex flex-col space-y-6">
            <Header title="DASHBOARD" subTitle="Welcome to Spark Admin Dashboard." />

            {/* Spark Branding */}
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
                <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16">
                        <Image
                            src={sparkLogo}
                            alt="Spark Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-bold tracking-tight">SPARK</h1>
                        <p className="text-sm text-muted-foreground font-medium">
                            Alumni of Sa-adiya Da-awa College
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Alumnies
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-blue-600">
                            {totalAlumnies}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total GB Members
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-blue-600">
                            {totalGBMembers}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <BatchBarChart
                title="GB Members (Batch-wise)"
                count={totalGBMembers}
                data={batchDistribution}
                color="#10b981"
            />

            <BatchBarChart
                title="Alumni Members (Batch-wise)"
                count={totalAlumnies}
                data={alumniBatchDistribution}
                color="#2563eb"
            />
        </div>
    );
}
