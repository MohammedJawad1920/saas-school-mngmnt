"use client";
import * as React from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ShareButton({ title, text, url, imageUrl }) {
  const handleShare = async () => {
    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
    const boldTitle = `*${title}*`;
    const shareData = {
      title: title,
      text: `${boldTitle}\n\n${text?.substring(0, 160) || ""}...\n\nRead more at:`,
      url: shareUrl,
    };

    try {
      // Try to include image if provided and supported
      if (imageUrl && navigator.canShare) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const file = new File([blob], "update.jpg", { type: blob.type });
          
          if (navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          }
        } catch (imageErr) {
          console.error("Could not fetch image for sharing:", imageErr);
          // Continue without image
        }
      }

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast.success("Link and details copied to clipboard!");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error sharing:", err);
        toast.error("Sharing failed. Try copying the link manually.");
      }
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleShare}
      className="rounded-full flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all active:scale-95 shadow-sm hover:shadow-md"
    >
      <Share2 className="w-4 h-4" />
      Share this Update
    </Button>
  );
}
