"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Header = ({ title, subTitle, alertTitle, alertDescription, rightAction }) => {
  const [isAlertOpen, setIsAlertOpen] = useState(true); // Opens by default

  const handleIconClick = () => {
    setIsAlertOpen(true);
  };

  return (
    <>
      <div className="p-2 mb-1 flex items-center justify-between no-print">
        <div>
          <h1 className="font-bold text-xl md:text-2xl text-foreground">
            {title}
            <button
              onClick={handleIconClick}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Show information"
            >
              {(alertTitle || alertDescription) && (
                <AlertCircle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              )}
            </button>
          </h1>
          <h3 className="text-muted-foreground">{subTitle}</h3>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
      {(alertTitle || alertDescription) && (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{alertTitle || "Information"}</AlertDialogTitle>
              <AlertDialogDescription>
                {alertDescription || "This is an informational message."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsAlertOpen(false)}>
                Got it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default Header;
