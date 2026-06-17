
import connectToDB from "@/lib/db";
import Finance from "@/models/Finance";
import { NextResponse } from "next/server";

export async function PUT(req, { params }) {
    try {
        await connectToDB();
        const { id } = params;
        const body = await req.json();

        const updatedTransaction = await Finance.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });

        if (!updatedTransaction) {
            return NextResponse.json(
                { success: false, error: "Transaction not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: updatedTransaction });
    } catch (error) {
        console.error("Error updating transaction:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update transaction" },
            { status: 500 }
        );
    }
}

export async function DELETE(req, { params }) {
    try {
        await connectToDB();
        const { id } = params;

        const deletedTransaction = await Finance.findByIdAndDelete(id);

        if (!deletedTransaction) {
            return NextResponse.json(
                { success: false, error: "Transaction not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete transaction" },
            { status: 500 }
        );
    }
}
