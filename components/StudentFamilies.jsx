"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, UserPlus, Users, Loader, CheckCircle2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import Header from "./Header";
import useCrud from "@/hooks/use-crud";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const StudentFamilies = ({ apiKey }) => {
  const queryClient = useQueryClient();
  const [batches, setBatches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [students, setStudents] = useState([]);
  const [familyDetails, setFamilyDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [familyOtherDetails, setFamilyOtherDetails] = useState("");
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const searchInputRef = useRef(null);
  const hasLoadedRef = useRef({});

  // Form state for new family member
  const [formData, setFormData] = useState({
    position: "",
    name: "",
    age: "",
    education: "",
    status: "",
    mobileNumber: "",
    otherDetails: "",
  });

  const { useFetchItems, useUpdateItem } = useCrud("users", apiKey);
  const updateStudent = useUpdateItem();

  useEffect(() => {
    fetch("/api/batches")
      .then((res) => res.json())
      .then((data) => setBatches(data.batches || []))
      .catch((err) => console.error("Error fetching batches:", err));

    fetch("/api/classes")
      .then((res) => res.json())
      .then((data) => setClasses(data.classes || []))
      .catch((err) => console.error("Error fetching classes:", err));
  }, []);

  const studentsQuery = useFetchItems(0, 1000, {
    roles: "Student",
    batchId: (selectedBatch && selectedBatch !== "all") ? selectedBatch : undefined,
    classId: (selectedClass && selectedClass !== "all") ? selectedClass : undefined,
    status: (selectedClass && selectedClass !== "all") ? "Active" : undefined,
  }, {
    enabled: true // Always enabled to show all students if no filter
  });

  useEffect(() => {
    if (studentsQuery.data?.users) {
      setStudents(studentsQuery.data.users);
    }
  }, [studentsQuery.data]);

  useEffect(() => {
    if (showSuccessDialog) {
      const timer = setTimeout(() => {
        setShowSuccessDialog(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessDialog]);

  useEffect(() => {
    setLoading(studentsQuery.isLoading);
  }, [studentsQuery.isLoading]);

  // Loads data when student is selected OR when students data first arrives (e.g. page refresh).
  // Uses a ref to avoid overwriting local edits when React Query refetches after a save.
  useEffect(() => {
    if (selectedStudentId) {
      const student = students.find((s) => s._id === selectedStudentId);
      if (student && !hasLoadedRef.current[selectedStudentId]) {
        // First time data is available for this student — load from server
        setFamilyDetails(student.familyDetails || []);
        setFamilyOtherDetails(student.familyOtherDetails || "");
        hasLoadedRef.current[selectedStudentId] = true;
      }
    } else {
      // No student selected — clear everything and reset ref
      setFamilyDetails([]);
      setFamilyOtherDetails("");
      hasLoadedRef.current = {};
    }
  }, [selectedStudentId, students]);

  useEffect(() => {
    if (isSelectOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isSelectOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePositionChange = (value) => {
    setFormData((prev) => ({ ...prev, position: value }));
  };

  const addFamilyMember = async () => {
    if (!formData.position || !formData.name) {
      toast.error("Please fill in at least Position and Name");
      return;
    }

    if (!selectedStudentId) {
      toast.error("Please select a student first");
      return;
    }

    setSaving(true);
    try {
      const newMember = { ...formData, age: formData.age ? parseInt(formData.age) : undefined };
      let updatedDetails;
      
      if (isEditing && selectedIndices.length > 0) {
        updatedDetails = [...familyDetails];
        updatedDetails[selectedIndices[0]] = newMember;
      } else {
        updatedDetails = [...familyDetails, newMember];
      }
      
      // Update local state only (Add to List)
      setFamilyDetails(updatedDetails);
      setFormData({
        position: "",
        name: "",
        age: "",
        education: "",
        status: "",
        mobileNumber: "",
        otherDetails: "",
      });
      setIsEditing(false);
      setSelectedIndices([]);
      toast.success("Added to list. Remember to save changes.");
    } catch (error) {
      console.error("Error adding to list:", error);
      toast.error("Failed to add to list");
    } finally {
      setSaving(false);
    }
  };

  const saveToDatabase = async () => {
    if (!selectedStudentId) {
      toast.error("Please select a student first");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/kinship", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          familyDetails: familyDetails,
          familyOtherDetails: familyOtherDetails,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Save failed");
      }

      // Invalidate queries to trigger a background refetch
      queryClient.invalidateQueries({ queryKey: ["users"] });
      
      // Update local students state manually for instant feedback before refetch completes
      setStudents(prev => prev.map(s => 
        s._id === selectedStudentId 
          ? { ...s, familyDetails: [...familyDetails], familyOtherDetails: familyOtherDetails }
          : s
      ));

      setShowSuccessDialog(true);
      setIsFormOpen(false);
      setSelectedIndices([]);
      // Keep hasLoadedRef true to prevent the refetch from overwriting our fresh local state
      hasLoadedRef.current[selectedStudentId] = true;
    } catch (error) {
      console.error("Error saving kinship data:", error);
      toast.error("Failed to save: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddForm = () => {
    setFormData({
      position: "",
      name: "",
      age: "",
      education: "",
      status: "",
      mobileNumber: "",
    });
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = () => {
    if (selectedIndices.length === 0) return;
    const member = familyDetails[selectedIndices[0]];
    setFormData({
      position: member.position,
      name: member.name,
      age: member.age || "",
      education: member.education || "",
      status: member.status || "",
      mobileNumber: member.mobileNumber || "",
      otherDetails: member.otherDetails || "",
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleDeleteMember = () => {
    if (selectedIndices.length === 0 || !selectedStudentId) return;
    setShowDeleteDialog(true);
  };

  const confirmDeleteMember = async () => {
    setShowDeleteDialog(false);

    setSaving(true);
    try {
      const updatedDetails = familyDetails.filter((_, i) => !selectedIndices.includes(i));
      
      const res = await fetch("/api/kinship", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          familyDetails: updatedDetails,
          familyOtherDetails: familyOtherDetails,
        }),
      });

      if (!res.ok) throw new Error("Delete failed");

      setFamilyDetails(updatedDetails);
      setSelectedIndices([]);
      toast.success("Family member(s) removed");
    } catch (error) {
      console.error("Error removing family member:", error);
      toast.error("Failed to remove family member(s)");
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIndices.length === familyDetails.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(familyDetails.map((_, i) => i));
    }
  };

  const toggleSelectRow = (index) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(prev => prev.filter(i => i !== index));
    } else {
      setSelectedIndices(prev => [...prev, index]);
    }
  };

  const removeFamilyMember = (index) => {
    if (!selectedStudentId) return;
    
    setSelectedIndices([index]);
    setShowDeleteDialog(true);
  };

  const selectedStudent = useMemo(() => {
    return students.find((s) => s._id === selectedStudentId);
  }, [students, selectedStudentId]);

  const lastUpdated = selectedStudent?.updatedAt 
    ? new Date(selectedStudent.updatedAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : null;



  const filteredStudents = useMemo(() => {
    const list = !searchTerm
      ? students
      : students.filter(s =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s._id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    return [...list].sort((a, b) => {
      const aVal = String(a.studentSpecificField?.admissionNumber ?? a.admissionNumber ?? a._id ?? "");
      const bVal = String(b.studentSpecificField?.admissionNumber ?? b.admissionNumber ?? b._id ?? "");
      return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [students, searchTerm]);

  return (
    <div className="space-y-3 pb-10 px-0 sm:px-0">
      <Header 
        title="KINSHIP" 
        subTitle="Manage students' family background details" 
        icon={<Users className="h-5 w-5 text-muted-foreground" />}
      />

      <Card className="border-primary/10 shadow-sm">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Batch</Label>
              <Select value={selectedBatch} onValueChange={(val) => {
                setSelectedBatch(val);
                setSelectedClass("all");
                setSelectedStudentId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map((batch) => (
                    <SelectItem key={batch._id} value={batch._id}>
                      {batch.name} {batch.academicYear ? `(${batch.academicYear})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={(val) => {
                setSelectedClass(val);
                setSelectedStudentId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Student</Label>
              <Popover open={isSelectOpen} onOpenChange={setIsSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isSelectOpen}
                    className="w-full justify-between font-normal hover:bg-background"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Loading Students...</span>
                      </div>
                    ) : selectedStudentId ? (
                      <span className="truncate">
                        {students.find((s) => s._id === selectedStudentId)?.name} ({selectedStudentId})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select Student</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search student..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No students found</CommandEmpty>
                      <CommandGroup>
                        {students.map((student) => (
                          <CommandItem
                            key={student._id}
                            value={`${student.name} ${student._id}`}
                            onSelect={() => {
                              setSelectedStudentId(student._id);
                              setIsSelectOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedStudentId === student._id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {student.name} ({student._id})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedStudentId && (
        <div className="space-y-4">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between py-3 relative">
              <div>
                <CardTitle className="text-lg">Family Details</CardTitle>
                <CardDescription className="text-xs">
                  Background information for {selectedStudent?.name}
                  {lastUpdated && (
                    <span className="md:hidden block mt-0.5 text-blue-600 font-semibold italic">
                      Last updated: {lastUpdated}
                    </span>
                  )}
                </CardDescription>
              </div>

              {/* Centered date for desktop view */}
              <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {lastUpdated && (
                  <span className="flex items-center gap-1.5 bg-white/50 border border-gray-200 px-3 py-1 rounded-full shadow-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                    Last Updated: {lastUpdated}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleOpenAddForm} 
                    className="bg-primary hover:bg-primary/90 h-8 gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Add</span>
                  </Button>
                  {selectedIndices.length > 0 && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleOpenEditForm} 
                        disabled={selectedIndices.length !== 1}
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 h-8 gap-2"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">Edit</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleDeleteMember} 
                        disabled={saving}
                        className="border-red-200 text-red-600 hover:bg-red-50 h-8 gap-2"
                      >
                        {saving ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        <span className="hidden md:inline">Delete</span>
                      </Button>
                    </>
                  )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">
                        <input 
                          type="checkbox" 
                          checked={familyDetails.length > 0 && selectedIndices.length === familyDetails.length}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                      </TableHead>
                      <TableHead className="w-16">Sl.No</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-16 text-center">Age</TableHead>
                      <TableHead>Education</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mobile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {familyDetails.length > 0 ? (
                      familyDetails.map((member, index) => (
                        <TableRow 
                          key={index} 
                          className={`hover:bg-muted/50 transition-colors cursor-pointer ${selectedIndices.includes(index) ? 'bg-primary/5' : ''}`}
                          onClick={() => toggleSelectRow(index)}
                        >
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedIndices.includes(index)}
                              onChange={() => toggleSelectRow(index)}
                              className="h-4 w-4 cursor-pointer accent-primary"
                            />
                          </TableCell>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{member.position}</TableCell>
                          <TableCell className="uppercase">{member.name}</TableCell>
                          <TableCell className="text-center">{member.age || "-"}</TableCell>
                          <TableCell>{member.education || "-"}</TableCell>
                          <TableCell>{member.status || "-"}</TableCell>
                          <TableCell>{member.mobileNumber || "-"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          No family details added yet. Click "Add" to begin.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Other Details — directly below the family table */}
          <Card className="border-border shadow-sm bg-gray-50/50">
            <CardHeader className="py-3 px-4 border-b bg-gray-100/70">
              <CardTitle className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                Other Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {familyOtherDetails ? (
                <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {familyOtherDetails}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No general notes added for this family. Use the "Add" button to add notes.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-full h-full md:w-[95vw] lg:max-w-5xl md:h-auto md:max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-none md:rounded-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Family Member" : "Add Family Members"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update family information for this student." : "Enter family details for the selected student."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 md:space-y-6 py-2 md:py-4">
            <div className="space-y-3 md:space-y-4 bg-muted/20 p-3 md:p-4 rounded-lg border border-dashed border-primary/20">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="space-y-2 md:col-span-3">
                  <Label>Position</Label>
                  <Select value={formData.position} onValueChange={handlePositionChange}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Father">Father</SelectItem>
                      <SelectItem value="Mother">Mother</SelectItem>
                      <SelectItem value="Brother">Brother</SelectItem>
                      <SelectItem value="Sister">Sister</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-6">
                  <Label>Name</Label>
                  <Input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    placeholder="Full Name" 
                    className="uppercase bg-background"
                  />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label>Age</Label>
                  <Input 
                    type="number" 
                    name="age" 
                    value={formData.age} 
                    onChange={handleInputChange} 
                    placeholder="Age" 
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="space-y-2 md:col-span-3">
                  <Label>Mobile</Label>
                  <Input 
                    name="mobileNumber" 
                    value={formData.mobileNumber} 
                    onChange={handleInputChange} 
                    placeholder="Mobile" 
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label>Education</Label>
                  <Input 
                    name="education" 
                    value={formData.education} 
                    onChange={handleInputChange} 
                    placeholder="Education" 
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label>Status</Label>
                  <Input 
                    name="status" 
                    value={formData.status} 
                    onChange={handleInputChange} 
                    placeholder="Status" 
                    className="bg-background"
                  />
                </div>

                <div className="flex items-center md:col-span-2">
                  <Button 
                    onClick={addFamilyMember} 
                    className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 h-10 px-2"
                    variant="outline"
                    disabled={saving}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {isEditing ? "Update" : "Add"}
                  </Button>
                </div>
              </div>
            </div>

            {familyDetails.length > 0 && (
              <div className="space-y-0">
                <Card className="border shadow-none overflow-hidden bg-card">
                  <div className="bg-muted/40 px-3 py-2 border-b">
                    <h4 className="text-sm font-semibold text-primary">Members in this list</h4>
                  </div>
                  
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[300px]">
                    <Table className="text-xs min-w-full relative">
                      <TableHeader className="bg-muted/20 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="h-8 py-0">Position</TableHead>
                          <TableHead className="h-8 py-0">Name</TableHead>
                          <TableHead className="h-8 py-0">Age</TableHead>
                          <TableHead className="h-8 py-0">Education</TableHead>
                          <TableHead className="h-8 py-0">Mobile</TableHead>
                          <TableHead className="h-8 py-0">Status</TableHead>
                          <TableHead className="h-8 py-0 w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {familyDetails.map((member, index) => (
                          <TableRow key={index} className="hover:bg-muted/30 border-b last:border-0">
                            <TableCell className="py-1.5">{member.position}</TableCell>
                            <TableCell className="py-1.5 font-medium text-blue-600 uppercase">{member.name}</TableCell>
                            <TableCell className="py-1.5">{member.age || "-"}</TableCell>
                            <TableCell className="py-1.5">{member.education || "-"}</TableCell>
                            <TableCell className="py-1.5 whitespace-nowrap">{member.mobileNumber || "-"}</TableCell>
                            <TableCell className="py-1.5">{member.status || "-"}</TableCell>
                            <TableCell className="py-1.5 text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setDeleteIndex(index);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y max-h-[350px] overflow-y-auto">
                    {familyDetails.map((member, index) => (
                      <div key={index} className="p-3 space-y-2 bg-background">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">{member.position}</p>
                            <p className="text-sm font-bold text-blue-600 uppercase">{member.name}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                            onClick={() => {
                              setDeleteIndex(index);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Age:</span>
                            <span>{member.age || "-"}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Mobile:</span>
                            <span className="truncate">{member.mobileNumber || "-"}</span>
                          </div>
                          <div className="flex gap-2 col-span-2">
                            <span className="text-muted-foreground">Edu:</span>
                            <span className="truncate">{member.education || "-"}</span>
                          </div>
                          <div className="flex gap-2 col-span-2">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="truncate">{member.status || "-"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-primary font-semibold">Other Details</Label>
              <Textarea 
                value={familyOtherDetails} 
                onChange={(e) => setFamilyOtherDetails(e.target.value)} 
                placeholder="Additional notes for the whole family..." 
                className="bg-background min-h-[60px] md:min-h-[100px]"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-2 md:mt-4 border-t pt-3 md:pt-4">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={saveToDatabase} disabled={saving} className="bg-green-600 hover:bg-green-700 min-w-[100px]">
              {saving ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Family Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the member from your current list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteIndex !== null) {
                  setFamilyDetails(prev => prev.filter((_, i) => i !== deleteIndex));
                  setDeleteIndex(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="w-[90%] sm:w-full sm:max-w-md rounded-xl">
          <DialogHeader className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
              Saved Successfully
            </DialogTitle>
            <DialogDescription className="text-lg">
              Family details for {selectedStudent?.name} have been updated.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
              <Trash2 className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-xl font-bold">
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedIndices.length > 1 ? `${selectedIndices.length} members` : "this family member"}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="w-24">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteMember} className="w-24">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentFamilies;
