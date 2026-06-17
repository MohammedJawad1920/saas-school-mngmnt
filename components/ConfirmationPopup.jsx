"use client";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Loader, Trash, AlertTriangle } from "lucide-react";
import { capitalize } from "lodash";
import { Input } from "./ui/input";

export default function ConfirmationPopup({
  loading = false,
  action,
  title,
  icon,
  onClick,
  triggerClass,
  confirmText = "",
}) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleClick = React.useCallback(async () => {
    try {
      await onClick();
      setOpen(false);
      setInputValue("");
    } catch (error) {
      console.error(error.message);
    }
  }, [onClick]);

  const isConfirmDisabled = confirmText && inputValue !== confirmText;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) setInputValue("");
    }}>
      <DialogTrigger asChild>
        <Button variant={triggerClass ? "default" : "outline"} className={triggerClass}>
          {icon || <Trash />}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              Are you sure you want to {action.toLowerCase()} this?
              {confirmText && (
                <div className="mt-4 space-y-2">
                  <p className="text-foreground font-medium">
                    Please type <span className="font-bold text-destructive select-none">{confirmText}</span> to confirm.
                  </p>
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`Type ${confirmText} here`}
                    className="border-destructive/30 focus-visible:ring-destructive"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-between gap-4 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="outline"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:text-destructive-foreground flex-1"
            onClick={handleClick}
            disabled={loading || isConfirmDisabled}
          >
            {loading ? (
              <Loader className="animate-spin mr-2" />
            ) : (
              capitalize(action)
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
