// app/program-management/reset/page.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function ResetPage() {
  const router = useRouter();
  const [mode, setMode] = useState("registrations");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();

    if (confirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/program-management/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset data");
      }

      toast.success("Data reset successfully!");
      setShowConfirm(false);
      setConfirmText("");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-destructive flex items-center gap-2">
          <AlertTriangle className="h-8 w-8" />
          Danger Zone - Data Reset
        </h1>
        <p className="text-muted-foreground">
          Permanently delete festival data. This action cannot be undone.
        </p>
      </div>

      {/* Reset Options Card */}
      <Card className="border-destructive/20 shadow-lg">
        <CardHeader className="bg-destructive/5 rounded-t-xl">
          <CardTitle className="text-destructive">Select Reset Mode</CardTitle>
          <CardDescription>
            Choose the scope of data you want to delete.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <RadioGroup
            value={mode}
            onValueChange={setMode}
            className="grid gap-4 grid-cols-1"
          >
            {/* Registrations & Results Only */}
            <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-accent">
              <RadioGroupItem
                value="registrations"
                id="registrations"
                className="mt-1"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="registrations"
                  className="text-base font-semibold cursor-pointer"
                >
                  Reset Competition Data (Registrations & Results)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Deletes all Program Registrations, Schedules, Results, and
                  Scores.
                  <br />
                  <span className="text-green-600 font-medium flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Keeps Participants, Teams, Divisions, and Programs.
                  </span>
                </p>
              </div>
            </div>

            {/* Participants & Teams */}
            <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-accent">
              <RadioGroupItem
                value="participants"
                id="participants"
                className="mt-1"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="participants"
                  className="text-base font-semibold cursor-pointer"
                >
                  Reset Participants & Teams
                </Label>
                <p className="text-sm text-muted-foreground">
                  Deletes all Participants and Teams. Also deletes all
                  competition data (Registrations, Results) as they depend on
                  participants.
                  <br />
                  <span className="text-green-600 font-medium flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Keeps Divisions and Programs.
                  </span>
                </p>
              </div>
            </div>

            {/* Full Reset */}
            <div className="flex items-start space-x-4 p-4 rounded-lg border border-destructive/50 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer has-[:checked]:border-destructive has-[:checked]:bg-destructive/10">
              <RadioGroupItem
                value="all"
                id="all"
                className="mt-1 border-destructive text-destructive"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="all"
                  className="text-base font-semibold cursor-pointer text-destructive"
                >
                  Full Factory Reset
                </Label>
                <p className="text-sm text-muted-foreground">
                  Deletes EVERYTHING: Divisions, Programs, Teams, Participants,
                  Registrations, Results, etc.
                  <br />
                  <span className="text-orange-600 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    Only keeps Festival Settings and User Accounts.
                  </span>
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>

        <Separator />

        <CardFooter className="pt-6 flex justify-end bg-muted/20">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => setShowConfirm(true)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Reset Selected Data...
          </Button>
        </CardFooter>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm font-medium">
              You are about to delete:{" "}
              {mode === "all"
                ? "ALL DATA"
                : mode === "participants"
                  ? "Participants, Teams, and Competition Data"
                  : "Registrations and Results"}
            </div>

            <div className="space-y-2">
              <Label>Type "DELETE" to confirm</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="border-destructive/50 focus-visible:ring-destructive"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={confirmText !== "DELETE" || loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Confirm Reset"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
