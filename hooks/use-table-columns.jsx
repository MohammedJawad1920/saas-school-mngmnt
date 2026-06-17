import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, ExternalLink, Pencil, Trash, User, Phone, MessageCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { CLASS_ORDER } from "@/lib/utils";

const SaveContactButton = ({ number, altNumber, name }) => {
    const [href, setHref] = useState("");
    const [download, setDownload] = useState(undefined);

    useEffect(() => {
        if (!number) return;
        
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        let fallbackUrl = `${window.location.origin}/api/vcard?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(number)}`;
        if (altNumber) {
            fallbackUrl += `&altPhone=${encodeURIComponent(altNumber)}`;
        }

        if (isAndroid) {
            let intentStr = `intent:#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/contact;S.name=${encodeURIComponent(name)};S.phone=${encodeURIComponent(number)}`;
            if (altNumber) {
                intentStr += `;S.secondary_phone=${encodeURIComponent(altNumber)}`;
            }
            intentStr += `;S.com.android.contacts.extra.ACCOUNT_TYPE=com.google;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
            setHref(intentStr);
        } else {
            setHref(fallbackUrl);
            if (!isIOS) {
                setDownload(`${name}.vcf`);
            }
        }
    }, [name, number, altNumber]);

    if (!href) return <button className="text-indigo-300 p-2 block print:hidden" onClick={(e) => e.stopPropagation()}><UserPlus className="w-5 h-5" /></button>;

    return (
        <a
            href={href}
            download={download}
            onClick={(e) => e.stopPropagation()}
            className="text-indigo-500 hover:text-indigo-700 p-2 block print:hidden"
            title="Save Contact"
        >
            <UserPlus className="w-5 h-5" />
        </a>
    );
};

const useTableColumns = (columnConfig, onCellClick) => {
  return columnConfig.map((col) => {
    let columnDefinition = { ...col };

    // Handle checkboxes (for row selection)
    if (col.type?.includes("checkbox")) {
      columnDefinition.enableSorting = false;
      columnDefinition.enableHiding = false;
      columnDefinition.meta = { className: "print:hidden" };

      columnDefinition.header = ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      );

      columnDefinition.cell = ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      );
    }

    // Handle Serial Number Column (Dynamically generated)
    if (col.type?.includes("serialNo")) {
      columnDefinition.cell = ({ row, table }) => {
        const sortedRows = table.getSortedRowModel().flatRows;
        const index = sortedRows.findIndex((r) => r.id === row.id);
        return <div className="font-medium">{index + 1}</div>;
      };
    }

    // Apply sorting if type includes "sortable"
    if (col.type?.includes("sortable")) {
      columnDefinition.sortingFn = col.sortingFn || "alphanumeric";
      columnDefinition.header = ({ column }) => (
        <div className="flex items-center ">
          <span>{col.header}</span>
          <Button
            className="px-0 ml-1 print:hidden"
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    // Apply currency formatting if type includes "currency"
    if (col.type?.includes("currency")) {
      columnDefinition.cell = ({ row }) => {
        const amount = parseFloat(row.getValue(col.accessorKey));
        return (
          <div className="font-medium">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "INR",
            }).format(amount)}
          </div>
        );
      };
    }

    if (col.type?.includes("array")) {
      columnDefinition.cell = ({ row }) => {
        const value = row.getValue(col.accessorKey);

        const displayValue = Array.isArray(value)
          ? value.join(", ")
          : value || "-";
        if (col.type?.includes("vertical")) {
          return (
            <div className="scrollable">
              {Array.isArray(value) ? (
                value.map((item, index) => <div key={index}>{item}</div>)
              ) : (
                <span>{displayValue}</span>
              )}
            </div>
          );
        }
        return <div>{displayValue}</div>;
      };
    }

    // Apply list if type includes "arrayWithValueKey"
    if (col.type?.includes("arrayWithValueKey")) {
      columnDefinition.cell = ({ row }) => {
        const items = row.getValue(col.accessorKey);

        if (col.type?.includes("list")) {
          return (
            <div className="font-medium">
              {items?.map((item, index) => (
                <div key={index}>{item?.[col?.valueKey]}</div>
              ))}
            </div>
          );
        }

        return (
          <div className="font-medium">
            {items?.length > 0 ? (
              Array.from(new Set(items.map((i) => i?.[col.valueKey]).filter(Boolean))).join(", ")
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        );
      };
    }

    // Apply nested object data if type includes "nestedObject"
    if (col.type?.includes("nestedObject")) {
      columnDefinition.cell = ({ row }) => {
        const value = row.getValue(col.accessorKey);

        return (
          <div className="font-medium">
            {Object.values(value).filter(Boolean).join(", ")}
          </div>
        );
      };
    }

    // Apply date formatting if type includes "date"
    if (col.type?.includes("date")) {
      columnDefinition.cell = ({ row }) => {
        let val = row.getValue(col.accessorKey);
        
        // Specialized handling for decisionDate with fallback to updatedAt for legacy records
        if (col.type?.includes("decisionDate")) {
          const status = row.original.status;
          const updatedAt = row.original.updatedAt;
          val = val || (status !== "Pending" ? updatedAt : null);
        }

        if (!val) return <span className="text-muted-foreground">-</span>;
        const value = new Date(val);
        
        if (col.type?.includes("longDate")) {
          const dayOfMonth = value.getDate();
          const monthName = value.toLocaleString("en-US", { month: "long" });
          const year = value.getFullYear();
          const dayOfWeek = value.toLocaleString("en-US", { weekday: "long" });
          return <div className="min-w-[180px]">{`${dayOfMonth} ${monthName} ${year}, ${dayOfWeek}`}</div>;
        }

        const date = value.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        return <div>{date === "Invalid Date" ? "-" : date}</div>;
      };
    }

    // Apply boolean formatting if type includes "boolean"
    if (col.type?.includes("boolean")) {
      columnDefinition.cell = ({ row }) => {
        const value = row.getValue(col.accessorKey);
        return value ? "✅ Yes" : "❌ No";
      };
    }

    // Apply color formatting if type includes "color"
    if (col.type?.includes("color")) {
      columnDefinition.cell = ({ row }) => {
        const color = row.original[col.accessorKey] || "#808080";
        return (
          <div className="flex items-center gap-2 group">
            <div
              className="w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0 transition-transform group-hover:scale-125 duration-200"
              style={{ 
                backgroundColor: color,
                boxShadow: `0 0 10px ${color}40`,
              }}
              title={color}
            />
            <span className="text-[10px] font-bold font-mono uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">{color}</span>
          </div>
        );
      };
    }
 
    // Handle shortname specifically
    if (col.accessorKey === "shortname") {
      columnDefinition.cell = ({ row }) => (
        <span className="font-medium uppercase">{row.original.shortname || "-"}</span>
      );
    }

    // Apply clickable name formatting if accessorKey is "name"
    if (col.accessorKey === "name" && col.type?.includes("clickableApprovedName")) {
      columnDefinition.cell = ({ row }) => {
        const name = row.original.name;
        const status = row.original.status;
        const isApproved = status === "Approved";
        const isClickable = onCellClick && isApproved;

        return (
          <div
            className={`font-bold transition-all duration-200 ${isClickable ? "cursor-pointer text-indigo-900 dark:text-indigo-300 hover:text-blue-600 hover:underline" : "text-sky-950 dark:text-sky-200"}`}
            onClick={() => {
              if (isClickable) {
                onCellClick(row.original, col);
              }
            }}
          >
            {name}
          </div>
        );
      };
    }

    // Apply avatar formatting if type includes "avatar"
    if (col.type?.includes("avatar")) {
      columnDefinition.cell = ({ row }) => {
        const image = row.getValue(col.accessorKey);
        const name = row.getValue("name");

        return (
          <Avatar className="w-7 h-7">
            <AvatarImage
              src={image?.url || null}
              alt="Profile"
              onError={(e) => {
                e.currentTarget.style.display = "none"; // Hide broken image
              }}
            />
            <AvatarFallback>
              {name ? (
                name.charAt(0).toUpperCase()
              ) : (
                <User className="w-5 h-5" />
              )}
            </AvatarFallback>
          </Avatar>
        );
      };
    }

    // Apply link formatting if type includes "link"
    if (col.type?.includes("link")) {
      columnDefinition.cell = ({ row }) => (
        <a
          href={row.getValue(col.link || col.accessorKey)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {row.getValue(col.accessorKey)}
        </a>
      );
    }
    if (col.type?.includes("externalLink")) {
      const searchParams = col.searchParams ? `?${col.searchParams}` : "";
      columnDefinition.cell = ({ row }) => (
        <Link
          href={`${row.original[col.accessorKey] || col.accessorKey}/${row.original[col.endpointKey] + searchParams}`}
        >
          <ExternalLink className="text-muted-foreground h-5 w-5 print:hidden" />
        </Link>
      );
    }

    // Apply badge formatting if type includes "badge"
    if (col.type?.includes("badge")) {
      columnDefinition.cell = ({ row }) => {
        const status = row.getValue(col.accessorKey);
        let displayStatus = status;
        if (status === "Active") {
          displayStatus = "Acivated";
        } else if (status === "Stopped Out") {
          displayStatus = "Accelerated";
        }

        let color;
        switch (displayStatus?.toLowerCase()) {
          case "active":
          case "activated":
          case "acivated":
            color = "bg-green-200 text-green-800";
            break;
          case "graduated":
            color = "bg-blue-200 text-blue-800";
            break;
          case "dropped out":
          case "stopped out":
          case "accelerated":
          case "closed":
            color = "bg-red-200 text-red-800";
            break;
          case "approved":
            color = "bg-blue-100 text-blue-800";
            break;
          case "rejected":
            color = "bg-orange-100 text-orange-800";
            break;
          case "admitted":
            color = "bg-purple-100 text-purple-800";
            break;
          default:
            color = "bg-gray-200 text-gray-800";
        }
        const isClickable = col.type?.includes("clickableBadge") && onCellClick;

        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${color} ${isClickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
            onClick={(e) => {
              if (isClickable) {
                e.stopPropagation();
                onCellClick(row.original, col);
              }
            }}
          >
            {displayStatus}
          </span>
        );
      };
    }

    if (col.type?.includes("length")) {
      columnDefinition.cell = ({ row }) => {
        const length = row.original?.[col.valueKey]?.length || 0;
        
        if (col.clickable && length > 0) {
          return (
            <Button
              variant="link"
              className="p-0 h-auto font-medium text-primary hover:text-primary/80"
              onClick={() => onCellClick?.(row.original, col)}
            >
              {length}
            </Button>
          );
        }
        
        return length;
      };
    }
    if (col.type?.includes("filteredLength")) {
      columnDefinition.cell = ({ row }) => {
        const length =
          row.original?.[col.valueKey]?.filter(
            (item) => item?.[col.accessorKey] === col.filterValue
          )?.length || 0;

        if (col.clickable && length > 0) {
          return (
            <Button
              variant="link"
              className="p-0 h-auto font-medium text-primary hover:text-primary/80"
              onClick={() => onCellClick?.(row.original, col)}
            >
              {length}
            </Button>
          );
        }

        return length;
      };
    }

    if (col.type?.includes("contactWithAlternative")) {
      columnDefinition.cell = ({ row }) => {
        const contact = row.getValue(col.accessorKey) || row.original.contactNumber || "-";
        const alternative = row.original.alternativeNumber;
        return (
          <div className="flex flex-col">
            <span>{contact}</span>
            {alternative && (
              <span className="text-xs text-muted-foreground">{alternative}</span>
            )}
          </div>
        );
      };
    }

    if (col.type?.includes("guardianNameWithRelationship")) {
      columnDefinition.cell = ({ row }) => {
        const name = row.getValue(col.accessorKey) || row.original.guardianName || row.original?.studentSpecificField?.guardianName || "-";
        const relationship = row.original.relationship || row.original?.studentSpecificField?.relationship;
        return (
          <div className="flex flex-col">
            <span>{name}</span>
            {relationship && (
              <span className="text-xs text-muted-foreground">({relationship})</span>
            )}
          </div>
        );
      };
    }

    if (col.type?.includes("guardianContactWithAlternative")) {
      columnDefinition.cell = ({ row }) => {
        const contact = row.getValue(col.accessorKey) || row.original.guardianContactNumber || row.original?.studentSpecificField?.guardianContactNumber || "-";
        const alternative = row.original.guardianAlternativeNumber || row.original?.studentSpecificField?.guardianAlternativeNumber;
        return (
          <div className="flex flex-col">
            <span>{contact}</span>
            {alternative && (
              <span className="text-xs text-muted-foreground">{alternative}</span>
            )}
          </div>
        );
      };
    }

    if (col.type?.includes("saveContactAction")) {
      columnDefinition.cell = ({ row }) => {
        let number = row.getValue(col.accessorKey) || row.original[col.accessorKey] || row.original?.studentSpecificField?.[col.accessorKey];
        if (!number || number === "-") return null;
        number = String(number).replace(/[^\d+]/g, '');
        if (!number) return null;
        
        let altNumber = row.original.alternativeNumber;
        if (altNumber) altNumber = String(altNumber).replace(/[^\d+]/g, '');

        const batchName = row.original.batchName || row.original.batchId || "";
        const studentName = row.original.name || "Student";
        const name = batchName ? `${batchName} - ${studentName}` : studentName;
        
        return <SaveContactButton number={number} altNumber={altNumber} name={name} />;
      };
    }

    if (col.type?.includes("saveGuardianContactAction")) {
      columnDefinition.cell = ({ row }) => {
        let number = row.getValue(col.accessorKey) || row.original[col.accessorKey] || row.original?.studentSpecificField?.[col.accessorKey];
        if (!number || number === "-") return null;
        number = String(number).replace(/[^\d+]/g, '');
        if (!number) return null;
        
        let altNumber = row.original.guardianAlternativeNumber || row.original?.studentSpecificField?.guardianAlternativeNumber;
        if (altNumber) altNumber = String(altNumber).replace(/[^\d+]/g, '');

        const batchName = row.original.batchName || row.original.batchId || "";
        const studentName = row.original.name || "Student";
        const relationship = row.original.relationship || row.original?.studentSpecificField?.relationship || "Guardian";
        
        const baseName = batchName ? `${batchName} - ${studentName}` : studentName;
        const contactName = `${baseName} (${relationship})`;
        
        return <SaveContactButton number={number} altNumber={altNumber} name={contactName} />;
      };
    }

    if (col.type?.includes("whatsappAction")) {
      columnDefinition.cell = ({ row }) => {
        let number = row.getValue(col.accessorKey) || row.original[col.accessorKey] || row.original?.studentSpecificField?.[col.accessorKey];
        if (!number || number === "-") return null;
        number = String(number).replace(/[^\d+]/g, ''); // Extract digits and +
        if (!number) return null;
        
        return (
          <a
            href={`https://wa.me/${number.replace('+', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-500 hover:text-green-700 p-1 block print:hidden"
            title="WhatsApp"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="w-4 h-4" />
          </a>
        );
      };
    }

    if (col.type?.includes("callAction")) {
      columnDefinition.cell = ({ row }) => {
        let number = row.getValue(col.accessorKey) || row.original[col.accessorKey] || row.original?.studentSpecificField?.[col.accessorKey];
        if (!number || number === "-") return null;
        number = String(number).replace(/[^\d+]/g, ''); // Extract digits and +
        if (!number) return null;
        
        return (
          <a
            href={`tel:${number}`}
            className="text-blue-500 hover:text-blue-700 p-1 block print:hidden"
            title="Call"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-4 h-4" />
          </a>
        );
      };
    }

    if (col?.type?.includes("percentage")) {
      columnDefinition.cell = ({ row }) => {
        let percentageValue = "0.00%";
        
        // If the percentage was calculated directly by the backend (e.g., toppers API)
        if (row.original.percentage !== undefined && row.original.percentage !== null) {
          percentageValue = `${row.original.percentage}%`;
        } else {
          const total = row.original?.[col.totalKey]?.length || 0;
          const divide =
            row.original?.[col.totalKey]?.filter(
              (item) => item?.[col.filterKey] === col.filterValue
            )?.length || 0;
          
          if (total > 0) {
            percentageValue = `${((divide / total) * 100).toFixed(2)}%`;
          }
        }

        if (col.clickable && percentageValue !== "0.00%") {
          return (
            <Button
              variant="link"
              className="p-0 h-auto font-medium text-primary hover:text-primary/80"
              onClick={() => onCellClick?.(row.original, col)}
            >
              {percentageValue}
            </Button>
          );
        }

        return percentageValue;
      };
    }

    // Render two fields stacked with labeled sub-headings in a single cell
    if (col.type?.includes("dualField")) {
      columnDefinition.cell = ({ row }) => {
        const primary = row.original?.[col.primaryKey];
        const secondary = row.original?.[col.secondaryKey];
        return (
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground leading-none mb-0.5">
                {col.primaryLabel || col.primaryKey}
              </span>
              <span>{primary || <span className="text-muted-foreground">—</span>}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground leading-none mb-0.5">
                {col.secondaryLabel || col.secondaryKey}
              </span>
              <span>{secondary || <span className="text-muted-foreground">—</span>}</span>
            </div>
          </div>
        );
      };
    }

    if (col.type?.includes("groupedList")) {
      columnDefinition.cell = ({ row }) => {
        const items = row.getValue(col.accessorKey);
        if (!Array.isArray(items) || items.length === 0) return "-";

        const grouped = items.reduce((acc, item) => {
          const key = item.className || "Unknown Class";
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {});

        return (
          <div className="text-left space-y-2 max-h-60 overflow-y-auto print:max-h-none print:overflow-visible min-w-[200px]">
            <div className="hidden print:block text-xs mb-2 space-y-1 border-b pb-2">
              <div>
                <span className="font-semibold">Leader:</span>{" "}
                {row.original.leaderName || "-"}
              </div>
              <div>
                <span className="font-semibold">Assist. Leader:</span>{" "}
                {row.original.assistantLeaderName || "-"}
              </div>
            </div>
            <div className="font-bold text-xs text-muted-foreground uppercase mb-2 print:hidden">
              Total Students: {items.length}
            </div>
            {Object.entries(grouped)
              .sort(([classA], [classB]) => {
                const normalize = (name) => String(name || "").replace(/\s/g, "").toUpperCase();
                const normalizedOrder = Array.isArray(CLASS_ORDER) ? CLASS_ORDER.map(normalize) : [];

                const indexA = normalizedOrder.indexOf(normalize(classA));
                const indexB = normalizedOrder.indexOf(normalize(classB));

                if (indexA !== -1 && indexB !== -1) return indexB - indexA;

                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return classA.localeCompare(classB);
              })
              .map(([className, students]) => (
                <div key={className}>
                  <div className="font-bold text-xs text-muted-foreground uppercase mb-1">
                    {className}
                  </div>
                  <div className="text-sm space-y-1">
                    {students
                      .sort((a, b) =>
                        String(a._id || "").localeCompare(
                          String(b._id || ""),
                          undefined,
                          { numeric: true }
                        )
                      )
                      .map((student, idx) => (
                        <div key={student._id}>
                          <span className="text-muted-foreground mr-1">
                            {idx + 1}.
                          </span>
                          {student.name}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({student._id})
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        );
      };
    }

    // Apply actions if type includes "actions"
    if (col.type?.includes("actions")) {
      columnDefinition.cell = ({ row }) => (
        <div className="flex gap-2">
          <Button className="px-0" variant="outline" size="icon">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button className="px-0" variant="destructive" size="icon">
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    // Apply mapped string render if type includes "mappedValue"
    if (col.type?.includes("mappedValue") && col.valueMap) {
      columnDefinition.cell = ({ row }) => {
        const value = row.getValue(col.accessorKey);
        return <div>{col.valueMap[value] || value}</div>;
      };
    }

    columnDefinition.meta = {
      ...columnDefinition.meta,
      width: col.width || "auto", // Default: auto
      minWidth: col.minWidth || "100px", // Default min-width
      maxWidth: col.maxWidth || "auto", // Default max-width
    };

    return columnDefinition;
  });
};

export default useTableColumns;
