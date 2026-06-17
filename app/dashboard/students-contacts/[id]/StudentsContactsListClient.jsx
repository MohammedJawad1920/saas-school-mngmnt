"use client";

import { useState, useEffect } from "react";
import TableComponent from "@/components/TableComponent";
import { Pencil, Phone, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// --- Edit Contact Dialog ---
function EditContactDialog({ open, onOpenChange, student, onSaved }) {
  const [contactNumber, setContactNumber] = useState("");
  const [alternativeNumber, setAlternativeNumber] = useState("");
  const [guardianContactNumber, setGuardianContactNumber] = useState("");
  const [guardianAlternativeNumber, setGuardianAlternativeNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync field values whenever the student changes (different student selected)
  useEffect(() => {
    setContactNumber(student?.contactNumber || "");
    setAlternativeNumber(student?.alternativeNumber || "");
    setGuardianContactNumber(student?.guardianContactNumber || "");
    setGuardianAlternativeNumber(student?.guardianAlternativeNumber || "");
  }, [student]);

  const handleOpenChange = (isOpen) => {
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        ids: [student._id],
        contactNumber: contactNumber.trim(),
        alternativeNumber: alternativeNumber.trim(),
        guardianContactNumber: guardianContactNumber.trim(),
        guardianAlternativeNumber: guardianAlternativeNumber.trim(),
      };

      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update");

      toast.success(`Contact details updated for ${student.name}`);
      onSaved(student._id, {
        contactNumber: contactNumber.trim(),
        alternativeNumber: alternativeNumber.trim(),
        guardianContactNumber: guardianContactNumber.trim(),
        guardianAlternativeNumber: guardianAlternativeNumber.trim(),
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Failed to update contact details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-blue-500" />
            Edit Contact Numbers
          </DialogTitle>
          {student?.name && (
            <p className="text-sm text-muted-foreground pt-1">{student.name}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Student ── */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Student
          </p>

          <div className="space-y-2">
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input
              id="contactNumber"
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. +91 9876543210"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alternativeNumber">Alternative Number</Label>
            <Input
              id="alternativeNumber"
              type="tel"
              value={alternativeNumber}
              onChange={(e) => setAlternativeNumber(e.target.value)}
              placeholder="e.g. +91 9876543210"
            />
          </div>

          {/* ── Guardian ── */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pt-1">
            <Users className="w-3.5 h-3.5" /> Guardian
          </p>

          <div className="space-y-2">
            <Label htmlFor="guardianContactNumber">Contact Number</Label>
            <Input
              id="guardianContactNumber"
              type="tel"
              value={guardianContactNumber}
              onChange={(e) => setGuardianContactNumber(e.target.value)}
              placeholder="e.g. +91 9876543210"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardianAlternativeNumber">Alternative Number</Label>
            <Input
              id="guardianAlternativeNumber"
              type="tel"
              value={guardianAlternativeNumber}
              onChange={(e) => setGuardianAlternativeNumber(e.target.value)}
              placeholder="e.g. +91 9876543210"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={saving}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Component ---
export default function StudentsContactsListClient({
  initialData,
  apiKey,
  printTitle,
  isCollegeAdmin,
}) {
  const [data, setData] = useState(initialData || []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleEditClick = (student, e) => {
    e.stopPropagation();
    setSelectedStudent(student);
    setDialogOpen(true);
  };

  // Update local state immediately so the table reflects saved changes
  const handleSaved = (userId, updates) => {
    setData((prev) =>
      prev.map((row) =>
        String(row._id) === String(userId) ? { ...row, ...updates } : row
      )
    );
  };

  // Single edit button column — placed right after Name
  const editColumn = {
    id: "edit_contacts",
    header: "Edit",
    width: 52,
    maxWidth: 52,
    minWidth: 52,
    cell: ({ row }) => (
      <button
        onClick={(e) => handleEditClick(row.original, e)}
        title="Edit contact numbers"
        className="flex items-center justify-center w-8 h-8 rounded-md text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 transition-colors print:hidden"
      >
        <Pencil className="w-4 h-4" />
      </button>
    ),
  };

  const columns = [
    {
      accessorKey: "serialNo",
      header: "Sl.No",
      type: ["serialNo"],
      width: 60,
      maxWidth: 60,
      minWidth: 60,
    },
    {
      accessorKey: "profilePic",
      header: "Image",
      type: ["avatar"],
      width: 70,
      maxWidth: 70,
      minWidth: 70,
    },
    { accessorKey: "name", header: "Name" },

    // ── Single edit button immediately after Name (College Admin only) ──
    ...(isCollegeAdmin ? [editColumn] : []),

    // ── Student contact ──
    {
      accessorKey: "contactNumber",
      header: "Contact",
      type: ["contactWithAlternative"],
    },
    {
      id: "contactNumber_save",
      accessorKey: "contactNumber",
      header: "Save",
      type: ["saveContactAction"],
      width: 40,
      maxWidth: 40,
      minWidth: 40,
    },
    {
      id: "contactNumber_wa",
      accessorKey: "contactNumber",
      header: "WA",
      type: ["whatsappAction"],
      width: 40,
      maxWidth: 40,
      minWidth: 40,
    },
    {
      id: "contactNumber_call",
      accessorKey: "contactNumber",
      header: "Call",
      type: ["callAction"],
      width: 40,
      maxWidth: 40,
      minWidth: 40,
    },

    // ── Guardian ──
    {
      accessorKey: "guardianName",
      header: "Guardian Name",
      type: ["guardianNameWithRelationship"],
    },
    {
      accessorKey: "guardianContactNumber",
      header: "Guardian Contact",
      type: ["guardianContactWithAlternative"],
    },
    {
      id: "guardianContactNumber_save",
      accessorKey: "guardianContactNumber",
      header: "Save",
      type: ["saveGuardianContactAction"],
      width: 40,
      maxWidth: 40,
      minWidth: 40,
    },
    {
      id: "guardianContactNumber_wa",
      accessorKey: "guardianContactNumber",
      header: "WA",
      type: ["whatsappAction"],
      width: 40,
      maxWidth: 40,
      minWidth: 40,
    },
    {
      id: "guardianContactNumber_call",
      accessorKey: "guardianContactNumber",
      header: "Call",
      type: ["callAction"],
      width: 40,
      maxWidth: 40,
      minWidth: 40,
    },
  ];

  return (
    <>
      <TableComponent
        data={data}
        columnsConfig={columns}
        printTitle={printTitle}
        apiKey={apiKey}
        showCsvBtn={true}
      />

      {isCollegeAdmin && selectedStudent && (
        <EditContactDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          student={selectedStudent}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
