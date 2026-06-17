import React from "react";
import { formatDateShort } from "@/lib/utils";

export const getStudentColumns = ({ classes, pageTitle, onNameClick, onProfileRequestClick, excludeColumns = [] }) => {
    return [
        {
            id: "select",
            header: "Select",
            type: ["checkbox"],
            width: 50,
            maxWidth: 50,
            minWidth: 50,
        },
        {
            accessorKey: "serialNo",
            header: "Sl.No",
            type: ["serialNo"],
            width: 60,
            maxWidth: 60,
            minWidth: 60,
        },
        {
            accessorKey: "profilePic",
            header: "Image",
            type: ["avatar"],
            width: 70,
            maxWidth: 70,
            minWidth: 70,
        },
        {
            accessorKey: "_id",
            header: pageTitle === "ADMISSION REGISTER" ? <div>Student<br />ID</div> : "Student ID",
            type: ["sortable"],
            sortingFn: "alphanumeric"
        },
        {
            accessorKey: "name",
            header: pageTitle === "ADMISSION REGISTER" ? <div>Student Name &<br />Contact Number</div> : "Name",
            cell: ({ row }) => (
                <div
                    className="flex flex-col cursor-pointer hover:text-blue-600 group"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onNameClick) {
                            onNameClick(row.original);
                        }
                    }}
                >
                    <span className="font-bold text-sky-950 dark:text-sky-200 group-hover:underline">{row.original.name}</span>
                    {pageTitle === "ADMISSION REGISTER" && (
                        <div className="flex flex-col gap-0.5 mt-1">
                            {row.original.contactNumber && <span className="text-xs text-muted-foreground">Ph: {row.original.contactNumber}</span>}
                            {row.original.alternativeNumber && <span className="text-xs text-muted-foreground">Alt: {row.original.alternativeNumber}</span>}
                        </div>
                    )}
                </div>
            ),
        },
        { accessorKey: "email", header: "Email" },
        {
            accessorKey: "contactNumber",
            header: "Contact Number",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span>{row.original.contactNumber}</span>
                    {row.original.alternativeNumber && (
                        <span className="text-xs text-muted-foreground">{row.original.alternativeNumber}</span>
                    )}
                </div>
            )
        },
        { accessorKey: "aadharNo", header: "Aadhar Number" },
        { accessorKey: "batchName", header: "Batch" },
        { 
            accessorKey: "className", 
            header: "Class",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-semibold">{row.original.className}</span>
                    {row.original.stream && (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{row.original.stream}</span>
                    )}
                </div>
            )
        },
        ...(pageTitle !== "ADMISSION REGISTER" ? [{
            accessorKey: "subjectTypeAssignments",
            header: "Subject Assignment",
            cell: ({ row }) => {
                const assignments = row.original.subjectTypeAssignments ||
                    row.original.studentSpecificField?.subjectTypeAssignments || [];
                if (!assignments.length) return <span className="text-muted-foreground text-xs">—</span>;
                return (
                    <div className="flex flex-col gap-0.5">
                        {assignments.map((assignment, idx) => {
                            const colonIdx = assignment.lastIndexOf(":");
                            let label;
                            if (colonIdx !== -1) {
                                const classId = assignment.slice(0, colonIdx);
                                const type = assignment.slice(colonIdx + 1).toUpperCase();
                                const classObj = classes?.find((c) => c._id === classId);
                                const shortName = classObj?.shortname || classObj?.name || classId;
                                label = `${shortName} ${type}`;
                            } else {
                                label = assignment.toUpperCase();
                            }
                            return (
                                <span key={idx} className="text-xs font-medium text-foreground">
                                    {label}
                                </span>
                            );
                        })}
                    </div>
                );
            },
        }] : []),
        {
            accessorKey: "admissionClassName",
            header: pageTitle === "ADMISSION REGISTER" ? <div>Admission<br />Class</div> : "Admission Class"
        },
        {
            accessorKey: "admissionDate",
            header: pageTitle === "ADMISSION REGISTER" ? <div>Admission<br />Date & Class</div> : "Admission Date",
            cell: ({ row }) => {
                const date = row.getValue("admissionDate");
                const formattedDate = formatDateShort(date);
                return (
                    <div className="flex flex-col">
                        <span>{formattedDate}</span>
                        {pageTitle === "ADMISSION REGISTER" && row.original.admissionClassName && (
                            <span className="text-xs text-muted-foreground">{row.original.admissionClassName}</span>
                        )}
                    </div>
                );
            },
        },
        { 
            accessorKey: "dateOfBirth", 
            header: "Date Of Birth", 
            cell: ({ row }) => formatDateShort(row.getValue("dateOfBirth"))
        },
        { accessorKey: "bloodGroup", header: "Blood Group" },
        { accessorKey: "roles", header: "Roles", type: ["array"] },

        {
            accessorKey: "guardianName",
            header: pageTitle === "ADMISSION REGISTER" ? <div>Guardian Name &<br />Contact Number</div> : "Guardian Name",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.original.guardianName}</span>
                    <span className="text-xs text-muted-foreground">({row.original.relationship})</span>
                    {pageTitle === "ADMISSION REGISTER" && (
                        <div className="flex flex-col gap-0.5 mt-1">
                            {row.original.guardianContactNumber && <span className="text-xs text-muted-foreground">Ph: {row.original.guardianContactNumber}</span>}
                            {row.original.guardianAlternativeNumber && <span className="text-xs text-muted-foreground">Alt: {row.original.guardianAlternativeNumber}</span>}
                        </div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: "guardianContactNumber",
            header: "G. Contact Number",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span>{row.original.guardianContactNumber}</span>
                    {row.original.guardianAlternativeNumber && (
                        <span className="text-xs text-muted-foreground">{row.original.guardianAlternativeNumber}</span>
                    )}
                </div>
            )
        },
        {
            accessorKey: "address",
            header: "Address",
            minWidth: 180,
            width: 200,
            cell: ({ row }) => {
                const student = row.original;
                const addr = student.address || {};
                const locationPoint = student.locationPoint || addr.locationPoint;
                
                return (
                    <div className="flex flex-col text-[10px] gap-0.5 whitespace-normal break-words leading-tight py-1">
                        {addr.houseName && (
                            <div className="flex gap-1">
                                <span className="font-bold shrink-0">House:</span>
                                <span>{addr.houseName}</span>
                            </div>
                        )}
                        {addr.place && (
                            <div className="flex gap-1">
                                <span className="font-bold shrink-0">Place:</span>
                                <span>{addr.place}</span>
                            </div>
                        )}
                        {locationPoint && (
                            <div className="flex gap-1">
                                <span className="font-bold shrink-0">Location:</span>
                                <span>{locationPoint}</span>
                            </div>
                        )}
                        {addr.postOffice && (
                            <div className="flex gap-1">
                                <span className="font-bold shrink-0">P.O:</span>
                                <span>{addr.postOffice}</span>
                            </div>
                        )}
                        {addr.district && (
                            <div className="flex gap-1">
                                <span className="font-bold shrink-0">Dist:</span>
                                <span>{addr.district}</span>
                            </div>
                        )}
                        {(addr.state || addr.pin) && (
                            <div className="flex gap-1">
                                <span className="font-bold shrink-0">State:</span>
                                <span>{addr.state}{addr.pin ? ` - Pin: ${addr.pin}` : ''}</span>
                            </div>
                        )}
                    </div>
                );
            }
        },

        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.original.status;
                let colorClass = "bg-gray-100 text-gray-800";
                if (status === "Active") colorClass = "bg-green-100 text-green-800";
                if (status === "Graduated") colorClass = "bg-blue-100 text-blue-800";
                if (status === "Dropped Out") colorClass = "bg-red-100 text-red-800";

                return (
                    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${colorClass}`}>
                        {status}
                    </div>
                )
            }
        },
        {
            id: "statusDetails",
            header: "Status Details",
            minWidth: 150,
            width: 200,
            cell: ({ row }) => {
                const {
                    status,
                    graduatedYear,
                    islamicQualification,
                    academicQualification,
                    droppedOutDate,
                    droppedOutClass,
                    droppedOutReason,
                } = row.original;

                if (status === "Graduated") {
                    return (
                        <div className="flex flex-col text-xs gap-0.5 whitespace-normal break-words leading-tight py-1">
                            <span className="font-semibold text-blue-600">Graduated: {graduatedYear}</span>
                            {islamicQualification && <span>Islamic: {islamicQualification}</span>}
                            {academicQualification && <span>Academic: {academicQualification}</span>}
                        </div>
                    );
                } else if (status === "Dropped Out") {
                    const formattedDate = formatDateShort(droppedOutDate) || 'N/A';
                    const classObj = classes?.find((c) => c._id === droppedOutClass);
                    const className = classObj ? classObj.name : droppedOutClass;
                    return (
                        <div className="flex flex-col text-xs gap-0.5 whitespace-normal break-words leading-tight py-1">
                            <span className="font-semibold text-red-600">Dropped Out: {formattedDate}</span>
                            {droppedOutClass && <span>Class: {className}</span>}
                            {droppedOutReason && droppedOutReason.toLowerCase() !== 'unknown' && <span>Reason: {droppedOutReason}</span>}
                        </div>
                    );
                }
                return <span className="text-muted-foreground">-</span>;
            },
        },
        {
            accessorKey: "updatedAt",
            header: "Last Updated On",
            cell: ({ row }) => {
                const student = row.original;
                const updatedAt = student.updatedAt;
                const status = student.profileUpdateStatus;

                if (status === "Pending") {
                    return (
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">{formatDateShort(updatedAt)}</span>
                            <button 
                                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-0.5 rounded transition-colors shadow-sm uppercase tracking-wider"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onProfileRequestClick) onProfileRequestClick(student);
                                }}
                            >
                                Requested
                            </button>
                            <span className="text-[10px] text-blue-600 font-medium">{formatDateShort(student.profileRequestDate)}</span>
                        </div>
                    );
                }

                if (status === "Verified") {
                    return (
                        <div className="flex flex-col">
                            <span className="text-green-600 font-bold text-xs uppercase tracking-tight">Verified</span>
                            <span className="text-xs text-muted-foreground">{formatDateShort(updatedAt)}</span>
                        </div>
                    );
                }

                return (
                    <span className="text-xs">
                        {formatDateShort(updatedAt)}
                    </span>
                );
            },
        },

        {
            id: "remarks",
            header: "Remarks",
            cell: ({ row }) => {
                const isVerified = row.original.isVerified;
                const verifiedAt = row.original.verifiedAt;

                // Assuming isVerified is boolean or strictly "true"/"false" if string
                // Adjust logic if it's different (e.g. check for null/undefined)
                const verified = isVerified === true || isVerified === "true";

                return (
                    <div className="flex flex-col items-center gap-1">
                        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${verified ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {verified ? "Verified" : "Not Verified"}
                        </div>
                        {verified && verifiedAt && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                                {new Date(verifiedAt).toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                );
            }
        },
    ].filter(column => {
        const key = column.id || column.accessorKey;
        return !excludeColumns.includes(key);
    });
};
