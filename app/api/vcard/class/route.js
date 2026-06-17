import { NextResponse } from "next/server";
import User from "@/models/User";
import dbConnect from "@/lib/db";
import Batch from "@/models/Batch"; // ensure Batch is registered

export async function GET(request) {
    try {
        await dbConnect();
        
        const { searchParams } = new URL(request.url);
        const classId = searchParams.get("classId");
        const className = searchParams.get("className") || "Class";
        
        if (!classId) {
            return new NextResponse("classId is required", { status: 400 });
        }
        
        // Ensure Batch model is loaded before populate
        await Batch.init();

        const users = await User.find({
            "roles": "Student",
            "studentSpecificField.classId": classId,
            "studentSpecificField.status": "Active"
        }).populate("studentSpecificField.batchId", "name");
        
        if (!users || users.length === 0) {
            return new NextResponse("No students found in this class", { status: 404 });
        }
        
        let vcardData = "";
        
        for (const user of users) {
            // Student Contact
            const studentNumber = user.contactNumber ? String(user.contactNumber).replace(/[^\d+]/g, '') : "";
            const altNumber = user.alternativeNumber ? String(user.alternativeNumber).replace(/[^\d+]/g, '') : "";
            const batchName = user.studentSpecificField?.batchId?.name || "";
            const studentName = user.name || "Student";
            const name = batchName ? `${batchName} - ${studentName}` : studentName;
            
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
            return new NextResponse("No valid phone numbers found for students in this class", { status: 404 });
        }
        
        return new Response(vcardData, {
            headers: {
                "Content-Type": "text/x-vcard",
                "Content-Disposition": `attachment; filename="${className}_Contacts.vcf"`,
            },
        });
    } catch (error) {
        console.error("Error generating class vcard:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
