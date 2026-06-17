"use client";

import { memo } from "react";
import Image from "next/image";
import { UserCheck } from "lucide-react";

import { Card } from "@/components/ui/card";

const FacultyProfileCard = memo(({ faculty, assignedClass }) => (
  <Card
    className="overflow-hidden hover:border-primary/50 transition-all col-span-6 md:col-span-3 lg:col-span-2 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary"
    role="region"
    aria-labelledby={`faculty-${faculty._id}`}
  >
    <div className="flex">
      <div className="w-20 xs:w-32 h-20 xs:h-32 relative bg-muted/30">
        {faculty.profilePic?.url ? (
          <Image
            src={faculty?.profilePic?.url}
            alt={`${faculty.name} profile picture`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted">
            <UserCheck
              className="h-12 w-12 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        )}
      </div>
      <div className="p-2 md:p-4">
        <div className="flex justify-between mb-1 md:mb-2">
          <div>
            <h3 id={`faculty-${faculty._id}`} className="font-semibold text-sm">
              {faculty.name}
            </h3>
            <p className="text-muted-foreground text-xs">{faculty.place}</p>
          </div>
        </div>
        <div className="text-xs space-y-1">
          <div className="whitespace-nowrap">
            <span className="text-muted-foreground">Contact: </span>
            <span>{faculty.contactNumber || "N/A"}</span>
          </div>
          <div className="whitespace-nowrap">
            <span className="text-muted-foreground">Class: </span>
            <span>{assignedClass || "N/A"}</span>
          </div>
        </div>
      </div>
    </div>
  </Card>
));
FacultyProfileCard.displayName = "FacultyProfileCard";

export default FacultyProfileCard;
