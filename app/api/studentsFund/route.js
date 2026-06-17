import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import StudentsFund from "@/models/StudentsFund";
import { apiResponse } from "@/lib/apiResponse";

export async function GET(req, res) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const searchParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      searchParams[key] = value;
    }

    // IF getAll is present, fetch ALL funds for this student
    if (searchParams.getAll && searchParams.studentId) {
      const query = { studentId: searchParams.studentId };
      if (searchParams.batchId) {
        query.batchId = searchParams.batchId;
      }

      const studentFunds = await StudentsFund.find(query)
        .populate("teacherId", "name roles")
        .populate("transactions.performedBy", "name")
        .lean();

      return NextResponse.json({ studentFunds }, { status: 200 });
    }

    const projections = {};
    if (searchParams.projection) {
      searchParams.projection.split(",").forEach((field) => {
        projections[field.trim()] = 1;
      });
    }

    const query = {};
    if (searchParams.studentId) {
      query.studentId = searchParams.studentId;
    } else {
      query.studentId = { $exists: false };
    }

    // Hybrid Fund Logic
    if (searchParams.department) {
      query.department = searchParams.department;
      query.fundType = "Department";
    } else if (searchParams.teacherId) {
      query.teacherId = searchParams.teacherId;
      // Allow legacy docs (missing fundType) or new docs (fundType="Individual")
      query.$or = [{ fundType: "Individual" }, { fundType: { $exists: false } }];
    }

    if (searchParams.batchId) {
      query.batchId = searchParams.batchId;
    }

    const studentFundsList = await StudentsFund.find(query, projections).sort({ updatedAt: -1 }).lean();

    let studentFund = null;
    if (studentFundsList.length > 0) {
      if (studentFundsList.length === 1) {
        studentFund = studentFundsList[0];
      } else {
        // Merge duplicates for this specific student
        studentFund = { ...studentFundsList[0] };
        studentFund.balance = studentFundsList.reduce((sum, fund) => sum + (fund.balance || 0), 0);
        studentFund.transactions = studentFundsList.reduce((acc, fund) => acc.concat(fund.transactions || []), []).sort((a, b) => new Date(b.date) - new Date(a.date));
      }
    }

    // Query for "All Students Balance" list
    // Optimization: If specific studentId is requested, we might not need allStudentsFund unless specifically asked
    let allStudentsFund = [];
    if (!searchParams.studentId || searchParams.includeSummary === "true") {
      const allStudentsQuery = {
        batchId: searchParams.batchId,
      };

      if (searchParams.department) {
        allStudentsQuery.department = searchParams.department;
        allStudentsQuery.fundType = "Department";
      } else if (searchParams.teacherId) {
        allStudentsQuery.teacherId = searchParams.teacherId;
        allStudentsQuery.$or = [
          { fundType: "Individual" },
          { fundType: { $exists: false } },
        ];
      }

      const rawFunds = await StudentsFund.find(allStudentsQuery)
        .populate("studentId", "name profilePic studentSpecificField.admissionNumber studentSpecificField.batchId") // Optimized population
        .sort({ updatedAt: -1 })
        .lean();

      // Deduplicate on the backend to prevent duplicate students in the list, but sum their balances!
      const uniqueStudentsMap = new Map();
      rawFunds.forEach(fund => {
        const studentId = fund.studentId?._id;
        if (studentId) {
          const idStr = studentId.toString();
          if (!uniqueStudentsMap.has(idStr)) {
            uniqueStudentsMap.set(idStr, { ...fund });
          } else {
            // merge balance and transactions for duplicates
            const existing = uniqueStudentsMap.get(idStr);
            existing.balance = (existing.balance || 0) + (fund.balance || 0);
            if (fund.transactions && fund.transactions.length > 0) {
               existing.transactions = (existing.transactions || []).concat(fund.transactions);
            }
          }
        }
      });
      allStudentsFund = Array.from(uniqueStudentsMap.values());
    }

    return NextResponse.json({ studentFund, allStudentsFund }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const {
      studentId,
      teacherId,
      batchId,
      transaction,
      department,
      fundType = "Individual",
    } = await req.json();

    if (fundType === "Department") {
      if (!department) {
        return NextResponse.json(
          { message: "Department is required for Department funds" },
          { status: 400 }
        );
      }
    } else {
      if (!teacherId) {
        return NextResponse.json(
          { message: "Teacher ID is required for Individual funds" },
          { status: 400 }
        );
      }
    }

    const query = {
      batchId,
      fundType, // Include fundType to ensure partialFilterExpression of unique index is met
    };

    if (fundType === "Department" && department) {
      query.department = department;
    } else {
      query.teacherId = teacherId;
    }

    if (studentId) {
      query.studentId = studentId;
    } else {
      query.studentId = { $exists: false };
    }

    const amountChange =
      transaction.type === "Deposit"
        ? transaction.amount
        : -transaction.amount;

    // Find all existing records for this exact query
    const existingFunds = await StudentsFund.find(query).sort({ updatedAt: -1 });

    let studentFund;

    if (existingFunds.length > 1) {
      // We found duplicates! We need to merge them to fix the data pollution.
      
      // Calculate summed balance and collect all transactions from all duplicates
      const totalBalance = existingFunds.reduce((sum, f) => sum + (f.balance || 0), 0);
      const allTransactions = existingFunds.reduce((acc, f) => acc.concat(f.transactions || []), []);

      // The newest record will be kept, the rest deleted
      const primaryFund = existingFunds[0];
      const duplicateIds = existingFunds.slice(1).map(f => f._id);

      // Clean up duplicates from the DB
      await StudentsFund.deleteMany({ _id: { $in: duplicateIds } });

      // Apply the new transaction to the merged data
      const newTotalBalance = totalBalance + amountChange;
      allTransactions.push({ ...transaction, date: new Date() });

      // Sort transactions latest first (optional, frontend handles it, but good for DB)
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Update the primary fund
      primaryFund.balance = newTotalBalance;
      primaryFund.transactions = allTransactions;
      await primaryFund.save();
      
      studentFund = primaryFund;

    } else {
      // Normal flow (0 or 1 record)
      // Define the update operation
      const update = {
        $inc: { balance: amountChange },
        $push: { transactions: { ...transaction, date: new Date() } },
        $setOnInsert: {
          // fundType, // Already in query
          // ...query, // Already in query
        },
      };

      // Use findOneAndUpdate with upsert: true
      studentFund = await StudentsFund.findOneAndUpdate(query, update, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      });
    }

    return NextResponse.json({ newStudentsFund: studentFund }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();
    const {
      studentId,
      teacherId,
      batchId,
      department,
      fundType = "Individual",
    } = await req.json();

    const query = {
      batchId,
    };

    if (studentId) {
      query.studentId = studentId;
    } else {
      query.studentId = { $exists: false };
    }

    if (fundType === "Department" && department) {
      query.department = department;
    } else {
      query.teacherId = teacherId;
    }

    // Get all records to consolidate and clear
    const existingFunds = await StudentsFund.find(query).sort({ updatedAt: -1 });

    let studentFund = null;
    if (existingFunds.length > 0) {
      // Pick the primary/newest fund to keep and update
      studentFund = existingFunds[0];
      const duplicateIds = existingFunds.slice(1).map(f => f._id);

      // Delete the duplicates completely
      if (duplicateIds.length > 0) {
        await StudentsFund.deleteMany({ _id: { $in: duplicateIds } });
      }

      // Clear the primary fund's transactions and set fundType
      studentFund = await StudentsFund.findByIdAndUpdate(
        studentFund._id,
        {
          $set: {
            transactions: [],
            fundType: fundType, // Migrate on update
          },
        },
        { new: true }
      );
    } else {
       // If no fund existed, we shouldn't really be clearing history, but we fallback
       studentFund = await StudentsFund.findOneAndUpdate(
        query,
        {
          $set: {
            transactions: [],
            fundType: fundType,
          },
        },
        { new: true, upsert: true }
      );
    }
    return NextResponse.json({ studentFund }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}
