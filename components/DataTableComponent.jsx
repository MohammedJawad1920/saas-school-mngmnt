"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useMemo, useRef, useState, useEffect, useCallback, isValidElement, cloneElement } from "react";
import useTableColumns from "@/hooks/use-table-columns";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import useDataFilter from "@/hooks/use-data-filter";
import dynamic from "next/dynamic";
import { Loader, Search, X, Trophy, FileSpreadsheet, Printer, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { capitalize, debounce } from "lodash";
import { Skeleton } from "./ui/skeleton";
import { useReactToPrint } from "react-to-print";
import { useIsMobile } from "@/hooks/use-mobile";
import { applyPrintStyles, removePrintStyles, formatDateForDisplay, formatDateMonthYear, cn, sortClasses } from "@/lib/utils";
import * as XLSX from "xlsx";
import PrintHeader from "@/components/PrintHeader";
import DateRangeFilter from "@/components/DateRangeFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import ColumnCustomization from "./ColumnCustomization";
import PopupFilter from "./PopupFilter";
import ConfirmationPopup from "./ConfirmationPopup";
import PopupForm from "./PopupForm";

// Dynamic imports removed to fix ChunkLoadError
// const PopupFilter = ...
// const ColumnCustomization = ... (already removed)
// const ConfirmationPopup = ...
// const PopupForm = ...

const getCellStyles = (meta) => ({
  width: meta?.width || "auto",
  minWidth: meta?.minWidth || "100px",
  maxWidth: meta?.maxWidth || "300px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const handleError = (error) => {
  // Safely handle error logging
  let message = "An error occurred";

  try {
    if (error && typeof error.message === 'string') {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
  } catch (e) {
    // Fallback if accessing property fails
    message = "Unknown error";
  }

  // Use console.log to avoid potential serialization issues in some environments
  console.log("Error handled:", message);

  if (!error?.details?.errors) {
    toast.error(message);
  } else {
    toast.error("Validation error. Check your input.");
  }
};

const DEFAULT_API_FILTERS = {};
const DEFAULT_ARRAY = [];
const DEFAULT_OBJECT = {};

const DataTableComponent = ({
  resource,
  apiEndpoint = "",
  initialData = DEFAULT_ARRAY,
  columnsConfig,
  tableHeight = "calc(100vh - 312px)",
  formFields,
  createSuccessMessage = "Item added successfully!",
  editSuccessMessage = "Item Updated successfully!",
  deleteSuccessMessage = "Item deleted successfully!",
  apiKey,
  createFormTitle = "Add New Item",
  editFormTitle = "Edit Item",
  deleteFormTitle = "Delete Item",
  filterConfig = DEFAULT_ARRAY,
  multiEdit = false,
  limit = 20,
  apiFilters = DEFAULT_API_FILTERS,
  readOnly = false,
  filterTitle = "",
  filterType = "client",
  infiniteScrollThreshold = 0.3,
  printTitle,
  enableDelete = false,
  editFormFields = DEFAULT_ARRAY,
  additionalProps = DEFAULT_OBJECT,
  isFestival = false,
  multiEditFormFields = DEFAULT_ARRAY,
  enableCreate = true,
  enableSearch = false,
  printInReverse = false,
  dateRangeInPopup = false,
  enableMonthYearFilter = false,
  trailingToolbar = null,
  highlightHighest = null,
  mobileSplitLayout = false,
  mobileSearchPlaceholder = "Search...",
  desktopSearchPlaceholder = "Search by ID or Name...",
  rowLink = null,
  rowLinkKey = "_id",
  rowLinkSearchParams = "",
  enableDefaultSort = true,
  defaultSorting = DEFAULT_ARRAY,
  createButtonClass = "",
  createButtonText = "",
  onSuccess = null,
  onDataFetched = null,
  formClassName = "",
  onCellClick = null,
  enableClickToEdit = false,
  clickToEditExcludeColumns = ["_id", "select", "serialNo", "actions"],
  refetchInterval = 0,
  capitalizeInputs = false,
  customTopRightButtons = null,
  searchBarClassName = "",
  extraSearchFields = DEFAULT_ARRAY,
}) => {
  const [sorting, setSorting] = useState(defaultSorting);
  const [loading, setLoading] = useState(false);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(0);
  const [data, setData] = useState(initialData);
  const [dataCount, setDataCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [activeApiFilters, setActiveApiFilters] = useState(apiFilters);
  const [showLogo, setShowLogo] = useState(false);
  // Add state to track filter changes more precisely
  const [filterMonth, setFilterMonth] = useState(() => enableMonthYearFilter ? new Date().getMonth() + 1 : null);
  const [filterYear, setFilterYear] = useState(() => enableMonthYearFilter ? new Date().getFullYear() : null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [toppersOnly, setToppersOnly] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ title: "", message: "" });
  const lastSuccessShowRef = useRef(0);

  const triggerSuccessPopup = useCallback((title, message) => {
    const now = Date.now();
    if (now - lastSuccessShowRef.current < 2000) {
      console.log("[SuccessPopup] Ignored duplicate trigger within 2 seconds");
      return;
    }
    lastSuccessShowRef.current = now;
    setSuccessConfig({ title, message });
    setShowSuccess(true);
  }, []);
  
  // State for cell detail drill-down
  const [detailView, setDetailView] = useState(null); // { student, col, title }
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailedRecords, setDetailedRecords] = useState([]);

  // Sync state to window as a fallback for dynamic toolbar components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__SET_TOPPERS__ = setToppersOnly;
      window.__TOPPERS_ONLY__ = toppersOnly;
    }
  }, [setToppersOnly, toppersOnly]);

  const tableRef = useRef(null);
  const isFetchingRef = useRef(false);
  const loaderRef = useRef(null);
  const router = useRouter();
  const mutationLockRef = useRef(false);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const isMobile = useIsMobile();

  // Sync activeApiFilters with prop
  useEffect(() => {
    setActiveApiFilters(apiFilters);
    // Reset state when filters (like refreshKey) change to ensure a clean reload
    setPage(0);
    setData([]);
    setIsFilterChanged(true);
  }, [apiFilters]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  // Client-side filtering
  const initialFilters = useMemo(() => {
    const defaults = {};
    if (filterConfig) {
      filterConfig.forEach((f) => {
        if (f.defaultValue) {
          defaults[f.id] = { value: f.defaultValue };
          if (f.inputType === "dateRange") {
            // For dateRange, structure might need startDate/endDate if it's an object
            // But if we pass a string yyyy-mm-dd from URL, useDataFilter might expect specific structure ?
            // Let's assume for now simple value passing works, or logic needs adaptation
            defaults[f.id] = f.defaultValue;
          }
        }
      });
    }
    return defaults;
  }, [filterConfig]);

  const searchableFields = useMemo(() => {
    const fromColumns = columnsConfig
      .filter(col => col.accessorKey && col.accessorKey !== "serialNo" && col.id !== "select")
      .map(col => col.accessorKey);
    return [...new Set([...fromColumns, ...extraSearchFields])];
  }, [columnsConfig, extraSearchFields]);

  const {
    filteredData,
    filters,
    setFilter,
    removeFilter,
    clearFilters,
    globalFilter,
    setGlobalFilter,
    hasFilters,
  } = useDataFilter(data, initialFilters, searchableFields);

  const [lastFilterHash, setLastFilterHash] = useState(() => JSON.stringify({
    filters: activeApiFilters,
    globalFilter,
    isApiFiltering: filterType === "api",
  }));
  const [isFilterChanged, setIsFilterChanged] = useState(false);

  const { useFetchItems, useAddItem, useUpdateItem, useDeleteItem } = useCrud(
    apiEndpoint ? apiEndpoint : resource,
    apiKey
  );

  // Determine if we should use API filtering
  const isApiFiltering = filterType === "api";

  // Create a memoized combined filters object for API calls
  const combinedApiFilters = useMemo(() => {
    if (!isApiFiltering) return activeApiFilters;

    const transformedFilters = {};

    if (hasFilters) {
      Object.entries(filters).forEach(([key, filterObj]) => {
        const value = filterObj?.value;

        if (value && typeof value === "object" && !Array.isArray(value)) {
          Object.assign(transformedFilters, value);
        } else if (value !== undefined) {
          transformedFilters[key] = value;
        } else if (filterObj !== undefined) {
          transformedFilters[key] = filterObj;
        }
      });
    }

    if (enableMonthYearFilter && filterMonth && filterYear && !transformedFilters.startDate && !transformedFilters.endDate) {
      const startDateStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
      const endDateStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(new Date(filterYear, filterMonth, 0).getDate()).padStart(2, '0')}`;
      transformedFilters.startDate = startDateStr;
      transformedFilters.endDate = endDateStr;
    }

    return {
      ...activeApiFilters,
      ...transformedFilters,
      ...(globalFilter ? (resource === "studentAttendances" ? { name: globalFilter } : { global: globalFilter }) : {}),
      ...(toppersOnly ? { toppersOnly: true } : {}),
    };
  }, [isApiFiltering, activeApiFilters, filters, globalFilter, hasFilters, enableMonthYearFilter, filterMonth, filterYear]);

  // Create a hash of current filters to detect changes
  const currentFilterHash = useMemo(() => {
    return JSON.stringify({
      filters: combinedApiFilters,
      globalFilter,
      isApiFiltering,
    });
  }, [combinedApiFilters, globalFilter, isApiFiltering]);

  // Detect filter changes
  useEffect(() => {
    if (currentFilterHash !== lastFilterHash) {
      setIsFilterChanged(true);
      setLastFilterHash(currentFilterHash);
    }
  }, [currentFilterHash, lastFilterHash]);

  // API fetch with combined filters
  const fetchItemsQuery = useFetchItems(page, limit, combinedApiFilters, {
    retry: 2,
    retryDelay: 1000,
    refetchOnMount: "always",
    refetchInterval: refetchInterval > 0 ? refetchInterval : false,
  });

  // Handle fetch errors
  useEffect(() => {
    if (fetchItemsQuery.error) {
      toast.error(
        fetchItemsQuery.error.message ||
        "Failed to fetch data. Please try again."
      );
    }
  }, [fetchItemsQuery.error]);

  // FIXED: Process fetched data with better logic
  useEffect(() => {
    if (fetchItemsQuery.data) {
      const newItems = fetchItemsQuery.data[resource] || [];
      const pagination = fetchItemsQuery.data?.pagination || {};

      setTotalPages(pagination?.totalPages || 0);
      setDataCount(pagination?.total || 0);

      // FIXED: Better logic for when to reset vs append/update data
      const isRefetch = page === 0 && data.length > 0 && !isFilterChanged;
      const shouldResetData =
        isFilterChanged || 
        (page === 0 && data.length === 0);

      if (shouldResetData) {
        setData(newItems);
        setIsFilterChanged(false);
      } else {
        // FIXED: Update existing items instead of just filtering them out
        setData((prev) => {
          const updatedData = [...prev];
          const newItemsToAppend = [];

          newItems.forEach(newItem => {
            const index = updatedData.findIndex(item => item._id === newItem._id);
            if (index !== -1) {
              // Update existing item
              updatedData[index] = { ...updatedData[index], ...newItem };
            } else {
              // Mark as new item to append
              newItemsToAppend.push(newItem);
            }
          });

          return isRefetch ? newItems : [...updatedData, ...newItemsToAppend];
        });
      }

      setHasNextPage(page < (pagination?.totalPages || 1) - 1);
      setIsFetchingNextPage(false);
      isFetchingRef.current = false;

      // Notify parent of fetched data (contains summary, pagination, etc.)
      if (onDataFetched) {
        onDataFetched(fetchItemsQuery.data);
      }
    }
  }, [fetchItemsQuery.data, page, resource, isFilterChanged, data.length]);



  // Loading states
  const isInitialLoading =
    fetchItemsQuery.isLoading && page === 0 && data.length === 0;

  const isLoadingMore =
    isFetchingNextPage || (fetchItemsQuery.isLoading && page > 0);

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage || isLoadingMore || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsFetchingNextPage(true);
    setPage((prevPage) => prevPage + 1);
  }, [hasNextPage, isLoadingMore, page]);

  // Improved IntersectionObserver handler
  const handleObserver = useCallback(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoadingMore && hasNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, isLoadingMore, hasNextPage]
  );

  // Enhanced scroll handling with debounce
  const handleScroll = useCallback(
    debounce(() => {
      if (!tableRef.current || isLoadingMore || !hasNextPage) return;

      const container = tableRef.current;
      const scrollPosition = container.scrollTop + container.clientHeight;
      const scrollThreshold = container.scrollHeight * infiniteScrollThreshold;

      if (scrollPosition >= scrollThreshold) {
        fetchNextPage();
      }
    }, 100),
    [fetchNextPage, isLoadingMore, hasNextPage, infiniteScrollThreshold]
  );

  // Set up the intersection observer for the loader element
  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: tableRef.current,
      rootMargin: "100px",
      threshold: 0.1,
    });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [handleObserver]);

  // Set up scroll event for table body
  useEffect(() => {
    const tableBody = tableRef.current;
    if (tableBody) {
      tableBody.addEventListener("scroll", handleScroll);
      return () => tableBody.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // FIXED: More conservative client-side filter loading
  useEffect(() => {
    if (!isApiFiltering && hasNextPage && !isLoadingMore && hasFilters) {
      const displayedRows = filteredData.length;
      const minRequiredRows = Math.min(limit, 10);

      if (displayedRows < minRequiredRows) {
        fetchNextPage();
      }
    }
  }, [
    filteredData.length,
    hasFilters,
    fetchNextPage,
    hasNextPage,
    isLoadingMore,
    limit,
    isApiFiltering,
  ]);

  // FIXED: Handle API filtering with proper state reset
  const handleApiFilter = useCallback(() => {
    if (isApiFiltering) {
      setIsFilterChanged(true);
      setPage(0);
      setHasNextPage(true);
      setData([]);
      isFetchingRef.current = false;
      fetchItemsQuery.refetch();
    }
  }, [isApiFiltering, fetchItemsQuery]);

  // Update filters with debounce for API filtering
  const debouncedApiFilterUpdate = useCallback(
    debounce(() => {
      handleApiFilter();
    }, 300),
    [handleApiFilter]
  );

  // Intercept filter changes for API filtering
  const handleSetFilter = useCallback(
    (key, value, operator, nestedArrayField) => {
      setFilter(key, value, operator, nestedArrayField);
      if (isApiFiltering) {
        debouncedApiFilterUpdate();
      }
    },
    [setFilter, isApiFiltering, debouncedApiFilterUpdate]
  );

  const handleRemoveFilter = useCallback(
    (key) => {
      removeFilter(key);
      if (isApiFiltering) {
        debouncedApiFilterUpdate();
      }
    },
    [removeFilter, isApiFiltering, debouncedApiFilterUpdate]
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();
    if (isApiFiltering) {
      debouncedApiFilterUpdate();
    }
  }, [clearFilters, isApiFiltering, debouncedApiFilterUpdate]);

  const handleSetGlobalFilter = useCallback(
    (value) => {
      setGlobalFilter(value);
      if (isApiFiltering) {
        debouncedApiFilterUpdate();
      }
    },
    [setGlobalFilter, isApiFiltering, debouncedApiFilterUpdate]
  );

  const handlePrint = useReactToPrint({
    contentRef: tableRef,
    documentTitle: printTitle ? printTitle : resource,
  });

  const handleDownloadPDF = async () => {
    applyPrintStyles();
    const html2pdf = (await import("html2pdf.js")).default;

    const element = tableRef.current;
    const images = element.querySelectorAll("img");
    const imagePromises = Array.from(images).map((img) => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = resolve;
          img.onerror = resolve;
        }
      });
    });

    await Promise.all(imagePromises);
    const options = {
      filename: `${printTitle ? printTitle : resource}.pdf`,
      margin: 0.5,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: {
        unit: "in",
        format: "letter",
        orientation: "portrait",
      },
    };

    await html2pdf().set(options).from(element).save();
    removePrintStyles();
  };

  const handleExportExcel = () => {
    const exportData = table.getFilteredRowModel().rows.map(row => row.original);

    const excelData = exportData.map((row, index) => {
      const rowData = {};

      columnsConfig.forEach((col) => {
        if (col.id === "select" || col.type?.includes("checkbox") || col.type?.includes("avatar") || col.type?.includes("image") || col.id === "actions") {
          return;
        }

        const header = col.header || col.accessorKey || col.id;

        if (col.type?.includes("serialNo") || col.accessorKey === "serialNo") {
          rowData[header] = index + 1;
          return;
        }

        if (col.accessorKey) {
          const keys = col.accessorKey.split(".");
          let value = row;
          for (const key of keys) {
            if (value === null || value === undefined) break;
            value = value[key];
          }

          let valueStr = "";
          if (value !== null && value !== undefined) {
            if (col.type?.includes("date")) {
              valueStr = formatDateForDisplay(value);
            } else if (col.type?.includes("array") || Array.isArray(value)) {
              valueStr = Array.isArray(value) ? value.join(", ") : value;
            } else if (col.type?.includes("nestedObject") || typeof value === "object") {
              if (value.name) {
                valueStr = value.name;
              } else if (value.label) {
                valueStr = value.label;
              } else {
                const objVals = [];
                for (const key in value) {
                  if (typeof value[key] === "string" || typeof value[key] === "number") {
                    objVals.push(value[key]);
                  }
                }
                valueStr = objVals.join(", ");
              }
            } else {
              valueStr = value;
            }
          }
          rowData[header] = valueStr;
        }
      });
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, printTitle || resource || "Sheet1");
    XLSX.writeFile(workbook, `${printTitle ? printTitle : resource}.xlsx`);
  };

  // Table columns
  const handleCellClick = useCallback(async (row, col) => {
    // If an external click handler is provided, call it
    if (onCellClick) {
      onCellClick(row, col);
      return;
    }

    const studentId = row._id;
    const arrayKey = col.valueKey || col.totalKey;
    const records = row[arrayKey]?.filter(
      (item) => item?.[col.accessorKey || col.filterKey] === col.filterValue
    ) || [];

    setDetailView({
      student: row,
      col: col,
      title: col.header === "Absentees" 
        ? `Absent Students for ${formatDateForDisplay(row.date)}` 
        : `${col.header} Records for ${row.name}`,
      colHeader: col.header,
      viewType: col.header === "Absentees" ? "studentList" : "recordList"
    });
    setDetailedRecords(records);

    // If it's attendance history, fetch extra details (like teacher names)
    if (resource === "studentAttendances" || resource === "teacherAttendances") {
      setDetailsLoading(true);
      try {
        // Use the month/year filter from the current table if available
        const m = filterMonth || (new Date().getMonth() + 1);
        const y = filterYear || new Date().getFullYear();
        
        const endpoint = resource === "studentAttendances" 
          ? `/api/student-attendance-lookup?studentId=${studentId}&month=${m}&year=${y}`
          : `/api/teacher-attendance-lookup?teacherId=${studentId}&month=${m}&year=${y}`;

        const res = await fetch(endpoint);
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Fetch failed with status ${res.status}:`, errorText);
          throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json();
        
        if (data.records) {
          // Filter the fetched records to match the specific "Present" or "Absent" status requested
          const filtered = data.records.filter(r => r.present === col.filterValue);
          setDetailedRecords(filtered);
        }
      } catch (err) {
        console.error("Error fetching details:", err);
      } finally {
        setDetailsLoading(false);
      }
    }
  }, [resource, filterMonth, filterYear]);

  const columns = useMemo(() => {
    return useTableColumns(columnsConfig, handleCellClick);
  }, [columnsConfig, handleCellClick]);

  // CRUD operations
  const addData = useAddItem();
  const updateData = useUpdateItem();
  const deleteData = useDeleteItem();


  // Highlight highest logic
  const highlightedRowIds = useMemo(() => {
    const tableData = isApiFiltering ? data : filteredData;
    if (!highlightHighest || !tableData.length) return new Set();

    const { accessorKey, type, totalKey, filterKey, filterValue, groupBy } = highlightHighest;
    const allIds = new Set();

    // Helper to get group key
    const getGroupKey = (item) => {
      if (!groupBy) return "single-group";
      if (typeof groupBy === "function") return groupBy(item);

      // Support nested keys like "attendanceRecords.0.className"
      const keys = groupBy.split(".");
      let val = item;
      for (const key of keys) {
        if (val === null || val === undefined) break;
        val = val[key];
      }
      return val || "no-group";
    };

    // Calculate max value for each group
    const groupStats = {}; // { groupKey: { maxVal, ids } }

    tableData.forEach((item) => {
      let val = -1;
      if (type === "percentage") {
        const records = item[totalKey] || [];
        const total = records.length;
        const present = records.filter(r => r[filterKey] === filterValue).length;
        val = total > 0 ? (present / total) * 100 : 0;
      } else {
        val = parseFloat(item[accessorKey]);
        if (isNaN(val)) val = -1;
      }

      const groupKey = getGroupKey(item);
      if (!groupStats[groupKey]) {
        groupStats[groupKey] = { maxVal: -Infinity, ids: new Set() };
      }

      const stats = groupStats[groupKey];
      if (val > stats.maxVal) {
        stats.maxVal = val;
        stats.ids = new Set([item._id]);
      } else if (val === stats.maxVal && val !== -Infinity && val !== -1) {
        stats.ids.add(item._id);
      }
    });

    // Collect all highlighted IDs from all groups
    Object.values(groupStats).forEach(stats => {
      if (stats.maxVal > 0) {
        stats.ids.forEach(id => allIds.add(id));
      }
    });

    return allIds;
  }, [data, filteredData, isApiFiltering, highlightHighest]);

  const tableDataForTable = useMemo(() => {
    let baseData = isApiFiltering ? data : filteredData;
    if (toppersOnly && highlightedRowIds.size > 0) {
      baseData = baseData.filter((item) => highlightedRowIds.has(item._id));

      // Sort by class name if highlightHighest.groupBy is available
      if (highlightHighest?.groupBy) {
        baseData = [...baseData].sort((a, b) => {
          const getName = (item) => {
            const keys = highlightHighest.groupBy.split(".");
            let val = item;
            for (const key of keys) {
              if (val === null || val === undefined) break;
              val = val[key];
            }
            return val;
          };
          const classCompare = sortClasses(a, b, getName);
          if (classCompare !== 0) return classCompare;
          // Sort by student ID within class
          return String(a._id).localeCompare(String(b._id), undefined, { numeric: true });
        });
      }
    } else if (baseData.length > 0 && enableDefaultSort && sorting.length === 0) {
      if (resource === "studentAttendances" && highlightHighest?.groupBy) {
        // Sort by class then student ID ascending
        baseData = [...baseData].sort((a, b) => {
          const getName = (item) => {
            const keys = highlightHighest.groupBy.split(".");
            let val = item;
            for (const key of keys) {
              if (val === null || val === undefined) break;
              val = val[key];
            }
            return val;
          };
          const classCompare = sortClasses(a, b, getName);
          if (classCompare !== 0) return classCompare;
          return String(a._id).localeCompare(String(b._id), undefined, { numeric: true });
        });
      } else if (resource === "users") {
        // Default sort by ID descending so newest/highest IDs appear first
        baseData = [...baseData].sort((a, b) => {
          return String(b._id).localeCompare(String(a._id), undefined, { numeric: true, sensitivity: 'base' });
        });
      } else {
        // Default sort by createdAt descending so newest records appear first
        baseData = [...baseData].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;
          return String(b._id).localeCompare(String(a._id), undefined, { numeric: true, sensitivity: 'base' });
        });
      }
    }
    return baseData;
  }, [isApiFiltering, data, filteredData, toppersOnly, highlightedRowIds, highlightHighest, sorting]);

  const groupedTopperRows = useMemo(() => {
    if (!toppersOnly) return [];

    const groups = {};
    tableDataForTable.forEach((row) => {
      const getName = (item) => {
        if (!highlightHighest?.groupBy) return "Other";
        const keys = highlightHighest.groupBy.split(".");
        let val = item;
        for (const key of keys) {
          if (val === null || val === undefined) break;
          val = val[key];
        }
        return val || "Other";
      };

      const className = getName(row);
      if (!groups[className]) groups[className] = { students: [], percentage: 0 };

      // Calculate percentage the same way highlightHighest does
      let percentage = 0;
      if (highlightHighest?.type === "percentage") {
        const records = row[highlightHighest.totalKey] || [];
        const total = records.length;
        const present = records.filter(r => r[highlightHighest.filterKey] === highlightHighest.filterValue).length;
        percentage = total > 0 ? (present / total) * 100 : 0;
      }

      groups[className].students.push({ id: row._id, name: row.name });
      groups[className].percentage = percentage;
    });

    return Object.entries(groups)
      .sort((a, b) => sortClasses(a[0], b[0], (x) => x))
      .map(([className, group]) => ({
        className,
        students: group.students.sort((a, b) => 
          String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
        ),
        percentage: group.percentage,
      }));
  }, [toppersOnly, tableDataForTable, highlightHighest]);

  // Initialize table
  const table = useReactTable({
    data: tableDataForTable,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    manualFiltering: isApiFiltering,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: undefined, // Handled externally by useDataFilter or API
    },
  });

  // Selected rows data
  const selectedData = useMemo(
    () => table.getFilteredSelectedRowModel().rows.map((row) => row.original),
    [table, rowSelection]
  );

  // Helper to remove UI components from API payload
  const getApiProps = (props) => {
    if (!props) return {};
    const { customActions, customToolbar, ...apiProps } = props;
    return apiProps;
  };

  // FIXED: Form submission handler with proper state management
  const handleSubmit = async (values) => {
    if (mutationLockRef.current) return false;
    try {
      mutationLockRef.current = true;
      setLoading(true);
      const filteredValues = Object.fromEntries(
        Object.entries(values).filter(([_, value]) => Boolean(value))
      );

      await addData.mutateAsync({ ...filteredValues, ...getApiProps(additionalProps) });
      table.resetRowSelection();

      // FIXED: Proper data refresh
      setIsFilterChanged(true);
      setPage(0);
      setData([]);
      await fetchItemsQuery.refetch();
      if (onSuccess) onSuccess();
      
      // Close the create form immediately to prevent animation overlapping
      setIsCreateOpen(false);
      setTimeout(() => {
        triggerSuccessPopup("Success!", createSuccessMessage);
      }, 300);

      return true;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
      mutationLockRef.current = false;
    }
  };

  // FIXED: Edit handler with proper state management
  const handleEdit = async (values) => {
    if (mutationLockRef.current) return false;
    try {
      mutationLockRef.current = true;
      setLoading(true);
      const payload = {
        data: {
          ids: selectedData?.map((item) => item?._id),
          ...values,
          ...getApiProps(additionalProps),
        },
      };
      
      await updateData.mutateAsync(payload);
      
      table.resetRowSelection();

      // FIXED: Force a deep refresh by clearing local state and refetching
      setIsFilterChanged(true);
      setPage(0);
      setData([]);
      
      await fetchItemsQuery.refetch();
      if (onSuccess) onSuccess();
      
      // Close the edit form immediately to prevent animation overlapping
      setIsEditOpen(false);
      setTimeout(() => {
        triggerSuccessPopup("Success!", editSuccessMessage);
      }, 300);

      return true;
    } catch (error) {
      console.error("Mutation Error:", error);
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
      mutationLockRef.current = false;
    }
  };

  // FIXED: Delete handler with proper state management
  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteData.mutateAsync({
        data: {
          ids: selectedData?.map((item) => item?._id),
          ...getApiProps(additionalProps),
        },
      });
      table.resetRowSelection();

      // FIXED: Proper data refresh
      setIsFilterChanged(true);
      setPage(0);
      setData([]);
      await fetchItemsQuery.refetch();
      if (onSuccess) onSuccess();
      
      // Delay success popup slightly so the delete confirmation dialog closes completely first
      setTimeout(() => {
        triggerSuccessPopup("Deleted!", deleteSuccessMessage);
      }, 300);

      return true;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Display current filter mode (only in development)
  const filterModeDisplay = useMemo(() => {
    return isApiFiltering ? "API Filtering" : "Client Filtering";
  }, [isApiFiltering]);

  // FIXED: Better data count display
  const displayedItemsCount = isApiFiltering
    ? data.length
    : filteredData.length;
  const totalItemsText =
    isApiFiltering && totalPages > 0 ? ` of ${dataCount} total` : "";
  // Shared action buttons (used in both layouts)
  const actionButtons = (
    <>
      {additionalProps?.customActions && (
        <div>{additionalProps.customActions}</div>
      )}
      {(selectedData.length === 1 ||
        (selectedData.length > 1 && multiEdit)) &&
        !readOnly && (
          <PopupForm
            data={selectedData[0]}
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            formFields={
              selectedData.length > 1 && multiEditFormFields?.length > 0
                ? multiEditFormFields
                : editFormFields?.length > 0
                  ? editFormFields
                  : formFields
            }
            onSubmit={handleEdit}
            loading={loading}
            title={editFormTitle}
            apiKey={apiKey}
            triggerVariant="outline"
            className={formClassName}
            capitalizeInputs={capitalizeInputs}
          />
        )}
      {!!selectedData?.length && (!readOnly || enableDelete) && (
        <ConfirmationPopup
          onClick={handleDelete}
          action="delete"
          loading={loading}
          title={deleteFormTitle}
          triggerClass="bg-red-600 hover:bg-red-700 text-white rounded-md h-9 w-9 p-0 flex items-center justify-center shrink-0"
        />
      )}
      {!readOnly && enableCreate && (
        <PopupForm
          formFields={formFields}
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSubmit={handleSubmit}
          loading={loading}
          title={createFormTitle}
          apiKey={apiKey}
          triggerClass="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-9 w-9 p-0 flex items-center justify-center shrink-0"
          triggerText=""
          className={formClassName}
          capitalizeInputs={capitalizeInputs}
        />
      )}
      {table.getRowModel().rows?.length > 0 && (
        <>
          {customTopRightButtons}
          <Button onClick={handleExportExcel} className="print:hidden bg-green-600 text-white hover:bg-green-700 h-9 px-3 gap-2 shrink-0">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden md:inline">Excel</span>
          </Button>
          <Button onClick={handlePrint} className="print:hidden btn-print h-9 px-3 gap-2 shrink-0">
            <Printer className="h-4 w-4" />
            <span className="hidden md:inline">Print</span>
          </Button>
        </>
      )}
    </>
  );

  return (
    <div className={cn("space-y-4", isMobile && "space-y-2")}>
      {/* ── Mobile Split Layout ── */}
      {isMobile ? (
        <div className="space-y-2">
          {/* Row 1: Custom Toolbar (Search/Scan) or Default Search */}
          <div className="w-full">
            {additionalProps?.customToolbar ? (
              <div className="w-full">{additionalProps.customToolbar}</div>
            ) : (
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={mobileSearchPlaceholder}
                  value={globalFilter ?? ""}
                  onChange={(e) => handleSetGlobalFilter(e.target.value)}
                  className="h-10 w-full pl-9 bg-background"
                />
              </div>
            )}
          </div>

          {/* Row 2: Icons (Columns, Filter, Trophy, Excel, Print) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar bg-card/50 p-1.5 rounded-lg">
            <ColumnCustomization table={table} columnsConfig={columnsConfig} />
            
            <PopupFilter
              filterConfig={dateRangeInPopup ? filterConfig : filterConfig.filter(f => f.inputType !== "dateRange")}
              filters={filters}
              setFilter={handleSetFilter}
              removeFilter={handleRemoveFilter}
              clearFilters={handleClearFilters}
              globalFilter={globalFilter}
              setGlobalFilter={handleSetGlobalFilter}
              hasFilters={hasFilters || Object.keys(filters).length > 0}
              title={filterTitle || capitalize(resource)}
              filterType={filterType}
            />

            {/* Trophy Icon Toggle for Toppers */}
            {resource === "studentAttendances" && enableMonthYearFilter && (
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-9 w-9 shrink-0 transition-all duration-200", 
                  toppersOnly 
                    ? "bg-green-50 border-green-300 shadow-sm" 
                    : "hover:bg-neutral-100"
                )}
                onClick={() => {
                  const newVal = !toppersOnly;
                  setToppersOnly(newVal);
                  if (isApiFiltering) {
                    setIsFilterChanged(true);
                    setPage(0);
                    setData([]);
                    debouncedApiFilterUpdate();
                  }
                }}
                title="Green Listed Students (Toppers)"
              >
                <Trophy 
                  className={cn(
                    "h-4 w-4 transition-colors", 
                    toppersOnly ? "text-green-500" : "text-black"
                  )} 
                  fill={toppersOnly ? "currentColor" : "none"}
                  strokeWidth={2.5}
                />
              </Button>
            )}

            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              {(selectedData.length === 1 || (selectedData.length > 1 && multiEdit)) && !readOnly && (
                <PopupForm
                  data={selectedData[0]}
                  formFields={
                    selectedData.length > 1 && multiEditFormFields?.length > 0
                      ? multiEditFormFields
                      : editFormFields?.length > 0
                        ? editFormFields
                        : formFields
                  }
                  onSubmit={handleEdit}
                  loading={loading}
                  title={editFormTitle}
                  apiKey={apiKey}
                  triggerClass="h-9 w-9 p-0 flex items-center justify-center shrink-0"
                  triggerVariant="outline"
                  className={formClassName}
                  capitalizeInputs={capitalizeInputs}
                />
              )}
              {!!selectedData?.length && (!readOnly || enableDelete) && (
                <ConfirmationPopup
                  onClick={handleDelete}
                  action="delete"
                  loading={loading}
                  title={deleteFormTitle}
                  triggerClass="bg-red-600 hover:bg-red-700 text-white rounded-md h-9 w-9 p-0 flex items-center justify-center shrink-0"
                />
              )}
              {!readOnly && enableCreate && (
                <PopupForm
                  formFields={formFields}
                  onSubmit={handleSubmit}
                  loading={loading}
                  title={createFormTitle}
                  apiKey={apiKey}
                  triggerClass="bg-blue-600 hover:bg-blue-700 text-white rounded-md h-9 w-9 p-0 flex items-center justify-center shrink-0"
                  triggerText=""
                  className={formClassName}
                  capitalizeInputs={capitalizeInputs}
                />
              )}
              
              {additionalProps?.customActions && (
                <div className="shrink-0">{additionalProps.customActions}</div>
              )}
              
              {customTopRightButtons}
              
              <Button onClick={handleExportExcel} className="h-9 w-9 p-0 flex items-center justify-center bg-green-600 text-white hover:bg-green-700 border-0 shrink-0">
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
              
              <Button onClick={handleDownloadPDF} className="h-9 w-9 p-0 flex items-center justify-center btn-print border-0 shrink-0">
                <Printer className="h-4 w-4" />
              </Button>
            </div>

            {additionalProps?.customToolbar && !isMobile && (
              <div className="flex items-center">
                {additionalProps.customToolbar}
              </div>
            )}
          </div>

          {/* Row 3: Year and Month selectors */}
          {enableMonthYearFilter && (
            <div className="flex items-center justify-center gap-2 bg-muted/30 p-2 rounded-lg">
              <div className="flex items-center gap-1.5 w-full">
                <Select value={filterYear?.toString()} onValueChange={(v) => {
                  setFilterYear(parseInt(v));
                  if (isApiFiltering) debouncedApiFilterUpdate();
                }}>
                  <SelectTrigger className="flex-1 h-10 text-sm font-medium bg-background border-muted-foreground/20">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterMonth?.toString()} onValueChange={(v) => {
                  setFilterMonth(parseInt(v));
                  if (isApiFiltering) debouncedApiFilterUpdate();
                }}>
                  <SelectTrigger className="flex-1 h-10 text-sm font-medium bg-background border-muted-foreground/20">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}


          {!!selectedData.length && (
            <div className="text-muted-foreground text-[10px] bg-muted/50 px-2 py-0.5 rounded-full inline-block">
              {selectedData?.length} selected
            </div>
          )}
        </div>
      ) : (
        /* ── Desktop Layout ── */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="mr-auto flex items-center flex-wrap gap-2">
              {additionalProps?.customToolbar && (
                <div className="mr-2">{additionalProps.customToolbar}</div>
              )}
              <ColumnCustomization table={table} columnsConfig={columnsConfig} />

              <PopupFilter
                filterConfig={dateRangeInPopup ? filterConfig : filterConfig.filter(f => f.inputType !== "dateRange")}
                filters={filters}
                setFilter={handleSetFilter}
                removeFilter={handleRemoveFilter}
                clearFilters={handleClearFilters}
                globalFilter={globalFilter}
                setGlobalFilter={handleSetGlobalFilter}
                hasFilters={hasFilters || Object.keys(filters).length > 0}
                title={filterTitle || capitalize(resource)}
                filterType={filterType}
              />

              {enableSearch && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={desktopSearchPlaceholder}
                    value={globalFilter ?? ""}
                    onChange={(e) => handleSetGlobalFilter(e.target.value)}
                    className={cn("h-9 pl-9", searchBarClassName || "w-[180px] lg:w-[280px] xl:w-[320px]")}
                  />
                </div>
              )}

              {enableMonthYearFilter && (
                <div className="flex items-center space-x-2">
                  <Select value={filterYear?.toString()} onValueChange={(v) => {
                    setFilterYear(parseInt(v));
                    if (isApiFiltering) debouncedApiFilterUpdate();
                  }}>
                    <SelectTrigger className="w-[80px] h-8 text-xs">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterMonth?.toString()} onValueChange={(v) => {
                    setFilterMonth(parseInt(v));
                    if (isApiFiltering) debouncedApiFilterUpdate();
                  }}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {trailingToolbar && (
                <div className="flex items-center">
                  {isValidElement(trailingToolbar)
                    ? cloneElement(trailingToolbar, {
                      filterMonth,
                      filterYear,
                      apiKey,
                      toppersOnly,
                      setToppersOnly,
                      tableData: isApiFiltering ? data : filteredData,
                    })
                    : trailingToolbar}
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* Desktop Date Range Filter */}
                {!dateRangeInPopup && filterConfig.find(f => f.inputType === "dateRange") && (
                  <DateRangeFilter
                    value={(() => {
                      const filterState = filters[filterConfig.find(f => f.inputType === "dateRange").id];
                      return filterState?.value || filterState || {};
                    })()}
                    onChange={(val) => {
                      const config = filterConfig.find(f => f.inputType === "dateRange");
                      if (val.startDate || val.endDate) {
                        handleSetFilter(config.id, val, "dateRange", null);
                      } else {
                        handleRemoveFilter(config.id);
                      }
                    }}
                  />
                )}


              </div>
            </div>
            <div className="space-x-2 flex items-center">
              {actionButtons}
            </div>
          </div>

          {!!selectedData.length && (
            <div className="text-muted-foreground text-sm">
              {selectedData?.length} selected
            </div>
          )}
        </div>
      )}
      <div
        ref={tableRef}
        className="rounded-md border overflow-auto shadow-sm table-print relative "
        style={{
          maxHeight: tableHeight === "auto" ? "none" : tableHeight,
        }}
      >
        <PrintHeader
          apiKey={apiKey}
          title={(() => {
            if (toppersOnly && enableMonthYearFilter && filterMonth && filterYear) {
              return `Attendance Toppers - ${new Date(2000, filterMonth - 1, 1).toLocaleString('default', { month: 'long' })} ${filterYear}`;
            }

            let baseTitle = printTitle || resource;
            let classLabel = "";
            let batchLabel = "";

            if (filters["classId"] && filterConfig) {
              const config = filterConfig.find(f => f.id === "classId");
              if (config && config.options) {
                const val = typeof filters["classId"] === 'object' ? filters["classId"].value : filters["classId"];
                const opt = config.options.find(o => String(o.value) === String(val));
                if (opt) classLabel = opt.label;
              }
            }

            if (filters["batchId"] && filterConfig) {
              const config = filterConfig.find(f => f.id === "batchId");
              if (config && config.options) {
                const val = typeof filters["batchId"] === 'object' ? filters["batchId"].value : filters["batchId"];
                const opt = config.options.find(o => String(o.value) === String(val));
                if (opt) batchLabel = opt.label;
              }
            }

            if (classLabel && batchLabel) {
              return `${baseTitle} - ${classLabel} (${batchLabel})`;
            } else if (classLabel) {
              return `${baseTitle} - ${classLabel}`;
            } else if (batchLabel) {
              return `${baseTitle} - ${batchLabel}`;
            }

            return baseTitle;
          })()}
          subTitle={(() => {
            const dateFilterConfig = filterConfig.find(f => f.inputType === "dateRange");
            if (!dateFilterConfig) return null;
            const filterState = filters[dateFilterConfig.id];

            // Extract the actual value from the filter state
            const filterVal = filterState?.value || filterState;

            // Check if filter exists and has values
            if (filterVal) {
              // Handle object format {startDate, endDate}
              if (typeof filterVal === 'object' && !Array.isArray(filterVal)) {
                if (filterVal.startDate || filterVal.endDate) {
                  const start = filterVal.startDate ? formatDateForDisplay(filterVal.startDate) : "";
                  const end = filterVal.endDate ? formatDateForDisplay(filterVal.endDate) : "";

                  if (start && end) return `Date: ${start} to ${end}`;
                  if (start) return `Date: From ${start}`;
                  if (end) return `Date: Up to ${end}`;
                }
              }
              // Handle string format "startDate,endDate" (if used essentially)
              else if (typeof filterVal === 'string' && filterVal.includes(',')) {
                const [start, end] = filterVal.split(',');
                return `Date: ${formatDateForDisplay(start)} to ${formatDateForDisplay(end)}`;
              }
            }
            return null;
          })()}
          displayOnScreen={showLogo}
          isFestival={isFestival}
        />
        <Table className={cn(toppersOnly ? "print:hidden" : "")}>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={getCellStyles(header.column.columnDef.meta)}
                    className={`${header.id === "select" ? "print:hidden" : ""} ${header.column.columnDef.meta?.className || ""
                      }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className={printInReverse ? "print:hidden" : ""}>
            {isInitialLoading ? (
              Array(3)
                .fill(0)
                .map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={columns.length} className="h-12">
                      <Skeleton className="w-full h-full rounded" />
                    </TableCell>
                  </TableRow>
                ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn(
                    "break-inside-avoid",
                    highlightedRowIds.has(row.original._id) && highlightHighest?.className,
                    rowLink && "cursor-pointer hover:bg-muted/60 active:bg-muted transition-colors"
                  )}
                  onClick={rowLink ? (e) => {
                    // Don't navigate if clicking a checkbox or interactive element
                    if (e.target.closest('input, button, a, [role="checkbox"]')) return;
                    const id = row.original[rowLinkKey];
                    const params = rowLinkSearchParams ? `?${rowLinkSearchParams}` : "";
                    router.push(`${rowLink}/${id}${params}`);
                  } : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      style={getCellStyles(cell.column.columnDef.meta)}
                      key={cell.id}
                      className={cn(
                        cell.column.id === "select" ? "print:hidden" : "",
                        cell.column.columnDef.meta?.className || "",
                        enableClickToEdit && !readOnly && !clickToEditExcludeColumns.includes(cell.column.id) && "cursor-pointer hover:bg-muted/60 transition-colors"
                      )}
                      onClick={(e) => {
                        if (
                          enableClickToEdit &&
                          !readOnly &&
                          !clickToEditExcludeColumns.includes(cell.column.id)
                        ) {
                          // Don't trigger if clicking an interactive element
                          if (e.target.closest('input, button, a, [role="checkbox"]')) return;
                          
                          // Select only this row and open edit form
                          table.setRowSelection({ [row.id]: true });
                          setIsEditOpen(true);
                        }
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <h2 className="text-lg font-bold">No Data.</h2>
                  <p className="text-sm text-muted-foreground">
                    {hasFilters || Object.keys(filters).length > 0
                      ? "No matching records found."
                      : "Sorry, there is no data available at the moment."}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {printInReverse && table.getRowModel().rows?.length > 0 && (
            <TableBody className="hidden print:table-row-group">
              {[...table.getRowModel().rows].reverse().map((row) => (
                <TableRow
                  key={`print-${row.id}`}
                  className="break-inside-avoid"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      style={getCellStyles(cell.column.columnDef.meta)}
                      key={`print-${cell.id}`}
                      className={cn(
                        cell.column.id === "select" ? "print:hidden" : "",
                        cell.column.columnDef.meta?.className || ""
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>

        {/* Grouped Toppers Table (Only visible during print when toppersOnly is active) */}
        {toppersOnly && (
          <div className="hidden print:block w-full">
            <Table className="print:table w-full border-collapse">
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="w-[80px] border text-center font-bold">Sl.No.</TableHead>
                  <TableHead className="w-[180px] border font-bold">Class</TableHead>
                  <TableHead className="border font-bold">Toppers</TableHead>
                  <TableHead className="w-[100px] border text-right font-bold">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedTopperRows.map((group, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-center border py-2">{idx + 1}</TableCell>
                    <TableCell className="font-bold border bg-muted/5 py-2 uppercase">
                      {group.className}
                    </TableCell>
                    <TableCell className="border leading-relaxed py-2 font-normal text-foreground">
                      <div className="flex flex-col gap-1">
                        {group.students.map((student, sIdx) => (
                          <div key={sIdx} className="whitespace-nowrap">
                            {sIdx + 1}. [{student.id}] {student.name}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right border font-bold py-2 px-4 shadow-none">
                      {group.percentage.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {hasNextPage && table.getRowModel().rows?.length > 0 && (
          <div ref={loaderRef} className="w-full p-4 text-center print:hidden">
            {isLoadingMore ? (
              <div className="flex justify-center">
                <Loader className="animate-spin" size={24} />
              </div>
            ) : (
              <div className="h-8" />
            )}
          </div>
        )}
      </div>
      <div className="w-full flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Showing {displayedItemsCount} items{totalItemsText}
          {process.env.NODE_ENV === "development" && (
            <span className="ml-2 px-2 py-1 bg-muted rounded-full text-xs">
              {filterModeDisplay} | Page: {page} | HasNext:{" "}
              {hasNextPage.toString()}
            </span>
          )}
        </div>
      </div>
      {/* Detail View Modal for drill-down */}
      <Dialog open={!!detailView} onOpenChange={(open) => !open && setDetailView(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 md:p-6 pb-4 border-b bg-background z-50 shrink-0">
            <div className="flex items-start justify-between w-full relative">
              <DialogTitle className="flex flex-col text-left">
                {isMobile ? (
                  <div className="flex flex-col gap-0.5 pr-10">
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {detailView?.colHeader} Records
                    </span>
                    <span className="text-lg font-extrabold text-foreground leading-tight">
                      {detailView?.student?.name}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] font-bold">
                        {detailedRecords.length} {detailedRecords.length === 1 ? 'Record' : 'Records'}
                      </Badge>
                      {detailView?.student?._id && (
                        <span className="text-[10px] font-mono text-muted-foreground">ID: {detailView.student._id}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-xl font-bold">{detailView?.title}</span>
                    {detailView?.student?._id && (
                      <span className="text-xs font-mono text-muted-foreground">ID: {detailView.student._id}</span>
                    )}
                  </div>
                )}
              </DialogTitle>
              
              {!isMobile && (
                <div className="flex items-center gap-3">
                  {detailedRecords.length > 0 && (
                    <Badge variant="secondary" className="h-6">
                      {detailedRecords.length} Records
                    </Badge>
                  )}
                </div>
              )}

              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-8 w-8 rounded-full hover:bg-muted shrink-0 z-20",
                  isMobile ? "absolute right-0 top-0" : ""
                )}
                onClick={() => setDetailView(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-4 bg-muted/5">
            {detailsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-70" />
                <div className="space-y-1 text-center">
                  <p className="text-base font-semibold text-foreground">Loading Records</p>
                  <p className="text-sm text-muted-foreground animate-pulse">Syncing teacher details and subjects...</p>
                </div>
              </div>
            ) : detailedRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-lg bg-background">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <Search className="h-8 w-8 opacity-40" />
                </div>
                <p className="text-lg font-medium">No records found</p>
                <p className="text-sm">There are no matching entries for the selected filter.</p>
              </div>
            ) : (
              <div className="border rounded-xl shadow-sm bg-background overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[60px] font-bold text-center">Sl. No.</TableHead>
                      {detailView?.viewType === "studentList" ? (
                        <>
                          <TableHead className="w-[120px] font-bold">Student ID</TableHead>
                          <TableHead className="font-bold">Name</TableHead>
                          <TableHead className="font-bold">Class</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="w-[150px] font-bold">Date & Day</TableHead>
                          <TableHead className="font-bold">Subject</TableHead>
                          {(resource === "studentAttendances" || resource === "teacherAttendances") && (
                            <TableHead className="font-bold">
                              {resource === "teacherAttendances" ? "Class" : "Teacher"}
                            </TableHead>
                          )}
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedRecords.map((rec, i) => {
                      const isAbsent = rec.present === false;
                      return (
                        <TableRow 
                          key={i} 
                          className={cn(
                            "transition-colors",
                            isAbsent ? "bg-red-50/40 hover:bg-red-50/60 dark:bg-red-950/10 dark:hover:bg-red-950/20" : "hover:bg-muted/30"
                          )}
                        >
                          <TableCell className="text-center font-medium text-muted-foreground py-3">
                            {i + 1}
                          </TableCell>
                          {detailView?.viewType === "studentList" ? (
                            <>
                              <TableCell className="font-mono text-xs py-3">{rec.studentId || "—"}</TableCell>
                              <TableCell className="font-bold text-sm py-3 uppercase">{rec.studentName || rec.name || "—"}</TableCell>
                              <TableCell className="text-muted-foreground text-sm py-3 font-medium">{rec.className || "—"}</TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="font-medium whitespace-nowrap py-3">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold">{formatDateMonthYear(rec.date)}</span>
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {new Date(rec.date).toLocaleDateString(undefined, { weekday: 'long' })}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm">
                                    {rec.subjectName || "—"}
                                  </span>
                                  {rec.periodNumber && (
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                      PERIOD {rec.periodNumber}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              {(resource === "studentAttendances" || resource === "teacherAttendances") && (
                                <TableCell className="text-muted-foreground text-sm py-3">
                                  {resource === "teacherAttendances" ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="whitespace-nowrap font-medium">{rec.className || "—"}</span>
                                      {rec.leaveReason && (
                                        <span className="text-[10px] text-orange-500 font-medium leading-tight">
                                          {rec.leaveReason}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-bold text-sm">{rec.teacherName || "—"}</span>
                                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-tight">
                                        {rec.className || "—"}
                                      </span>
                                      {rec.leaveReason && (
                                        <span className="text-[10px] text-orange-500 font-medium leading-tight mt-0.5">
                                          {rec.leaveReason}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              )}
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Success Popup */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md w-[85vw] rounded-2xl">
          <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
            <div className="rounded-full bg-emerald-100 p-3 animate-in zoom-in duration-300">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold text-emerald-900">{successConfig.title}</DialogTitle>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {successConfig.message}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataTableComponent;
