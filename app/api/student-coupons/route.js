import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import StudentCoupon from "@/models/StudentCoupon";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        await connectToDB();

        const url = new URL(req.url);
        const academicYear = url.searchParams.get("academicYear");
        const classId = url.searchParams.get("classId");
        const batchId = url.searchParams.get("batchId");
        const status = url.searchParams.get("status");
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");
        const search = url.searchParams.get("search");
        const studentId = url.searchParams.get("studentId");
        const role = req.headers.get("active-role");

        // Build filter
        const filter = {};
        if (academicYear) filter.academicYear = academicYear;
        if (status && status !== "all") filter.status = status;
        if (studentId) filter.studentId = studentId;

        // Date Range Filter (Applied to Payments)
        let dateFilter = null;
        if (startDate || endDate) {
            dateFilter = {};
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
            // Filter coupons that have AT LEAST one payment in this range
            filter["payments.date"] = dateFilter;
        }

        if (search) {
            // Find students matching the search term (Name or ID)
            const users = await User.find({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { _id: { $regex: search, $options: "i" } }
                ]
            }).select("_id");
            const userIds = users.map(u => u._id);

            filter.$or = [
                { couponNumber: { $regex: search, $options: "i" } },
                { studentId: { $in: userIds } }
            ];
        }

        // Filter by Batch and/or Class
        if (classId || batchId) {
            const studentQuery = {};
            if (classId) {
                studentQuery["studentSpecificField.classId"] = {
                    $in: classId.split(",").map((id) => id.trim()),
                };
            }
            if (batchId) {
                studentQuery["studentSpecificField.batchId"] = {
                    $in: batchId.split(",").map((id) => id.trim()),
                };
            }

            const studentsInScope = await User.find(studentQuery).select("_id");
            filter.studentId = { $in: studentsInScope.map(s => s._id) };
        }

        // Fetch coupons
        const coupons = await StudentCoupon.find(filter)
            .populate({
                path: "studentId",
                select: "name studentSpecificField.classId _id",
                populate: {
                    path: "studentSpecificField.classId",
                    select: "name"
                }
            })
            .sort({ createdAt: -1 });

        // Client-side filtering for search text match on student name (if not handled by regex above)
        // Client-side filtering is NOT needed as we handle it in the DB query above with $or
        // AND sorting is handled below
        let filteredCoupons = coupons;

        // Sort by Student ID Ascending
        filteredCoupons.sort((a, b) => {
            const idA = a.studentId?._id || "";
            const idB = b.studentId?._id || "";
            return idA.localeCompare(idB);
        });

        // Calculate Summary Stats
        const stats = {
            totalCouponAmount: 0,
            totalCollected: 0,
            totalPending: 0
        };

        filteredCoupons.forEach(coupon => {
            stats.totalCouponAmount += (coupon.couponAmount || 0);

            // Calculate extracted payments based on Date Range
            const relevantPayments = coupon.payments?.filter(p => {
                if (!dateFilter) return true;
                const pDate = new Date(p.date);
                if (dateFilter.$gte && pDate < dateFilter.$gte) return false;
                if (dateFilter.$lte && pDate > dateFilter.$lte) return false;
                return true;
            }) || [];

            stats.totalCollected += relevantPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        });

        // Total Pending logic:
        // If viewing specific date range, "Pending" is ambiguous. 
        // Do we show current actual pending? Or "What wasn't paid in this period"? 
        // Usually current actual pending is most useful.
        // Current logic: stats.totalPending = stats.totalCouponAmount - stats.totalCollected; 
        // THIS IS WRONG if totalCollected is partial period.
        // Let's use the coupon's actual balance for pending.

        stats.totalPending = 0;
        filteredCoupons.forEach(c => {
            // Use virtual/calculated balance derived from ALL payments, regardless of filter
            // We need to recalculate full paid for balance
            const fullPaid = c.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
            const balance = (c.couponAmount || 0) - fullPaid;
            stats.totalPending += balance;
        });

        return NextResponse.json({
            coupons: filteredCoupons,
            stats
        });

    } catch (error) {
        return apiResponse.error(error);
    }
}

export async function DELETE(req) {
    try {
        await connectToDB();
        const { id } = await req.json();

        if (!id) {
            return apiResponse.error("Coupon ID is required", 400);
        }

        const deletedCoupon = await StudentCoupon.findByIdAndDelete(id);

        if (!deletedCoupon) {
            return apiResponse.notFound("Coupon");
        }

        return apiResponse.success(null, "Coupon deleted successfully");
    } catch (error) {
        return apiResponse.error(error);
    }
}

export async function PUT(req) {
    try {
        await connectToDB();
        const body = await req.json();
        const { id, couponNumber, couponAmount, totalPaid, paymentDate } = body;

        if (!id) {
            return apiResponse.error("Coupon ID is required", 400);
        }

        const coupon = await StudentCoupon.findById(id);
        if (!coupon) {
            return apiResponse.notFound("Coupon");
        }

        // Update basic fields
        if (couponNumber !== undefined) coupon.couponNumber = couponNumber;
        if (couponAmount !== undefined) coupon.couponAmount = Number(couponAmount);

        // Update Payments (Full Array Replace)
        if (body.payments && Array.isArray(body.payments)) {
            coupon.payments = body.payments.map(p => ({
                amount: Number(p.amount),
                date: new Date(p.date),
                note: p.note || "Edited via Table",
                recordedBy: "Admin"
            }));
        }
        // Fallback: Update Paid Amount (Reset payments if changed or date updated)
        else if (totalPaid !== undefined) {
            const newTotalPaid = Number(totalPaid);
            const currentTotal = coupon.payments.reduce((sum, p) => sum + (p.amount || 0), 0);

            if (currentTotal !== newTotalPaid || paymentDate) {
                coupon.payments = [{
                    amount: newTotalPaid,
                    date: paymentDate ? new Date(paymentDate) : new Date(),
                    note: "Manual Correction via Edit",
                    recordedBy: "Admin"
                }];
            }
        }

        await coupon.save();

        return apiResponse.success(coupon, "Coupon updated successfully");
    } catch (error) {
        return apiResponse.error(error);
    }
}

export async function POST(req) {
    try {
        await connectToDB();
        const body = await req.json();
        const { studentId, academicYear, couponNumber, couponAmount, payment } = body;

        // Check if coupon exists for this student + year
        let coupon = await StudentCoupon.findOne({ studentId, academicYear });

        if (coupon) {
            // Update existing coupon

            // If couponNumber is provided, update it (allow overwriting or setting if was empty)
            if (couponNumber !== undefined) {
                coupon.couponNumber = couponNumber;
            }

            // check if we are adding a payment
            if (payment && payment.amount > 0) {
                coupon.payments.push(payment);
            }
            // Update coupon amount if changed
            if (couponAmount !== undefined) coupon.couponAmount = couponAmount;

            await coupon.save();
        } else {
            // Create new coupon
            coupon = new StudentCoupon({
                studentId,
                academicYear,
                couponNumber, // can be undefined
                couponAmount: couponAmount || 0,
                payments: payment && payment.amount > 0 ? [payment] : []
            });
            await coupon.save();
        }

        return apiResponse.success(coupon, "Student coupon funds updated successfully");

    } catch (error) {
        // handle duplicate key error for couponNumber
        if (error.code === 11000) {
            return apiResponse.error("Coupon number already exists!");
        }
        return apiResponse.error(error);
    }
}
