// app/dashboard/results-qr-code/_components/QRCodeActions.jsx
"use client";

import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Copy,
  Printer,
  Download,
  ExternalLink,
  Share2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useClipboard } from "@/hooks/use-clipboard";
import { createPrintHandler } from "@/lib/qr-code/print-handler";
import { downloadQRCode } from "@/lib/qr-code/download-handler";

export function QRCodeActions({
  resultsUrl,
  organizationName = "SCOFIST",
  printRef,
}) {
  const { isCopied, copyToClipboard } = useClipboard();

  // Print handler
  const handlePrint = useReactToPrint(
    createPrintHandler(printRef, { organizationName })
  );

  // Download handler
  const handleDownload = async () => {
    try {
      downloadQRCode(
        "#qr-code-canvas canvas",
        `Results-QR-${organizationName}`
      );
      toast.success("QR code downloaded!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Copy URL
  const handleCopyUrl = async () => {
    const success = await copyToClipboard(resultsUrl);
    if (success) {
      toast.success("URL copied to clipboard!");
    } else {
      toast.error("Failed to copy URL");
    }
  };

  // View results
  const handleViewResults = () => {
    window.open(resultsUrl, "_blank", "noopener,noreferrer");
  };

  // Share (if supported)
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Festival Results",
          text: "Check out our festival results!",
          url: resultsUrl,
        });
        toast.success("Shared successfully!");
      } catch (error) {
        if (error.name !== "AbortError") {
          toast.error("Failed to share");
        }
      }
    } else {
      handleCopyUrl();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleDownload} className="w-full" variant="default">
          <Download className="mr-2 h-4 w-4" />
          Download QR Code
        </Button>

        <Button onClick={handlePrint} className="w-full" variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Print QR Code
        </Button>

        <Button onClick={handleCopyUrl} className="w-full" variant="outline">
          {isCopied ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {isCopied ? "Copied!" : "Copy URL"}
        </Button>

        <Button
          onClick={handleViewResults}
          className="w-full"
          variant="outline"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View Results Page
        </Button>

        {typeof navigator !== "undefined" && navigator.share && (
          <Button onClick={handleShare} className="w-full" variant="secondary">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        )}

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs font-medium mb-1">Results URL:</p>
          <p className="text-xs text-muted-foreground break-all">
            {resultsUrl}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
