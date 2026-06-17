"use client";
import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Upload, Download as DownloadIcon, Loader, Trash2, Pencil, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Header from "./Header";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { saveAs } from "file-saver";
import { MultiSelect } from "@/components/ui/multi-select";

const Syllabus = ({ initialSyllabus = [], apiKey, activeRole }) => {
  const [year, setYear] = useState(null);
  const [course, setCourse] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterYear, setFilterYear] = useState("all");
  const [filterCourse, setFilterCourse] = useState("all");
  const [previewItem, setPreviewItem] = useState(null);

  const { useFetchItems, useAddItem, useUpdateItem, useDeleteItem } = useCrud(
    "syllabus",
    apiKey
  );
  const fetchSyllabusQuery = useFetchItems(
    null,
    null,
    { 
      year: filterYear === "all" ? "" : filterYear, 
      course: filterCourse === "all" ? "" : filterCourse 
    },
    { initialData: { syllabuses: initialSyllabus } }
  );
  const addSyllabus = useAddItem();
  const updateSyllabus = useUpdateItem();
  const deleteSyllabus = useDeleteItem();

  const [editingSyllabus, setEditingSyllabus] = useState(null);
  const [editCourse, setEditCourse] = useState("");
  const [editYear, setEditYear] = useState("");

  const handleEditClick = (syllabus) => {
    setEditingSyllabus(syllabus);
    setEditCourse(syllabus.course);
    setEditYear(syllabus.year);
  };

  const handleUpdate = async () => {
    if (!editCourse || !editYear) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      await updateSyllabus.mutateAsync({
        data: {
          _id: editingSyllabus._id,
          course: editCourse,
          year: editYear,
        },
      });
      toast.success("Updated successfully");
      setEditingSyllabus(null);
      await fetchSyllabusQuery.refetch();
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Failed to update");
    }
  };

  const onDrop = (acceptedFiles) => {
    setFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        [".pptx"],
    },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file || !course || !year) {
      toast.error("Please fill all fields and select a file.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Upload via /api/upload
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "api-key": apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Upload failed with status: ${response.status}`
        );
      }

      const data = await response.json();
      const fileUrl = data.secure_url;

      // Save syllabus metadata to database
      await addSyllabus.mutateAsync({
        course,
        year,
        fileUrl,
        fileName: file.name,
      });

      // Refresh syllabus list
      await fetchSyllabusQuery.refetch();

      // Reset form
      setCourse("");
      setYear(null);
      setFile(null);

      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileUrl, course, year, downloadId) => {
    setDownloadingId(downloadId);
    try {
      let url = fileUrl;
      // Force PDF transformation only for Cloudinary images (avoiding raw files like .docx)
      if (url.includes("cloudinary.com") && url.includes("/image/upload/") && !url.toLowerCase().endsWith(".pdf")) {
        const parts = url.split("/upload/");
        if (parts.length === 2) {
          url = `${parts[0]}/upload/f_pdf/${parts[1].replace(/\.[^/.]+$/, ".pdf")}`;
        }
      }


      const filename = `${course}_Year${year}_Syllabus.pdf`.replace(/\s+/g, "_");

      const proxyUrl = `/api/download-file?url=${encodeURIComponent(
        url
      )}&filename=${encodeURIComponent(filename)}`;


      const response = await fetch(proxyUrl, {
        headers: {
          "api-key": apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to download file");
      }

      const blob = await response.blob();
      saveAs(blob, filename);

      toast.success("Download started!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(`Failed to download file: ${error.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (syllabus) => {
    setDeletingId(syllabus._id);
    try {
      await deleteSyllabus.mutateAsync({
        data: {
          _id: syllabus._id,
          fileUrl: syllabus.fileUrl,
        },
      });

      await fetchSyllabusQuery.refetch();
      toast.success("File deleted successfully!");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(`Failed to delete file: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSyllabus = useMemo(() => {
    return fetchSyllabusQuery.data?.syllabuses || [];
  }, [fetchSyllabusQuery.data]);

  const years = [1, 2, 3, 4, 5];
  const courses = ["BSIc(5 Years)", "HSIc(3 Years)", "HSIc(2 Years)"];

  return (
    <>
      <Header
        title="SYLLABUS"
        subTitle="Download and upload syllabus"
      />
      <div className="container mx-auto p-4 space-y-6">
        {activeRole === "College Admin" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Syllabus</CardTitle>
              <CardDescription>
                Upload syllabus for students to download
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <MultiSelect
                    id="course"
                    value={course}
                    onValueChange={setCourse}
                    options={[
                      { value: "BSIc(5 Years)", label: "BSIc(5 Years)" },
                      { value: "HSIc(3 Years)", label: "HSIc(3 Years)" },
                      { value: "HSIc(2 Years)", label: "HSIc(2 Years)" },
                    ]}
                    placeholder="Select or type a course"
                    freeSolo
                    multiSelect={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Select id="year" value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="h-5 w-5" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {isDragActive
                        ? "Drop the file here..."
                        : "Drag 'n' drop a file here, or click to select one"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports: PDF, DOC, DOCX, PPT, PPTX
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleUpload}
                disabled={uploading || !file}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              Available Syllabuses ({filteredSyllabus.length})
            </CardTitle>
            <CardDescription>
              Filter and download syllabus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Filter by Course</Label>
                <Select value={filterCourse} onValueChange={setFilterCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Filter by Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        Year {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSyllabus.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        No syllabus available
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSyllabus.map((syllabus) => (
                      <TableRow key={syllabus._id}>
                        <TableCell>{syllabus.course}</TableCell>
                        <TableCell>{syllabus.year}</TableCell>
                        <TableCell>{syllabus.fileName}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              title="Preview"
                              onClick={() => setPreviewItem({ url: syllabus.fileUrl, title: `${syllabus.course} Year ${syllabus.year} Syllabus` })}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDownload(
                                  syllabus.fileUrl,
                                  syllabus.course,
                                  syllabus.year,
                                  syllabus._id
                                )
                              }
                              disabled={downloadingId === syllabus._id}
                            >
                              {downloadingId === syllabus._id ? (
                                <>
                                  <Loader className="h-4 w-4 sm:mr-2 animate-spin" />
                                  <span className="hidden sm:inline">Downloading...</span>
                                </>
                              ) : (
                                <>
                                  <DownloadIcon className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Download</span>
                                </>
                              )}
                            </Button>
                            {activeRole === "College Admin" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditClick(syllabus)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={deletingId === syllabus._id}
                                    >
                                      {deletingId === syllabus._id ? (
                                        <Loader className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Are you sure?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the file "
                                        {syllabus.fileName}" from {syllabus.course}{" "}
                                        Year {syllabus.year}. This action cannot be
                                        undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(syllabus)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={!!editingSyllabus} onOpenChange={(open) => !open && setEditingSyllabus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Syllabus</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={editCourse} onValueChange={setEditCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={String(editYear)} onValueChange={setEditYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSyllabus(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateSyllabus.isPending}>
              {updateSyllabus.isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* PDF Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <DialogTitle className="text-sm font-semibold truncate">{previewItem?.title || "Preview"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {previewItem?.url && (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewItem.url)}&embedded=true`}
                className="w-full h-full border-0"
                title={previewItem?.title || "Document Preview"}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Syllabus;