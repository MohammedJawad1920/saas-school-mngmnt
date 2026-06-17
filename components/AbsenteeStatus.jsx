import { useMemo } from "react";
import { AlertCircle, AlertTriangle, XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const AbsenteeStatus = ({ absenteeInfo }) => {
  const { continuousAbsences, lastAbsenceDate, totalAbsences, attendanceRate } =
    absenteeInfo || {};

  // Return null if no absentee info
  if (!absenteeInfo || continuousAbsences === 0) return null;

  // Determine severity levels and styling
  const getSeverityInfo = useMemo(() => {
    if (continuousAbsences >= 3) {
      return {
        level: "high",
        color: "text-destructive",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        borderColor: "border-red-200 dark:border-red-800",
        icon: <XCircle className="h-4 w-4 text-destructive" />,
        label: "Critical",
        action: "Requires immediate attention",
      };
    } else if (continuousAbsences === 2) {
      return {
        level: "medium",
        color: "text-amber-500",
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
        borderColor: "border-amber-200 dark:border-amber-800",
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        label: "Warning",
        action: "Monitor closely",
      };
    } else {
      return {
        level: "low",
        color: "text-blue-500",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        borderColor: "border-blue-200 dark:border-blue-800",
        icon: <AlertCircle className="h-4 w-4 text-blue-500" />,
        label: "Notice",
        action: "Be aware",
      };
    }
  }, [continuousAbsences]);

  // Format date for display
  const formattedDate = lastAbsenceDate
    ? new Date(lastAbsenceDate).toLocaleDateString()
    : "N/A";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center max-w-fit gap-2 rounded-full px-2 py-1 border ${getSeverityInfo.borderColor} ${getSeverityInfo.bgColor}`}
          >
            {getSeverityInfo.icon}
            <Badge
              variant={
                getSeverityInfo.level === "high"
                  ? "destructive"
                  : getSeverityInfo.level === "medium"
                    ? "warning"
                    : "outline"
              }
              className="text-xs whitespace-nowrap"
            >
              {continuousAbsences}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent className="w-64 p-0 overflow-hidden" sideOffset={5}>
          <div className="p-3">
            <div className="font-medium flex items-center gap-2">
              {getSeverityInfo.icon}
              <span>{getSeverityInfo.label}: Absence Pattern</span>
            </div>

            <div className="mt-2 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Consecutive absences:</span>
                <span className={`font-semibold ${getSeverityInfo.color}`}>
                  {continuousAbsences}
                </span>
              </div>

              {totalAbsences && (
                <div className="flex justify-between">
                  <span>Total absences:</span>
                  <span className="font-semibold">{totalAbsences}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Last absent:</span>
                <span>{formattedDate}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border text-xs">
              <p className={`font-medium ${getSeverityInfo.color}`}>
                {getSeverityInfo.action}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AbsenteeStatus;
