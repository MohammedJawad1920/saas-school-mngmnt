"use client";
import * as React from "react";
import { Image, Loader, Upload, X, Trash2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

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

function parseAspectRatio(aspectRatioStr) {
  const [w, h] = aspectRatioStr.split(":").map(Number);
  return w / h;
}

// File validation configurations
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

const ImageUploader = ({
  value,
  onChange,
  disabled,
  apiKey,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  aspectRatio = null,
  minWidth = null,
  minHeight = null,
  maxWidth = null,
  maxHeight = null,
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

  // Image Cropper States
  const [cropImageSrc, setCropImageSrc] = React.useState("");
  const [isCropOpen, setIsCropOpen] = React.useState(false);
  const [originalFile, setOriginalFile] = React.useState(null);

  const [cropBox, setCropBox] = React.useState({ x: 0, y: 0, w: 200, h: 200 });
  const [dragMode, setDragMode] = React.useState(null); // 'move', 'n', 's', 'e', 'w'
  const dragStart = React.useRef({ x: 0, y: 0 });
  const startBox = React.useRef({ x: 0, y: 0, w: 200, h: 200 });
  const [renderedDims, setRenderedDims] = React.useState({ width: 0, height: 0 });
  const imgRef = React.useRef(null);

  const handleImageLoad = (e) => {
    const img = e.currentTarget;
    const rw = img.width;
    const rh = img.height;
    setRenderedDims({ width: rw, height: rh });
    
    // Center a rectangle crop box inside the image boundaries (80% of width and height)
    const w = rw * 0.8;
    const h = rh * 0.8;
    setCropBox({
      x: (rw - w) / 2,
      y: (rh - h) / 2,
      w: w,
      h: h,
    });
  };

  const handleDragStart = (e, mode) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    setDragMode(mode);
    dragStart.current = { x: clientX, y: clientY };
    startBox.current = { ...cropBox };
  };

  const handleDragMove = React.useCallback((e) => {
    if (!dragMode) return;
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    
    const { width: rw, height: rh } = renderedDims;
    
    if (dragMode === "move") {
      // Pan crop box
      const newX = Math.max(0, Math.min(startBox.current.x + dx, rw - cropBox.w));
      const newY = Math.max(0, Math.min(startBox.current.y + dy, rh - cropBox.h));
      setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
    } else {
      // Resize crop box from 4 sides freely
      let newX = cropBox.x;
      let newY = cropBox.y;
      let newW = cropBox.w;
      let newH = cropBox.h;
      
      if (dragMode === "s") {
        // Dragging bottom side down/up
        newH = Math.max(50, Math.min(startBox.current.h + dy, rh - startBox.current.y));
      } else if (dragMode === "n") {
        // Dragging top side up/down (bottom edge is stationary)
        newY = Math.max(0, Math.min(startBox.current.y + dy, startBox.current.y + startBox.current.h - 50));
        newH = (startBox.current.y + startBox.current.h) - newY;
      } else if (dragMode === "e") {
        // Dragging right side right/left
        newW = Math.max(50, Math.min(startBox.current.w + dx, rw - startBox.current.x));
      } else if (dragMode === "w") {
        // Dragging left side left/right (right edge is stationary)
        newX = Math.max(0, Math.min(startBox.current.x + dx, startBox.current.x + startBox.current.w - 50));
        newW = (startBox.current.x + startBox.current.w) - newX;
      }
      
      setCropBox({ x: newX, y: newY, w: newW, h: newH });
    }
  }, [dragMode, renderedDims, cropBox.w, cropBox.h]);

  const handleDragEnd = React.useCallback(() => {
    setDragMode(null);
  }, []);

  React.useEffect(() => {
    if (dragMode) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [dragMode, handleDragMove, handleDragEnd]);

  const handleRotate = () => {
    if (!cropImageSrc) return;

    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Swap width and height for 90 degree rotation
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext("2d");

      // Translate to center and rotate 90 degrees
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotatedData = canvas.toDataURL(originalFile?.type || "image/jpeg");
      setCropImageSrc(rotatedData);
    };
    img.src = cropImageSrc;
  };

  // Update publicId when value changes (for edit mode)
  React.useEffect(() => {
    if (value?.url && value?.url !== preview) {
      setPreview(value?.url);
      setPublicId(
        value?.publicId ? value?.publicId : getPublicIdFromUrl(value?.url)
      );
    }
  }, [value?.url]);

  // Cleanup progress interval on unmount
  React.useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const validateFile = (file) => {
    // Check file size
    if (file.size > maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds ${(maxFileSize / (1024 * 1024)).toFixed(
          1
        )}MB limit`,
      };
    }

    // Check file type
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

  const validateImageDimensions = (img) => {
    return new Promise((resolve) => {
      const image = new window.Image();
      image.onload = () => {
        const issues = [];

        if (minWidth && image.width < minWidth) {
          issues.push(`Image width must be at least ${minWidth}px`);
        }

        if (minHeight && image.height < minHeight) {
          issues.push(`Image height must be at least ${minHeight}px`);
        }

        if (maxWidth && image.width > maxWidth) {
          issues.push(`Image width cannot exceed ${maxWidth}px`);
        }

        if (maxHeight && image.height > maxHeight) {
          issues.push(`Image height cannot exceed ${maxHeight}px`);
        }

        if (aspectRatio) {
          const [w, h] = aspectRatio.split(":").map(Number);
          const targetRatio = w / h;
          const currentRatio = image.width / image.height;
          const tolerance = 0.1;

          if (Math.abs(currentRatio - targetRatio) > tolerance) {
            issues.push(`Image aspect ratio should be approximately ${w}:${h}`);
          }
        }

        if (issues.length > 0) {
          resolve({ valid: false, error: issues.join(", ") });
        } else {
          resolve({ valid: true });
        }

        // Clean up object URL
        URL.revokeObjectURL(image.src);
      };

      image.onerror = () => {
        resolve({ valid: false, error: "Failed to load image for validation" });
        // Clean up object URL
        URL.revokeObjectURL(image.src);
      };

      image.src = URL.createObjectURL(img);
    });
  };

  const simulateUploadProgress = () => {
    setUploadProgress(0);
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        const increment = Math.random() * 10;
        const newProgress = Math.min(prev + increment, 90); // Cap at 90% until upload completes
        return newProgress;
      });
    }, 300);
  };

  const uploadToCloudinary = async (base64Image) => {
    try {
      setLoading(true);
      simulateUploadProgress();

      const response = await fetch("/api/cloudinary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload image");
      }

      const data = await response.json();

      // Set progress to 100% when complete
      setUploadProgress(100);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      // Reset progress after a short delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);

      return data;
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
      console.error("Upload error details:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteFromCloudinary = async (publicId) => {
    try {
      setLoading(true);
      const response = await fetch("/api/cloudinary", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({ publicId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete image");
      }

      return await response.json();
    } catch (error) {
      toast.error(error.message || "Error deleting image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Validate file type and size first
      const fileValidation = validateFile(file);
      if (!fileValidation.valid) {
        toast.error(fileValidation.error);
        return;
      }

      // Validate image dimensions if specified
      if (aspectRatio || minWidth || minHeight || maxWidth || maxHeight) {
        const dimensionValidation = await validateImageDimensions(file);
        if (!dimensionValidation.valid) {
          toast.error(dimensionValidation.error);
          return;
        }
      }

      // Read as base64 to open in cropper modal
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result);
        setOriginalFile(file);
        setRenderedDims({ width: 0, height: 0 });
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Failed to process image");
    }
  };

  const handleCropSave = () => {
    if (!cropImageSrc || !originalFile) return;

    const img = new window.Image();
    img.onload = () => {
      // Compute scaling from rendered dimensions to natural image dimensions
      const scaleX = img.width / renderedDims.width;
      const scaleY = img.height / renderedDims.height;

      const sourceX = cropBox.x * scaleX;
      const sourceY = cropBox.y * scaleY;
      const sourceWidth = cropBox.w * scaleX;
      const sourceHeight = cropBox.h * scaleY;

      // Define target high-res dimensions (max 800px)
      let targetWidth = sourceWidth;
      let targetHeight = sourceHeight;
      const maxDim = 800;
      if (sourceWidth > maxDim || sourceHeight > maxDim) {
        if (sourceWidth > sourceHeight) {
          targetWidth = maxDim;
          targetHeight = maxDim * (sourceHeight / sourceWidth);
        } else {
          targetHeight = maxDim;
          targetWidth = maxDim * (sourceWidth / sourceHeight);
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      // Draw solid white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Draw the cropped portion
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );

      // Convert Canvas to Blob/File to save
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], originalFile.name, {
            type: originalFile.type,
            lastModified: Date.now(),
          });

          setSelectedFile(croppedFile);
          
          const objectUrl = URL.createObjectURL(croppedFile);
          setLocalPreview(objectUrl);
          onChange({ url: "", publicId: null }); // Force user to upload this new cropped image

          setIsCropOpen(false);
          toast.success("Image cropped successfully! Click 'Upload Image' to submit.");
        }
      }, originalFile.type);
    };
    img.src = cropImageSrc;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select an image first");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Upload to Cloudinary
          const result = await uploadToCloudinary(reader.result);

          // Update with Cloudinary URL
          setPreview(result.url);
          setPublicId(result.publicId);
          onChange({ url: result.url, publicId: result.publicId });

          // Clear the selected file and local preview
          setSelectedFile(null);
          setLocalPreview(null);

          toast.success("Image uploaded successfully!");
        } catch (error) {
          console.error("Upload failed:", error);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Failed to read image file");
    }
  };

  const handleRemoveImage = async () => {
    // If there's only a local preview, just clear it
    if (localPreview && !publicId) {
      setLocalPreview(null);
      setSelectedFile(null);
      return;
    }

    // If there's a cloudinary image to delete
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId);
        setPreview("");
        setPublicId(null);
        onChange({ url: "", publicId: null });
        toast.success("Image removed successfully!");
      } catch (error) {
        console.error("Error removing image:", error);
      }
    } else {
      setPreview("");
      onChange({ url: "", publicId: null });
    }
  };

  const handleSelectClick = () => {
    if (!disabled && !loading) {
      fileInputRef.current.click();
    }
  };

  const displayedImage = localPreview || preview;

  // Generate constraint message
  const getConstraintMessage = () => {
    const constraints = [];

    if (maxFileSize) {
      constraints.push(
        `Max size: ${(maxFileSize / (1024 * 1024)).toFixed(1)}MB`
      );
    }

    if (allowedTypes && allowedTypes.length > 0) {
      const types = allowedTypes
        .map((type) => type.split("/")[1].toUpperCase())
        .join(", ");
      constraints.push(`Formats: ${types}`);
    }

    if (minWidth && minHeight) {
      constraints.push(`Min dimensions: ${minWidth}×${minHeight}px`);
    } else if (minWidth) {
      constraints.push(`Min width: ${minWidth}px`);
    } else if (minHeight) {
      constraints.push(`Min height: ${minHeight}px`);
    }

    if (maxWidth && maxHeight) {
      constraints.push(`Max dimensions: ${maxWidth}×${maxHeight}px`);
    } else if (maxWidth) {
      constraints.push(`Max width: ${maxWidth}px`);
    } else if (maxHeight) {
      constraints.push(`Max height: ${maxHeight}px`);
    }

    if (aspectRatio) {
      constraints.push(
        `Aspect ratio: ${aspectRatio === 1 ? "1:1" : aspectRatio}`
      );
    }

    return constraints.join(" • ");
  };

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
        className={`w-full h-48 border-2 border-dashed rounded-md flex flex-col items-center justify-center relative ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          } transition-colors`}
      >
        {loading && (
          <div className="absolute inset-0 backdrop-blur-md bg-white/50 border border-white/30 shadow-lg flex flex-col items-center justify-center z-10">
            <Loader className="animate-spin text-primary mb-4" size={32} />

            {uploadProgress > 0 && (
              <div className="w-2/3 flex flex-col items-center">
                <Progress value={uploadProgress} className="h-2 w-full mb-2" />
                <span className="text-xs text-gray-800 font-medium drop-shadow-sm">
                  {Math.round(uploadProgress)}%
                </span>
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div onClick={handleSelectClick} className="text-center p-4">
            <Image className="h-10 w-10 text-gray-400 mb-2 mx-auto" />
            <p className="text-sm text-gray-500">Click to select an image</p>
            <p className="text-xs text-gray-400 mt-1">
              {getConstraintMessage()}
            </p>
          </div>
        )}
      </div>

      {/* Upload and Change Image buttons */}
      <div className="flex gap-2 w-full">
        {selectedFile && !loading && (
          <Button
            type="button"
            className="flex-1"
            onClick={handleUpload}
            disabled={disabled}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
        )}

        {displayedImage && !selectedFile && !loading && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleSelectClick}
            disabled={disabled}
          >
            <Image className="h-4 w-4 mr-2" />
            Change Image
          </Button>
        )}

        {!displayedImage && !selectedFile && (
          <Button
            type="button"
            className="flex-1"
            onClick={handleSelectClick}
            disabled={disabled}
          >
            <Image className="h-4 w-4 mr-2" />
            Select Image
          </Button>
        )}
      </div>

      {/* Premium Image Cropper Modal */}
      <Dialog open={isCropOpen} onOpenChange={setIsCropOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Crop Profile Photo</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
              Drag inside the box to position, or pull the 4 corners to resize.
            </DialogDescription>
          </DialogHeader>

          {/* Premium Bounding Box Cropper container */}
          <div className="flex flex-col items-center justify-center p-6 bg-zinc-50/50 dark:bg-zinc-950/50 rounded-lg border border-zinc-100 dark:border-zinc-800/80 my-2 relative overflow-hidden">
            {cropImageSrc ? (
              <div className="relative max-w-full max-h-[350px] overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 select-none">
                <div className="relative inline-block overflow-hidden" style={{ width: renderedDims.width || 'auto', height: renderedDims.height || 'auto' }}>
                  <img
                    ref={imgRef}
                    src={cropImageSrc}
                    alt="Crop source"
                    onLoad={handleImageLoad}
                    className="max-w-full max-h-[350px] block select-none pointer-events-none"
                    draggable={false}
                  />
                  
                  {/* Dark overlay mask outside cropbox */}
                  <div 
                    className="absolute border border-white/90 cursor-move select-none shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] rounded-lg"
                    style={{
                      left: `${cropBox.x}px`,
                      top: `${cropBox.y}px`,
                      width: `${cropBox.w}px`,
                      height: `${cropBox.h}px`,
                    }}
                    onMouseDown={(e) => handleDragStart(e, "move")}
                    onTouchStart={(e) => handleDragStart(e, "move")}
                  >
                    {/* 3x3 dashed grid guidelines inside cropbox */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                      <div className="border-r border-dashed border-white/40 border-b border-white/40" />
                      <div className="border-r border-dashed border-white/40 border-b border-white/40" />
                      <div className="border-dashed border-white/40 border-b border-white/40" />
                      <div className="border-r border-dashed border-white/40 border-b border-white/40" />
                      <div className="border-r border-dashed border-white/40 border-b border-white/40" />
                      <div className="border-dashed border-white/40 border-b border-white/40" />
                      <div className="border-r border-dashed border-white/40" />
                      <div className="border-r border-dashed border-white/40" />
                      <div />
                    </div>

                    {/* 4 Side resizing handles */}
                    {/* Top Side (N) */}
                    <div 
                      className="absolute -top-[6px] left-0 right-0 h-[12px] cursor-ns-resize z-10 flex items-center justify-center"
                      onMouseDown={(e) => handleDragStart(e, "n")}
                      onTouchStart={(e) => handleDragStart(e, "n")}
                    >
                      <div className="w-8 h-1 bg-white border border-zinc-400 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] pointer-events-none" />
                    </div>
                    {/* Bottom Side (S) */}
                    <div 
                      className="absolute -bottom-[6px] left-0 right-0 h-[12px] cursor-ns-resize z-10 flex items-center justify-center"
                      onMouseDown={(e) => handleDragStart(e, "s")}
                      onTouchStart={(e) => handleDragStart(e, "s")}
                    >
                      <div className="w-8 h-1 bg-white border border-zinc-400 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] pointer-events-none" />
                    </div>
                    {/* Left Side (W) */}
                    <div 
                      className="absolute -left-[6px] top-0 bottom-0 w-[12px] cursor-ew-resize z-10 flex items-center justify-center"
                      onMouseDown={(e) => handleDragStart(e, "w")}
                      onTouchStart={(e) => handleDragStart(e, "w")}
                    >
                      <div className="w-1 h-8 bg-white border border-zinc-400 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] pointer-events-none" />
                    </div>
                    {/* Right Side (E) */}
                    <div 
                      className="absolute -right-[6px] top-0 bottom-0 w-[12px] cursor-ew-resize z-10 flex items-center justify-center"
                      onMouseDown={(e) => handleDragStart(e, "e")}
                      onTouchStart={(e) => handleDragStart(e, "e")}
                    >
                      <div className="w-1 h-8 bg-white border border-zinc-400 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <Loader className="animate-spin text-zinc-400" />
              </div>
            )}
          </div>

          {/* Controls Panel */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-semibold text-zinc-400">Ratio: 1:1 Square</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRotate}
              className="h-8 px-3 text-xs gap-1.5 font-medium border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Rotate 90°
            </Button>
          </div>

          <DialogFooter className="flex sm:justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCropOpen(false)}
              className="text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCropSave}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/10"
            >
              Apply Crop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageUploader;
