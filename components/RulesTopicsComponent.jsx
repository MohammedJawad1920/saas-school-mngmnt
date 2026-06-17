"use client";
import { useState, useRef, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  Edit3,
  X,
  Search,
  Download,
  Printer,
  BookOpen,
  FileText,
  Users,
  User,
  Award,
  Filter,
  ChevronDown,
  Loader,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import useCrud from "@/hooks/use-crud";
import { useIsMobile } from "@/hooks/use-mobile";
import { applyPrintStyles, removePrintStyles } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import PrintHeader from "@/components/PrintHeader";
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

// Full page loading component
const FullPageLoading = () => (
  <Card>
    <CardContent className="flex flex-col items-center justify-center py-16 sm:py-20">
      <div className="relative mb-6">
        <Loader className="w-12 h-12 sm:w-16 sm:h-16 animate-spin text-primary" />
      </div>
      <h3 className="text-lg sm:text-xl font-semibold mb-2 text-center">
        Loading Programs
      </h3>
      <p className="text-sm sm:text-base text-muted-foreground text-center max-w-sm">
        Fetching rules and topics data. This should only take a moment.
      </p>
      <div className="mt-6 flex space-x-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
        <div
          className="w-2 h-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: "0.1s" }}
        ></div>
        <div
          className="w-2 h-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: "0.2s" }}
        ></div>
      </div>
    </CardContent>
  </Card>
);

// Memoized icon components to prevent re-renders
const TypeIcon = ({ type }) => {
  return type === "Group" ? (
    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
  ) : (
    <User className="w-3 h-3 sm:w-4 sm:h-4" />
  );
};

const CategoryIcon = ({ category }) => {
  return category === "Stage" ? (
    <Award className="w-3 h-3 sm:w-4 sm:h-4" />
  ) : (
    <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
  );
};

// Memoized program card component to prevent unnecessary re-renders
const ProgramCard = ({
  program,
  viewMode,
  readOnly,
  editingProgram,
  editData,
  loading,
  onEdit,
  onSave,
  onCancel,
  onEditDataChange,
  onClearRules,
  onClearTopics,
  onClearBoth,
}) => {
  const isEditing = editingProgram === program._id;

  const handleRulesChange = useCallback(
    (e) => {
      onEditDataChange((prev) => ({ ...prev, rules: e.target.value }));
    },
    [onEditDataChange]
  );

  const handleTopicsChange = useCallback(
    (e) => {
      onEditDataChange((prev) => ({ ...prev, topics: e.target.value }));
    },
    [onEditDataChange]
  );

  const handleEditClick = useCallback(() => {
    onEdit(program);
  }, [onEdit, program]);

  const handleClearRules = useCallback(() => {
    onClearRules(program);
  }, [onClearRules, program]);

  const handleClearTopics = useCallback(() => {
    onClearTopics(program);
  }, [onClearTopics, program]);

  const handleClearBoth = useCallback(() => {
    onClearBoth(program);
  }, [onClearBoth, program]);

  return (
    <Card className="break-inside-avoid">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2 min-w-0 flex-1">
            <CardTitle className="text-lg sm:text-xl font-bold text-primary leading-tight">
              {program.name}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <Badge
                variant="secondary"
                className="flex items-center gap-1 text-xs"
              >
                <TypeIcon type={program.type} />
                <span className="hidden sm:inline">{program.type}</span>
                <span className="sm:hidden">{program.type.charAt(0)}</span>
              </Badge>
              <Badge
                variant="outline"
                className="flex items-center gap-1 text-xs"
              >
                <CategoryIcon category={program.category} />
                <span className="hidden sm:inline">{program.category}</span>
                <span className="sm:hidden">{program.category.charAt(0)}</span>
              </Badge>
              {program.divisionName && (
                <Badge variant="secondary" className="text-xs">
                  {program.divisionName}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!readOnly && !isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditClick}
                  className="print:hidden h-8 w-8 p-0"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>

                {/* Clear buttons based on what content exists */}
                {program.rules && program.topics && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="print:hidden h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Clear Rules & Topics
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          What would you like to clear for "{program.name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleClearRules}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          Clear Rules
                        </AlertDialogAction>
                        <AlertDialogAction
                          onClick={handleClearTopics}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Clear Topics
                        </AlertDialogAction>
                        <AlertDialogAction
                          onClick={handleClearBoth}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Clear Both
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {program.rules && !program.topics && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="print:hidden h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Rules</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to clear the rules for "
                          {program.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleClearRules}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Clear Rules
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {!program.rules && program.topics && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="print:hidden h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Topics</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to clear the topics for "
                          {program.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleClearTopics}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Clear Topics
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6">
        {isEditing ? (
          <div className="space-y-4 print:hidden">
            {(viewMode === "both" || viewMode === "rules") && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Rules
                </label>
                <Textarea
                  value={editData.rules}
                  onChange={handleRulesChange}
                  placeholder="Enter program rules..."
                  className="min-h-[100px] sm:min-h-[120px] resize-y text-sm"
                  disabled={loading}
                />
              </div>
            )}

            {(viewMode === "both" || viewMode === "topics") && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Topics
                </label>
                <Textarea
                  value={editData.topics}
                  onChange={handleTopicsChange}
                  placeholder="Enter program topics..."
                  className="min-h-[100px] sm:min-h-[120px] resize-y text-sm"
                  disabled={loading}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button onClick={onSave} disabled={loading} size="sm">
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                size="sm"
                disabled={loading}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {(viewMode === "both" || viewMode === "rules") && program.rules && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <h3 className="text-base sm:text-lg font-semibold">Rules</h3>
                </div>
                <div className="bg-muted/30 p-3 sm:p-4 rounded-lg border-l-4 border-primary">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                    {program.rules}
                  </div>
                </div>
              </div>
            )}

            {(viewMode === "both" || viewMode === "rules") &&
              (viewMode === "both" || viewMode === "topics") &&
              program.rules &&
              program.topics && <Separator />}

            {(viewMode === "both" || viewMode === "topics") &&
              program.topics && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <h3 className="text-base sm:text-lg font-semibold">
                      Topics
                    </h3>
                  </div>
                  <div className="bg-muted/30 p-3 sm:p-4 rounded-lg border-l-4 border-green-500">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                      {program.topics}
                    </div>
                  </div>
                </div>
              )}

            {!program.rules && !program.topics && (
              <div className="text-center py-6 sm:py-8 text-muted-foreground print:hidden">
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm sm:text-base">
                  No rules or topics added yet.
                </p>
                {!readOnly && (
                  <Button
                    variant="link"
                    onClick={handleEditClick}
                    className="mt-2 text-sm"
                  >
                    Add rules or topics
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Memoize the ProgramCard to prevent unnecessary re-renders
const MemoizedProgramCard = memo(ProgramCard);

const RulesTopicsComponent = ({ apiKey, readOnly = false }) => {
  const [editingProgram, setEditingProgram] = useState(null);
  const [editData, setEditData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedDivision, setSelectedDivision] = useState("All");
  const [viewMode, setViewMode] = useState("both");
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const printRef = useRef();
  const isMobile = useIsMobile();

  const { useUpdateItem, useFetchItems } = useCrud("programs", apiKey);
  const fetchItemsQuery = useFetchItems(
    0,
    0,
    {},
    {
      cacheTime: 0,
      staleTime: 0,
    }
  );
  const updateProgram = useUpdateItem();

  const programs = useMemo(() => {
    return (
      fetchItemsQuery.data?.programs?.sort((a, b) =>
        a.name.localeCompare(b.name)
      ) || []
    );
  }, [fetchItemsQuery.data]);

  const isLoading = fetchItemsQuery.isLoading;
  const isError = fetchItemsQuery.isError;

  // Memoize filter values to prevent recalculation on every render
  const filterValues = useMemo(() => {
    const categories = [...new Set(programs.map((p) => p.category))];
    const types = [...new Set(programs.map((p) => p.type))];
    const divisions = [
      ...new Set(programs.map((p) => p.divisionName).filter(Boolean)),
    ];

    return { categories, types, divisions };
  }, [programs]);

  // Memoize filtered programs to prevent expensive filtering on every render
  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      const matchesSearch =
        program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (program.rules &&
          program.rules.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (program.topics &&
          program.topics.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === "All" || program.category === selectedCategory;
      const matchesType =
        selectedType === "All" || program.type === selectedType;
      const matchesDivision =
        selectedDivision === "All" || program.divisionName === selectedDivision;

      return matchesSearch && matchesCategory && matchesType && matchesDivision;
    });
  }, [programs, searchTerm, selectedCategory, selectedType, selectedDivision]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      selectedCategory !== "All" ||
      selectedType !== "All" ||
      selectedDivision !== "All"
    );
  }, [selectedCategory, selectedType, selectedDivision]);

  // Memoize event handlers to prevent child re-renders
  const handleEdit = useCallback((program) => {
    setEditingProgram(program._id);
    setEditData({
      rules: program.rules || "",
      topics: program.topics || "",
    });
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setLoading(true);
      await updateProgram.mutateAsync({
        data: {
          ids: [editingProgram],
          ...editData,
        },
      });
      toast.success("Program updated successfully!");
      await fetchItemsQuery.refetch();
      setEditingProgram(null);
      setEditData({});
    } catch (error) {
      toast.error("Failed to update program");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [editingProgram, editData, updateProgram]);

  const handleCancel = useCallback(() => {
    setEditingProgram(null);
    setEditData({});
  }, []);

  const handleClearRules = useCallback(
    async (program) => {
      try {
        setLoading(true);
        await updateProgram.mutateAsync({
          data: {
            ids: [program._id],
            rules: "",
          },
        });
        toast.success("Rules cleared successfully!");
        await fetchItemsQuery.refetch();
      } catch (error) {
        toast.error("Failed to clear rules");
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [updateProgram, fetchItemsQuery]
  );

  const handleClearTopics = useCallback(
    async (program) => {
      try {
        setLoading(true);
        await updateProgram.mutateAsync({
          data: {
            ids: [program._id],
            topics: "",
          },
        });
        toast.success("Topics cleared successfully!");
        await fetchItemsQuery.refetch();
      } catch (error) {
        toast.error("Failed to clear topics");
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [updateProgram, fetchItemsQuery]
  );

  const handleClearBoth = useCallback(
    async (program) => {
      try {
        setLoading(true);
        await updateProgram.mutateAsync({
          data: {
            ids: [program._id],
            rules: "",
            topics: "",
          },
        });
        toast.success("Rules and topics cleared successfully!");
        await fetchItemsQuery.refetch();
      } catch (error) {
        toast.error("Failed to clear rules and topics");
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [updateProgram, fetchItemsQuery]
  );

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedCategory("All");
    setSelectedType("All");
    setSelectedDivision("All");
    setSearchTerm("");
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Rules and Topics",
  });

  const handleDownloadPDF = useCallback(async () => {
    try {
      applyPrintStyles();

      const html2pdf = (await import("html2pdf.js")).default;
      const element = printRef.current;

      const options = {
        filename: "Rules_and_Topics.pdf",
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
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  }, []);

  // Handle error state
  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
          <FileText className="w-12 h-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Failed to Load Programs
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            There was an error loading the program data. Please try refreshing
            the page.
          </p>
          <Button onClick={() => fetchItemsQuery.refetch()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Controls - Hidden in Print */}
      <div className="print:hidden space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search programs, rules, or topics..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 text-base"
            disabled={isLoading}
          />
        </div>

        {/* Mobile Filter Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-primary rounded-full" />
            )}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </Button>

          {/* Desktop Filters */}
          <div className="hidden sm:flex flex-wrap gap-2">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[140px] lg:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {filterValues.categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedType}
              onValueChange={setSelectedType}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[120px] lg:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                {filterValues.types.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filterValues.divisions.length > 0 && (
              <Select
                value={selectedDivision}
                onValueChange={setSelectedDivision}
                disabled={isLoading}
              >
                <SelectTrigger className="w-[140px] lg:w-[180px]">
                  <SelectValue placeholder="Division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Divisions</SelectItem>
                  {filterValues.divisions.map((division) => (
                    <SelectItem key={division} value={division}>
                      {division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs"
                disabled={isLoading}
              >
                Clear
              </Button>
            )}
          </div>

          {/* View Mode and Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* View Mode Toggle - Compact on mobile */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                View:
              </span>
              <div className="flex rounded-md border">
                <Button
                  variant={viewMode === "both" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleViewModeChange("both")}
                  className="rounded-r-none text-xs sm:text-sm px-2 sm:px-3"
                  disabled={isLoading}
                >
                  <span className="hidden sm:inline">Both</span>
                  <span className="sm:hidden">All</span>
                </Button>
                <Button
                  variant={viewMode === "rules" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleViewModeChange("rules")}
                  className="rounded-none border-x-0 text-xs sm:text-sm px-2 sm:px-3"
                  disabled={isLoading}
                >
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Rules</span>
                </Button>
                <Button
                  variant={viewMode === "topics" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleViewModeChange("topics")}
                  className="rounded-l-none text-xs sm:text-sm px-2 sm:px-3"
                  disabled={isLoading}
                >
                  <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Topics</span>
                </Button>
              </div>
            </div>

            <Button
              onClick={isMobile ? handleDownloadPDF : handlePrint}
              size="sm"
              disabled={isLoading || filteredPrograms.length === 0}
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

        {/* Mobile Filters Collapsible */}
        <Collapsible
          open={showFilters}
          onOpenChange={setShowFilters}
          className="sm:hidden"
        >
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="grid grid-cols-1 gap-3">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {filterValues.categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedType}
                onValueChange={setSelectedType}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  {filterValues.types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {filterValues.divisions.length > 0 && (
                <Select
                  value={selectedDivision}
                  onValueChange={setSelectedDivision}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Divisions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Divisions</SelectItem>
                    {filterValues.divisions.map((division) => (
                      <SelectItem key={division} value={division}>
                        {division}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="w-full"
                  disabled={isLoading}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Main Content */}
      <div ref={printRef} className="space-y-4 sm:space-y-6">
        <PrintHeader
          apiKey={apiKey}
          title="RULES & TOPICS"
          subtitle="Program Guidelines and Information"
          isFestival={true}
        />

        {isLoading ? (
          <FullPageLoading />
        ) : filteredPrograms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
              <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">
                No Programs Found
              </h3>
              <p className="text-sm text-muted-foreground text-center px-4">
                {searchTerm ||
                selectedCategory !== "All" ||
                selectedType !== "All" ||
                selectedDivision !== "All"
                  ? "No programs match your current filters."
                  : "No programs have rules or topics added yet."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  onClick={clearAllFilters}
                  className="mt-2 text-sm"
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {filteredPrograms.map((program) => (
              <MemoizedProgramCard
                key={program._id}
                program={program}
                viewMode={viewMode}
                readOnly={readOnly}
                editingProgram={editingProgram}
                editData={editData}
                loading={loading}
                onEdit={handleEdit}
                onSave={handleSave}
                onCancel={handleCancel}
                onEditDataChange={setEditData}
                onClearRules={handleClearRules}
                onClearTopics={handleClearTopics}
                onClearBoth={handleClearBoth}
              />
            ))}
          </div>
        )}
      </div>

      {/* Print Footer */}
      <div className="hidden print:block text-center text-xs text-muted-foreground mt-8 pt-4 border-t">
        <p>Generated on {new Date().toLocaleDateString()} | Rules & Topics</p>
      </div>
    </div>
  );
};

export default RulesTopicsComponent;
