import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Result from "@/models/Result.js";
import ProgramRegistration from "@/models/ProgramRegistration.js";
import GradeScheme from "@/models/GradeScheme.js";
import Program from "@/models/Program.js";
import Division from "@/models/Division.js";
import Participant from "@/models/Participant.js";
import Team from "@/models/Team.js";
import { getYear } from "@/lib/getYear";

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
  return { grade: "-", points: 0 };
}

// Helper function to calculate average marks
function calculateAverageMarks(marksByJudges) {
  if (!marksByJudges || marksByJudges.length === 0) return 0;
  const sum = marksByJudges.reduce((acc, mark) => acc + (mark || 0), 0);
  return Math.round(sum / marksByJudges.length);
}

// ----------------------------- GET - Fetch Results -----------------------------
export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 0;
    const limit = parseInt(searchParams.get("limit")) || Infinity;
    const skip = page * limit;

    const divisionId = searchParams.get("divisionId");
    const programId = searchParams.get("programId");
    const isResultDeclared = searchParams.get("isResultDeclared");
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const rank = searchParams.get("rank");
    const resultNumber = searchParams.get("resultNumber");

    // Build query
    const query = {};
    if (programId) query.programId = programId;
    if (isResultDeclared !== null && isResultDeclared !== undefined) {
      query.isResultDeclared = isResultDeclared === "true";
    }
    if (resultNumber) query.resultNumber = parseInt(resultNumber);

    // Add year to query
    query.year = await getYear(request);

    // Get all results with program and division details
    // Use .lean() to prevent Mongoose from casting string IDs to null
    const results = await Result.find(query)
      .populate({
        path: "programId",
        select: "name type category divisionId pointScheme",
        populate: {
          path: "divisionId",
          select: "name type",
        },
      })
      .sort({ resultNumber: 1 })
      .skip(skip)
      .lean();

    // Manual fallback for participants if populate failed
    const participantIdsToFetch = new Set();
    results.forEach(res => {
      res.participants.forEach(p => {
        if (!p.id || typeof p.id === 'string') {
          const pid = p.id?._id || p.id;
          if (pid) participantIdsToFetch.add(pid);
        }
      });
    });

    let manualParticipantMap = {};
    if (participantIdsToFetch.size > 0) {
      const manualParticipants = await Participant.find({ 
        _id: { $in: Array.from(participantIdsToFetch) } 
      }).populate('teamId', 'name color').lean();
      
      manualParticipants.forEach(p => {
        manualParticipantMap[String(p._id)] = p;
      });
    }

    // Filter results based on additional criteria
    let filteredResults = results.filter((result) => {
      if (!result.programId) return false;

      const program = result.programId;
      const division = program.divisionId;

      if (divisionId && (!division || division._id.toString() !== divisionId)) {
        return false;
      }
      if (type && program.category !== type) {
        return false;
      }
      if (category && program.category !== category) {
        return false;
      }

      if (rank && !result.participants.some(p => p.rank == parseInt(rank))) {
        return false;
      }

      return true;
    });

    // Format results with detailed information
    const userIds = new Set();
    results.forEach(res => {
      res.participants.forEach(p => {
        const participantDoc = p.id && typeof p.id === 'object' ? p.id : manualParticipantMap[String(p.id?._id || p.id)];
        if (participantDoc) {
          const participantId = participantDoc._id;
          const userId = String(participantId).split("-")[0];
          userIds.add(userId);
        }
      });
    });

    const User = (await import("@/models/User.js")).default;
    const users = await User.find({ _id: { $in: Array.from(userIds) } }, "profilePic").lean();
    const userProfileMap = {};
    users.forEach(u => {
      userProfileMap[String(u._id)] = u.profilePic?.url || null;
    });

    const formattedResults = filteredResults.map((result, index) => ({
      _id: result._id,
      programId: result.programId._id,
      programName: result.programId.name,
      programType: result.programId.type,
      programCategory: result.programId.category,
      pointScheme: result.programId.pointScheme,
      divisionId: result.programId.divisionId?._id,
      divisionName: result.programId.divisionId?.name,
      participants: result.participants.map((p) => {
        const participantDoc = (p.id && typeof p.id === 'object' && p.id.name) 
          ? p.id 
          : manualParticipantMap[String(p.id?._id || p.id)];
        
        const participantId = participantDoc?._id || p.id?._id || p.id;
        const userId = participantId ? String(participantId).split("-")[0] : null;
        
        return {
          ...p,
          participantDetails: participantDoc
            ? {
                ...participantDoc,
                profilePic: userId ? userProfileMap[userId] || null : null,
              }
            : null,
        };
      }),
      winners: result.participants
        ?.filter((p) => p.rank < 4 && (!rank || p.rank == rank))
        .map((p) => {
          const pDoc = (p.id && typeof p.id === 'object' && p.id.name) 
            ? p.id 
            : manualParticipantMap[String(p.id?._id || p.id)];
          return `${p.rank}. ${pDoc?.name || "Unknown"}`;
        }),

      isResultDeclared: result.isResultDeclared,
      resultNumber: result.resultNumber,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }));

    const totalCount = filteredResults.length;

    return NextResponse.json({
      success: true,
      results: formattedResults,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        hasNextPage: skip + limit < totalCount,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch results" },
      { status: 500 }
    );
  }
}

// ----------------------------- POST - Generate Results -----------------------------
export async function POST(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { programId, userId, activeRole, userName } = body;

    if (!programId) {
      return NextResponse.json(
        { success: false, message: "Program ID is required" },
        { status: 400 }
      );
    }

    // Get grade schemes for calculation
    const gradeSchemes = await GradeScheme.find().sort({ points: -1 });

    // Get all registrations for this program
    const registrations = await ProgramRegistration.find({ programId })
      .populate("participants.id", "name age chestNumber")
      .populate("programId", "pointScheme");

    if (registrations.length === 0) {
      return NextResponse.json(
        { success: false, message: "No registrations found for this program" },
        { status: 404 }
      );
    }

    const pointsScheme =
      registrations[0].programId.pointScheme
        ?.split(",")
        .map((p) => parseInt(p)) || [];

    // Collect all participants with marks
    const allParticipants = [];
    registrations.forEach((reg) => {
      reg.participants.forEach((p) => {
        const averageMarks = calculateAverageMarks(p.marksByJudges);
        if (averageMarks > 0) {
          allParticipants.push({
            id: p.id._id,
            codeLetter: p.codeLetter,
            totalMarks: averageMarks,
            participantDetails: p.id,
          });
        }
      });
    });

    if (allParticipants.length === 0) {
      return NextResponse.json(
        { success: false, message: "No participants with marks found" },
        { status: 404 }
      );
    }

    // Sort by total marks (descending)
    allParticipants.sort((a, b) => b.totalMarks - a.totalMarks);

    // Calculate final results with grades and points
    const participants = allParticipants.map((p, index) => {
      const { grade, points } = calculateGrade(p.totalMarks, gradeSchemes);
      const positionBonus = pointsScheme[index] || 0;

      return {
        id: p.id,
        codeLetter: p.codeLetter,
        grade,
        points: points + positionBonus,
        rank: index + 1,
      };
    });

    // Create or update result
    const activeYear = await getYear(request);
    let result = await Result.findOne({ programId, year: activeYear });
    if (result) {
      result.participants = participants;
      result.isResultDeclared = false; // Reset declaration status
      await result.save();
    } else {
      result = await Result.create({
        programId,
        participants,
        isResultDeclared: false,
        year: activeYear,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Results generated successfully",
      result: {
        _id: result._id,
        programId: result.programId,
        participants: result.participants,
        isResultDeclared: result.isResultDeclared,
      },
    });
  } catch (error) {
    console.error("Error generating results:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to generate results",
      },
      { status: 500 }
    );
  }
}

// ----------------------------- PUT - Declare Results -----------------------------
export async function PUT(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { resultId, isResultDeclared } = body;

    if (!resultId) {
      return NextResponse.json(
        { success: false, message: "Result ID is required" },
        { status: 400 }
      );
    }

    // Find and update the result
    const result = await Result.findById(resultId).populate({
      path: "programId",
      select: "name type category divisionId",
      populate: {
        path: "divisionId",
        select: "name type",
      },
    });

    if (!result) {
      return NextResponse.json(
        { success: false, message: "Result not found" },
        { status: 404 }
      );
    }

    const registrations = await ProgramRegistration.find({
      programId: result.programId._id,
    });

    const newDeclarationStatus =
      isResultDeclared !== undefined
        ? isResultDeclared
        : !result.isResultDeclared;

    // Import models here to avoid circular dependency issues
    const Participant = (await import("@/models/Participant")).default;
    const Team = (await import("@/models/Team")).default;

    // Handle result number assignment
    if (newDeclarationStatus && !result.isResultDeclared) {
      // DECLARING RESULT - Find gaps first, then assign new number

      // Get all declared results sorted by result number for this year
      const activeYear = await getYear(request);
      const allDeclaredResults = await Result.find({
        resultNumber: { $ne: null },
        year: activeYear,
      })
        .sort({ resultNumber: 1 })
        .select("resultNumber");

      let nextResultNumber;

      if (allDeclaredResults.length === 0) {
        // No declared results yet, start with 1
        nextResultNumber = 1;
      } else {
        // Check for gaps in the sequence
        const resultNumbers = allDeclaredResults.map((r) => r.resultNumber);
        let foundGap = false;

        // Look for the first gap in the sequence
        for (let i = 1; i <= resultNumbers.length + 1; i++) {
          if (!resultNumbers.includes(i)) {
            nextResultNumber = i;
            foundGap = true;
            break;
          }
        }

        // If no gap found, assign the next sequential number
        if (!foundGap) {
          const maxResultNumber = Math.max(...resultNumbers);
          nextResultNumber = maxResultNumber + 1;
        }
      }

      result.resultNumber = nextResultNumber;
      result.declaredAt = new Date();
    } else if (!newDeclarationStatus && result.isResultDeclared) {
      // UNDECLARING RESULT - Remove result number (this creates a gap)
      result.resultNumber = null;
      result.declaredAt = null;
    }

    if (newDeclarationStatus) {
      // DECLARING RESULT - Update participant and team records

      // Step 1: Track team points accumulation
      const teamPointsAccumulator = new Map(); // teamId -> { stagePoints, offStagePoints }

      // Step 2: Update participants and accumulate team points
      const participantUpdatePromises = result.participants.map(
        async (participantResult) => {
          const participantId = participantResult.id;
          const programId = result.programId._id;
          const programCategory = result.programId.category;
          const programType = result.programId.type;
          const divisionType = result.programId.divisionId.type;

          // Update participant's program entry
          const participant = await Participant.findById(participantId);
          if (participant) {
            // Find existing program entry or create new one
            const existingProgramIndex = participant.programs.findIndex(
              (p) => p.id.toString() === programId.toString()
            );

            const programEntry = {
              id: programId,
              rank: participantResult.rank,
              grade: participantResult.grade,
              points: participantResult.points,
            };

            if (existingProgramIndex >= 0) {
              participant.programs[existingProgramIndex] = programEntry;
            } else {
              participant.programs.push(programEntry);
            }

            // Update stage/off-stage points for participant
            if (
              programCategory === "Stage" &&
              programType === "Individual" &&
              divisionType === "Primary"
            ) {
              participant.stagePoints =
                (participant.stagePoints || 0) + participantResult.points;
            } else if (
              programCategory === "Off-Stage" &&
              programType === "Individual" &&
              divisionType === "Primary"
            ) {
              participant.offStagePoints =
                (participant.offStagePoints || 0) + participantResult.points;
            }

            await participant.save();

            // Accumulate team points
            const teamId = participant.teamId.toString();
            if (!teamPointsAccumulator.has(teamId)) {
              teamPointsAccumulator.set(teamId, {
                stagePoints: 0,
                offStagePoints: 0,
              });
            }

            const teamAccumulator = teamPointsAccumulator.get(teamId);
            if (programCategory === "Stage") {
              teamAccumulator.stagePoints += participantResult.points;
            } else {
              teamAccumulator.offStagePoints += participantResult.points;
            }
          }
        }
      );

      // Wait for all participant updates to complete
      await Promise.all(participantUpdatePromises);

      // Step 3: Update each team only once with accumulated points
      const teamUpdatePromises = Array.from(
        teamPointsAccumulator.entries()
      ).map(async ([teamId, accumulatedPoints]) => {
        const team = await Team.findById(teamId);
        if (team) {
          team.stagePoints =
            (team.stagePoints || 0) + accumulatedPoints.stagePoints;
          team.offStagePoints =
            (team.offStagePoints || 0) + accumulatedPoints.offStagePoints;
          await team.save();
        }
      });

      await Promise.all(teamUpdatePromises);
    } else {
      // UNDECLARING RESULT - Remove participant and team records

      // Step 1: Track team points to subtract
      const teamPointsSubtractor = new Map(); // teamId -> { stagePoints, offStagePoints }

      // Step 2: Update participants and accumulate team points to subtract
      const participantUpdatePromises = result.participants.map(
        async (participantResult) => {
          const participantId = participantResult.id;
          const programId = result.programId._id;
          const programCategory = result.programId.category;
          const programType = result.programId.type;

          // Update participant's program entry
          const participant = await Participant.findById(participantId);
          if (participant) {
            // Remove the program entry
            participant.programs = participant.programs.filter(
              (p) => p.id.toString() !== programId.toString()
            );

            // Subtract stage/off-stage points from participant
            if (programCategory === "Stage" && programType === "Individual") {
              participant.stagePoints = Math.max(
                0,
                (participant.stagePoints || 0) - participantResult.points
              );
            } else if (
              programCategory === "Off-Stage" &&
              programType === "Individual"
            ) {
              participant.offStagePoints = Math.max(
                0,
                (participant.offStagePoints || 0) - participantResult.points
              );
            }

            await participant.save();

            // Accumulate team points to subtract
            const teamId = participant.teamId.toString();
            if (!teamPointsSubtractor.has(teamId)) {
              teamPointsSubtractor.set(teamId, {
                stagePoints: 0,
                offStagePoints: 0,
              });
            }

            const teamSubtractor = teamPointsSubtractor.get(teamId);
            if (programCategory === "Stage") {
              teamSubtractor.stagePoints += participantResult.points;
            } else {
              teamSubtractor.offStagePoints += participantResult.points;
            }
          }
        }
      );

      // Wait for all participant updates to complete
      await Promise.all(participantUpdatePromises);

      // Step 3: Update each team only once with subtracted points
      const teamUpdatePromises = Array.from(teamPointsSubtractor.entries()).map(
        async ([teamId, pointsToSubtract]) => {
          const team = await Team.findById(teamId);
          if (team) {
            team.stagePoints = Math.max(
              0,
              (team.stagePoints || 0) - pointsToSubtract.stagePoints
            );
            team.offStagePoints = Math.max(
              0,
              (team.offStagePoints || 0) - pointsToSubtract.offStagePoints
            );
            await team.save();
          }
        }
      );

      await Promise.all(teamUpdatePromises);
    }

    // Update result declaration status
    result.isResultDeclared = newDeclarationStatus;
    await result.save();

    await Promise.all(
      registrations.map((registration) =>
        ProgramRegistration.findByIdAndUpdate(
          registration._id,
          { isResultDeclared: newDeclarationStatus },
          { new: true }
        )
      )
    );

    return NextResponse.json({
      success: true,
      message: `Result ${result.isResultDeclared ? "declared" : "undeclared"} successfully`,
      result: {
        _id: result._id,
        programId: result.programId._id,
        programName: result.programId.name,
        isResultDeclared: result.isResultDeclared,
        resultNumber: result.resultNumber,
        declaredAt: result.declaredAt,
        updatedAt: result.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating result declaration:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update result declaration",
      },
      { status: 500 }
    );
  }
}

// ----------------------------- DELETE - Delete Results -----------------------------
export async function DELETE(request) {
  try {
    await connectToDB();

    const data = await request.json();
    const resultId = data.resultId;
    const programId = data.programId;

    let deletedCount = 0;

    if (resultId) {
      const result = await Result.findByIdAndDelete(resultId);
      deletedCount = result ? 1 : 0;
    } else if (programId) {
      const deleteResult = await Result.deleteMany({ programId });
      deletedCount = deleteResult.deletedCount;
    }

    if (deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "No results found to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `${deletedCount} result(s) deleted successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting results:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete results",
      },
      { status: 500 }
    );
  }
}
