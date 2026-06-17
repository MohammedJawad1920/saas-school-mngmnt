"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Save, Loader, Edit } from "lucide-react";
import { toast } from "sonner";
import ImageUploader from "./ImageUploader";
import PosterImageUploader from "./PosterImageUploader";
import { useRouter } from "next/navigation";

export default function CommitteePostersSettings({
    initialPosters = [],
    apiKey,
    type = "org", // org | spark
}) {
    const [posters, setPosters] = React.useState(initialPosters);
    const [year, setYear] = React.useState(`${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`);
    const [newPosterImage, setNewPosterImage] = React.useState({});
    const [loading, setLoading] = React.useState(false);
    const [editingYear, setEditingYear] = React.useState(null);
    const router = useRouter();

    // Sort posters by year descending for display (string comparison)
    const sortedPosters = React.useMemo(() => {
        return [...posters].sort((a, b) => {
            // Try to sort by the first 4 chars if year starts with number
            return b.year.toString().localeCompare(a.year.toString());
        });
    }, [posters]);

    const handleAddPoster = () => {
        if (!year) {
            toast.error("Please enter a year");
            return;
        }
        if (!newPosterImage || !newPosterImage.url) {
            toast.error("Please upload a poster image");
            return;
        }

        if (posters.some((p) => p.year === year)) {
            toast.error(`A poster for year ${year} already exists`);
            return;
        }

        const newPoster = {
            year: year,
            poster: newPosterImage,
        };

        setPosters((prev) => [...prev, newPoster]);
        setNewPosterImage({});
        setYear(`${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`);
        toast.success("Poster added to list (unsaved)");
    };

    const handleEditPoster = (poster) => {
        setYear(poster.year);
        setNewPosterImage(poster.poster);
        setEditingYear(poster.year);
    };

    const handleDeletePoster = async (yearToDelete) => {
        if (!window.confirm("Are you sure you want to delete this poster?")) return;
        // Optimistically update UI
        const updatedPosters = posters.filter((p) => p.year !== yearToDelete);
        setPosters(updatedPosters);

        try {
            // No global loading spinner to avoid blocking "Add" UI, but we could add one if desired.
            // Using toast promises or just awaiting silently with error handling.

            const response = await fetch("/api/settings", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "api-key": apiKey,
                },
                body: JSON.stringify({
                    committeePosters: updatedPosters,
                    type: type,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Delete Poster Error Response:", errorText);
                let errorMessage;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorJson.error || "Unknown server error";
                } catch {
                    errorMessage = errorText || `Server returned ${response.status}`;
                }
                throw new Error(errorMessage);
            }

            toast.success("Poster deleted permanently");
            router.refresh();
        } catch (error) {
            console.error("Error deleting poster:", error);
            toast.error("Failed to delete poster");
            // Revert state on error (simple reload or re-fetch would be better, but for now reverting via props or just leaving it)
            // Ideally we'd keep the previous state to revert to.
            setPosters(posters); // Reset to state before deletion attempt (closure captures 'posters')
        }
    };

    const handleSave = async () => {
        let finalPosters = [...posters];
        let resetForm = false;

        // If inputs are present, try to include them
        if (year && newPosterImage?.url) {
            if (editingYear) {
                if (year !== editingYear && posters.some((p) => p.year === year)) {
                    toast.error(`A poster for year ${year} already exists`);
                    return;
                }
                finalPosters = finalPosters.map((p) => (p.year === editingYear ? { year, poster: newPosterImage } : p));
                resetForm = true;
            } else {
                if (posters.some((p) => p.year === year)) {
                    toast.error(`A poster for year ${year} already exists`);
                    return;
                }
                finalPosters.push({
                    year: year,
                    poster: newPosterImage,
                });
                resetForm = true;
            }
        } else if (year || newPosterImage?.url) {
            // Optional: warn if partially filled. 
            // For now let's strict validate only if they clicked save and something is there.
            if (year && !newPosterImage?.url) {
                toast.error("Please upload an image for the new poster");
                return;
            }
            if (!year && newPosterImage?.url) {
                toast.error("Please enter a year for the new poster");
                return;
            }
        }

        try {
            console.log("Saving Committee Posters Payload:", {
                committeePosters: finalPosters,
                type: type,
            });

            const response = await fetch("/api/settings", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "api-key": apiKey,
                },
                body: JSON.stringify({
                    committeePosters: finalPosters,
                    type: type,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Server Error Response:", errorText);
                let errorMessage;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorJson.error || "Unknown server error";
                } catch {
                    errorMessage = errorText || `Server returned ${response.status}`;
                }
                throw new Error(errorMessage);
            }

            setPosters(finalPosters);
            if (resetForm) {
                setNewPosterImage({});
                setYear(`${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`);
                setEditingYear(null);
            }
            toast.success("Committee posters saved successfully!");
            router.refresh();
        } catch (error) {
            console.error("Error saving posters:", error);
            toast.error(`Failed to save: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Committee Posters</CardTitle>
                <CardDescription>
                    Manage committee posters for different years. The latest one will be
                    displayed on the dashboard.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Add / Update Poster */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                            <h3 className="font-medium text-sm">Add / Update Poster</h3>

                            {/* Image Uploader First */}
                            <div>
                                <Label className="mb-2 block">Poster Image</Label>
                                <PosterImageUploader
                                    value={newPosterImage}
                                    onChange={setNewPosterImage}
                                    apiKey={apiKey}
                                    maxFileSize={5 * 1024 * 1024}
                                />
                            </div>

                            {/* Year and Save Button Side by Side */}
                            <div className="flex items-end gap-3">
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="year">Year (e.g. 2026-27)</Label>
                                    <Input
                                        id="year"
                                        type="text"
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                        placeholder="Enter Year"
                                    />
                                </div>
                                {editingYear && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setEditingYear(null);
                                            setYear(`${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`);
                                            setNewPosterImage({});
                                        }}
                                        disabled={loading}
                                        type="button"
                                    >
                                        Cancel
                                    </Button>
                                )}
                                <Button onClick={handleSave} disabled={loading} type="button">
                                    {loading ? <Loader className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                    {editingYear ? "Update" : "Save"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Existing Posters */}
                    <div className="lg:col-span-7 space-y-4">
                        <h3 className="font-medium text-sm">Existing Posters</h3>

                        {sortedPosters.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg border-dashed">
                                No posters added yet.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-4">
                                {sortedPosters.map((item) => (
                                    <div
                                        key={item.year}
                                        className="relative group border rounded-lg overflow-hidden bg-card w-24 flex-shrink-0 shadow-sm"
                                    >
                                        <div className="p-1 text-center font-bold bg-muted text-xs truncate">
                                            {item.year}
                                        </div>
                                        <div className="aspect-[3/4] relative">
                                            <img
                                                src={item.poster.url}
                                                alt={`Committee Poster ${item.year}`}
                                                className="object-cover w-full h-full"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => handleEditPoster(item)}
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => handleDeletePoster(item.year)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
