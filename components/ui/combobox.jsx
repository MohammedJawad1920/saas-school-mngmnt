"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function ComboBox({ items, value, onSelect, placeholder = "Select item..." }) {
    const [open, setOpen] = React.useState(false)

    // Items expected to be array of { value, label }
    const selectedLabel = items.find((item) => item.value === value)?.label

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedLabel || placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="w-[400px] p-0" 
                onWheel={(e) => e.stopPropagation()}
            >
                <Command>
                    <CommandInput placeholder={`Search...`} />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty>No item found.</CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={String(item.value)}
                                    value={String(item.label)} // Use label for searching
                                    onSelect={(currentValue) => {
                                        // We want to pass back the ID (value), not the label
                                        // But command uses the value prop for filtering usually. 
                                        // ShadCN's CommandItem `value` is the text to match against.
                                        // We need to map back to the ID.

                                        // Actually, simpler: pass item.value to onSelect
                                        onSelect(item.value === value ? "" : item.value)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === item.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {item.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
