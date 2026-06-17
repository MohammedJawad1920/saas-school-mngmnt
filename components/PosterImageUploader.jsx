"use client";
import * as React from "react";
import { Image, Loader, Upload, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Extract the public ID from a Cloudinary URL
const getPublicIdFromUrl = (url) => {
    if (!url || !url.includes("cloudinary.com")) return null;

    try {
        // Parse URL to extract the public ID
        const urlParts = url.split("/");
        const uploadIndex = urlParts.findIndex((part) => part === "upload");

        if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
            // Extract folder and filename
            const publicIdParts = urlParts.slice(uploadIndex + 1);
            // Remove file extension and transformation parameters
            const publicId = publicIdParts.join("/").split(".")[0].split("?")[0];
            return publicId;
        }
    } catch (error) {
        console.error("Error extracting public ID:", error);
    }

    return null;
};

// File validation configurations
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

const PosterImageUploader = ({
    value,
    onChange,
    disabled,
    apiKey,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
}) => {
    const [preview, setPreview] = React.useState(value?.url || "");
    const [loading, setLoading] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [publicId, setPublicId] = React.useState(
        value?.publicId || getPublicIdFromUrl(value?.url) || null
    );
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [localPreview, setLocalPreview] = React.useState(null);
    const fileInputRef = React.useRef(null);
    const progressIntervalRef = React.useRef(null);

    React.useEffect(() => {
        if (value?.url && value?.url !== preview) {
            setPreview(value?.url);
            setPublicId(
                value?.publicId ? value?.publicId : getPublicIdFromUrl(value?.url)
            );
        }
    }, [value?.url]);

    React.useEffect(() => {
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

    const validateFile = (file) => {
        if (file.size > maxFileSize) {
            return {
                valid: false,
                error: `File size exceeds ${(maxFileSize / (1024 * 1024)).toFixed(1)}MB limit`,
            };
        }
        if (!allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: `File type not supported. Please upload ${allowedTypes
                    .map((type) => type.split("/")[1])
                    .join(", ")}`,
            };
        }
        return { valid: true };
    };

    const simulateUploadProgress = () => {
        setUploadProgress(0);
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }
        progressIntervalRef.current = setInterval(() => {
            setUploadProgress((prev) => {
                const increment = Math.random() * 10;
                return Math.min(prev + increment, 90);
            });
        }, 300);
    };

    const uploadToCloudinary = async (file) => {
        try {
            setLoading(true);
            simulateUploadProgress();

            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload", {
                method: "POST",
                headers: {
                    "api-key": apiKey,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message;
                } catch {
                    errorMessage = errorText || `Server returned ${response.status}`;
                }
                console.error("Upload server error:", response.status, errorMessage);
                throw new Error(errorMessage || "Failed to upload image");
            }

            const data = await response.json();

            setUploadProgress(100);
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
            setTimeout(() => setUploadProgress(0), 1000);

            // Map /api/upload response (snake_case) to our component state (camelCase)
            return {
                url: data.secure_url,
                publicId: data.public_id
            };
        } catch (error) {
            toast.error(`Upload failed: ${error.message}`);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const deleteFromCloudinary = async (publicIdToDelete) => {
        // /api/upload DELETE method might not exist or might valid logic
        // Let's check /api/cloudinary DELETE which IS standard?
        // /api/upload/route.js DOES NOT HAVE DELETE.
        // So we must use /api/cloudinary for deletion if we want to delete.
        // But /api/cloudinary routes to standard cloudinary destroy.
        // Check if we can use it.
        try {
            setLoading(true);
            const response = await fetch("/api/cloudinary", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "api-key": apiKey,
                },
                body: JSON.stringify({ publicId: publicIdToDelete }),
            });

            if (!response.ok) {
                // We fail gracefully on delete usually, or log it
                console.warn("Failed to delete image from cloud");
            }
            return true;
        } catch (error) {
            console.error("Error deleting image:", error);
            // We don't block UI on delete failure usually
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileValidation = validateFile(file);
        if (!fileValidation.valid) {
            toast.error(fileValidation.error);
            return;
        }

        setSelectedFile(file);
        const objectUrl = URL.createObjectURL(file);
        setLocalPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error("Please select an image first");
            return;
        }

        try {
            const result = await uploadToCloudinary(selectedFile);
            setPreview(result.url);
            setPublicId(result.publicId);
            onChange({ url: result.url, publicId: result.publicId });
            setSelectedFile(null);
            setLocalPreview(null);
            toast.success("Image uploaded successfully!");
        } catch (error) {
            console.error("Upload failed", error);
        }
    };

    const handleRemoveImage = async () => {
        if (localPreview && !publicId) {
            setLocalPreview(null);
            setSelectedFile(null);
            return;
        }
        if (publicId) {
            await deleteFromCloudinary(publicId);
            setPreview("");
            setPublicId(null);
            onChange({ url: "", publicId: null });
            toast.success("Image removed");
        } else {
            setPreview("");
            onChange({});
        }
    };

    const handleSelectClick = () => {
        if (!disabled && !loading) {
            fileInputRef.current.click();
        }
    };

    const displayedImage = localPreview || preview;

    return (
        <div className="flex flex-col items-center gap-3">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept={allowedTypes.join(",")}
                className="hidden"
                disabled={disabled || loading}
            />

            <div
                className={`w-full h-48 border-2 border-dashed rounded-md flex flex-col items-center justify-center relative ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} transition-colors`}
            >
                {loading && (
                    <div className="absolute inset-0 backdrop-blur-md bg-white/50 border border-white/30 shadow-lg flex flex-col items-center justify-center z-10">
                        <Loader className="animate-spin text-primary mb-4" size={32} />
                        {uploadProgress > 0 && (
                            <div className="w-2/3 flex flex-col items-center">
                                <Progress value={uploadProgress} className="h-2 w-full mb-2" />
                                <span className="text-xs text-gray-800 font-medium">{Math.round(uploadProgress)}%</span>
                            </div>
                        )}
                    </div>
                )}

                {displayedImage ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img
                            src={displayedImage}
                            alt="Image preview"
                            className="max-h-full max-w-full object-contain"
                        />
                        {!disabled && !loading && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ) : (
                    <div onClick={handleSelectClick} className="text-center p-4">
                        <Image className="h-10 w-10 text-gray-400 mb-2 mx-auto" />
                        <p className="text-sm text-gray-500">Click to select an image</p>
                    </div>
                )}
            </div>

            <div className="flex gap-2 w-full">
                {selectedFile && !loading && (
                    <Button type="button" className="flex-1" onClick={handleUpload} disabled={disabled}>
                        <Upload className="h-4 w-4 mr-2" /> Upload Image
                    </Button>
                )}
                {(displayedImage || (!displayedImage && !selectedFile)) && !loading && (
                    <Button type="button" variant={displayedImage ? "outline" : "default"} className="flex-1" onClick={handleSelectClick} disabled={disabled}>
                        <Image className="h-4 w-4 mr-2" /> {displayedImage ? "Change Image" : "Select Image"}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default PosterImageUploader;
