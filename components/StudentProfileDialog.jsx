"use client";

import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Printer } from "lucide-react";
import StudentProfilePrintView from "@/components/StudentProfilePrintView";

export default function StudentProfileDialog({ student, open, onClose, classes, batches, apiKey }) {
    if (!student) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden rounded-xl shadow-2xl flex flex-col">
                <div className="flex items-center justify-between p-3 border-b bg-card no-print">
                    <DialogTitle className="text-lg font-bold">
                        Student Profile Summary: {student.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={handlePrint}
                            className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs bg-black text-white hover:bg-black/90 px-4 h-8"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onClose(false)}
                            className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs border-slate-200 h-8 px-4"
                        >
                            Close
                        </Button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/10">
                    <StudentProfilePrintView 
                        student={student} 
                        apiKey={apiKey} 
                        classes={classes} 
                        batches={batches}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
