import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Predefined color palette
const DEFAULT_COLORS = [
  // Original Vibrant Colors
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57", 
  "#ff9ff3", "#54a0ff", "#5f27cd", "#00d2d3", "#ff9f43", 
  "#2ed573", "#ffa502", "#3742fa", "#2f3542", "#ff4757", 
  "#7bed9f", "#70a1ff", "#5352ed", "#ffffff", "#000000",
  // New Vibrant & Modern Colors
  "#1dd1a1", "#ff6b6b", "#feca57", "#ff9ff3", "#ff9f43",
  "#ee5253", "#0abde3", "#10ac84", "#5f27cd", "#341f97",
  "#01a3a4", "#2e86de", "#c56cf0", "#ffb8b8", "#ff3838",
  "#ff9f1a", "#ffffff", "#7d5fff", "#7158e2", "#3de1ad",
  "#32ff7e", "#3ae374", "#67e6dc", "#17c0eb", "#18dcff",
  "#ff4d4d", "#ffaf40", "#fffa65", "#32ff7e", "#7efff5",
  "#18dcff", "#7d5fff", "#cd84f1", "#ffcccc", "#ffb8b8",
  "#ff9f1a", "#ffaf40", "#fffa65", "#fff200", "#32ff7e",
  "#7efff5", "#18dcff", "#7d5fff", "#c56cf0", "#ffb8b8"
];

export const ColorInput = React.forwardRef(
  (
    {
      name,
      value = "#000000",
      onChange,
      onBlur,
      disabled = false,
      readOnly = false,
      placeholder = "Select a color",
      showPalette = true,
      customColors = [],
      className,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(value || "#000000");

    const colors = customColors.length > 0 ? customColors : DEFAULT_COLORS;

    // Update input value when prop value changes
    React.useEffect(() => {
      setInputValue(value || "#000000");
    }, [value]);

    const handleColorSelect = (color) => {
      const upperColor = color.toUpperCase();
      setInputValue(upperColor);
      onChange?.(upperColor);
      setOpen(false);
    };

    const handleInputChange = (e) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // Always call onChange to update the form, even for invalid colors
      onChange?.(newValue);
    };

    const handleInputBlur = (e) => {
      // Ensure valid hex color on blur
      let finalValue = inputValue;
      if (inputValue && !/^#[0-9A-Fa-f]{6}$/.test(inputValue)) {
        // If invalid, try to fix common issues
        if (inputValue.startsWith("#") && inputValue.length === 4) {
          // Convert #RGB to #RRGGBB
          const shortHex = inputValue.slice(1);
          finalValue =
            "#" +
            shortHex
              .split("")
              .map((char) => char + char)
              .join("");
        } else if (
          !inputValue.startsWith("#") &&
          /^[0-9A-Fa-f]{6}$/.test(inputValue)
        ) {
          // Add missing #
          finalValue = "#" + inputValue;
        } else if (
          !inputValue.startsWith("#") &&
          /^[0-9A-Fa-f]{3}$/.test(inputValue)
        ) {
          // Convert RGB to #RRGGBB
          finalValue =
            "#" +
            inputValue
              .split("")
              .map((char) => char + char)
              .join("");
        } else {
          // If still invalid, keep the current value but don't auto-correct
          finalValue = inputValue;
        }

        if (finalValue !== inputValue) {
          setInputValue(finalValue);
          onChange?.(finalValue);
        }
      }
      onBlur?.(e);
    };

    const isValidColor = (color) => {
      return /^#[0-9A-Fa-f]{6}$/.test(color);
    };

    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {/* Color Preview */}
        <div
          className="w-10 h-10 rounded-md border-2 border-gray-300 flex items-center justify-center cursor-pointer"
          style={{
            backgroundColor: isValidColor(inputValue) ? inputValue : "#ffffff",
          }}
          onClick={() => !disabled && !readOnly && setOpen(true)}
        >
          {!isValidColor(inputValue) && (
            <Palette className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Text Input */}
        <Input
          ref={ref}
          name={name}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className="flex-1"
          {...props}
        />

        {/* Color Picker Popover */}
        {showPalette && !disabled && !readOnly && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="px-2"
                disabled={disabled}
              >
                <Palette className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Choose a color</Label>

                {/* Native Color Picker */}
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={isValidColor(inputValue) ? inputValue : "#000000"}
                    onChange={(e) => handleColorSelect(e.target.value)}
                    className="w-12 h-8 rounded border cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">Custom color</span>
                </div>

                {/* Predefined Color Palette */}
                <div>
                  <Label className="text-xs text-gray-500 mb-2 block">
                    Preset colors
                  </Label>
                  <div className="grid grid-cols-10 gap-1">
                    {colors.map((color, index) => (
                      <button
                        key={index}
                        type="button"
                        className={cn(
                          "w-6 h-6 rounded-sm border-2 relative hover:scale-110 transition-transform",
                          value === color
                            ? "border-gray-900"
                            : "border-gray-300"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorSelect(color)}
                        title={color}
                      >
                        {value === color && (
                          <Check className="w-3 h-3 text-white absolute inset-0 m-auto drop-shadow-sm" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }
);

ColorInput.displayName = "ColorInput";

export default ColorInput;
