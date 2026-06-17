import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import StudentsFund from "@/models/StudentsFund";
import { apiResponse } from "@/lib/apiResponse";

export async function POST(req) {
    try {
        await connectToDB();
        const {
            batchId,
            studentIds,
            transaction,
            teacherId,
            department,
            fundType = "Individual",
        } = await req.json();

        console.log("Bulk Transaction Payload:", {
            batchId,
            studentIdsCount: studentIds?.length,
            fundType,
            department,
        });

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json(
                { message: "No students selected" },
                { status: 400 }
            );
        }

        if (fundType === "Department") {
            if (!department) {
                return NextResponse.json(
                    { message: "Department is required for Department funds" },
                    { status: 400 }
                );
            }
        } else {
            // Individual Fund
            if (!teacherId) {
                return NextResponse.json(
                    { message: "Teacher ID is required for Individual funds" },
                    { status: 400 }
                );
            }
        }

        const amountChange =
            transaction.type === "Deposit"
                ? transaction.amount
                : -transaction.amount;

        // Deduplicate studentIds to prevent parallel upsert collisions within the same batch
        const uniqueStudentIds = [...new Set(studentIds)];

        const operations = uniqueStudentIds.map((studentId) => {
            const query = {
                batchId,
                studentId,
                fundType, // Include fundType in query to match unique index partialFilterExpression
            };

            if (fundType === "Department" && department) {
                query.department = department;
            } else {
                query.teacherId = teacherId;
            }

            return {
                updateOne: {
                    filter: query,
                    update: {
                        $inc: { balance: amountChange },
                        $push: { transactions: { ...transaction, date: new Date() } },
                        $setOnInsert: {
                            // fundType, // Already in query
                            // ...query, // Already in query
                        },
                    },
                    upsert: true,
                },
            };
        });

        try {
            const result = await StudentsFund.bulkWrite(operations, {
                ordered: false,
            });

            return NextResponse.json(
                {
                    message: "Bulk transaction processed",
                    results: {
                        success: studentIds, // In bulkWrite with ordered:false, identifying exact simplified success ids is harder without parsing result errors, but mostly all succeed.
                        resultDetails: result,
                    },
                },
                { status: 200 }
            );
        } catch (error) {
            // If complete failure or some failure
            console.error("Bulk write error:", error);
            return apiResponse.error(error);
        }

    } catch (error) {
        return apiResponse.error(error);
    }
}
