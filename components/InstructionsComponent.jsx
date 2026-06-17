"use client";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  Edit3,
  X,
  Download,
  Printer,
  FileText,
  BookOpen,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { useIsMobile } from "@/hooks/use-mobile";
import { applyPrintStyles, removePrintStyles } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import useCrud from "@/hooks/use-crud";
import PrintHeader from "./PrintHeader";

const InstructionsComponent = ({ data = "", apiKey, readOnly = false }) => {
  const [instructions, setInstructions] = useState(data);
  const [originalInstructions, setOriginalInstructions] = useState(data);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const { useUpdateItem } = useCrud("settings", apiKey);

  const updateItem = useUpdateItem();

  const printRef = useRef();
  const isMobile = useIsMobile();

  // Handle save instructions
  const handleSave = useCallback(async () => {
    try {
      setLoading(true);

      const data = await updateItem.mutateAsync({
        data: {
          instructions,
        },
      });

      setOriginalInstructions(instructions);
      setIsEditing(false);
      toast.success("Instructions updated successfully!");
    } catch (error) {
      console.error("Error saving instructions:", error);
      toast.error("Failed to save instructions");
    } finally {
      setLoading(false);
    }
  }, [instructions, apiKey]);

  // Handle cancel editing
  const handleCancel = useCallback(() => {
    setInstructions(originalInstructions);
    setIsEditing(false);
  }, [originalInstructions]);

  // Handle start editing
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setIsExpanded(true);
  }, []);

  // Handle text change
  const handleInstructionsChange = useCallback((e) => {
    setInstructions(e.target.value);
  }, []);

  // Check if there are unsaved changes
  const hasUnsavedChanges = instructions !== originalInstructions;

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Festival Instructions",
  });

  // Handle PDF download
  const handleDownloadPDF = useCallback(async () => {
    try {
      applyPrintStyles();

      const html2pdf = (await import("html2pdf.js")).default;
      const element = printRef.current;

      const options = {
        filename: "Festival_Instructions.pdf",
        margin: 0.5,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: {
          unit: "in",
          format: "a4",
          orientation: "portrait",
        },
      };

      await html2pdf().set(options).from(element).save();
      removePrintStyles();
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Controls - Hidden in Print */}
      <div className="print:hidden space-y-4">
        {/* Status Alerts */}
        {hasUnsavedChanges && isEditing && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Remember to save your edits.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            {!readOnly && !isEditing && (
              <Button variant="outline" onClick={handleEdit} size="sm">
                <Edit3 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}

            <Button
              onClick={isMobile ? handleDownloadPDF : handlePrint}
              size="sm"
            >
              {isMobile ? (
                <>
                  <Download className="w-4 h-4 mr-1" />
                  PDF
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div ref={printRef} className="space-y-4 sm:space-y-6">
        <PrintHeader
          apiKey={apiKey}
          title="FESTIVAL INSTRUCTIONS"
          subtitle="Guidelines and Important Information"
          isFestival={true}
        />

        <Card className="break-inside-avoid">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <BookOpen className="w-5 h-5 text-primary" />
                  General Instructions
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Important guidelines for all festival participants
                </p>
              </div>

              {!isEditing && originalInstructions && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleExpanded}
                  className="print:hidden h-8 w-8 p-0"
                >
                  {isExpanded ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4 print:hidden">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Instructions
                  </label>
                  <Textarea
                    value={instructions}
                    onChange={handleInstructionsChange}
                    placeholder="Enter festival instructions and guidelines here...

Examples:
• Registration deadline and process
• Dress code requirements  
• Reporting time and venue details
• Contact information for queries
• Rules and regulations
• Prize distribution details
• Certificate collection information
• COVID-19 safety protocols
• Parking and transportation details"
                    className="min-h-[250px] sm:min-h-[350px] resize-y text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Use bullet points (•) or numbers for better readability
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={loading || !instructions.trim()}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {loading ? "Saving..." : "Save Instructions"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    size="sm"
                    disabled={loading}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                  <CollapsibleContent>
                    {originalInstructions ? (
                      <div className="space-y-4">
                        {/* Instructions Content */}
                        <div className="bg-muted/30 p-4 sm:p-6 rounded-lg border-l-4 border-primary">
                          <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed break-words">
                            {originalInstructions}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 sm:py-12 text-muted-foreground">
                        <FileText className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-base sm:text-lg font-semibold mb-2">
                          No Instructions Added
                        </h3>
                        <p className="text-sm mb-4 px-4">
                          Add festival instructions to help participants
                          understand the guidelines and requirements.
                        </p>
                        {!readOnly && (
                          <Button onClick={handleEdit} size="sm">
                            <Edit3 className="w-4 h-4 mr-1" />
                            Add Instructions
                          </Button>
                        )}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block text-center text-xs text-muted-foreground mt-8 pt-4 border-t">
        <p>
          Generated on {new Date().toLocaleDateString()} | Festival Instructions
        </p>
      </div>
    </div>
  );
};

export default InstructionsComponent;
