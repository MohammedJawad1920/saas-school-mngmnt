"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ScratchCard({
  letter,
  size = 200,
  brushRadius = 16,
  onRevealChange,
}) {
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isScratching, setIsScratching] = useState(false);
  const [revealPercent, setRevealPercent] = useState(0);
  const [fullyRevealed, setFullyRevealed] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState(false);

  // Track last position for smooth interpolation
  const lastPositionRef = useRef(null);

  // Refs for performance
  const revealCheckTimeoutRef = useRef();
  const lastRevealCheck = useRef(0);

  // Reset card state when letter changes (new generation)
  useEffect(() => {
    setRevealPercent(0);
    setFullyRevealed(false);
    setKeyboardMode(false);
    setIsScratching(false);
    lastPositionRef.current = null;

    // Force canvas reset by clearing and reinitializing
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.opacity = "1";
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    }
  }, [letter]);

  /**
   * Initialize canvases with proper scaling for device pixel ratio
   */
  const initializeCanvases = useCallback(() => {
    if (typeof window === "undefined") return;

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const dpr = window.devicePixelRatio || 1;

    // Set actual size for both canvases
    [canvas, maskCanvas].forEach((c) => {
      c.width = size * dpr;
      c.height = size * dpr;
      c.style.width = `${size}px`;
      c.style.height = `${size}px`;

      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
      }
    });

    // Initialize overlay canvas (visible scratch surface)
    const overlayCtx = canvas.getContext("2d");
    if (overlayCtx) {
      overlayCtx.fillStyle = "#94a3b8"; // bg-slate-400
      overlayCtx.fillRect(0, 0, size, size);
    }

    // Initialize mask canvas (tracking scratched areas)
    const maskCtx = maskCanvas.getContext("2d");
    if (maskCtx) {
      maskCtx.fillStyle = "#000000";
      maskCtx.fillRect(0, 0, size, size);
    }

    // Apply CSS touch-action to prevent scrolling/zooming
    canvas.style.touchAction = "none";
  }, [size]);

  /**
   * Calculate reveal percentage by sampling mask canvas pixels
   * Debounced to avoid performance issues during rapid scratching
   */
  const calculateRevealPercent = useCallback(() => {
    const now = Date.now();
    if (now - lastRevealCheck.current < 50) return; // Throttle to max 20fps
    lastRevealCheck.current = now;

    if (revealCheckTimeoutRef.current) {
      clearTimeout(revealCheckTimeoutRef.current);
    }

    revealCheckTimeoutRef.current = setTimeout(() => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;

      const ctx = maskCanvas.getContext("2d");
      if (!ctx) return;

      try {
        // Sample pixels at lower resolution for performance
        const sampleSize = 4; // Sample every 4th pixel
        const imageData = ctx.getImageData(
          0,
          0,
          maskCanvas.width,
          maskCanvas.height
        );
        const data = imageData.data;
        let totalSamples = 0;
        let revealedSamples = 0;

        // Sample pixels in a grid pattern
        for (let y = 0; y < maskCanvas.height; y += sampleSize) {
          for (let x = 0; x < maskCanvas.width; x += sampleSize) {
            const index = (y * maskCanvas.width + x) * 4;
            totalSamples++;
            // Check alpha channel - if it's low, pixel is "scratched"
            if (data[index + 3] < 128) {
              revealedSamples++;
            }
          }
        }

        const percent =
          totalSamples > 0 ? (revealedSamples / totalSamples) * 100 : 0;
        setRevealPercent(Math.round(percent));
        onRevealChange && onRevealChange(percent);

        // Auto-reveal at 40% threshold
        if (percent >= 40 && !fullyRevealed) {
          setFullyRevealed(true);
          // Hide overlay canvas
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.style.opacity = "0";
          }
        }
      } catch (error) {
        console.error("Error calculating reveal percent:", error);
      }
    }, 100); // Reduced debounce for better responsiveness
  }, [fullyRevealed, onRevealChange]);

  /**
   * Draw a scratch stroke on both overlay and mask canvases
   */
  const scratch = useCallback(
    (x, y) => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !maskCanvas || fullyRevealed) return;

      // Use CSS pixels directly since canvas is already scaled
      const drawScratch = (ctx, x, y) => {
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
        ctx.fill();
      };

      // Draw on overlay canvas (visual feedback)
      const overlayCtx = canvas.getContext("2d");
      if (overlayCtx) {
        drawScratch(overlayCtx, x, y);
      }

      // Draw on mask canvas (tracking)
      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        drawScratch(maskCtx, x, y);
      }

      calculateRevealPercent();
    },
    [brushRadius, fullyRevealed, calculateRevealPercent]
  );

  /**
   * Smooth interpolation between two points to avoid gaps
   */
  const scratchLine = useCallback(
    (x1, y1, x2, y2) => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !maskCanvas || fullyRevealed) return;

      const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const steps = Math.max(1, Math.ceil(distance / (brushRadius / 2)));

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        scratch(x, y);
      }
    },
    [scratch, brushRadius, fullyRevealed]
  );

  /**
   * Get normalized coordinates from pointer event
   */
  const getPointerCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  /**
   * Unified pointer event handlers (works for mouse, touch, and pen)
   */
  const handlePointerDown = useCallback(
    (e) => {
      if (fullyRevealed) return;

      const coords = getPointerCoordinates(e);
      if (!coords) return;

      setIsScratching(true);
      lastPositionRef.current = coords;

      // Capture pointer for smooth dragging across the entire screen
      e.currentTarget.setPointerCapture(e.pointerId);

      // Initial scratch at touch point
      scratch(coords.x, coords.y);
    },
    [fullyRevealed, getPointerCoordinates, scratch]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isScratching || fullyRevealed) return;

      const coords = getPointerCoordinates(e);
      if (!coords) return;

      // Smooth interpolation from last position to current position
      if (lastPositionRef.current) {
        scratchLine(
          lastPositionRef.current.x,
          lastPositionRef.current.y,
          coords.x,
          coords.y
        );
      } else {
        scratch(coords.x, coords.y);
      }

      lastPositionRef.current = coords;
    },
    [isScratching, fullyRevealed, getPointerCoordinates, scratchLine, scratch]
  );

  const handlePointerUp = useCallback((e) => {
    setIsScratching(false);
    lastPositionRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const handlePointerCancel = useCallback((e) => {
    setIsScratching(false);
    lastPositionRef.current = null;
    // Release capture on cancel (important for resilience)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore errors if pointer was already released
    }
  }, []);

  /**
   * Keyboard accessibility support
   */
  const handleKeyDown = useCallback(
    (e) => {
      if (fullyRevealed) return;

      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          setKeyboardMode(!keyboardMode);
          break;
        case "r":
        case "R":
          if (revealPercent >= 60) {
            e.preventDefault();
            setFullyRevealed(true);
            if (canvasRef.current) {
              canvasRef.current.style.opacity = "0";
            }
          }
          break;
        case "ArrowUp":
        case "ArrowDown":
        case "ArrowLeft":
        case "ArrowRight":
          if (keyboardMode) {
            e.preventDefault();
            // Simulate scratching in the direction of arrow key
            const centerX = size / 2;
            const centerY = size / 2;
            const stepSize = brushRadius;
            let scratchX = centerX;
            let scratchY = centerY;

            switch (e.key) {
              case "ArrowUp":
                scratchY -= stepSize;
                break;
              case "ArrowDown":
                scratchY += stepSize;
                break;
              case "ArrowLeft":
                scratchX -= stepSize;
                break;
              case "ArrowRight":
                scratchX += stepSize;
                break;
            }

            // Keep within bounds
            scratchX = Math.max(
              brushRadius,
              Math.min(size - brushRadius, scratchX)
            );
            scratchY = Math.max(
              brushRadius,
              Math.min(size - brushRadius, scratchY)
            );

            scratch(scratchX, scratchY);
          }
          break;
      }
    },
    [fullyRevealed, keyboardMode, revealPercent, size, brushRadius, scratch]
  );

  // Initialize canvases on mount and when letter changes
  useEffect(() => {
    initializeCanvases();
  }, [initializeCanvases, letter]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (revealCheckTimeoutRef.current) {
        clearTimeout(revealCheckTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card
      ref={containerRef}
      className="relative overflow-hidden select-none"
      style={{ width: size, height: size }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Scratch card for letter ${letter}`}
      aria-describedby="scratch-instructions"
    >
      {/* Letter content (revealed underneath) */}
      <div
        className="absolute inset-0 flex items-center justify-center text-6xl font-bold text-slate-800 bg-white"
        aria-hidden={!fullyRevealed}
      >
        {letter?.toUpperCase()}
      </div>

      {/* Hidden canvas for tracking scratch areas */}
      <canvas
        ref={maskCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ display: "none" }}
        aria-hidden="true"
      />

      {/* Visible scratch overlay canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair transition-opacity duration-500"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          touchAction: "none", // Prevent scrolling/zooming during interaction
          opacity: fullyRevealed ? 0 : 1,
        }}
        aria-hidden="true"
      />

      {/* Status indicators */}
      <div className="absolute top-2 left-2">
        <Badge variant="secondary" className="text-xs">
          {revealPercent}%
        </Badge>
      </div>

      {keyboardMode && (
        <div className="absolute bottom-2 left-2">
          <Badge variant="outline" className="text-xs">
            KB
          </Badge>
        </div>
      )}
    </Card>
  );
}
