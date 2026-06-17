import * as React from "react";
import {
  CheckIcon,
  XCircle,
  ChevronDown,
  XIcon,
  Search,
  WandSparkles,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Variants for the multi-select component to handle different styles.
 */
const multiSelectVariants = (variant) => {
  const baseClasses =
    "m-1 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-300";

  const variantClasses = {
    default: "border-foreground/10 text-foreground bg-card hover:bg-card/80",
    secondary:
      "border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive:
      "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    inverted: "inverted",
    freeSolo:
      "border-dashed border-primary/50 bg-primary/5 text-primary hover:bg-primary/10",
  };

  return cn(baseClasses, variantClasses[variant || "default"]);
};

export const MultiSelect = React.forwardRef(
  (
    {
      options,
      onValueChange,
      variant,
      placeholder = "Select options",
      animation = 0,
      maxCount = Infinity,
      asChild = false,
      className,
      disableSearch = false,
      multiSelect = true,
      value,
      freeSolo = false,
      showSelectedCount = false,
      freeSoloValidator = null, // Function to validate free solo input
      freeSoloTransformer = null, // Function to transform free solo input
      freeSoloPlaceholder = "Type to add option...",
      allowDuplicates = false,
      minLength = 1,
      maxLength = 50,
      caseSensitive = false,
      readOnly = false,
      onOptionDelete = null,
      ...props
    },
    ref
  ) => {
    // Use a memoized default value to avoid recreation on every render
    const defaultValue = React.useMemo(() => (multiSelect ? [] : ""), [multiSelect]);
    const effectiveValue = value ?? defaultValue;

    const [selectedValues, setSelectedValues] = React.useState(effectiveValue);
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [isAnimating, setIsAnimating] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [menuItems, setMenuItems] = React.useState(options || []);
    const [inputError, setInputError] = React.useState("");

    React.useEffect(() => {
      setMenuItems(options);
    }, [options]);

    React.useEffect(() => {
      // Only update if the value actually changed to avoid infinite loops
      // Simple reference check first, then content check for arrays
      if (value !== undefined && value !== null) {
        if (multiSelect && Array.isArray(value)) {
          if (JSON.stringify(value) !== JSON.stringify(selectedValues)) {
            setSelectedValues(value);
          }
        } else if (value !== selectedValues) {
          setSelectedValues(value);
        }
      } else if (selectedValues !== defaultValue) {
        setSelectedValues(defaultValue);
      }
    }, [value, multiSelect, defaultValue, selectedValues]);

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery) return menuItems;
      return menuItems.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [menuItems, searchQuery]);

    // Check if current search query can be added as a new option
    const canAddNewOption = React.useMemo(() => {
      if (!freeSolo || !searchQuery.trim()) return false;

      const trimmedQuery = searchQuery.trim();

      // Length validation
      if (trimmedQuery.length < minLength || trimmedQuery.length > maxLength) {
        return false;
      }

      // Check for duplicates
      const compareValue = caseSensitive
        ? trimmedQuery
        : trimmedQuery.toLowerCase();
      const existsInOptions = menuItems.some((option) =>
        caseSensitive
          ? option.value === trimmedQuery
          : option.value.toLowerCase() === compareValue
      );
      const existsInSelected = multiSelect
        ? selectedValues.some((value) =>
          caseSensitive
            ? value === trimmedQuery
            : value.toLowerCase() === compareValue
        )
        : caseSensitive
          ? selectedValues === trimmedQuery
          : selectedValues.toLowerCase() === compareValue;

      if (!allowDuplicates && (existsInOptions || existsInSelected)) {
        return false;
      }

      // Custom validation
      if (freeSoloValidator && !freeSoloValidator(trimmedQuery)) {
        return false;
      }

      return true;
    }, [
      searchQuery,
      freeSolo,
      minLength,
      maxLength,
      caseSensitive,
      allowDuplicates,
      menuItems,
      selectedValues,
      multiSelect,
      freeSoloValidator,
    ]);

    // Validate input and set error message
    const validateInput = (input) => {
      const trimmedInput = input.trim();

      if (!trimmedInput) {
        setInputError("");
        return;
      }

      if (trimmedInput.length < minLength) {
        setInputError(`Minimum ${minLength} characters required`);
        return;
      }

      if (trimmedInput.length > maxLength) {
        setInputError(`Maximum ${maxLength} characters allowed`);
        return;
      }

      const compareValue = caseSensitive
        ? trimmedInput
        : trimmedInput.toLowerCase();
      const existsInOptions = menuItems.some((option) =>
        caseSensitive
          ? option.value === trimmedInput
          : option.value.toLowerCase() === compareValue
      );
      const existsInSelected = multiSelect
        ? selectedValues.some((value) =>
          caseSensitive
            ? value === trimmedInput
            : value.toLowerCase() === compareValue
        )
        : caseSensitive
          ? selectedValues === trimmedInput
          : selectedValues.toLowerCase() === compareValue;

      if (!allowDuplicates && (existsInOptions || existsInSelected)) {
        setInputError("Option already exists");
        return;
      }

      if (freeSoloValidator && !freeSoloValidator(trimmedInput)) {
        setInputError("Invalid input");
        return;
      }

      setInputError("");
    };

    // Add new option from free solo input
    const addNewOption = (inputValue) => {
      const trimmedValue = inputValue.trim();
      if (!trimmedValue || !canAddNewOption) return;

      // Transform the value if transformer is provided
      const finalValue = freeSoloTransformer
        ? freeSoloTransformer(trimmedValue)
        : trimmedValue;

      // Add to selected values
      const newSelectedValues = multiSelect
        ? [...selectedValues, finalValue]
        : finalValue;

      setSelectedValues(newSelectedValues);
      onValueChange(newSelectedValues);

      // Add to menu items for future reference
      setMenuItems((prevItems) => [
        ...prevItems,
        {
          label: finalValue,
          value: finalValue,
          isCustom: true, // Mark as custom option
        },
      ]);

      // Clear search
      setSearchQuery("");
      setInputError("");
    };

    const handleSearchInputKeyDown = (event) => {
      if (event.key === "Enter" && freeSolo) {
        event.preventDefault();
        addNewOption(searchQuery);
      } else if (event.key === "Backspace" && !searchQuery && multiSelect) {
        // Remove last selected item when backspacing with empty input
        const newSelectedValues = [...selectedValues];
        newSelectedValues.pop();
        setSelectedValues(newSelectedValues);
        onValueChange(newSelectedValues);
      } else if (event.key === "Escape") {
        setSearchQuery("");
        setInputError("");
        setIsPopoverOpen(false);
      }
    };

    const handleSearchChange = (e) => {
      const newValue = e.target.value;
      setSearchQuery(newValue);
      if (freeSolo) {
        validateInput(newValue);
      }
    };

    const toggleOption = (option) => {
      const newSelectedValues = multiSelect
        ? selectedValues.includes(option)
          ? selectedValues.filter((value) => value !== option)
          : [...selectedValues, option]
        : option;

      setSelectedValues(newSelectedValues);
      onValueChange(newSelectedValues);

      if (!multiSelect) {
        setIsPopoverOpen(false);
      }
    };

    const handleClear = () => {
      setSelectedValues(multiSelect ? [] : "");
      onValueChange(multiSelect ? [] : "");
      setSearchQuery("");
      setInputError("");
    };

    const clearExtraOptions = () => {
      const newSelectedValues = multiSelect
        ? selectedValues.slice(0, maxCount)
        : selectedValues;

      setSelectedValues(newSelectedValues);
      onValueChange(newSelectedValues);
    };

    const toggleAll = () => {
      if (selectedValues.length === menuItems.length) {
        handleClear();
      } else {
        const allValues = menuItems.map((option) => option.value);
        setSelectedValues(allValues);
        onValueChange(allValues);
      }
    };

    // Determine badge variant for custom options
    const getBadgeVariant = (value) => {
      const option = menuItems.find((o) => o.value === value);
      return option?.isCustom ? "freeSolo" : variant;
    };

    return (
      <Popover
        open={isPopoverOpen}
        onOpenChange={(open) => {
          if (!readOnly) {
            setIsPopoverOpen(open);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            {...props}
            onClick={() => {
              if (!readOnly) setIsPopoverOpen(!isPopoverOpen);
            }}
            className={cn(
              "flex w-full p-1 rounded-md border min-h-10 h-auto items-center justify-between bg-inherit hover:bg-inherit [&_svg]:pointer-events-auto",
              className
            )}
          >
            {selectedValues &&
              (multiSelect
                ? selectedValues.length > 0
                : selectedValues !== "" &&
                selectedValues !== null &&
                selectedValues !== undefined) ? (
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-wrap items-center">
                  {/* Handle multiSelect = true (array) */}
                  {multiSelect && !showSelectedCount ? (
                    selectedValues.slice(0, maxCount).map((value) => {
                      const option = menuItems.find((o) => o.value === value);
                      const IconComponent = option?.icon;
                      const badgeVariant = getBadgeVariant(value);

                      return (
                        <Badge
                          key={value}
                          className={cn(
                            isAnimating ? "animate-bounce" : "",
                            multiSelectVariants(badgeVariant)
                          )}
                          style={{ animationDuration: `${animation}s` }}
                          title={option?.isCustom ? "Custom option" : ""}
                        >
                          {IconComponent && (
                            <IconComponent className="h-4 w-4 mr-2" />
                          )}
                          {option?.label || value}
                          <XCircle
                            className="ml-2 h-4 w-4 cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!readOnly) toggleOption(value);
                            }}
                          />
                        </Badge>
                      );
                    })
                  ) : multiSelect && showSelectedCount ? (
                    <Badge
                      className={cn(
                        isAnimating ? "animate-bounce" : "",
                        multiSelectVariants(variant)
                      )}
                      style={{ animationDuration: `${animation}s` }}
                    >
                      {`${selectedValues.length} selected`}
                      <XCircle
                        className="ml-2 h-4 w-4 cursor-pointer"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!readOnly) handleClear();
                        }}
                      />
                    </Badge>
                  ) : (
                    // Handle multiSelect = false (single value)
                    (() => {
                      const option = menuItems.find(
                        (o) => o.value === selectedValues
                      );
                      const IconComponent = option?.icon;
                      const badgeVariant = getBadgeVariant(selectedValues);

                      return (
                        <Badge
                          className={cn(
                            isAnimating ? "animate-bounce" : "",
                            multiSelectVariants(badgeVariant)
                          )}
                          style={{ animationDuration: `${animation}s` }}
                          title={option?.isCustom ? "Custom option" : ""}
                        >
                          {IconComponent && (
                            <IconComponent className="h-4 w-4 mr-2" />
                          )}
                          {option?.label ||
                            (typeof selectedValues === "object"
                              ? selectedValues?.label ||
                              selectedValues?.name ||
                              JSON.stringify(selectedValues)
                              : selectedValues)}
                          <XCircle
                            className="ml-2 h-4 w-4 cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!readOnly) handleClear();
                            }}
                          />
                        </Badge>
                      );
                    })()
                  )}
                  {/* Show `+ more` badge only for multiSelect mode */}
                  {multiSelect && selectedValues.length > maxCount && (
                    <Badge
                      className={cn(
                        "bg-transparent text-foreground border-foreground/1 hover:bg-transparent",
                        isAnimating ? "animate-bounce" : "",
                        multiSelectVariants(variant)
                      )}
                      style={{ animationDuration: `${animation}s` }}
                    >
                      {`${selectedValues.length - maxCount} more`}
                      <XCircle
                        className="ml-2 h-4 w-4 cursor-pointer"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!readOnly) clearExtraOptions();
                        }}
                      />
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <XIcon
                    className="h-4 mx-2 cursor-pointer text-muted-foreground"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!readOnly) handleClear();
                    }}
                  />
                  <Separator
                    orientation="vertical"
                    className="flex min-h-6 h-full"
                  />
                  <ChevronDown className="h-4 mx-2 cursor-pointer text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full mx-auto">
                <span className="text-sm text-muted-foreground mx-3">
                  {placeholder}
                </span>
                <ChevronDown className="h-4 cursor-pointer text-muted-foreground mx-2" />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          onEscapeKeyDown={() => setIsPopoverOpen(false)}
          portalled={false}
        >
          <div className="flex flex-col">
            {/* Search input */}
            {!disableSearch && (
              <div className="flex flex-col border-b">
                <div className="flex items-center px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    className="flex z-40 h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={freeSolo ? freeSoloPlaceholder : "Search..."}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchInputKeyDown}
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                </div>
                {/* Error message */}
                {inputError && (
                  <div className="px-3 pb-2 text-xs text-destructive">
                    {inputError}
                  </div>
                )}
                {/* Add new option hint */}
                {freeSolo && canAddNewOption && (
                  <div className="px-3 pb-2 text-xs text-muted-foreground">
                    Press Enter to add "{searchQuery.trim()}"
                  </div>
                )}
              </div>
            )}

            {/* Options list */}
            <div
              className="overflow-y-auto max-h-60"
              style={{
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-y",
                overscrollBehavior: "contain",
              }}
            >
              {/* Add new option button for free solo */}
              {freeSolo && canAddNewOption && (
                <div className="p-1 border-b">
                  <div
                    className="flex items-center rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground border-dashed border border-primary/50 bg-primary/5"
                    onClick={() => addNewOption(searchQuery)}
                  >
                    <Plus className="mr-2 h-4 w-4 text-primary" />
                    <span className="text-primary">
                      Add "{searchQuery.trim()}"
                    </span>
                  </div>
                </div>
              )}

              {filteredOptions.length === 0 && !canAddNewOption && (
                <div className="py-6 text-center text-sm">
                  No results found.
                </div>
              )}

              <div className="p-1">
                {multiSelect && filteredOptions.length > 0 && (
                  <div
                    className="flex items-center rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    onClick={toggleAll}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        selectedValues.length === menuItems.length
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50"
                      )}
                    >
                      {selectedValues.length === menuItems.length && (
                        <CheckIcon className="h-4 w-4" />
                      )}
                    </div>
                    <span>(Select All)</span>
                  </div>
                )}
                {filteredOptions.map((option) => {
                  const isSelected = multiSelect
                    ? selectedValues.includes(option.value)
                    : option.value === selectedValues;

                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "flex items-center rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                        option.isCustom &&
                        "bg-primary/5 border-l-2 border-primary/20"
                      )}
                      onClick={() => {
                        if (!readOnly) toggleOption(option.value);
                      }}
                      title={option.isCustom ? "Custom option" : ""}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}
                      >
                        {isSelected && <CheckIcon className="h-4 w-4" />}
                      </div>
                      {option.icon && (
                        <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      )}
                      <span
                        className={cn(
                          "flex-1",
                          option.isCustom && "text-primary font-medium"
                        )}
                      >
                        {option.label}
                      </span>
                      {onOptionDelete && !option.isCustom && (
                        <div
                          className="ml-2 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOptionDelete(option.value);
                          }}
                          title={`Remove ${option.label} from list`}
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </div>
                      )}
                      {option.isCustom && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          Custom
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t">
              <div className="flex items-center">
                {selectedValues.length > 0 && (
                  <>
                    <button
                      className="flex-1 py-2 text-sm justify-center cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center"
                      onClick={handleClear}
                    >
                      Clear
                    </button>
                    <Separator orientation="vertical" className="h-8" />
                  </>
                )}
                <button
                  className="flex-1 py-2 text-sm justify-center cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center"
                  onClick={() => setIsPopoverOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </PopoverContent>
        {animation > 0 && selectedValues.length > 0 && (
          <WandSparkles
            className={cn(
              "cursor-pointer my-2 text-foreground bg-background w-3 h-3",
              isAnimating ? "" : "text-muted-foreground"
            )}
            onClick={() => setIsAnimating(!isAnimating)}
          />
        )}
      </Popover>
    );
  }
);

MultiSelect.displayName = "MultiSelect";
