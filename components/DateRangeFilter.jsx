import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function DateRangeFilter({
    value = {},
    onChange,
    className,
}) {
    const handleChange = (field, newVal) => {
        const updatedValue = { ...value, [field]: newVal };
        onChange(updatedValue);
    };

    return (
        <div className={cn("flex items-center space-x-2", className)}>
            <Input
                type="date"
                value={value?.startDate || ""}
                placeholder="Start date"
                onChange={(e) => handleChange("startDate", e.target.value)}
                className="w-40 h-9 text-sm" // Increased size
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
                type="date"
                value={value?.endDate || ""}
                placeholder="End date"
                onChange={(e) => handleChange("endDate", e.target.value)}
                className="w-40 h-9 text-sm" // Increased size
            />
        </div>
    );
}
