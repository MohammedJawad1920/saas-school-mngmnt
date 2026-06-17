import { NextResponse } from "next/server";
import User from "@/models/User";
import dbConnect from "@/lib/db";
import Batch from "@/models/Batch";

export async function GET(request) {
    try {
        await dbConnect();
        
        const { searchParams } = new URL(request.url);
        const batchId = searchParams.get("batchId");
        const batchName = searchParams.get("batchName") || "Batch";
        
        const type = searchParams.get("type") || "gb";
        const statusFilter = type === "alumni" ? "Dropped Out" : { $in: ["Active", "Graduated"] };

        if (!batchId) {
            return new NextResponse("batchId is required", { status: 400 });
        }
        
        await Batch.init();

        const users = await User.find({
            "roles": "Student",
            "studentSpecificField.batchId": batchId,
            "studentSpecificField.status": statusFilter
        }).populate("studentSpecificField.batchId", "name");
        
        if (!users || users.length === 0) {
            return new NextResponse("No students found in this batch", { status: 404 });
        }
        
        let vcardData = "";
        
        for (const user of users) {
            // Student Contact
            const studentNumber = user.contactNumber ? String(user.contactNumber).replace(/[^\d+]/g, '') : "";
            const altNumber = user.alternativeNumber ? String(user.alternativeNumber).replace(/[^\d+]/g, '') : "";
            const bName = user.studentSpecificField?.batchId?.name || "";
            const studentName = user.name || "Student";
            const name = bName ? `${bName} - ${studentName}` : studentName;
            
            const hasValidStudentNumber = studentNumber && studentNumber !== "-";
            const hasValidAltNumber = altNumber && altNumber !== "-";
            
            if (hasValidStudentNumber || hasValidAltNumber) {
                vcardData += `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\n`;
                if (hasValidStudentNumber) vcardData += `TEL;TYPE=CELL:${studentNumber}\n`;
                if (hasValidAltNumber) vcardData += `TEL;TYPE=HOME:${altNumber}\n`;
                vcardData += `END:VCARD\n`;
            }
            
            // Guardian Contact
            const rawGuardianNumber = user.studentSpecificField?.guardianContactNumber || user.guardianContactNumber;
            const guardianNumber = rawGuardianNumber ? String(rawGuardianNumber).replace(/[^\d+]/g, '') : "";
            const rawGuardianAltNumber = user.studentSpecificField?.guardianAlternativeNumber || user.guardianAlternativeNumber;
            const guardianAltNumber = rawGuardianAltNumber ? String(rawGuardianAltNumber).replace(/[^\d+]/g, '') : "";
            const relationship = user.studentSpecificField?.relationship || "Guardian";
            const contactName = `${name} (${relationship})`;
            
            const hasValidGuardianNumber = guardianNumber && guardianNumber !== "-";
            const hasValidGuardianAltNumber = guardianAltNumber && guardianAltNumber !== "-";
            
            if (hasValidGuardianNumber || hasValidGuardianAltNumber) {
                vcardData += `BEGIN:VCARD\nVERSION:3.0\nFN:${contactName}\n`;
                if (hasValidGuardianNumber) vcardData += `TEL;TYPE=CELL:${guardianNumber}\n`;
                if (hasValidGuardianAltNumber) vcardData += `TEL;TYPE=HOME:${guardianAltNumber}\n`;
                vcardData += `END:VCARD\n`;
            }
        }
        
        if (!vcardData) {
            return new NextResponse("No valid phone numbers found for students in this batch", { status: 404 });
        }
        
        return new Response(vcardData, {
            headers: {
                "Content-Type": "text/x-vcard",
                "Content-Disposition": `attachment; filename="${batchName}_Contacts.vcf"`,
            },
        });
    } catch (error) {
        console.error("Error generating batch vcard:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
