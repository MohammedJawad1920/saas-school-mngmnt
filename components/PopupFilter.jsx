"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { MultiSelect } from "./ui/multi-select";

// Define all available operators
const OPERATORS = {
  EQUALS: "equals",
  NOT_EQUALS: "notEquals",
  CONTAINS: "contains",
  NOT_CONTAINS: "notContains",
  STARTS_WITH: "startsWith",
  ENDS_WITH: "endsWith",
  GREATER_THAN: "greaterThan",
  LESS_THAN: "lessThan",
  GREATER_THAN_OR_EQUAL: "greaterThanOrEqual",
  LESS_THAN_OR_EQUAL: "lessThanOrEqual",
  BETWEEN: "between",
  INCLUDES: "includes",
  EXCLUDES: "excludes",
  IS_EMPTY: "isEmpty",
  IS_NOT_EMPTY: "isNotEmpty",
  IS_NULL: "isNull",
  IS_NOT_NULL: "isNotNull",
  REGEX: "regex",
  DATE_RANGE: "dateRange",
};

// Default operators by input type
const DEFAULT_OPERATORS = {
  text: OPERATORS.CONTAINS,
  number: OPERATORS.EQUALS,
  date: OPERATORS.EQUALS,
  dateRange: OPERATORS.DATE_RANGE,
  select: OPERATORS.EQUALS,
  multiSelect: OPERATORS.INCLUDES,
  boolean: OPERATORS.EQUALS,
};

const getCurrentValue = (filterItem, currentFilter) => {
  if (currentFilter?.value !== undefined) return currentFilter.value;
  if (typeof currentFilter !== "object") return currentFilter;
  if (filterItem.inputType === "dateRange") {
    return { startDate: "", endDate: "" };
  }
  return filterItem.inputType === "multiSelect" ? [] : "";
};

// Normalize values for comparison
const normalizeValue = (val) => {
  if (val === undefined || val === null) return "";
  if (Array.isArray(val)) return val.length > 0 ? normalizeValue(val[0]) : "";
  if (typeof val === "object") {
    if (val._id) return String(val._id).trim();
    if (val.value) return String(val.value).trim();
    if (val.id) return String(val.id).trim();
  }
  return String(val).trim();
};

export default function PopupFilter({
  filterConfig = [],
  filters = {},
  setFilter,
  removeFilter,
  clearFilters,
  globalFilter,
  setGlobalFilter,
  hasFilters,
  title = "Table",
}) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  // Sync local filters with props
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Helper function to get filtered options based on dependent fields
  const getFilteredOptions = useCallback(
    (filterItem) => {
      // Handle legacy single filter
      if (filterItem.filter && (!filterItem.filters || filterItem.filters.length === 0)) {
        const dependentFieldName = filterItem.filter.dependentField;
        const key = filterItem.filter.key;
        const valueToMatch =
          localFilters[dependentFieldName]?.value ||
          localFilters[dependentFieldName];

        if (!valueToMatch) {
          return filterItem.options || [];
        }

        const normalizedValue = normalizeValue(valueToMatch);

        return (filterItem.options || []).filter((option) => {
          const rawOptionValue = key ? option?.[dependentFieldName]?.[key] : option?.[dependentFieldName];

          if (Array.isArray(rawOptionValue)) {
            return rawOptionValue.some(val => normalizeValue(val) === normalizedValue);
          }

          const normalizedOption = normalizeValue(rawOptionValue);
          const isMatch = normalizedOption === normalizedValue;
          return isMatch;
        });
      }

      if (!filterItem.filters || filterItem.filters.length === 0) {
        return filterItem.options || [];
      }

      // Handle multiple filters
      if (filterItem.filters && filterItem.filters.length > 0) {
        let filteredOptions = filterItem.options || [];

        // Apply each filter sequentially
        filterItem.filters.forEach((filter) => {
          const dependentFieldName = filter.dependentField;
          const key = filter.key;
          const valueToMatch =
            localFilters[dependentFieldName]?.value ||
            localFilters[dependentFieldName];

          if (valueToMatch) {
            const normalizedValue = normalizeValue(valueToMatch);

            filteredOptions = filteredOptions.filter((option) => {
              const rawOptionValue = key ? option?.[dependentFieldName]?.[key] : option?.[dependentFieldName];
              const normalizedOption = normalizeValue(rawOptionValue);
              return normalizedOption === normalizedValue;
            });
          }
        });

        // Always include currently selected options to prevent them from disappearing
        const currentValue = getCurrentValue(
          filterItem,
          localFilters[filterItem.id] || {}
        );
        const selectedOptions = (filterItem.options || []).filter((option) =>
          Array.isArray(currentValue)
            ? currentValue.includes(option.value)
            : currentValue === option.value
        );

        return [
          ...filteredOptions,
          ...selectedOptions.filter(
            (opt) => !filteredOptions.some((f) => f.value === opt.value)
          ),
        ];
      }
      return filterItem.options || [];
    },
    [localFilters]
  );

  // Enhanced filter change handler with dependent field support
  const handleFilterChange = useCallback(
    (filterId, value, operator, nestedArrayField) => {
      // Update local filters first
      const updatedLocalFilters = { ...localFilters, [filterId]: value };

      // Check for dependent filters that need to be reset
      filterConfig.forEach((filterItem) => {
        const dependentFields = [];

        // Collect all dependent fields from both single filter and filters array
        if (filterItem.filter?.dependentField) {
          dependentFields.push(filterItem.filter.dependentField);
        }
        if (filterItem.filters) {
          filterItem.filters.forEach((filter) => {
            if (filter.dependentField) {
              dependentFields.push(filter.dependentField);
            }
          });
        }

        // Check if this filter depends on the field that just changed
        if (dependentFields.includes(filterId)) {
          // Get the new filtered options for this dependent filter
          const newFilteredOptions = getFilteredOptionsForField(
            filterItem,
            updatedLocalFilters
          );

          // Reset dependent filter if current value is no longer valid
          const currentValue = updatedLocalFilters[filterItem.id];
          const isCurrentValueValid = newFilteredOptions.some(
            (option) =>
              option.value === currentValue ||
              option.id === currentValue ||
              (Array.isArray(currentValue) &&
                currentValue.some(
                  (val) => option.value === val || option.id === val
                ))
          );

          if (currentValue && !isCurrentValueValid) {
            updatedLocalFilters[filterItem.id] =
              filterItem.inputType === "multiSelect" ? [] : "";
            // Remove the filter from parent state
            removeFilter(filterItem.id);
          }
        }
      });

      setLocalFilters(updatedLocalFilters);

      // Handle the original filter logic
      if (
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === "object" &&
          value !== null &&
          Object.values(value).every(
            (v) => v === "" || v === null || v === undefined
          )) ||
        value === undefined ||
        value === null
      ) {
        removeFilter(filterId);
      } else {
        setFilter(filterId, value, operator, nestedArrayField);
      }
    },
    [setFilter, removeFilter, localFilters, filterConfig]
  );

  // Helper function to get filtered options for a specific field (used in reset logic)
  const getFilteredOptionsForField = useCallback(
    (filterItem, currentFilters) => {
      // Handle legacy single filter
      if (filterItem.filter && !filterItem.filters) {
        const dependentFieldName = filterItem.filter.dependentField;
        const key = filterItem.filter.key;
        const dependentValue =
          currentFilters[dependentFieldName]?.value ||
          currentFilters[dependentFieldName];

        if (!dependentValue) {
          return filterItem.options || [];
        }

        const normalizedDependentValue = normalizeValue(dependentValue);

        return (filterItem.options || []).filter((option) => {
          const rawOptionValue = key
            ? option?.[dependentFieldName]?.[key]
            : option?.[dependentFieldName];

          if (Array.isArray(rawOptionValue)) {
            return rawOptionValue.some(
              (val) => normalizeValue(val) === normalizedDependentValue
            );
          }

          return normalizeValue(rawOptionValue) === normalizedDependentValue;
        });
      }

      // Handle multiple filters
      if (filterItem.filters && filterItem.filters.length > 0) {
        let filteredOptions = filterItem.options || [];

        filterItem.filters.forEach((filter) => {
          const dependentFieldName = filter.dependentField;
          const key = filter.key;
          const valueToMatch =
            currentFilters[dependentFieldName]?.value ||
            currentFilters[dependentFieldName];

          if (valueToMatch) {
            const normalizedValue = normalizeValue(valueToMatch);
            filteredOptions = filteredOptions.filter((option) => {
              const rawOptionValue = key
                ? option?.[dependentFieldName]?.[key]
                : option?.[dependentFieldName];

              if (Array.isArray(rawOptionValue)) {
                return rawOptionValue.some(
                  (val) => normalizeValue(val) === normalizedValue
                );
              }

              return normalizeValue(rawOptionValue) === normalizedValue;
            });
          }
        });

        return filteredOptions;
      }

      return filterItem.options || [];
    },
    []
  );

  // Handle date range change
  const handleDateRangeChange = useCallback(
    (filterId, field, value, currentValue, operator, nestedArrayField) => {
      console.log(currentValue);
      const updatedValue = { ...currentValue, [field]: value };
      if (updatedValue.startDate || updatedValue.endDate) {
        handleFilterChange(filterId, updatedValue, operator, nestedArrayField);
      } else {
        removeFilter(filterId);
      }
    },
    [handleFilterChange, removeFilter]
  );

  // Handle clearing filters and closing the dialog
  const handleClearFilters = useCallback(() => {
    clearFilters();
    setLocalFilters({});
    setOpen(false);
  }, [clearFilters]);

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant={hasFilters ? "default" : "outline"} size="sm">
              <Filter className="h-4 w-4" />
              {hasFilters && (
                <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">
                  {Object.keys(filters).length}
                </span>
              )}
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-3xl w-[95vw]">
            <DialogHeader>
              <DialogTitle>Filter {title}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Individual Filters */}
              {filterConfig.map((filterItem) => {
                const filterId = filterItem.id;
                const currentFilter = filters[filterId] || {};
                const currentValue = getCurrentValue(filterItem, currentFilter);

                const displayName = filterItem.label || filterId;
                const inputType = filterItem.inputType || "text";
                const operator =
                  currentFilter.operator ||
                  filterItem.operator ||
                  DEFAULT_OPERATORS[inputType] ||
                  OPERATORS.CONTAINS;
                const availableOptions = getFilteredOptions(filterItem);
                const type = filterItem.type || "text";
                const nestedArrayField = filterItem.nestedArrayField || null;
                const className = filterItem.className || "";

                return (
                  <div key={filterId} className={`space-y-2 ${className}`}>
                    <label className="text-sm font-medium block">
                      {displayName}
                    </label>

                    {inputType === "dateRange" ? (
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="date"
                            value={currentValue.startDate || ""}
                            placeholder="Start date"
                            onChange={(e) =>
                              handleDateRangeChange(
                                filterId,
                                "startDate",
                                e.target.value,
                                currentValue,
                                OPERATORS.DATE_RANGE,
                                nestedArrayField
                              )
                            }
                            className="flex-1 h-8 text-xs"
                          />
                          <span className="text-xs">to</span>
                          <Input
                            type="date"
                            value={currentValue.endDate || ""}
                            placeholder="End date"
                            onChange={(e) =>
                              handleDateRangeChange(
                                filterId,
                                "endDate",
                                e.target.value,
                                currentValue,
                                OPERATORS.DATE_RANGE,
                                nestedArrayField
                              )
                            }
                            className="flex-1 h-8 text-xs"
                          />
                        </div>
                      </div>
                    ) : inputType === "multiSelect" ||
                      inputType === "select" ? (
                      <MultiSelect
                        options={availableOptions}
                        value={currentValue}
                        onValueChange={(value) =>
                          handleFilterChange(
                            filterId,
                            value,
                            operator,
                            nestedArrayField
                          )
                        }
                        placeholder={`Select ${displayName}...`}
                        multiSelect={inputType === "multiSelect"}
                      />
                    ) : (
                      <Input
                        placeholder={`Filter by ${displayName}...`}
                        value={currentValue}
                        type={type}
                        onChange={(e) =>
                          handleFilterChange(
                            filterId,
                            e.target.value,
                            operator,
                            nestedArrayField
                          )
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={handleClearFilters}>
                Clear All
              </Button>
              <Button onClick={() => setOpen(false)}>Apply Filters</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
