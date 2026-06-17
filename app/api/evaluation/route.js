import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import ProgramRegistration from "@/models/ProgramRegistration";
import GradeScheme from "@/models/GradeScheme";
import Result from "@/models/Result";

// Helper function to calculate grade from marks
function calculateGrade(totalMarks, gradeSchemes) {
  for (const scheme of gradeSchemes) {
    const [min, max] = scheme.markRange.split("-").map(Number);
    if (totalMarks >= min && totalMarks <= max) {
      return {
        grade: scheme.grade,
        points: scheme.points,
      };
    }
  }
  return { grade: "F", points: 0 };
}

// Helper function to calculate average marks
function calculateAverageMarks(marksByJudges) {
  if (!marksByJudges || marksByJudges.length === 0) return 0;
  const sum = marksByJudges.reduce((acc, mark) => acc + (mark || 0), 0);
  return Math.round(sum / marksByJudges.length);
}

// ----------------------------- GET -----------------------------
export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;

    const divisionId = searchParams.get("divisionId");
    const programId = searchParams.get("programId");
    const teamId = searchParams.get("teamId");
    const type = searchParams.get("type");
    const category = searchParams.get("category");

    // Build registration query
    const regQuery = {};
    if (teamId) regQuery.teamId = teamId;
    if (programId) regQuery.programId = programId;

    // Get all registrations with program, division, and participant details
    const registrations = await ProgramRegistration.find(regQuery)
      .populate({
        path: "programId",
        select: "name type category divisionId pointScheme",
        populate: {
          path: "divisionId",
          select: "name type",
        },
      })
      .populate("teamId", "name")
      .populate({
        path: "participants.id",
        select: "name age chestNumber",
      })
      .sort({ "programId.name": 1 });

    // Filter registrations based on criteria
    let filteredRegistrations = registrations.filter((reg) => {
      if (!reg.programId) return false;

      const program = reg.programId;
      const division = program.divisionId;

      if (divisionId && (!division || division._id.toString() !== divisionId)) {
        return false;
      }
      if (type && program.type !== type) {
        return false;
      }
      if (category && program.category !== category) {
        return false;
      }

      return true;
    });

    // Return registrations with detailed participant and marks information
    const formattedRegistrations = filteredRegistrations.map((reg) => ({
      _id: reg._id,
      programId: reg.programId._id,
      programName: reg.programId.name,
      programType: reg.programId.type,
      programCategory: reg.programId.category,
      pointScheme: reg.programId.pointScheme,
      divisionId: reg.programId.divisionId?._id,
      divisionName: reg.programId.divisionId?.name,
      teamId: reg.teamId?._id,
      teamName: reg.teamId?.name,
      participants: reg.participants.map((p) => ({
        ...p.toObject(),
        participantDetails: p.id,
        averageMarks: calculateAverageMarks(p.marksByJudges),
      })),
      status: reg.status,
      createdAt: reg.createdAt,
      updatedAt: reg.updatedAt,
    }));

    const totalCount = formattedRegistrations.length;
    const paginatedRegistrations = formattedRegistrations.slice(
      skip,
      skip + limit
    );

    return NextResponse.json({
      success: true,
      registrations: paginatedRegistrations,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        hasNextPage: skip + limit < totalCount,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching marks data:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch marks data" },
      { status: 500 }
    );
  }
}

// ----------------------------- PUT - Update Marks by Participant ID (FIXED) -----------------------------
export async function PUT(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { updates, userId, activeRole, userName } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, message: "Updates are required" },
        { status: 400 }
      );
    }

    // Validate each update
    for (const update of updates) {
      if (!update.registrationId || !update.participantUpdates) {
        return NextResponse.json(
          {
            success: false,
            message: "Registration ID and participant updates are required",
          },
          { status: 400 }
        );
      }
    }

    // Get grade schemes for calculation
    const gradeSchemes = await GradeScheme.find().sort({ points: -1 });

    // Keep track of programIds affected by updates
    const affectedProgramIds = new Set();

    // FIXED: Process updates with proper array handling
    const updatePromises = updates.map(async (update) => {
      const { registrationId, participantUpdates } = update;

      // Get the registration
      const registration = await ProgramRegistration.findById(registrationId);
      if (!registration) {
        throw new Error(`Registration not found: ${registrationId}`);
      }

      affectedProgramIds.add(registration.programId.toString());

      console.log(`Processing registration ${registrationId}:`, {
        totalParticipants: registration.participants.length,
        participantUpdates,
      });

      // Process each participant update using participant ID matching
      const bulkOps = [];

      for (const participantUpdate of participantUpdates) {
        // FIXED: Handle both single mark updates and complete marks array updates
        const { participantId, marks, judgeIndex, marksByJudges } =
          participantUpdate;

        // Find the participant by ID in the registration
        const participantIndex = registration.participants.findIndex(
          (p) => p.id.toString() === participantId.toString()
        );

        if (participantIndex === -1) {
          console.warn(
            `Participant ${participantId} not found in registration ${registrationId}`
          );
          continue;
        }

        // Get current participant data
        const currentParticipant = registration.participants[participantIndex];

        let finalMarksByJudges;

        if (marksByJudges) {
          // Frontend sent complete marks array (preferred method)
          finalMarksByJudges = marksByJudges;
        } else if (marks !== undefined && judgeIndex !== undefined) {
          // Fallback: single mark update (legacy support)
          let currentMarksByJudges = currentParticipant.marksByJudges || [];

          // Ensure the array is long enough for the judge index
          while (currentMarksByJudges.length <= judgeIndex) {
            currentMarksByJudges.push(0);
          }

          // Update the specific judge's marks
          currentMarksByJudges[judgeIndex] = marks;
          finalMarksByJudges = currentMarksByJudges;
        } else {
          console.warn(`Invalid participant update data for ${participantId}`);
          continue;
        }

        // Calculate new average marks from all valid marks
        const validMarks = finalMarksByJudges.filter(
          (m) => m !== undefined && m !== null && m > 0
        );
        const averageMarks =
          validMarks.length > 0
            ? Math.round(
                validMarks.reduce((sum, mark) => sum + mark, 0) /
                  validMarks.length
              )
            : 0;

        console.log(`Updating participant ${participantId}:`, {
          participantIndex,
          finalMarksByJudges,
          newAverageMarks: averageMarks,
        });

        // Create bulk operation to update this specific participant
        bulkOps.push({
          updateOne: {
            filter: {
              _id: registrationId,
              [`participants.${participantIndex}.id`]: participantId,
            },
            update: {
              $set: {
                [`participants.${participantIndex}.marksByJudges`]:
                  finalMarksByJudges,
                [`participants.${participantIndex}.totalMarks`]: averageMarks,
              },
            },
          },
        });
      }

      if (bulkOps.length === 0) {
        console.log(`No update operations for registration ${registrationId}`);
        return { modifiedCount: 0 };
      }

      console.log(
        `Executing ${bulkOps.length} bulk operations for ${registrationId}`
      );

      // Execute all bulk operations for this registration
      const result = await ProgramRegistration.bulkWrite(bulkOps);
      return { modifiedCount: result.modifiedCount };
    });

    const results = await Promise.all(updatePromises);
    const successCount = results.reduce((sum, r) => sum + r.modifiedCount, 0);

    console.log(`Updated ${successCount} participant marks successfully`);

    // ----------------------------- Auto Generate Results -----------------------------
    const resultPromises = Array.from(affectedProgramIds).map(
      async (programId) => {
        const registrations = await ProgramRegistration.find({
          programId,
        })
          .populate("participants.id", "name age chestNumber")
          .populate("programId", "pointScheme");

        if (registrations.length === 0) return null;

        const pointsScheme =
          registrations[0].programId.pointScheme
            ?.split(",")
            .map((p) => parseInt(p)) || [];

        const allParticipants = [];
        registrations.forEach((reg) => {
          reg.participants.forEach((p) => {
            if (p.totalMarks > 0) {
              allParticipants.push({
                id: p.id._id,
                codeLetter: p.codeLetter,
                totalMarks: p.totalMarks,
                participantDetails: p.id,
              });
            }
          });
        });

        if (allParticipants.length === 0) return null;

        allParticipants.sort((a, b) => b.totalMarks - a.totalMarks);

        const participants = allParticipants.map((p, index) => {
          const { grade, points } = calculateGrade(p.totalMarks, gradeSchemes);
          return {
            id: p.id,
            codeLetter: p.codeLetter,
            grade,
            points: points + (pointsScheme[index] ? pointsScheme[index] : 0),
            rank: index + 1,
          };
        });

        let result = await Result.findOne({ programId });
        if (result) {
          result.participants = participants;
          result.isResultDeclared = false;
          await result.save();
        } else {
          result = await Result.create({
            programId,
            participants,
            isResultDeclared: false,
          });
        }

        return result;
      }
    );

    const generatedResults = (await Promise.all(resultPromises)).filter(
      Boolean
    );

    return NextResponse.json({
      success: true,
      message: `${successCount} participant marks updated and results regenerated`,
      updatedCount: successCount,
      generatedResultsCount: generatedResults.length,
    });
  } catch (error) {
    console.error("Error updating marks & generating results:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update marks & generate results",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const data = await req.json();
    const { programId } = data;

    if (!programId) {
      return NextResponse.json(
        { success: false, message: "Program ID is required" },
        { status: 400 }
      );
    }

    const registrations = await ProgramRegistration.find({
      programId,
    });

    if (registrations.length === 0) {
      return NextResponse.json(
        { success: false, message: "No registrations found for this program" },
        { status: 404 }
      );
    }

    await ProgramRegistration.updateMany(
      { programId },
      {
        $set: {
          "participants.$[].marksByJudges": [],
          "participants.$[].totalMarks": 0,
        },
      }
    );

    await Result.deleteOne({ programId });

    return NextResponse.json({
      success: true,
      message: "Marks deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting marks:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete marks",
      },
      { status: 500 }
    );
  }
}
