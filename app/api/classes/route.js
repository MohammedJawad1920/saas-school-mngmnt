import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Class from "@/models/Class";
import User from "@/models/User";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam === "0" ? Infinity : (parseInt(limitParam) || Infinity);

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination parameters
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

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

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }
    if (filterParams?._id) {
      query._id = filterParams?._id;
    }
    if (filterParams.batchId) {
      query.batchId = filterParams.batchId;
    }
    if (filterParams.teacherId) {
      query.teacherId = filterParams.teacherId;
    }
    if (filterParams.status) {
      query.status = filterParams.status;
    }

    // Execute query with pagination
    const classes = await Class.find(query, projections)
      .populate("batchId", "name")
      .populate("teacherId", "name")
      .populate("coreSubjects", "name")
      .populate("majorSubjects", "name")
      .skip(limit === Infinity ? 0 : (page * limit))
      .limit(limit === Infinity ? 0 : limit)
      .sort({ _id: 1 })
      .collation({ locale: "en_US", numericOrdering: true })
      .lean();

    // Get total count for pagination info
    const total = await Class.countDocuments(query);

    const formattedClasses = classes.map((cls) => ({
      ...cls,
      shortname: cls.shortname,
      batchName: cls.batchId?.name,
      teacherName: cls.teacherId?.name,
      status: cls.status || "Active",
      coreSubjectsName: (cls.coreSubjects || []).map((subject) => subject?.name || ""),
      coreSubjectIds: (cls.coreSubjects || []).map((subject) => subject?._id || subject),
      majorSubjectsName: (cls.majorSubjects || []).map((subject) => subject?.name || ""),
      majorSubjectIds: (cls.majorSubjects || []).map((subject) => subject?._id || subject),
      // Keep old fields for backward compatibility
      subjectsName: [
        ...(cls.coreSubjects || []).map((s) => s?.name || ""),
        ...(cls.majorSubjects || []).map((s) => s?.name || ""),
      ],
      subjectIds: [
        ...(cls.coreSubjects || []).map((s) => s?._id || s),
        ...(cls.majorSubjects || []).map((s) => s?._id || s),
      ],
    }));

    // Classes are already sorted by _id in the MongoDB query.

    return NextResponse.json(
      {
        classes: formattedClasses,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Classes fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();

    const { _id, name, shortname, batchId, teacherId, coreSubjectIds, majorSubjectIds, status } = await req.json();
    const newClass = await Class.create({
      _id,
      name,
      shortname,
      batchId,
      teacherId,
      coreSubjects: coreSubjectIds,
      majorSubjects: majorSubjectIds,
      status: status || "Active",
    });

    if (newClass && batchId) {
      await User.updateMany(
        { roles: "Student", "studentSpecificField.batchId": batchId },
        { $set: { "studentSpecificField.classId": _id } }
      );
    }

    await syncStudentClasses();

    return NextResponse.json(
      { newClass, message: "Class created successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const rawBody = await req.json();
    console.log("DEBUG: Class PUT rawBody:", JSON.stringify(rawBody, null, 2));
    const body = rawBody.data || rawBody;
    console.log("DEBUG: Class PUT body:", JSON.stringify(body, null, 2));
    const { ids, name, shortname, batchId, teacherId, coreSubjectIds, majorSubjectIds, status } = body;

    if (!ids || !ids.length) {
      return NextResponse.json({ message: "No IDs provided" }, { status: 400 });
    }

    const _id = ids[0];

    if (ids.length > 1) {
      const updatedClasses = await Class.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            name,
            shortname,
            batchId,
            teacherId,
            coreSubjects: coreSubjectIds,
            majorSubjects: majorSubjectIds,
            status,
          },
        }
      );

      if (batchId) {
        await User.updateMany(
          { roles: "Student", "studentSpecificField.batchId": batchId },
          { $set: { "studentSpecificField.classId": ids[0] } }
        );
      }

      await syncStudentClasses();

      return NextResponse.json(
        { updatedClasses, message: "Classes Updated successfully!" },
        { status: 200 }
      );
    }

    // Direct update with strict: false to ensure the new field is saved
    const updatedClass = await Class.findOneAndUpdate(
      { _id },
      { 
        $set: { 
          name, 
          shortname, 
          batchId, 
          teacherId, 
          coreSubjects: coreSubjectIds,
          majorSubjects: majorSubjectIds,
          status 
        } 
      },
      { new: true, runValidators: true, strict: false }
    );

    if (!updatedClass) {
      return NextResponse.json({ message: "Class not found" }, { status: 404 });
    }

    if (batchId) {
      await User.updateMany(
        { roles: "Student", "studentSpecificField.batchId": batchId },
        { $set: { "studentSpecificField.classId": _id } }
      );
    }

    await syncStudentClasses();

    return NextResponse.json(
      { updatedClass, message: "Class Updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { ids } = await req.json();
    const _id = ids[0];
    if (ids.length > 1) {
      const deletedClasses = await Class.deleteMany({ _id: { $in: ids } });
      await syncStudentClasses();
      return NextResponse.json(
        { deletedClasses, message: "Classes deleted successfully!" },
        { status: 200 }
      );
    }
    const deletedClass = await Class.findByIdAndDelete(_id);
    await syncStudentClasses();
    return NextResponse.json(
      { deletedClass, message: "Class deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

async function syncStudentClasses() {
  try {
    const UserModel = Class.db.model("User");
    const classes = await Class.find({}).lean();
    const batchToClassMap = {};
    classes.forEach((cls) => {
      if (cls.batchId) {
        batchToClassMap[cls.batchId] = cls._id;
      }
    });

    const students = await UserModel.find({ roles: "Student" }).select("_id studentSpecificField.batchId studentSpecificField.classId").lean();

    const bulkOps = [];
    students.forEach((student) => {
      const currentBatchId = student.studentSpecificField?.batchId;
      const currentClassId = student.studentSpecificField?.classId;
      const expectedClassId = currentBatchId ? batchToClassMap[currentBatchId] : null;

      if (currentClassId !== expectedClassId) {
        bulkOps.push({
          updateOne: {
            filter: { _id: student._id },
            update: { 
              $set: { 
                "studentSpecificField.classId": expectedClassId || null 
              } 
            }
          }
        });
      }
    });

    if (bulkOps.length > 0) {
      console.log(`[Sync] Updating ${bulkOps.length} student class assignments...`);
      await UserModel.bulkWrite(bulkOps);
    }
  } catch (error) {
    console.error("Error in syncStudentClasses:", error);
  }
}
