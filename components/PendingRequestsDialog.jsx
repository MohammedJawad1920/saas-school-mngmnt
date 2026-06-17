"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader } from "lucide-react";
import useCrud from "@/hooks/use-crud";
import { formatDateForDisplay } from "@/lib/utils";

const PendingRequestsDialog = ({ open, onClose, apiKey, onView }) => {
  const { useFetchItems } = useCrud("users", apiKey);

  const { data, isLoading } = useFetchItems(
    0,
    100, // Fetch up to 100 pending requests
    {
      roles: "Student",
      profileUpdateStatus: "Pending",
    },
    {
      enabled: open,
      refetchOnWindowFocus: true,
    }
  );

  const pendingStudents = useMemo(() => {
    const students = data?.users || [];
    return [...students].sort((a, b) => {
      const dateA = new Date(a.profileRequestDate || 0).getTime();
      const dateB = new Date(b.profileRequestDate || 0).getTime();
      return dateB - dateA;
    });
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pending Profile Update Requests</DialogTitle>
          <DialogDescription>
            Students who have requested profile changes
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-md mt-4">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[80px]">Sl No</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Date of Request</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : pendingStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No pending profile requests
                  </TableCell>
                </TableRow>
              ) : (
                pendingStudents.map((student, index) => (
                  <TableRow key={student._id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{student._id}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>
                      {student.profileRequestDate 
                        ? formatDateForDisplay(student.profileRequestDate)
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView(student)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PendingRequestsDialog;
