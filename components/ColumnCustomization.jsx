import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { Sliders } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

const ColumnCustomization = ({ table, columnsConfig }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Sliders className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mx-4 max-h-[60vh] overflow-y-auto w-56" align="end">
        <DropdownMenuItem
          className="flex items-center space-x-2"
          onSelect={(event) => {
            event.preventDefault();
            table.toggleAllColumnsVisible(!table.getIsAllColumnsVisible());
          }}
        >
          <Checkbox
            checked={table.getIsAllColumnsVisible()}
            onCheckedChange={(value) => table.toggleAllColumnsVisible(!!value)}
            id="select-all-columns"
          />
          <label
            htmlFor="select-all-columns"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
          >
            Select All
          </label>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {columnsConfig.map((columnConfig) => {
          const columnId = columnConfig.id || columnConfig.accessorKey;
          if (!columnId) return null;

          const column = table.getColumn(columnId);

          // Skip if column doesn't exist in the table or cannot be hidden
          if (!column || !column.getCanHide()) return null;

          return (
            <DropdownMenuItem
              key={columnId}
              className="flex items-center space-x-2"
              onSelect={(event) => {
                event.preventDefault();
                column.toggleVisibility(!column.getIsVisible());
              }}
            >
              <Checkbox
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                id={`col-${columnId}`}
              />
              <label
                htmlFor={`col-${columnId}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 capitalize"
              >
                {(typeof columnConfig.header !== "function" && columnConfig.header) ||
                  columnConfig.id ||
                  columnConfig.accessorKey}
              </label>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnCustomization;
