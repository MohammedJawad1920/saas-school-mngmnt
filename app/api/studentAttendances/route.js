import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import StudentAttendance from "@/models/StudentAttendance";
import User from "@/models/User";
import Class from "@/models/Class";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination, limit, projection, and control flags
      if (!["page", "limit", "projection", "toppersOnly", "name"].includes(key)) {
        filterParams[key] = value;
      }
    }

    const isToppersOnly = url.searchParams.get("toppersOnly") === "true";
    const nameFilter = url.searchParams.get("name");

    // Get projection param
    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    // Convert projection param to MongoDB projection object
    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    // Build MongoDB query for the student document level
    const documentQuery = {};
    if (filterParams.studentId) {
      documentQuery.studentId = filterParams.studentId;
    } else if (nameFilter) {
      // Search for students by name
      const matchingStudents = await User.find({
        name: { $regex: nameFilter, $options: "i" },
        roles: "Student"
      }, { _id: 1 }).lean();

      if (matchingStudents.length > 0) {
        documentQuery.studentId = { $in: matchingStudents.map(m => m._id.toString()) };
      } else {
        // If name search is active but no students found, force empty result
        documentQuery.studentId = "NULL_USER_ID";
      }
    }

    // Handle batch and class filters at the student document level
    if (filterParams.classId || filterParams.batchId) {
      const userQuery = { roles: "Student" };
      
      if (filterParams.classId) {
        const classIds = filterParams.classId.split(',').map(s => s.trim());
        userQuery.$or = [
          { "studentSpecificField.classId": { $in: classIds } },
          { "studentSpecificField.subjectTypeAssignments": { 
              $in: classIds.flatMap(id => [`${id}:CORE`, `${id}:MAJOR`]) 
            } 
          }
        ];
        userQuery["studentSpecificField.status"] = "Active"; // filter by class only for active students
      }
      
      if (filterParams.batchId) {
        const batchIds = filterParams.batchId.split(',').map(s => s.trim());
        userQuery["studentSpecificField.batchId"] = { $in: batchIds };
        // No status filter here, so it includes all students of the batch
      }
      
      const matchingUsers = await User.find(userQuery, { _id: 1 }).lean();
      const matchedIds = matchingUsers.map(m => m._id.toString());
      
      if (matchedIds.length > 0) {
        if (documentQuery.studentId) {
          if (documentQuery.studentId.$in) {
            documentQuery.studentId.$in = documentQuery.studentId.$in.filter(id => matchedIds.includes(id));
            if (documentQuery.studentId.$in.length === 0) documentQuery.studentId = "NULL_USER_ID";
          } else {
             if (!matchedIds.includes(documentQuery.studentId)) {
                documentQuery.studentId = "NULL_USER_ID";
             }
          }
        } else {
          documentQuery.studentId = { $in: matchedIds };
        }
      } else {
        documentQuery.studentId = "NULL_USER_ID";
      }
    }

    // Store record-level filters separately - these will be used later for filtering the records array
    const recordFilters = {};
    if (filterParams.classId) {
      recordFilters.classId = filterParams.classId;
    }
    if (filterParams.batchId) {
      recordFilters.batchId = filterParams.batchId;
    }
    if (filterParams.subjectId) {
      recordFilters.subjectId = filterParams.subjectId;
    }

    // Handle date filtering
    let dateFilter = null;
    if (filterParams.date) {
      // Convert string date to Date object for exact date match
      const exactDate = new Date(filterParams.date);
      const startOfDay = new Date(exactDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(exactDate);
      endOfDay.setHours(23, 59, 59, 999);

      dateFilter = {
        start: startOfDay,
        end: endOfDay,
      };
    } else if (filterParams.startDate || filterParams.endDate) {
      dateFilter = {};

      if (filterParams.startDate) {
        const startDate = new Date(filterParams.startDate);
        startDate.setHours(0, 0, 0, 0);
        dateFilter.start = startDate;
      }

      if (filterParams.endDate) {
        const endDate = new Date(filterParams.endDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.end = endDate;
      }
    }

    console.log("Filters:", { documentQuery, recordFilters, dateFilter });

    // Fetch all classes to determine core/major subjects for filtering
    const allClasses = await Class.find({}, "coreSubjects majorSubjects").lean();
    const classSubjectMap = {};
    allClasses.forEach(c => {
      classSubjectMap[c._id] = {
        core: (c.coreSubjects || []).map(s => s.toString()),
        major: (c.majorSubjects || []).map(s => s.toString())
      };
    });

    // For better performance and to handle string IDs correctly, use aggregation with $lookup
    const pipeline = [
      // First match at document level (studentId filter)
      { $match: documentQuery },

      // Add the filtered records field using $filter operator
      {
        $addFields: {
          attendanceRecords: {
            $filter: {
              input: "$attendanceRecords",
              as: "record",
              cond: {
                $and: [
                  // Filter by class if specified
                  ...(recordFilters.classId
                    ? [
                      {
                        $in: [{ $toString: "$$record.classId" }, recordFilters.classId.split(',').map(s => s.trim())],
                      },
                    ]
                    : []),

                  // Filter by batch if specified
                  ...(recordFilters.batchId
                    ? [
                      {
                        $or: [
                          { $in: [{ $toString: "$$record.batchId" }, recordFilters.batchId.split(',').map(s => s.trim())] },
                          { $eq: [{ $toString: "$$record.batchId" }, "[object Object]"] }
                        ]
                      },
                    ]
                    : []),

                  // Filter by subject if specified
                  ...(recordFilters.subjectId
                    ? [
                      {
                        $in: [{ $toString: "$$record.subjectId" }, recordFilters.subjectId.split(',').map(s => s.trim())],
                      },
                    ]
                    : []),

                  // Date filtering - start date if specified
                  ...(dateFilter?.start
                    ? [
                      {
                        $gte: ["$$record.date", dateFilter.start],
                      },
                    ]
                    : []),

                  // Date filtering - end date if specified
                  ...(dateFilter?.end
                    ? [
                      {
                        $lte: ["$$record.date", dateFilter.end],
                      },
                    ]
                    : []),
                ],
              },
            },
          },
        },
      },

      // Now project to only include documents with matching records
      {
        $match: {
          "attendanceRecords.0": { $exists: true }, // Ensures at least one record matched
        },
      },
    ];

    if (!isToppersOnly) {
      let userQuery = { roles: "Student" };
      if (documentQuery.studentId) {
        if (documentQuery.studentId === "NULL_USER_ID") {
          return NextResponse.json({
            studentAttendances: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
            message: "No students found"
          }, { status: 200 });
        }
        userQuery._id = documentQuery.studentId;
      }
      
      const total = await User.countDocuments(userQuery);
      const users = await User.find(userQuery, "_id name")
        .skip(limit === Infinity ? 0 : page * limit)
        .limit(limit === Infinity ? 0 : limit)
        .lean();
        
      const userIds = users.map(u => u._id);
      
      const attendances = await StudentAttendance.find({ studentId: { $in: userIds } })
        .populate("attendanceRecords.classId", "name")
        .populate("attendanceRecords.subjectId", "name")
        .populate("attendanceRecords.teacherId", "name")
        .lean();
        
      const attendanceMap = {};
      attendances.forEach(doc => {
        attendanceMap[doc.studentId] = doc.attendanceRecords || [];
      });
      
      const formattedStudentAttendances = users.map(user => {
        let records = attendanceMap[user._id] || [];
        
        // Debug
        if (recordFilters.batchId && records.length > 0) {
          console.log(`Student ${user.name} records before batch filter: ${records.length}. sample batchId in record: ${records[0].batchId}`);
        }
        
        // Apply record filters
        if (recordFilters.classId) {
          const classIds = String(recordFilters.classId).split(',').map(s => s.trim());
          records = records.filter(r => classIds.includes(r.classId?._id?.toString() || r.classId?.toString()));
        }
        if (recordFilters.batchId) {
          const batchIds = String(recordFilters.batchId).split(',').map(s => s.trim());
          records = records.filter(r => {
            const bid = r.batchId?._id?.toString() || r.batchId?.toString();
            // Handle corrupted database records where batchId was saved as "[object Object]"
            return batchIds.includes(bid) || bid === "[object Object]";
          });
        }
        
        if (recordFilters.subjectId) {
          const subjectIds = String(recordFilters.subjectId).split(',').map(s => s.trim());
          records = records.filter(r => subjectIds.includes(r.subjectId?._id?.toString() || r.subjectId?.toString()));
        }
        if (dateFilter?.start) {
          records = records.filter(r => new Date(r.date) >= dateFilter.start);
        }
        if (dateFilter?.end) {
          records = records.filter(r => new Date(r.date) <= dateFilter.end);
        }
        
        // Filter for CORE and MAJOR subjects if they are defined, otherwise show all
        records = records.filter(r => {
          const cId = r.classId?._id?.toString() || r.classId?.toString();
          const sId = r.subjectId?._id?.toString() || r.subjectId?.toString();
          const subjects = classSubjectMap[cId];
          if (!subjects) return false;
          // If class has no CORE/MAJOR subjects assigned, allow all subjects for that class
          if (subjects.core.length === 0 && subjects.major.length === 0) return true;
          return subjects.core.includes(sId) || subjects.major.includes(sId);
        });
        
        return {
          _id: user._id,
          name: user.name,
          attendanceRecords: records.map(r => ({
            date: r.date,
            present: r.present ?? false,
            periodNumber: r.periodNumber,
            classId: r.classId?._id || r.classId,
            className: r.classId?.name || "Unknown",
            subjectId: r.subjectId?._id || r.subjectId,
            subjectName: r.subjectId?.name || "Unknown",
            teacherId: r.teacherId?._id || r.teacherId,
            teacherName: r.teacherId?.name || "N/A"
          }))
        };
      });
      
      // DEBUG: WRITE TO FILE
      const fs = require('fs');
      try {
        fs.writeFileSync('debug_api.json', JSON.stringify({
          recordFilters,
          dateFilter,
          sampleUsers: formattedStudentAttendances.slice(0, 2),
          totalFormattedUsers: formattedStudentAttendances.length,
          totalRecordsForFirstUser: formattedStudentAttendances[0]?.attendanceRecords?.length || 0,
          originalRecordsCount: attendanceMap[formattedStudentAttendances[0]?._id]?.length || 0
        }, null, 2));
      } catch (e) {
        console.error("Failed to write debug file", e);
      }
      
      return NextResponse.json({
        studentAttendances: formattedStudentAttendances,
        pagination: {
          page,
          limit,
          total,
          totalPages: limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Student attendance records fetched successfully"
      }, { status: 200 });
    }

    // If toppersOnly is true, calculate percentage and get the top student per class
    pipeline.push(
      { $unwind: "$attendanceRecords" },
      // Filter for CORE and MAJOR subjects in aggregation
      {
        $lookup: {
          from: "classes",
          localField: "attendanceRecords.classId",
          foreignField: "_id",
          as: "recordClassDetails"
        }
      },
      { $unwind: "$recordClassDetails" },
      {
        $match: {
          $expr: {
            $or: [
              { $in: ["$attendanceRecords.subjectId", "$recordClassDetails.coreSubjects"] },
              { $in: ["$attendanceRecords.subjectId", "$recordClassDetails.majorSubjects"] },
              // If both are empty, allow all records for this class
              {
                $and: [
                  { $eq: [{ $size: { $ifNull: ["$recordClassDetails.coreSubjects", []] } }, 0] },
                  { $eq: [{ $size: { $ifNull: ["$recordClassDetails.majorSubjects", []] } }, 0] }
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            classId: "$attendanceRecords.classId",
            studentId: "$studentId"
          },
          totalClasses: { $sum: 1 },
          presentClasses: {
            $sum: { $cond: [{ $eq: ["$attendanceRecords.present", true] }, 1, 0] }
          },
          records: { $push: "$attendanceRecords" }
        }
      },
      {
        $addFields: {
          percentage: {
            $multiply: [{ $divide: ["$presentClasses", "$totalClasses"] }, 100]
          }
        }
      },
      { $sort: { "_id.classId": 1, percentage: -1 } },
      {
        $group: {
          _id: "$_id.classId",
          topStudentId: { $first: "$_id.studentId" },
          percentage: { $first: "$percentage" },
          attendanceRecords: { $first: "$records" }
        }
      },
      {
        $project: {
          _id: 0,
          studentId: "$topStudentId",
          attendanceRecords: 1,
          percentage: { $round: ["$percentage", 1] }
        }
      }
    );

    // Now add $lookups to populate names (shared by both flows)
    pipeline.push(
      // Student Name
      {
        $lookup: {
          from: "users",
          localField: "studentId",
          foreignField: "_id",
          as: "studentInfo"
        }
      },
      { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },
      
      // Unwind attendanceRecords to populate each one
      { $unwind: { path: "$attendanceRecords", preserveNullAndEmptyArrays: true } },
      
      // Class Name for records
      {
        $lookup: {
          from: "classes",
          localField: "attendanceRecords.classId",
          foreignField: "_id",
          as: "classInfo"
        }
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
      
      // Subject Name for records
      {
        $lookup: {
          from: "subjects",
          localField: "attendanceRecords.subjectId",
          foreignField: "_id",
          as: "subjectInfo"
        }
      },
      { $unwind: { path: "$subjectInfo", preserveNullAndEmptyArrays: true } },

      // Teacher Name for records
      {
        $lookup: {
          from: "users",
          localField: "attendanceRecords.teacherId",
          foreignField: "_id",
          as: "teacherInfo"
        }
      },
      { $unwind: { path: "$teacherInfo", preserveNullAndEmptyArrays: true } },

      // Group back by student
      {
        $group: {
          _id: "$studentId",
          studentName: { $first: "$studentInfo.name" },
          percentage: { $first: "$percentage" }, // For toppers flow
          attendanceRecords: {
            $push: {
              date: "$attendanceRecords.date",
              present: "$attendanceRecords.present",
              periodNumber: "$attendanceRecords.periodNumber",
              classId: "$attendanceRecords.classId",
              className: "$classInfo.name",
              subjectId: "$attendanceRecords.subjectId",
              subjectName: "$subjectInfo.name",
              teacherId: "$attendanceRecords.teacherId",
              teacherName: "$teacherInfo.name"
            }
          }
        }
      }
    );

    // Execute the final aggregation pipeline
    const results = await StudentAttendance.aggregate(pipeline).exec();

    // Format final results
    const formattedStudentAttendances = results.map((record) => ({
      _id: record._id,
      name: record.studentName || "Unknown Student",
      percentage: record.percentage,
      attendanceRecords: record.attendanceRecords.map(item => ({
        ...item,
        teacherName: item.teacherName || "N/A"
      }))
    }));

    // Get total count more efficiently (same documentQuery logic)
    const countPipeline = [
      { $match: documentQuery },
      {
        $addFields: {
          filtered: {
            $filter: {
              input: "$attendanceRecords",
              as: "record",
              cond: {
                $and: [
                  ...(recordFilters.classId ? [{ $eq: [{ $toString: "$$record.classId" }, recordFilters.classId] }] : []),
                  ...(recordFilters.batchId ? [{ $eq: [{ $toString: "$$record.batchId" }, recordFilters.batchId] }] : []),
                  ...(recordFilters.subjectId ? [{ $eq: [{ $toString: "$$record.subjectId" }, recordFilters.subjectId] }] : []),
                  ...(dateFilter?.start ? [{ $gte: ["$$record.date", dateFilter.start] }] : []),
                  ...(dateFilter?.end ? [{ $lte: ["$$record.date", dateFilter.end] }] : []),
                ],
              },
            },
          },
        },
      },
      { $match: { "filtered.0": { $exists: true } } },
      { $count: "total" },
    ];

    const countResult = await StudentAttendance.aggregate(countPipeline).exec();
    const total = countResult.length > 0 ? countResult[0].total : 0;

    return NextResponse.json(
      {
        studentAttendances: formattedStudentAttendances,
        pagination: {
          page,
          limit,
          total,
          totalPages: limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Student attendance records fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Student attendance fetch error:", error);
    return apiResponse.error(error);
  }
}
