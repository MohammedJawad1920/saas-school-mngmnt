import React from "react";
import { Input } from "@/components/ui/input";

const RangeInput = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  disabled = false,
  placeholder = {},
  type = "number",
  fromLabel = "From",
  toLabel = "To",
  ...props
}) => {
  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    return new Date().toISOString().split("T")[0];
  };

  // Helper function to format date for display
  const formatDateForDisplay = (dateString) => {
    if (!dateString || dateString === "") return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Helper function to get default values based on type
  const getDefaultValues = () => {
    if (type === "date") {
      const today = getTodayString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split("T")[0];
      return { from: today, to: tomorrowString };
    } else if (type === "number") {
      return { from: min || 0, to: max || 100 };
    } else {
      return { from: "", to: "" };
    }
  };

  // Parse the current value - it should be an object like { from: 10, to: 50 }
  // If value is not provided or malformed, create a default structure
  const currentValue = React.useMemo(() => {
    if (!value || typeof value !== "object") {
      return getDefaultValues();
    }
    return {
      from: value.from ?? getDefaultValues().from,
      to: value.to ?? getDefaultValues().to,
    };
  }, [value, min, max, type]);

  // Handle changes to the "from" input
  const handleFromChange = (newFromValue) => {
    let processedValue = newFromValue;

    // Type-specific processing
    if (type === "number") {
      processedValue = newFromValue === "" ? "" : parseFloat(newFromValue) || 0;
    } else if (type === "date") {
      // For dates, keep the string value as-is since HTML date inputs handle the format
      processedValue = newFromValue;
    }

    const updatedValue = {
      ...currentValue,
      from: processedValue,
    };

    // Type-specific validation
    if (
      type === "number" &&
      processedValue !== "" &&
      currentValue.to !== "" &&
      processedValue > currentValue.to
    ) {
      updatedValue.to = processedValue;
    } else if (
      type === "date" &&
      processedValue &&
      currentValue.to &&
      new Date(processedValue) > new Date(currentValue.to)
    ) {
      // For dates, if the "from" date is after the "to" date, set "to" to the same date
      updatedValue.to = processedValue;
    }

    onChange(updatedValue);
  };

  // Handle changes to the "to" input
  const handleToChange = (newToValue) => {
    let processedValue = newToValue;

    // Type-specific processing
    if (type === "number") {
      processedValue = newToValue === "" ? "" : parseFloat(newToValue) || 0;
    } else if (type === "date") {
      // For dates, keep the string value as-is
      processedValue = newToValue;
    }

    const updatedValue = {
      ...currentValue,
      to: processedValue,
    };

    // Type-specific validation
    if (
      type === "number" &&
      processedValue !== "" &&
      currentValue.from !== "" &&
      processedValue < currentValue.from
    ) {
      updatedValue.from = processedValue;
    } else if (
      type === "date" &&
      processedValue &&
      currentValue.from &&
      new Date(processedValue) < new Date(currentValue.from)
    ) {
      // For dates, if the "to" date is before the "from" date, set "from" to the same date
      updatedValue.from = processedValue;
    }

    onChange(updatedValue);
  };

  // Calculate duration for date ranges (helpful user feedback)
  const getDurationDisplay = () => {
    if (type === "date" && currentValue.from && currentValue.to) {
      try {
        const fromDate = new Date(currentValue.from);
        const toDate = new Date(currentValue.to);
        const diffTime = Math.abs(toDate - fromDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Same day";
        if (diffDays === 1) return "1 day";
        return `${diffDays} days`;
      } catch {
        return "";
      }
    }
    return "";
  };

  // Determine what to show in the summary
  const getSummaryDisplay = () => {
    if (type === "date" && currentValue.from && currentValue.to) {
      const fromDisplay = formatDateForDisplay(currentValue.from);
      const toDisplay = formatDateForDisplay(currentValue.to);
      const duration = getDurationDisplay();
      return `${fromDisplay} to ${toDisplay} (${duration})`;
    } else if (currentValue.from !== "" && currentValue.to !== "") {
      return `Range: ${currentValue.from}${unit} - ${currentValue.to}${unit}`;
    }
    return "";
  };

  return (
    <div className="w-full space-y-2">
      {/* Two input fields side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* From input */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground block">
            {fromLabel}
          </label>
          <div className="relative">
            <Input
              type={type}
              value={currentValue.from}
              onChange={(e) => handleFromChange(e.target.value)}
              placeholder={
                placeholder.from ||
                (type === "date" ? "Start date" : `Min ${unit}`.trim())
              }
              disabled={disabled}
              min={min}
              max={max}
              step={step}
              className={unit && type !== "date" ? "pr-8" : ""}
              {...props}
            />
            {unit && type !== "date" && (
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                {unit}
              </span>
            )}
          </div>
        </div>

        {/* To input */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground block">
            {toLabel}
          </label>
          <div className="relative">
            <Input
              type={type}
              value={currentValue.to}
              onChange={(e) => handleToChange(e.target.value)}
              placeholder={
                placeholder.to ||
                (type === "date" ? "End date" : `Max ${unit}`.trim())
              }
              disabled={disabled}
              min={type === "date" ? currentValue.from : min} // For dates, min of "to" should be the "from" value
              max={max}
              step={step}
              className={unit && type !== "date" ? "pr-8" : ""}
              {...props}
            />
            {unit && type !== "date" && (
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                {unit}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced summary display with type-specific formatting */}
      {getSummaryDisplay() && (
        <div className="text-xs text-center text-muted-foreground bg-muted/30 rounded-md px-2 py-1">
          {getSummaryDisplay()}
        </div>
      )}
    </div>
  );
};

export default RangeInput;
