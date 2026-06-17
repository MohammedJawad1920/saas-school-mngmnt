// components/PosterCustomizer.jsx - COMPLETE WITH ALL CONTROLS
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Type,
  Eye,
  EyeOff,
  Settings,
  Save,
  Info,
  Upload,
  Plus,
  Trash2,
  Loader,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Grid,
  Download,
} from "lucide-react";
import ColorInput from "@/components/ColorInput";
import ImageUploader from "@/components/ImageUploader";
import { toast } from "sonner";
import { domToPng } from "modern-screenshot";

// Calculate responsive font
const calculateResponsiveFont = (
  baseSize,
  containerWidth,
  containerHeight,
  config
) => {
  let finalSize = baseSize;
  if (config.minFontSize) finalSize = Math.max(finalSize, config.minFontSize);
  if (config.maxFontSize) finalSize = Math.min(finalSize, config.maxFontSize);
  return Math.round(finalSize);
};

const calculateTextDimensions = (
  text,
  fontSize,
  fontWeight = "normal",
  maxWidth = 200
) => {
  if (typeof window === "undefined")
    return {
      width: 0,
      height: fontSize,
      suggestedFontSize: fontSize,
      requiresResize: false,
    };

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;

  if (textWidth > maxWidth && maxWidth > 0) {
    const suggestedSize = Math.floor((maxWidth / textWidth) * fontSize);
    return {
      width: textWidth,
      height: fontSize * 1.2,
      suggestedFontSize: Math.max(4, suggestedSize),
      requiresResize: true,
    };
  }

  return {
    width: textWidth,
    height: fontSize * 1.2,
    suggestedFontSize: fontSize,
    requiresResize: false,
  };
};

const truncateText = (text, maxLength) => {
  if (!maxLength || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
};

const createDefaultPoster = () => ({
  name: "Default Poster",
  backgroundImage: { url: "", publicId: "" },
  layout: {
    programInfo: {
      x: 50,
      y: 5,
      visible: true,
      fontSize: 14,
      responsiveSize: true,
      minFontSize: 4,
      maxFontSize: 32,
      color: "#000000",
      fontWeight: "bold",
      textAlign: "center",
      lineHeight: 1.1,
      textShadow: false,
      autoFit: true,
    },
    divisionInfo: {
      x: 50,
      y: 25,
      visible: true,
      fontSize: 10,
      responsiveSize: true,
      minFontSize: 4,
      maxFontSize: 24,
      color: "#333333",
      fontWeight: "normal",
      textAlign: "center",
      lineHeight: 1.2,
      textShadow: false,
      autoFit: true,
    },
    resultNumber: {
      x: 50,
      y: 12,
      visible: true,
      fontSize: 24,
      responsiveSize: true,
      minFontSize: 4,
      maxFontSize: 28,
      color: "#1a56db",
      fontWeight: "bold",
      textAlign: "left",
      lineHeight: 1.1,
      letterSpacing: 0,
      textShadow: false,
      prefix: "",
      autoFit: true,
    },
    firstPlace: {
      x: 50,
      y: 35,
      visible: true,
      fontSize: 12,
      responsiveSize: true,
      minFontSize: 4,
      maxFontSize: 24,
      color: "#FFD700",
      fontWeight: "normal",
      textAlign: "left",
      lineHeight: 1.2,
      letterSpacing: 0,
      nameSpacing: 8,
      maxNameLength: 25,
      textShadow: false,
      showRank: false,
      maxWinners: 1,
      autoFit: true,
      containerPadding: 15,
      teamNameSpacing: 0,
      showTeamName: true,
    },
    secondPlace: {
      x: 50,
      y: 60,
      visible: true,
      fontSize: 12,
      responsiveSize: true,
      minFontSize: 4,
      maxFontSize: 24,
      color: "#C0C0C0",
      fontWeight: "normal",
      textAlign: "left",
      lineHeight: 1.3,
      letterSpacing: 0,
      nameSpacing: 6,
      maxNameLength: 20,
      textShadow: false,
      showRank: false,
      maxWinners: 1,
      autoFit: true,
      containerPadding: 15,
      teamNameSpacing: 0,
      showTeamName: true,
    },
    thirdPlace: {
      x: 50,
      y: 80,
      visible: true,
      fontSize: 12,
      responsiveSize: true,
      minFontSize: 4,
      maxFontSize: 24,
      color: "#CD7F32",
      fontWeight: "normal",
      textAlign: "left",
      lineHeight: 1.3,
      letterSpacing: 0,
      nameSpacing: 6,
      maxNameLength: 20,
      textShadow: false,
      showRank: false,
      maxWinners: 1,
      autoFit: true,
      containerPadding: 15,
      teamNameSpacing: 0,
      showTeamName: true,
    },
  },
});

const PosterCustomizer = ({
  poster,
  onLayoutChange,
  onBackgroundChange,
  onSave,
  isPreview = false,
  initialSettings = null,
  tenantId = null,
  user = null,
  isFullPage = false,
}) => {
  const [currentSettings, setCurrentSettings] = useState(initialSettings);
  const [selectedPosterIndex, setSelectedPosterIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({
    width: 300,
    height: 300,
  });
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [presetTemplates] = useState([
    { name: "Centered Layout", value: "centered" },
    { name: "Vertical Stack", value: "vertical" },
    { name: "Traditional", value: "traditional" },
  ]);

  const canvasRef = useRef(null);
  const posterRef = useRef(null);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      setIsMobile(mobile);
      setShowMobileControls(mobile);
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  useEffect(() => {
    if (
      isFullPage &&
      (!currentSettings?.resultPosters ||
        currentSettings.resultPosters.length === 0)
    ) {
      setCurrentSettings((prev) => ({
        ...prev,
        resultPosters: [createDefaultPoster()],
      }));
    }
  }, [isFullPage, currentSettings]);

  useEffect(() => {
    setContainerSize({ width: 300, height: 300 });
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.body.style.overflow = "hidden";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.width = "";
    };
  }, [isDragging]);

  const getCurrentPoster = () => {
    if (isFullPage && currentSettings?.resultPosters) {
      return currentSettings.resultPosters[selectedPosterIndex];
    }
    return poster;
  };

  const handleFullPageLayoutChange = (elementKey, updates) => {
    if (!isFullPage) {
      onLayoutChange?.(elementKey, updates);
      return;
    }

    setCurrentSettings((prev) => ({
      ...prev,
      resultPosters: prev.resultPosters.map((p, index) =>
        index === selectedPosterIndex
          ? {
              ...p,
              layout: {
                ...p.layout,
                [elementKey]: {
                  ...p.layout[elementKey],
                  ...updates,
                },
              },
            }
          : p
      ),
    }));
  };

  const handleFullPageBackgroundChange = (imageData) => {
    if (!isFullPage) {
      onBackgroundChange?.(imageData);
      return;
    }

    setCurrentSettings((prev) => ({
      ...prev,
      resultPosters: prev.resultPosters.map((p, index) =>
        index === selectedPosterIndex ? { ...p, backgroundImage: imageData } : p
      ),
    }));
  };

  const handleMouseDown = (e, elementKey) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();

    setSelectedElement(elementKey);
    setIsDragging(true);

    const rect = canvasRef.current.getBoundingClientRect();
    const initialX = ((e.clientX - rect.left) / rect.width) * 100;
    const initialY = ((e.clientY - rect.top) / rect.height) * 100;

    setDragStart({
      x: initialX,
      y: initialY,
      elementX: getCurrentPoster()?.layout?.[elementKey]?.x || 0,
      elementY: getCurrentPoster()?.layout?.[elementKey]?.y || 0,
    });
  };

  const handleTouchStart = (e, elementKey) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();

    setSelectedElement(elementKey);
    setIsDragging(true);

    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const initialX = ((touch.clientX - rect.left) / rect.width) * 100;
    const initialY = ((touch.clientY - rect.top) / rect.height) * 100;

    setDragStart({
      x: initialX,
      y: initialY,
      elementX: getCurrentPoster()?.layout?.[elementKey]?.x || 0,
      elementY: getCurrentPoster()?.layout?.[elementKey]?.y || 0,
    });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !selectedElement || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;

      if (!clientX || !clientY) return;

      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));

      if (isFullPage) {
        handleFullPageLayoutChange(selectedElement, {
          x: clampedX,
          y: clampedY,
        });
      } else {
        onLayoutChange?.(selectedElement, { x: clampedX, y: clampedY });
      }
    },
    [isDragging, selectedElement, isFullPage]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleMove = (e) => {
      if (e.type === "mousemove") {
        handleMouseMove(e);
      } else if (e.type === "touchmove") {
        e.preventDefault();
        handleMouseMove(e);
      }
    };

    const handleEnd = () => handleMouseUp();

    if (isDragging) {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove, { passive: false });
      document.addEventListener("touchend", handleEnd);

      return () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleFullPageSave = async () => {
    if (!isFullPage) {
      onSave?.();
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/settings", {
        method: currentSettings.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentSettings,
          tenantId: tenantId,
          updatedBy: user?.id,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save settings");
      }

      const result = await response.json();
      setCurrentSettings(result.data);
      toast.success("Poster layout saved successfully!");
    } catch (error) {
      console.error("Error saving poster layout:", error);
      toast.error(error.message || "Failed to save poster layout");
    } finally {
      setIsSaving(false);
    }
  };

  const addNewPoster = () => {
    if (!isFullPage) return;

    const newPoster = createDefaultPoster();
    newPoster.name = `Poster ${(currentSettings?.resultPosters?.length || 0) + 1}`;

    setCurrentSettings((prev) => ({
      ...prev,
      resultPosters: [...(prev.resultPosters || []), newPoster],
    }));

    setSelectedPosterIndex(currentSettings?.resultPosters?.length || 0);
  };

  const updatePosterName = (name) => {
    if (!isFullPage) return;

    setCurrentSettings((prev) => ({
      ...prev,
      resultPosters: prev.resultPosters.map((p, index) =>
        index === selectedPosterIndex ? { ...p, name } : p
      ),
    }));
  };

  const removePoster = (indexToRemove) => {
    if (!isFullPage || currentSettings.resultPosters.length <= 1) {
      toast.error("Cannot remove the last poster");
      return;
    }

    setCurrentSettings((prev) => ({
      ...prev,
      resultPosters: prev.resultPosters.filter(
        (_, index) => index !== indexToRemove
      ),
    }));

    if (selectedPosterIndex >= indexToRemove && selectedPosterIndex > 0) {
      setSelectedPosterIndex(selectedPosterIndex - 1);
    }
  };

  const applyPresetTemplate = (templateType) => {
    const currentPoster = getCurrentPoster();
    if (!currentPoster) return;

    let newLayout;
    switch (templateType) {
      case "centered":
        newLayout = {
          ...currentPoster.layout,
          resultNumber: {
            ...currentPoster.layout.resultNumber,
            x: 50,
            y: 12,
            textAlign: "left",
          },
          firstPlace: {
            ...currentPoster.layout.firstPlace,
            x: 50,
            y: 35,
            textAlign: "left",
          },
          secondPlace: {
            ...currentPoster.layout.secondPlace,
            x: 50,
            y: 55,
            textAlign: "left",
          },
          thirdPlace: {
            ...currentPoster.layout.thirdPlace,
            x: 50,
            y: 75,
            textAlign: "left",
          },
        };
        break;
      case "vertical":
        newLayout = {
          ...currentPoster.layout,
          resultNumber: {
            ...currentPoster.layout.resultNumber,
            x: 50,
            y: 10,
            textAlign: "left",
          },
          firstPlace: {
            ...currentPoster.layout.firstPlace,
            x: 50,
            y: 25,
            textAlign: "left",
          },
          secondPlace: {
            ...currentPoster.layout.secondPlace,
            x: 50,
            y: 45,
            textAlign: "left",
          },
          thirdPlace: {
            ...currentPoster.layout.thirdPlace,
            x: 50,
            y: 65,
            textAlign: "left",
          },
        };
        break;
      case "traditional":
        newLayout = {
          ...currentPoster.layout,
          resultNumber: {
            ...currentPoster.layout.resultNumber,
            x: 50,
            y: 15,
            textAlign: "left",
          },
          firstPlace: {
            ...currentPoster.layout.firstPlace,
            x: 50,
            y: 40,
            textAlign: "left",
            fontSize: 20,
          },
          secondPlace: {
            ...currentPoster.layout.secondPlace,
            x: 25,
            y: 65,
            textAlign: "left",
          },
          thirdPlace: {
            ...currentPoster.layout.thirdPlace,
            x: 75,
            y: 65,
            textAlign: "left",
          },
        };
        break;
      default:
        return;
    }

    if (isFullPage) {
      setCurrentSettings((prev) => ({
        ...prev,
        resultPosters: prev.resultPosters.map((p, index) =>
          index === selectedPosterIndex ? { ...p, layout: newLayout } : p
        ),
      }));
    } else {
      Object.keys(newLayout).forEach((elementKey) => {
        onLayoutChange?.(elementKey, newLayout[elementKey]);
      });
    }

    toast.success(`Applied ${templateType} template`);
  };

  const renderProgramInfo = (config, isDraggable = false) => {
    if (!config?.visible) return null;

    const fallback = "SPEECH ENGLISH";
    const value = (config.text ?? "").trim() || fallback;
    const baseFontSize = calculateResponsiveFont(
      config.fontSize,
      containerSize.width,
      containerSize.height,
      config
    );
    const textDimensions = calculateTextDimensions(
      value,
      baseFontSize,
      config.fontWeight,
      containerSize.width * 0.9
    );
    const fontSize = config.autoFit
      ? textDimensions.suggestedFontSize
      : baseFontSize;

    return (
      <div
        key={`programInfo-${selectedPosterIndex}-${config.fontSize}`}
        className={`absolute pointer-events-auto select-none transition-all duration-200 ${
          isDraggable && !isPreview ? "cursor-move hover:scale-105" : ""
        } ${selectedElement === "programInfo" && !isPreview ? "ring-2 ring-primary ring-offset-2" : ""}`}
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform:
            config.textAlign === "center"
              ? "translateX(-50%)"
              : config.textAlign === "right"
                ? "translateX(-100%)"
                : "translateX(0)",
          fontSize: `${fontSize}px`,
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight,
          letterSpacing: `${config.letterSpacing || 0}px`,
          textShadow: config.textShadow
            ? "2px 2px 4px rgba(0,0,0,0.8)"
            : "none",
          maxWidth: "90%",
          whiteSpace: "nowrap",
          zIndex: 10,
        }}
        onMouseDown={
          isDraggable ? (e) => handleMouseDown(e, "programInfo") : undefined
        }
        onTouchStart={
          isDraggable ? (e) => handleTouchStart(e, "programInfo") : undefined
        }
        onClick={() => !isPreview && setSelectedElement("programInfo")}
      >
        {value}
      </div>
    );
  };

  const renderDivisionInfo = (config, isDraggable = false) => {
    if (!config?.visible) return null;

    const fallback = "Senior Group";
    const value = (config.text ?? "").trim() || fallback;
    const baseFontSize = calculateResponsiveFont(
      config.fontSize,
      containerSize.width,
      containerSize.height,
      config
    );
    const textDimensions = calculateTextDimensions(
      value,
      baseFontSize,
      config.fontWeight,
      containerSize.width * 0.9
    );
    const fontSize = config.autoFit
      ? textDimensions.suggestedFontSize
      : baseFontSize;

    return (
      <div
        key={`divisionInfo-${selectedPosterIndex}-${config.fontSize}`}
        className={`absolute pointer-events-auto select-none transition-all duration-200 ${
          isDraggable && !isPreview ? "cursor-move hover:scale-105" : ""
        } ${selectedElement === "divisionInfo" && !isPreview ? "ring-2 ring-primary ring-offset-2" : ""}`}
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform:
            config.textAlign === "center"
              ? "translateX(-50%)"
              : config.textAlign === "right"
                ? "translateX(-100%)"
                : "translateX(0)",
          fontSize: `${fontSize}px`,
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight,
          letterSpacing: `${config.letterSpacing || 0}px`,
          textShadow: config.textShadow
            ? "2px 2px 4px rgba(0,0,0,0.8)"
            : "none",
          maxWidth: "90%",
          whiteSpace: "nowrap",
          zIndex: 10,
        }}
        onMouseDown={
          isDraggable ? (e) => handleMouseDown(e, "divisionInfo") : undefined
        }
        onTouchStart={
          isDraggable ? (e) => handleTouchStart(e, "divisionInfo") : undefined
        }
        onClick={() => !isPreview && setSelectedElement("divisionInfo")}
      >
        {value}
      </div>
    );
  };

  const renderResultNumber = (config, isDraggable = false) => {
    if (!config?.visible) return null;

    const fallback = "01";
    const displayValue =
      config.prefix + ((config.text ?? "").trim() || fallback);
    const baseFontSize = calculateResponsiveFont(
      config.fontSize,
      containerSize.width,
      containerSize.height,
      config
    );
    const textDimensions = calculateTextDimensions(
      displayValue,
      baseFontSize,
      config.fontWeight,
      containerSize.width * 0.9
    );
    const fontSize = config.autoFit
      ? textDimensions.suggestedFontSize
      : baseFontSize;

    return (
      <div
        key={`resultNumber-${selectedPosterIndex}-${config.fontSize}`}
        className={`absolute pointer-events-auto select-none transition-all duration-200 ${
          isDraggable && !isPreview ? "cursor-move hover:scale-105" : ""
        } ${selectedElement === "resultNumber" && !isPreview ? "ring-2 ring-primary ring-offset-2" : ""}`}
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform: "translateX(0)",
          fontSize: `${fontSize}px`,
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight,
          letterSpacing: `${config.letterSpacing || 0}px`,
          textShadow: config.textShadow
            ? "2px 2px 4px rgba(0,0,0,0.8)"
            : "none",
          maxWidth: "90%",
          whiteSpace: "nowrap",
          zIndex: 10,
        }}
        onMouseDown={
          isDraggable ? (e) => handleMouseDown(e, "resultNumber") : undefined
        }
        onTouchStart={
          isDraggable ? (e) => handleTouchStart(e, "resultNumber") : undefined
        }
        onClick={() => !isPreview && setSelectedElement("resultNumber")}
      >
        {displayValue}
      </div>
    );
  };

  const renderWinnersList = (
    config,
    winners = [],
    elementKey,
    isDraggable = false
  ) => {
    if (!config?.visible || !winners?.length) return null;

    const maxWinners = Math.min(winners.length, config.maxWinners || 1);
    const displayWinners = winners.slice(0, maxWinners);
    const baseFontSize = calculateResponsiveFont(
      config.fontSize,
      containerSize.width,
      containerSize.height,
      config
    );

    return (
      <div
        key={`${elementKey}-${selectedPosterIndex}-${config.fontSize}`}
        className={`absolute pointer-events-auto select-none transition-all duration-200 ${
          isDraggable && !isPreview ? "cursor-move hover:scale-105" : ""
        } ${selectedElement === elementKey && !isPreview ? "ring-2 ring-primary ring-offset-2" : ""}`}
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform: "translateX(0)",
          maxWidth: "90%",
          zIndex: 10,
          padding: `${config.containerPadding || 10}px`,
        }}
        onMouseDown={
          isDraggable ? (e) => handleMouseDown(e, elementKey) : undefined
        }
        onTouchStart={
          isDraggable ? (e) => handleTouchStart(e, elementKey) : undefined
        }
        onClick={() => !isPreview && setSelectedElement(elementKey)}
      >
        {displayWinners.map((winner, index) => {
          const displayName = config.maxNameLength
            ? truncateText(winner.studentName || "Winner", config.maxNameLength)
            : winner.studentName || "Winner";
          const teamDisplay =
            config.showTeamName && winner.teamName ? winner.teamName : "";

          return (
            <div
              key={index}
              className="block"
              style={{
                marginBottom:
                  index < displayWinners.length - 1
                    ? `${config.nameSpacing || 4}px`
                    : "0",
                fontSize: `${baseFontSize}px`,
                color: config.color,
                fontWeight: config.fontWeight,
                textAlign: config.textAlign,
                lineHeight: config.lineHeight,
                letterSpacing: `${config.letterSpacing || 0}px`,
                textShadow: config.textShadow
                  ? "2px 2px 4px rgba(0,0,0,0.8)"
                  : "none",
                whiteSpace: "nowrap",
              }}
            >
              {config.showRank && `${index + 1}. `}
              {displayName}
              {teamDisplay && (
                <div
                  style={{
                    fontSize: `${Math.max(8, baseFontSize * 0.8)}px`,
                    opacity: 0.8,
                    marginTop: `${config.teamNameSpacing || 0}px`,
                  }}
                >
                  {teamDisplay}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleDownloadPoster = async () => {
    if (!posterRef.current) {
      toast.error("Please wait for the poster to load completely");
      return;
    }

    setIsLoading(true);
    try {
      const element = posterRef.current;
      const dataUrl = await domToPng(element, {
        quality: 1,
        scale: 6 * window.devicePixelRatio,
        backgroundColor: "#ffffff",
        style: {
          fontFamily: "'Montserrat', Arial, sans-serif",
        },
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "poster-template.png";
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Poster template downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download poster template. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFullPage && !currentSettings) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="h-6 w-6 animate-spin mr-2" />
        <span>Loading Poster Customizer...</span>
      </div>
    );
  }

  if (!getCurrentPoster()) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No poster data available</p>
      </div>
    );
  }

  const currentPoster = getCurrentPoster();

  return (
    <div className={isFullPage ? "min-h-screen" : ""}>
      {isFullPage && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="flex items-center justify-end gap-3">
            <Button
              onClick={handleFullPageSave}
              disabled={isSaving}
              size={isMobile ? "sm" : "default"}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      <div className={isFullPage ? "max-w-7xl mx-auto" : ""}>
        <div
          className={`grid gap-6 ${isFullPage ? "lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}
        >
          {isFullPage && (
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid className="h-5 w-5" />
                    Poster Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-3">
                    {currentSettings?.resultPosters?.map((poster, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                          selectedPosterIndex === index
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                            : "border-border hover:border-border"
                        }`}
                      >
                        <button
                          onClick={() => setSelectedPosterIndex(index)}
                          className="text-sm font-medium"
                        >
                          {poster.name}
                        </button>
                        {currentSettings.resultPosters.length > 1 && (
                          <button
                            onClick={() => removePoster(index)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 p-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      onClick={addNewPoster}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Poster
                    </Button>
                  </div>

                  <div className="mt-4">
                    <Label>Poster Name</Label>
                    <Input
                      value={currentPoster.name}
                      onChange={(e) => updatePosterName(e.target.value)}
                      placeholder="Enter poster name..."
                      className="mt-1"
                    />
                  </div>

                  <div className="mt-4">
                    <Label>Quick Templates</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {presetTemplates.map((template) => (
                        <Button
                          key={template.value}
                          onClick={() => applyPresetTemplate(template.value)}
                          variant="outline"
                          size="sm"
                        >
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div
            className={`${isFullPage ? "lg:col-span-2 order-2 md:order-1" : ""}`}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Poster Preview
                    {currentPoster.name && isFullPage && (
                      <Badge variant="secondary" className="ml-2">
                        {currentPoster.name}
                      </Badge>
                    )}
                  </CardTitle>
                  {!isPreview && isMobile && (
                    <Button
                      onClick={() => setShowMobileControls(!showMobileControls)}
                      variant="outline"
                      size="sm"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!isPreview && (
                  <div className="mb-4">
                    <Label className="flex items-center gap-2 mb-2">
                      <Upload className="h-4 w-4" />
                      Upload Background Image
                    </Label>
                    <ImageUploader
                      key={`bg-uploader-${selectedPosterIndex}`}
                      value={currentPoster.backgroundImage}
                      onChange={
                        isFullPage
                          ? handleFullPageBackgroundChange
                          : onBackgroundChange
                      }
                      aspectRatio="1:1"
                      allowedTypes={["image/jpeg", "image/png"]}
                      className="h-12"
                    />
                  </div>
                )}

                <div className="w-full overflow-x-auto overflow-y-hidden pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="flex justify-center min-w-[300px]">
                    <div
                      ref={posterRef}
                      className="relative w-[300px] mx-auto aspect-square bg-card overflow-hidden shadow-lg"
                    >
                      <div
                        ref={canvasRef}
                        key={`canvas-${selectedPosterIndex}`}
                        className={`relative mx-auto bg-gray-100 border-2 border-border overflow-hidden ${!isPreview ? "hover:border-primary/50" : ""}`}
                        style={{
                          width: "300px",
                          height: "300px",
                          backgroundImage: currentPoster?.backgroundImage?.url
                            ? `url(${currentPoster.backgroundImage.url})`
                            : "none",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }}
                      >
                        {renderProgramInfo(
                          currentPoster?.layout?.programInfo,
                          !isPreview
                        )}
                        {renderDivisionInfo(
                          currentPoster?.layout?.divisionInfo,
                          !isPreview
                        )}
                        {renderResultNumber(
                          currentPoster?.layout?.resultNumber,
                          !isPreview
                        )}
                        {renderWinnersList(
                          currentPoster?.layout?.firstPlace,
                          [
                            {
                              studentName: "1st Ranker",
                              teamName: "Team Alpha",
                            },
                          ],
                          "firstPlace",
                          !isPreview
                        )}
                        {renderWinnersList(
                          currentPoster?.layout?.secondPlace,
                          [
                            {
                              studentName: "2nd Ranker",
                              teamName: "Team Beta",
                            },
                          ],
                          "secondPlace",
                          !isPreview
                        )}
                        {renderWinnersList(
                          currentPoster?.layout?.thirdPlace,
                          [
                            {
                              studentName: "3rd Ranker",
                              teamName: "Team Gamma",
                            },
                          ],
                          "thirdPlace",
                          !isPreview
                        )}

                        {!isPreview && isMobile && !selectedElement && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/50 text-white px-3 py-2 rounded text-sm">
                              Tap elements to edit
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mt-4">
                  <Button
                    onClick={handleDownloadPoster}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download Poster
                      </>
                    )}
                  </Button>
                </div>

                {selectedElement && !isPreview && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Selected:{" "}
                        {selectedElement === "programInfo"
                          ? "Program Name"
                          : selectedElement === "divisionInfo"
                            ? "Division Name"
                            : selectedElement === "resultNumber"
                              ? "Result Number"
                              : selectedElement === "firstPlace"
                                ? "First Place"
                                : selectedElement === "secondPlace"
                                  ? "Second Place"
                                  : selectedElement === "thirdPlace"
                                    ? "Third Place"
                                    : selectedElement}
                      </span>
                      <button
                        onClick={() => setSelectedElement(null)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:dark:text-blue-200"
                      >
                        <EyeOff className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ============== CONTROLS SECTION - THIS WAS MISSING ============== */}
          <div
            className={`space-y-4 ${isFullPage ? "order-1 md:order-2" : ""} ${isMobile && !showMobileControls && !isPreview ? "hidden" : ""}`}
          >
            {/* Element Selection (Mobile) */}
            {isMobile && !isPreview && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Select Element</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedElement || ""}
                    onValueChange={(value) =>
                      setSelectedElement(value === "null" ? null : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose element to edit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="programInfo">Program Name</SelectItem>
                      <SelectItem value="divisionInfo">
                        Division Name
                      </SelectItem>
                      <SelectItem value="resultNumber">
                        Result Number
                      </SelectItem>
                      <SelectItem value="firstPlace">First Place</SelectItem>
                      <SelectItem value="secondPlace">Second Place</SelectItem>
                      <SelectItem value="thirdPlace">Third Place</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {/* Element Controls */}
            {selectedElement
              ? (() => {
                  const config = currentPoster.layout?.[selectedElement];
                  if (!config) return null;

                  return (
                    <Card
                      key={selectedElement}
                      className="ring-2 ring-primary transition-all"
                    >
                      <CardHeader className="pb-2 sm:pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                            <button
                              onClick={() => setSelectedElement(null)}
                              className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              {selectedElement === "programInfo"
                                ? "Program Name"
                                : selectedElement === "divisionInfo"
                                  ? "Division Name"
                                  : selectedElement === "resultNumber"
                                    ? "Result Number"
                                    : selectedElement === "firstPlace"
                                      ? "First Place"
                                      : selectedElement === "secondPlace"
                                        ? "Second Place"
                                        : "Third Place"}
                            </button>
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={config.visible}
                              onCheckedChange={(visible) => {
                                if (isFullPage) {
                                  handleFullPageLayoutChange(selectedElement, {
                                    visible,
                                  });
                                } else {
                                  onLayoutChange?.(selectedElement, {
                                    visible,
                                  });
                                }
                              }}
                            />
                            {config.visible ? (
                              <Eye className="h-4 w-4 text-green-600" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 sm:space-y-3 md:space-y-4 p-3 sm:p-4 md:p-6">
                        {/* Hidden Warning */}
                        {!config.visible && (
                          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                              <EyeOff className="h-4 w-4" />
                              This element is currently hidden on the poster
                            </p>
                          </div>
                        )}

                        {/* Position Controls */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs sm:text-sm">
                              X Position
                            </Label>
                            <Slider
                              value={[config.x || 50]}
                              onValueChange={([x]) => {
                                if (isFullPage) {
                                  handleFullPageLayoutChange(selectedElement, {
                                    x,
                                  });
                                } else {
                                  onLayoutChange?.(selectedElement, { x });
                                }
                              }}
                              max={100}
                              step={0.5}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm">
                              Y Position
                            </Label>
                            <Slider
                              value={[config.y || 50]}
                              onValueChange={([y]) => {
                                if (isFullPage) {
                                  handleFullPageLayoutChange(selectedElement, {
                                    y,
                                  });
                                } else {
                                  onLayoutChange?.(selectedElement, { y });
                                }
                              }}
                              max={100}
                              step={0.5}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        {/* Font Controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs sm:text-sm">
                              Font Size
                            </Label>
                            <Slider
                              value={[config.fontSize || 12]}
                              onValueChange={([fontSize]) => {
                                if (isFullPage) {
                                  handleFullPageLayoutChange(selectedElement, {
                                    fontSize,
                                  });
                                } else {
                                  onLayoutChange?.(selectedElement, {
                                    fontSize,
                                  });
                                }
                              }}
                              min={8}
                              max={48}
                              step={1}
                              className="mt-1"
                            />
                            <span className="text-xs text-muted-foreground">
                              {config.fontSize || 12}px
                            </span>
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm">
                              Text Color
                            </Label>
                            <ColorInput
                              value={config.color || "#ffffff"}
                              onChange={(color) => {
                                if (isFullPage) {
                                  handleFullPageLayoutChange(selectedElement, {
                                    color,
                                  });
                                } else {
                                  onLayoutChange?.(selectedElement, { color });
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* Style Controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs sm:text-sm">
                              Font Weight
                            </Label>
                            <Select
                              value={config.fontWeight || "normal"}
                              onValueChange={(fontWeight) => {
                                if (isFullPage) {
                                  handleFullPageLayoutChange(selectedElement, {
                                    fontWeight,
                                  });
                                } else {
                                  onLayoutChange?.(selectedElement, {
                                    fontWeight,
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="bold">Bold</SelectItem>
                                <SelectItem value="600">Semi Bold</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm">
                              Text Align
                            </Label>
                            <Select
                              value={config.textAlign || "left"}
                              onValueChange={(textAlign) => {
                                if (isFullPage) {
                                  handleFullPageLayoutChange(selectedElement, {
                                    textAlign,
                                  });
                                } else {
                                  onLayoutChange?.(selectedElement, {
                                    textAlign,
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Advanced Controls Toggle */}
                        {!isMobile && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full"
                          >
                            {showAdvanced ? "Hide" : "Show"} Advanced Options
                          </Button>
                        )}

                        {/* Advanced Options */}
                        {(showAdvanced || isMobile) && (
                          <div className="space-y-3 pt-3 border-t border-border">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs sm:text-sm">
                                  Line Height
                                </Label>
                                <Slider
                                  value={[config.lineHeight || 1.2]}
                                  onValueChange={([lineHeight]) => {
                                    if (isFullPage) {
                                      handleFullPageLayoutChange(
                                        selectedElement,
                                        { lineHeight }
                                      );
                                    } else {
                                      onLayoutChange?.(selectedElement, {
                                        lineHeight,
                                      });
                                    }
                                  }}
                                  min={0.8}
                                  max={2.0}
                                  step={0.1}
                                  className="mt-1"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {config.lineHeight || 1.2}
                                </span>
                              </div>

                              {(selectedElement === "resultNumber" ||
                                selectedElement === "firstPlace" ||
                                selectedElement === "secondPlace" ||
                                selectedElement === "thirdPlace") && (
                                <div>
                                  <Label className="text-xs sm:text-sm">
                                    Letter Spacing
                                  </Label>
                                  <Slider
                                    value={[config.letterSpacing || 0]}
                                    onValueChange={([letterSpacing]) => {
                                      if (isFullPage) {
                                        handleFullPageLayoutChange(
                                          selectedElement,
                                          { letterSpacing }
                                        );
                                      } else {
                                        onLayoutChange?.(selectedElement, {
                                          letterSpacing,
                                        });
                                      }
                                    }}
                                    min={-2}
                                    max={5}
                                    step={0.1}
                                    className="mt-1"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {config.letterSpacing || 0}px
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Result Number Prefix */}
                            {selectedElement === "resultNumber" && (
                              <div>
                                <Label className="text-xs sm:text-sm">
                                  Prefix Text
                                </Label>
                                <Input
                                  value={config.prefix || ""}
                                  onChange={(e) => {
                                    if (isFullPage) {
                                      handleFullPageLayoutChange(
                                        selectedElement,
                                        { prefix: e.target.value }
                                      );
                                    } else {
                                      onLayoutChange?.(selectedElement, {
                                        prefix: e.target.value,
                                      });
                                    }
                                  }}
                                  placeholder="e.g., R-"
                                  className="mt-1 h-8 text-xs"
                                />
                              </div>
                            )}

                            {/* Winner-specific options */}
                            {(selectedElement === "firstPlace" ||
                              selectedElement === "secondPlace" ||
                              selectedElement === "thirdPlace") && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs sm:text-sm">
                                      Max Winners
                                    </Label>
                                    <Slider
                                      value={[config.maxWinners || 1]}
                                      onValueChange={([maxWinners]) => {
                                        if (isFullPage) {
                                          handleFullPageLayoutChange(
                                            selectedElement,
                                            { maxWinners }
                                          );
                                        } else {
                                          onLayoutChange?.(selectedElement, {
                                            maxWinners,
                                          });
                                        }
                                      }}
                                      min={1}
                                      max={5}
                                      step={1}
                                      className="mt-1"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {config.maxWinners || 1}
                                    </span>
                                  </div>
                                  <div>
                                    <Label className="text-xs sm:text-sm">
                                      Name Spacing
                                    </Label>
                                    <Slider
                                      value={[config.nameSpacing || 4]}
                                      onValueChange={([nameSpacing]) => {
                                        if (isFullPage) {
                                          handleFullPageLayoutChange(
                                            selectedElement,
                                            { nameSpacing }
                                          );
                                        } else {
                                          onLayoutChange?.(selectedElement, {
                                            nameSpacing,
                                          });
                                        }
                                      }}
                                      min={-5}
                                      max={20}
                                      step={1}
                                      className="mt-1"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {config.nameSpacing || 4}px
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-xs sm:text-sm">
                                    Team Name Spacing
                                  </Label>
                                  <Slider
                                    value={[config.teamNameSpacing || 0]}
                                    onValueChange={([teamNameSpacing]) => {
                                      if (isFullPage) {
                                        handleFullPageLayoutChange(
                                          selectedElement,
                                          { teamNameSpacing }
                                        );
                                      } else {
                                        onLayoutChange?.(selectedElement, {
                                          teamNameSpacing,
                                        });
                                      }
                                    }}
                                    min={-5}
                                    max={10}
                                    step={1}
                                    className="mt-1"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {config.teamNameSpacing || 0}px
                                  </span>
                                </div>

                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id={`${selectedElement}-show-rank`}
                                      checked={config.showRank || false}
                                      onCheckedChange={(showRank) => {
                                        if (isFullPage) {
                                          handleFullPageLayoutChange(
                                            selectedElement,
                                            { showRank }
                                          );
                                        } else {
                                          onLayoutChange?.(selectedElement, {
                                            showRank,
                                          });
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor={`${selectedElement}-show-rank`}
                                      className="text-xs"
                                    >
                                      Show Rank Number
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id={`${selectedElement}-show-team`}
                                      checked={config.showTeamName !== false}
                                      onCheckedChange={(showTeamName) => {
                                        if (isFullPage) {
                                          handleFullPageLayoutChange(
                                            selectedElement,
                                            { showTeamName }
                                          );
                                        } else {
                                          onLayoutChange?.(selectedElement, {
                                            showTeamName,
                                          });
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor={`${selectedElement}-show-team`}
                                      className="text-xs"
                                    >
                                      Show Team
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Toggle Options */}
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={`${selectedElement}-text-shadow`}
                                  checked={config.textShadow || false}
                                  onCheckedChange={(textShadow) => {
                                    if (isFullPage) {
                                      handleFullPageLayoutChange(
                                        selectedElement,
                                        { textShadow }
                                      );
                                    } else {
                                      onLayoutChange?.(selectedElement, {
                                        textShadow,
                                      });
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`${selectedElement}-text-shadow`}
                                  className="text-xs"
                                >
                                  Text Shadow
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={`${selectedElement}-auto-fit`}
                                  checked={config.autoFit !== false}
                                  onCheckedChange={(autoFit) => {
                                    if (isFullPage) {
                                      handleFullPageLayoutChange(
                                        selectedElement,
                                        { autoFit }
                                      );
                                    } else {
                                      onLayoutChange?.(selectedElement, {
                                        autoFit,
                                      });
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`${selectedElement}-auto-fit`}
                                  className="text-xs"
                                >
                                  Auto Fit
                                </Label>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()
              : !isPreview && (
                  <Card className="border-dashed border-2 border-border">
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {isMobile
                          ? "Select an element above or tap elements in the preview"
                          : "Click elements in the preview to customize"}
                      </p>
                    </CardContent>
                  </Card>
                )}

            {/* All Elements Overview (Desktop) */}
            {!isMobile && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">All Elements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { key: "programInfo", label: "Program Name" },
                    { key: "divisionInfo", label: "Division Name" },
                    { key: "resultNumber", label: "Result Number" },
                    { key: "firstPlace", label: "First Place" },
                    { key: "secondPlace", label: "Second Place" },
                    { key: "thirdPlace", label: "Third Place" },
                  ].map((element) => {
                    const config = currentPoster.layout?.[element.key];
                    return (
                      <button
                        key={element.key}
                        onClick={() => setSelectedElement(element.key)}
                        className="w-full flex items-center justify-between p-2 rounded border hover:border-primary hover:bg-accent transition-colors text-left"
                      >
                        <span className="text-sm font-medium">
                          {element.label}
                        </span>
                        <div className="flex items-center gap-2">
                          {config?.visible ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {!isFullPage && onSave && (
            <div className="mt-6 text-center">
              <Button onClick={onSave} size="lg" className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Save Layout
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PosterCustomizer;
