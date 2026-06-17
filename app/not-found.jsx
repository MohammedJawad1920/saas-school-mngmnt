"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <div className="max-w-md w-full flex flex-col items-center gap-8 text-center">
        {/* 404 SVG Image */}
        <div className="relative w-64 h-64">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path
              fill="currentColor"
              fillOpacity="0.1"
              d="M45.11,29.35H25.12V42.6H45.11ZM82.55,73.44V86.69h20V73.44Zm0-44.09V42.6h20V29.35ZM25.12,73.44V86.69h20V73.44Zm57.43,44.1v13.25h20V117.54Zm-57.43,0v13.25h20V117.54Zm57.43,44.1v13.25h20V161.64Zm-57.43,0v13.25h20V161.64ZM121.5,29.35V42.6h20V29.35Zm0,44.09V86.69h20V73.44Zm0,44.1v13.25h20V117.54Zm0,44.1v13.25h20V161.64Zm40.51-132.29v13.25h13.25V29.35Zm0,44.09V86.69h13.25V73.44Zm0,44.1v13.25h13.25V117.54Zm0,44.1v13.25h13.25V161.64Z"
            />
            <text
              x="50"
              y="120"
              fontSize="60"
              fontWeight="bold"
              fill="currentColor"
            >
              404
            </text>
          </svg>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Page not found</h1>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>

        <div className="flex gap-4">
          <Button onClick={() => router.push("/dashboard")} variant="default">
            Go home
          </Button>
          <Button onClick={() => router.back()} variant="outline">
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}
