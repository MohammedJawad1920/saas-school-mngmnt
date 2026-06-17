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
import { Input } from "@/components/ui/input";
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

const Books = ({ initialBooks = [], apiKey, activeRole }) => {
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterName, setFilterName] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [previewItem, setPreviewItem] = useState(null);

  const { useFetchItems, useAddItem, useUpdateItem, useDeleteItem } = useCrud("books", apiKey);
  const fetchBooksQuery = useFetchItems(
    null,
    null,
    { 
      name: filterName, 
      course: filterCourse === "all" ? "" : filterCourse 
    },
    { initialData: { books: initialBooks } }
  );
  const addBook = useAddItem();
  const updateBook = useUpdateItem();
  const deleteBook = useDeleteItem();

  const [editingBook, setEditingBook] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCourse, setEditCourse] = useState("");

  const handleEditClick = (book) => {
    setEditingBook(book);
    setEditName(book.name);
    setEditCourse(book.course);
  };

  const handleUpdate = async () => {
    if (!editName || !editCourse) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      await updateBook.mutateAsync({
        data: {
          _id: editingBook._id,
          name: editName,
          course: editCourse,
        },
      });
      toast.success("Updated successfully");
      setEditingBook(null);
      await fetchBooksQuery.refetch();
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
    if (!file || !course || !name) {
      toast.error("Please fill all fields and select a file.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
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

      await addBook.mutateAsync({
        name,
        course,
        fileUrl,
        fileName: file.name,
      });

      await fetchBooksQuery.refetch();

      setName("");
      setCourse("");
      setFile(null);

      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (book, downloadId) => {
    setDownloadingId(downloadId);
    try {
      let url = book.fileUrl;
      // Force PDF transformation only for Cloudinary images (avoiding raw files like .docx)
      if (url.includes("cloudinary.com") && url.includes("/image/upload/") && !url.toLowerCase().endsWith(".pdf")) {
        const parts = url.split("/upload/");
        if (parts.length === 2) {
          url = `${parts[0]}/upload/f_pdf/${parts[1].replace(/\.[^/.]+$/, ".pdf")}`;
        }
      }


      const filename = `${book.name}.pdf`.replace(/\s+/g, "_");
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

  const handleDelete = async (book) => {
    setDeletingId(book._id);
    try {
      await deleteBook.mutateAsync({
        data: {
          _id: book._id,
          fileUrl: book.fileUrl,
        },
      });
      await fetchBooksQuery.refetch();
      toast.success("File deleted successfully!");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(`Failed to delete file: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredBooks = useMemo(() => {
    return fetchBooksQuery.data?.books || [];
  }, [fetchBooksQuery.data]);

  const courses = ["BSIc(5 Years)", "HSIc(3 Years)", "HSIc(2 Years)"];

  return (
    <>
      <Header title="BOOKS" subTitle="Download and upload books" />
      <div className="container mx-auto p-4 space-y-6">
        {activeRole === "College Admin" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Book</CardTitle>
              <CardDescription>Upload a new book for a course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <MultiSelect
                    id="course"
                    value={course}
                    onValueChange={setCourse}
                    options={courses.map((c) => ({ value: c, label: c }))}
                    placeholder="Select or type a course"
                    freeSolo
                    multiSelect={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Book Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter book name"
                  />
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
            <CardTitle>Available Books ({filteredBooks.length})</CardTitle>
            <CardDescription>Filter and download books</CardDescription>
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
                <Label>Filter by Book Name</Label>
                <Input
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Search by book name..."
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Book Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        No books available
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBooks.map((book) => (
                      <TableRow key={book._id}>
                        <TableCell>{book.course}</TableCell>
                        <TableCell>{book.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              title="Preview"
                              onClick={() => setPreviewItem({ url: book.fileUrl, title: `${book.name} — ${book.course}` })}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(book, book._id)}
                              disabled={downloadingId === book._id}
                            >
                              {downloadingId === book._id ? (
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
                                  onClick={() => handleEditClick(book)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={deletingId === book._id}
                                    >
                                      {deletingId === book._id ? (
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
                                        {book.fileName}" ({book.name}). This
                                        action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(book)}
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
      <Dialog open={!!editingBook} onOpenChange={(open) => !open && setEditingBook(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
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
              <Label>Book Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter book name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBook(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateBook.isPending}>
              {updateBook.isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
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

export default Books;
