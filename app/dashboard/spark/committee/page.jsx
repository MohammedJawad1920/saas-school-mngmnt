
import { cookies } from "next/headers";
import Header from "@/components/Header";
import { Users } from "lucide-react";
import CommitteeList from "./CommitteeList";
import connectToDB from "@/lib/db";
import SparkCommitteeMember from "@/models/SparkCommitteeMember";

async function getMembers() {
    await connectToDB();
    const members = await SparkCommitteeMember.find().sort({ order: 1 });
    return JSON.parse(JSON.stringify(members));
}

export default async function CommitteePage() {
    const members = await getMembers();
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active-role")?.value;
    const isSparkAdmin = activeRole === "Spark Admin";

    return (
        <div className="flex flex-col space-y-6">
            <Header
                title="COMMITTEE"
                subTitle="Central Committee 2025-27"
                icon={<Users className="h-5 w-5 text-muted-foreground" />}
            />
            <CommitteeList initialMembers={members} isSparkAdmin={isSparkAdmin} />
        </div>
    );
}
