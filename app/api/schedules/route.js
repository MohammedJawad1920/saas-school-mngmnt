import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Schedule from "@/models/Schedule";
import Program from "@/models/Program";
import { getYear } from "@/lib/getYear";

// Helper function to format time for display (12-hour format)
const formatTimeForDisplay = (time24) => {
  if (!time24) return "N/A";
  const [hours, minutes] = time24.split(":");
  const hour12 = ((parseInt(hours) + 11) % 12) + 1;
  const ampm = parseInt(hours) >= 12 ? "PM" : "AM";
  return `${hour12}:${minutes} ${ampm}`;
};

// Helper function to calculate schedule status based on date and time
const calculateScheduleStatus = (date, startTime, endTime) => {
  if (!date || !startTime || !endTime) {
    return "Unknown";
  }
  const now = new Date();
  const scheduleDate = new Date(date);

  // Create datetime objects for comparison
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  const startDateTime = new Date(scheduleDate);
  startDateTime.setHours(startHours, startMinutes, 0, 0);

  const endDateTime = new Date(scheduleDate);
  endDateTime.setHours(endHours, endMinutes, 0, 0);

  if (now < startDateTime) {
    return "Upcoming";
  } else if (now >= startDateTime && now <= endDateTime) {
    return "Ongoing";
  } else {
    return "Completed";
  }
};

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
      // Skip pagination parameters and status (since it's calculated)
      if (
        key !== "page" &&
        key !== "limit" &&
        key !== "projection" &&
        key !== "status"
      ) {
        filterParams[key] = value;
      }
    }

    // Get projection param
    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    // Convert projection param to MongoDB projection object
    if (projectionParam) {
      const fields = projectionParam?.split(",");
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams?._id) {
      query._id = filterParams._id;
    }
    if (filterParams.programId) {
      query.programId = filterParams.programId;
    }
    if (filterParams.date) {
      const filterDate = new Date(filterParams.date);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);

      query.date = {
        $gte: filterDate,
        $lt: nextDay,
      };
    }
    if (filterParams.dateRange) {
      const [startDate, endDate] = filterParams.dateRange.split(",");
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (filterParams.stageNumber) {
      query.stageNumber = parseInt(filterParams.stageNumber);
    }
    if (filterParams.isPublished !== undefined) {
      query.isPublished = filterParams.isPublished === "true";
    }

    // Add year to query
    query.year = await getYear(req);

    // Execute query with pagination
    const schedules = await Schedule.find(query, projections)
      .populate("programId", ["_id", "name", "type", "category", "divisionId"])
      .populate({
        path: "programId",
        populate: {
          path: "divisionId",
          select: "_id name",
        },
      })
      .skip(page * limit)
      .limit(limit)
      .sort({ date: 1, startTime: 1, stageNumber: 1 })
      .collation({ locale: "en_US", numericOrdering: true });

    // Get total count for pagination info
    const total = await Schedule.countDocuments(query);

    // Format schedules and calculate status for each
    const formattedSchedules = schedules.map((schedule) => {
      const calculatedStatus = calculateScheduleStatus(
        schedule.date,
        schedule.startTime,
        schedule.endTime
      );

      return {
        ...schedule.toObject(),
        programId: schedule.programId?._id || "Unknown",
        programName: schedule.programId?.name || "Unknown Program",
        programType: schedule.programId?.type || "Unknown",
        programCategory: schedule.programId?.category || "Unknown",
        divisionName: schedule.programId?.divisionId?.name || "Unknown",
        divisionId: schedule.programId?.divisionId?._id || "Unknown",
        dateFormatted: schedule.date.toLocaleDateString(),
        timeRange: `${formatTimeForDisplay(schedule.startTime)} - ${formatTimeForDisplay(schedule.endTime)}`,
        status: calculatedStatus, // Dynamically calculated status
      };
    });

    // Apply status filter after calculation if provided
    const statusFilter = url.searchParams.get("status");
    let filteredSchedules = formattedSchedules;
    if (statusFilter) {
      filteredSchedules = formattedSchedules.filter(
        (schedule) => schedule.status === statusFilter
      );
    }

    return NextResponse.json(
      {
        schedules: filteredSchedules,
        pagination: {
          page,
          limit,
          total: statusFilter ? filteredSchedules.length : total,
          totalPages: statusFilter
            ? Math.max(
                0,
                Math.ceil(
                  filteredSchedules.length /
                    (limit === Infinity ? filteredSchedules.length : limit)
                )
              )
            : limit === Infinity
              ? 1
              : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Schedules fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    // Remove status from data since it's not stored in database
    const { status, ...scheduleData } = data;

    // Validate required fields
    const requiredFields = ["programId", "date", "stageNumber"];
    for (const field of requiredFields) {
      if (!scheduleData[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate program exists
    const program = await Program.findById(scheduleData.programId);
    if (!program) {
      return NextResponse.json(
        { message: "Program not found" },
        { status: 404 }
      );
    }

    // Validate date is not in the past
    const scheduleDate = new Date(scheduleData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (scheduleDate < today) {
      return NextResponse.json(
        { message: "Cannot schedule events in the past" },
        { status: 400 }
      );
    }

    // Enhanced time format validation for 24-hour format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (
      (!!scheduleData.startTime && !timeRegex.test(scheduleData.startTime)) ||
      (!!scheduleData.endTime && !timeRegex.test(scheduleData.endTime))
    ) {
      return NextResponse.json(
        { message: "Invalid time format. Use 24-hour format (HH:MM)" },
        { status: 400 }
      );
    }

    // Validate start time is before end time
    const startTime = scheduleData.startTime
      ? new Date(`2000-01-01T${scheduleData.startTime}:00`)
      : null;
    const endTime = scheduleData.endTime
      ? new Date(`2000-01-01T${scheduleData.endTime}:00`)
      : null;

    if (startTime && endTime && startTime >= endTime) {
      return NextResponse.json(
        { message: "Start time must be before end time" },
        { status: 400 }
      );
    }

    // Validate stage number
    if (scheduleData.stageNumber < 1) {
      return NextResponse.json(
        { message: "Stage number must be at least 1" },
        { status: 400 }
      );
    }

    if (startTime && endTime) {
      // Check for time conflicts on the same stage and date
      const conflictingSchedule = await Schedule.findOne({
        date: scheduleDate,
        stageNumber: scheduleData.stageNumber,
        _id: { $ne: scheduleData._id }, // Exclude current schedule if updating
        $or: [
          {
            $and: [
              { startTime: { $lte: scheduleData.startTime } },
              { endTime: { $gt: scheduleData.startTime } },
            ],
          },
          {
            $and: [
              { startTime: { $lt: scheduleData.endTime } },
              { endTime: { $gte: scheduleData.endTime } },
            ],
          },
          {
            $and: [
              { startTime: { $gte: scheduleData.startTime } },
              { endTime: { $lte: scheduleData.endTime } },
            ],
          },
        ],
      }).populate("programId", "name");

      if (conflictingSchedule) {
        return NextResponse.json(
          {
            message: `Time conflict with "${conflictingSchedule.programId.name}" on Stage ${scheduleData.stageNumber} from ${formatTimeForDisplay(conflictingSchedule.startTime)} to ${formatTimeForDisplay(conflictingSchedule.endTime)}`,
          },
          { status: 409 }
        );
      }
    }

    // Ensure year is set
    if (!scheduleData.year) {
      scheduleData.year = await getYear(req);
    }

    // Create new schedule (without status field)
    const schedule = await Schedule.create({
      ...scheduleData,
      date: scheduleDate,
      isPublished: scheduleData.isPublished === "true",
    });

    // Populate the created schedule for response
    const populatedSchedule = await Schedule.findById(schedule._id)
      .populate("programId", "name type category divisionId")
      .populate({
        path: "programId",
        populate: {
          path: "divisionId",
          select: "name",
        },
      });

    // Add calculated status to response
    const responseSchedule = {
      ...populatedSchedule.toObject(),
      status: calculateScheduleStatus(
        populatedSchedule.date,
        populatedSchedule.startTime,
        populatedSchedule.endTime
      ),
    };

    return NextResponse.json(
      {
        message: "Schedule created successfully!",
        schedule: responseSchedule,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    const { ids } = data;

    if (!ids || ids.length === 0) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const scheduleId = ids[0];
    // Remove status from update data since it's not stored in database
    const { status, ...updateData } = data;
    updateData.isPublished = updateData.isPublished === "true";
    delete updateData.ids;

    // Validate program exists if programId is being updated
    if (updateData.programId) {
      const program = await Program.findById(updateData.programId);
      if (!program) {
        return NextResponse.json(
          { message: "Program not found" },
          { status: 404 }
        );
      }
    }

    // Validate date is not in the past if date is being updated
    if (updateData.date) {
      const scheduleDate = new Date(updateData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (scheduleDate < today) {
        return NextResponse.json(
          { message: "Cannot schedule events in the past" },
          { status: 400 }
        );
      }
      updateData.date = scheduleDate;
    }

    // Enhanced time format validation for 24-hour format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (updateData.startTime && !timeRegex.test(updateData.startTime)) {
      return NextResponse.json(
        { message: "Invalid start time format. Use 24-hour format (HH:MM)" },
        { status: 400 }
      );
    }
    if (updateData.endTime && !timeRegex.test(updateData.endTime)) {
      return NextResponse.json(
        { message: "Invalid end time format. Use 24-hour format (HH:MM)" },
        { status: 400 }
      );
    }

    // Get current schedule for validation
    const currentSchedule = await Schedule.findById(scheduleId);
    if (!currentSchedule) {
      return NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      );
    }

    // Prepare final values for validation
    const finalStartTime =
      updateData.startTime || currentSchedule.startTime || null;
    const finalEndTime = updateData.endTime || currentSchedule.endTime || null;
    const finalDate = updateData.date || currentSchedule.date;
    const finalStageNumber =
      updateData.stageNumber || currentSchedule.stageNumber;

    // Validate start time is before end time
    const startTime = finalStartTime
      ? new Date(`2000-01-01T${finalStartTime}:00`)
      : null;
    const endTime = finalEndTime
      ? new Date(`2000-01-01T${finalEndTime}:00`)
      : null;

    if (startTime && endTime && startTime >= endTime) {
      return NextResponse.json(
        { message: "Start time must be before end time" },
        { status: 400 }
      );
    }

    // Validate stage number
    if (finalStageNumber < 1) {
      return NextResponse.json(
        { message: "Stage number must be at least 1" },
        { status: 400 }
      );
    }

    if (startTime && endTime) {
      // Check for time conflicts on the same stage and date
      const conflictingSchedule = await Schedule.findOne({
        date: finalDate,
        stageNumber: finalStageNumber,
        _id: { $ne: scheduleId },
        $or: [
          {
            $and: [
              { startTime: { $lte: finalStartTime } },
              { endTime: { $gt: finalStartTime } },
            ],
          },
          {
            $and: [
              { startTime: { $lt: finalEndTime } },
              { endTime: { $gte: finalEndTime } },
            ],
          },
          {
            $and: [
              { startTime: { $gte: finalStartTime } },
              { endTime: { $lte: finalEndTime } },
            ],
          },
        ],
      }).populate("programId", "name");

      if (conflictingSchedule) {
        return NextResponse.json(
          {
            message: `Time conflict with "${conflictingSchedule.programId.name}" on Stage ${finalStageNumber} from ${formatTimeForDisplay(conflictingSchedule.startTime)} to ${formatTimeForDisplay(conflictingSchedule.endTime)}`,
          },
          { status: 409 }
        );
      }
    }

    // Handle bulk update for multiple schedules (only for isPublished since status is calculated)
    if (ids.length > 1) {
      const bulkUpdateData = {};
      if (updateData.isPublished !== undefined)
        bulkUpdateData.isPublished = updateData.isPublished;

      await Schedule.updateMany(
        { _id: { $in: ids } },
        { $set: bulkUpdateData }
      );
    }

    const schedule = await Schedule.findOneAndUpdate(
      { _id: scheduleId },
      { $set: updateData },
      { new: true }
    )
      .populate("programId", "name type category divisionId")
      .populate({
        path: "programId",
        populate: {
          path: "divisionId",
          select: "name",
        },
      });

    if (!schedule) {
      return NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      );
    }

    // Add calculated status to response
    const responseSchedule = {
      ...schedule.toObject(),
      status: calculateScheduleStatus(
        schedule.date,
        schedule.startTime,
        schedule.endTime
      ),
    };

    return NextResponse.json(
      { message: "Schedule updated successfully!", schedule: responseSchedule },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    const { ids } = data;

    if (!ids || ids.length === 0) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    // Get schedules to check their calculated status and published state
    const schedulesToDelete = await Schedule.find({
      _id: { $in: ids },
    }).populate("programId", "name");

    // Check if any schedules are published or ongoing (calculated)
    const protectedSchedules = schedulesToDelete.filter((schedule) => {
      const calculatedStatus = calculateScheduleStatus(
        schedule.date,
        schedule.startTime,
        schedule.endTime
      );
      return schedule.isPublished || calculatedStatus === "Ongoing";
    });

    if (protectedSchedules.length > 0) {
      const publishedNames = protectedSchedules
        .filter((s) => s.isPublished)
        .map((s) => s.programId.name);

      const ongoingNames = protectedSchedules
        .filter((s) => {
          const calculatedStatus = calculateScheduleStatus(
            s.date,
            s.startTime,
            s.endTime
          );
          return calculatedStatus === "Ongoing";
        })
        .map((s) => s.programId.name);

      let errorMessage = "Cannot delete: ";
      if (publishedNames.length > 0) {
        errorMessage += `Published schedules: ${publishedNames.join(", ")}`;
      }
      if (ongoingNames.length > 0) {
        if (publishedNames.length > 0) errorMessage += ", ";
        errorMessage += `Ongoing schedules: ${ongoingNames.join(", ")}`;
      }

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
        },
        { status: 400 }
      );
    }

    const deletedSchedules = await Schedule.deleteMany({ _id: { $in: ids } });

    if (deletedSchedules.deletedCount === 0) {
      return NextResponse.json(
        { message: "No schedules found to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: `${deletedSchedules.deletedCount} schedule(s) deleted successfully!`,
        deletedSchedules,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
