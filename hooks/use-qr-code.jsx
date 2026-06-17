// hooks/use-qr-code.js
"use client";

import { useState, useMemo } from "react";

export function useQRCodeConfig() {
  const [size, setSize] = useState(350);

  const resultsUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/results`;
  }, []);

  const qrOptions = useMemo(
    () => ({
      level: "H",
      margin: 3,
      scale: 4,
      width: size,
      color: {
        dark: "#1e40af",
        light: "#ffffff",
      },
    }),
    [size]
  );

  return {
    resultsUrl,
    qrOptions,
    size,
    setSize,
  };
}
