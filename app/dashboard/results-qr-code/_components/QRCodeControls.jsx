// app/dashboard/results-qr-code/_components/QRCodeControls.jsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export function QRCodeControls({ size, onSizeChange }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          QR Code Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">QR Code Size</label>
          <div className="space-y-2">
            <input
              type="range"
              min="200"
              max="500"
              step="50"
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              aria-label="Adjust QR code size"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Small (200px)</span>
              <span className="font-medium text-foreground">{size}px</span>
              <span>Large (500px)</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Error Correction</label>
          <div className="p-2 bg-muted rounded text-sm">High (H)</div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Format</label>
          <div className="p-2 bg-muted rounded text-sm">PNG</div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Color</label>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-700 border-2 border-border"></div>
            <span className="text-sm">Blue</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-900 dark:text-blue-100">
          <p className="font-medium mb-1">💡 Tip:</p>
          <p className="text-xs">
            Larger QR codes are easier to scan from a distance. High error
            correction allows the code to be scanned even if partially damaged.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
