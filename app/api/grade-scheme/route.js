import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import GradeScheme from "@/models/GradeScheme";
import { getYear } from "@/lib/getYear";

// Helper function to validate mark range
function validateMarkRange(markRange) {
  const match = markRange.match(/^(\d+)-(\d+)$/);
  if (!match) {
    return { isValid: false, error: "Mark range must be in format 'min-max'" };
  }

  const [, minStr, maxStr] = match;
  const min = parseInt(minStr);
  const max = parseInt(maxStr);

  if (min >= max) {
    return {
      isValid: false,
      error: "Minimum mark must be less than maximum mark",
    };
  }

  if (min < 0 || max > 100) {
    return { isValid: false, error: "Marks must be between 0 and 100" };
  }

  return { isValid: true, min, max };
}

// Helper function to check for overlapping ranges
async function checkForOverlappingRanges(markRange, activeYear, excludeId = null) {
  const validation = validateMarkRange(markRange);
  if (!validation.isValid) {
    return { hasOverlap: false, error: validation.error };
  }

  const { min: newMin, max: newMax } = validation;

  // Get all existing grade schemes for this year
  const query = { year: activeYear };
  if (excludeId) query._id = { $ne: excludeId };
  const existingSchemes = await GradeScheme.find(query, { markRange: 1 });

  for (const scheme of existingSchemes) {
    const existingValidation = validateMarkRange(scheme.markRange);
    if (!existingValidation.isValid) continue;

    const { min: existingMin, max: existingMax } = existingValidation;

    // Check for overlap: two ranges overlap if max of one is >= min of other and vice versa
    if (newMin <= existingMax && newMax >= existingMin) {
      return {
        hasOverlap: true,
        error: `Mark range overlaps with existing range: ${scheme.markRange}`,
      };
    }
  }

  return { hasOverlap: false };
}

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

    if (filterParams?._id) {
      query._id = filterParams._id;
    }
    if (filterParams.markRange) {
      query.markRange = { $regex: filterParams.markRange, $options: "i" };
    }
    if (filterParams.grade) {
      query.grade = { $regex: filterParams.grade, $options: "i" };
    }
    if (filterParams.points) {
      query.points = parseFloat(filterParams.points);
    }

    // Add year to query
    query.year = await getYear(req);

    // Execute query with pagination
    const gradeSchemes = await GradeScheme.find(query, projections)
      .skip(page * limit)
      .limit(limit)
      .sort({ points: -1, markRange: 1 }) // Sort by points descending, then by mark range
      .collation({ locale: "en_US", numericOrdering: true });

    // Get total count for pagination info
    const total = await GradeScheme.countDocuments(query);

    return NextResponse.json(
      {
        gradeSchemes: gradeSchemes,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Grade schemes fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching grade schemes:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    // Validate required fields
    const requiredFields = ["markRange", "grade", "points"];
    for (const field of requiredFields) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ""
      ) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate mark range format and logic
    const markRangeValidation = validateMarkRange(data.markRange);
    if (!markRangeValidation.isValid) {
      return NextResponse.json(
        { message: markRangeValidation.error },
        { status: 400 }
      );
    }

    // Validate points
    if (data.points < 0) {
      return NextResponse.json(
        { message: "Points must be a positive value" },
        { status: 400 }
      );
    }

    // Check for overlapping ranges
    const activeYear = await getYear(req);
    const overlapCheck = await checkForOverlappingRanges(data.markRange, activeYear);
    if (overlapCheck.hasOverlap) {
      return NextResponse.json(
        { message: overlapCheck.error },
        { status: 400 }
      );
    }

    // Create new grade scheme
    const gradeScheme = await GradeScheme.create({
      markRange: data.markRange.trim(),
      grade: data.grade.trim().toUpperCase(),
      points: parseFloat(data.points),
      year: activeYear,
    });

    return NextResponse.json(
      { message: "Grade scheme created successfully!", gradeScheme },
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

    const gradeSchemeId = ids[0];
    const updateData = { ...data };
    delete updateData.ids;

    // Validate mark range if being updated
    if (updateData.markRange) {
      const markRangeValidation = validateMarkRange(updateData.markRange);
      if (!markRangeValidation.isValid) {
        return NextResponse.json(
          { message: markRangeValidation.error },
          { status: 400 }
        );
      }

      // Check for overlapping ranges (excluding current scheme)
      const activeYear = await getYear(req);
      const overlapCheck = await checkForOverlappingRanges(
        updateData.markRange,
        activeYear,
        gradeSchemeId
      );
      if (overlapCheck.hasOverlap) {
        return NextResponse.json(
          { message: overlapCheck.error },
          { status: 400 }
        );
      }
    }

    // Validate points if being updated
    if (updateData.points !== undefined && updateData.points < 0) {
      return NextResponse.json(
        { message: "Points must be a positive value" },
        { status: 400 }
      );
    }

    // Prepare update data
    const finalUpdateData = {};
    if (updateData.markRange) {
      finalUpdateData.markRange = updateData.markRange.trim();
    }
    if (updateData.grade) {
      finalUpdateData.grade = updateData.grade.trim().toUpperCase();
    }
    if (updateData.points !== undefined) {
      finalUpdateData.points = parseFloat(updateData.points);
    }

    const gradeScheme = await GradeScheme.findOneAndUpdate(
      { _id: gradeSchemeId },
      { $set: finalUpdateData },
      { new: true, runValidators: true }
    );

    if (!gradeScheme) {
      return NextResponse.json(
        { message: "Grade scheme not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Grade scheme updated successfully!", gradeScheme },
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

    const gradeSchemesToDelete = await GradeScheme.find({
      _id: { $in: ids },
    }).select("_id markRange grade");

    const gradeSchemeIds = gradeSchemesToDelete.map((gs) => gs._id);

    if (gradeSchemeIds.length === 0) {
      return NextResponse.json(
        { message: "No grade schemes found to delete" },
        { status: 404 }
      );
    }

    const deletedGradeSchemes = await GradeScheme.deleteMany({
      _id: { $in: ids },
    });

    if (deletedGradeSchemes.deletedCount === 0) {
      return NextResponse.json(
        { message: "No grade schemes found to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: `${deletedGradeSchemes.deletedCount} grade scheme(s) deleted successfully!`,
        deletedGradeSchemes,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
