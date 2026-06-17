
import { getVerificationSummary } from "@/libservices/verificationService";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

export default async function VerificationPage() {
    const summary = await getVerificationSummary();

    const calculatePercentage = (verified, total) => {
        if (!total) return 0;
        return Math.round((verified / total) * 100);
    };

    return (
        <div className="p-4 space-y-6">
            <div className="mb-4">
                <h1 className="font-bold text-2xl tracking-tight uppercase">
                    Verification Summary
                </h1>
                <p className="text-muted-foreground">
                    Profile verification status for all members.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total GB Members
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summary.reduce((acc, batch) => acc + batch.gb.total, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Verified: {summary.reduce((acc, batch) => acc + batch.gb.verified, 0)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Alumni Members
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summary.reduce((acc, batch) => acc + batch.alumni.total, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Verified: {summary.reduce((acc, batch) => acc + batch.alumni.verified, 0)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Batch Verification Status</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="[&_td]:border-r [&_th]:border-r [&_td:last-child]:border-r-0 [&_th:last-child]:border-r-0">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Batch Name</TableHead>
                                    <TableHead className="text-center" colSpan={3}>
                                        GB Members
                                    </TableHead>
                                    <TableHead className="text-center border-l" colSpan={3}>
                                        Alumni Summary
                                    </TableHead>
                                </TableRow>
                                <TableRow className="bg-muted/50">
                                    <TableHead></TableHead>
                                    <TableHead className="text-center">Total</TableHead>
                                    <TableHead className="text-center">Verified</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-center border-l">Total</TableHead>
                                    <TableHead className="text-center">Verified</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summary.map((batch) => {
                                    const gbPercent = calculatePercentage(
                                        batch.gb.verified,
                                        batch.gb.total
                                    );
                                    const alumniPercent = calculatePercentage(
                                        batch.alumni.verified,
                                        batch.alumni.total
                                    );

                                    return (
                                        <TableRow key={batch.id}>
                                            <TableCell className="font-medium">
                                                {batch.name} <span className="text-muted-foreground font-normal">({batch.startYear}-{String(batch.endYear).slice(-2)})</span>
                                            </TableCell>

                                            {/* GB Columns */}
                                            <TableCell className="text-center">{batch.gb.total}</TableCell>
                                            <TableCell className="text-center text-green-600 font-medium">
                                                {batch.gb.verified}
                                            </TableCell>
                                            <TableCell className="w-[150px]">
                                                <div className="flex items-center gap-2">
                                                    <Progress value={gbPercent} className="h-2" />
                                                    <span className="text-xs text-muted-foreground">
                                                        {gbPercent}%
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Alumni Columns */}
                                            <TableCell className="text-center border-l">
                                                {batch.alumni.total}
                                            </TableCell>
                                            <TableCell className="text-center text-green-600 font-medium">
                                                {batch.alumni.verified}
                                            </TableCell>
                                            <TableCell className="w-[150px]">
                                                <div className="flex items-center gap-2">
                                                    <Progress value={alumniPercent} className="h-2" />
                                                    <span className="text-xs text-muted-foreground">
                                                        {alumniPercent}%
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {summary.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="text-center text-muted-foreground h-24"
                                        >
                                            No batch data available.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
