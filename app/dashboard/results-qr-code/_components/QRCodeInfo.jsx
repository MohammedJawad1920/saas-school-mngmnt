// app/dashboard/results-qr-code/_components/QRCodeInfo.jsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  QrCode,
  Printer,
  Share2,
  Shield,
  Smartphone,
  Globe,
} from "lucide-react";

export function QRCodeInfo() {
  const features = [
    {
      icon: QrCode,
      title: "High Quality",
      description:
        "Error correction level H ensures reliable scanning even if partially damaged",
      color: "blue",
    },
    {
      icon: Printer,
      title: "Print Ready",
      description:
        "Optimized for printing on posters, flyers, and event materials",
      color: "purple",
    },
    {
      icon: Share2,
      title: "Easy Sharing",
      description:
        "Share results instantly with participants and audience members",
      color: "green",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Protected URLs ensure your data stays safe",
      color: "red",
    },
    {
      icon: Smartphone,
      title: "Mobile Friendly",
      description: "Results page is fully responsive on all devices",
      color: "yellow",
    },
    {
      icon: Globe,
      title: "Universal Access",
      description: "Works with any QR code scanner or camera app",
      color: "indigo",
    },
  ];

  const colorClasses = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-950",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-950",
    green: "text-green-600 bg-green-50 dark:bg-green-950",
    red: "text-red-600 bg-red-50 dark:bg-red-950",
    yellow: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950",
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4">Why Use QR Codes?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-start space-y-2 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
              >
                <div
                  className={`p-2 rounded-lg ${colorClasses[feature.color]}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
