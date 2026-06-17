"use client";

import { useMemo, useState } from "react";
import DataTableComponent from "@/components/DataTableComponent";
import Header from "@/components/Header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { getStudentColumns } from "@/components/table-configs/studentColumns";
import { useIsMobile } from "@/hooks/use-mobile";

import Cookies from "js-cookie";

export default function BatchDetailsClient({ batch, classes, apiKey }) {
    const [activeTab, setActiveTab] = useState("GB"); // 'GB' or 'Alumni'
    const router = useRouter();
    const isMobile = useIsMobile();
    const activeRole = Cookies.get("active-role");

    const columnsConfig = getStudentColumns({
        classes,
        pageTitle: `${batch.name} - ${activeTab === "GB" ? "GB Members" : "Alumni Members"}`,
        onNameClick: null,
        excludeColumns: ["select", "batchName", "className", "liabilities", "roles", "subjectTypeAssignments", "remarks"]
    });

    const apiFilters = useMemo(() => {
        const filters = {
            roles: "Student",
            batchId: batch._id,
        };

        if (activeTab === "GB") {
            // For GB Members, we want Active OR Graduated
            filters.status = "Active,Graduated";
        } else {
            // For Alumni Members, we want Dropped Out
            filters.status = "Dropped Out";
        }

        return filters;
    }, [batch._id, activeTab]);

    const tabsElement = (
        <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="GB">GB Members</TabsTrigger>
                <TabsTrigger value="Alumni">Alumni Members</TabsTrigger>
            </TabsList>
        </Tabs>
    );

    const filterConfig = useMemo(() => {
        return [
            { label: "Student ID", id: "_id", inputType: "text" },
            { label: "Name", id: "name", inputType: "text" },
            {
                label: "Remarks",
                id: "isVerified",
                inputType: "select",
                options: [
                    { value: "true", label: "Verified" },
                    { value: "false", label: "Not Verified" },
                ],
            },
        ];
    }, []);

    // If the user is a Student, they should not see the detailed list
    if (activeRole === "Student") {
        return (
            <div className="flex flex-col space-y-2">
                <Header
                    title={`${batch.name} (${batch.academicYear})`}
                    subTitle={
                        activeTab === "GB"
                            ? `${batch.gbMembers} Members`
                            : `${batch.alumniMembers} Members`
                    }
                />

                <div className="flex items-center justify-center p-12 border rounded-lg bg-gray-50 text-muted-foreground">
                    <p>You do not have permission to view the student list for this batch.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-2">
            <Header
                title={`${batch.name} (${batch.academicYear})`}
                subTitle={
                    activeTab === "GB"
                        ? `${batch.gbMembers} Members`
                        : `${batch.alumniMembers} Members`
                }
            />

            <DataTableComponent
                resource="users"
                initialData={[]}
                columnsConfig={columnsConfig}
                apiKey={apiKey}
                createFormTitle="Add New Student"
                editFormTitle="Edit Student"
                deleteFormTitle="Delete Student"
                filterConfig={filterConfig}
                tableHeight="calc(100vh - 220px)"
                limit={20}
                apiFilters={apiFilters}
                filterTitle="Students"
                printTitle={`${batch.name} - ${activeTab === "GB" ? "GB Members" : "Alumni Members"}`}
                filterType="api"
                readOnly={true}
                enableCreate={false}
                additionalProps={{ customToolbar: tabsElement }}
            />
        </div>
    );
}
