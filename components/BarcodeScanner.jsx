"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const BarcodeScanner = ({ onScan, onClose }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [isSecureContext, setIsSecureContext] = useState(true);
    const [isLocalhost, setIsLocalhost] = useState(false);
    const scannerRef = useRef(null);
    // Use a unique ID for the reader div
    const readerId = useId().replace(/:/g, "");

    const startScanner = async () => {
        setErrorMsg("");

        try {
            const { Html5Qrcode } = await import("html5-qrcode");

            // If scanner is already running, don't start it again
            if (scannerRef.current?.isScanning) return;

            // Wait a bit to ensure the container is mounted and ready
            const container = document.getElementById(readerId);
            if (!container) return;

            const scanner = new Html5Qrcode(readerId);
            scannerRef.current = scanner;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            await scanner.start(
                { facingMode: "environment" },
                config,
                (result) => {
                    // Successful scan
                    onScan(result);
                    // Stop is usually handled by parent closing the dialog, 
                    // but we can be proactive if needed
                },
                () => {
                    // Ignore scan errors (scanning for frames that don't have QR codes)
                }
            );

            setIsScanning(true);
        } catch (err) {
            console.error("Error starting scanner:", err);
            let friendlyError = "Could not access camera.";

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                friendlyError = "Camera permission denied. Please allow camera access.";
            } else if (err.name === 'NotFoundError') {
                friendlyError = "No camera found on this device.";
            } else if (typeof window !== 'undefined' && !window.isSecureContext) {
                friendlyError = "Camera access requires HTTPS connection.";
            }

            setErrorMsg(friendlyError);
            toast.error(friendlyError);
        }
    };

    const cleanupScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                // clear() removes any UI elements left behind and helps prevent React/DOM conflicts
                await scannerRef.current.clear();
            } catch (err) {
                console.error("Failed to cleanup scanner:", err);
            } finally {
                scannerRef.current = null;
            }
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsSecureContext(window.isSecureContext);
            setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        }

        const timer = setTimeout(() => {
            startScanner();
        }, 500);

        return () => {
            clearTimeout(timer);
            cleanupScanner();
        };
    }, []);

    const handleStop = async () => {
        await cleanupScanner();
        onClose();
    };

    return (
        <div className="flex flex-col items-center gap-4 py-4 w-full">
            {/* 
                CRITICAL: The scanner container must be EMPTY. 
                React should not manage any children inside this div, 
                as html5-qrcode will inject its own video/canvas elements.
                Fighting over DOM children leads to "removeChild" errors.
            */}
            <div className="relative w-full max-w-[300px] aspect-square rounded-lg border-2 border-primary/20 overflow-hidden bg-black">
                {/* Dedicated node for the scanner library */}
                <div id={readerId} className="w-full h-full" />

                {/* Overlay UI managed by React */}
                {!isScanning && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-black/50 text-white text-center">
                        {errorMsg ? (
                            <div className="space-y-3">
                                <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
                                <p className="text-sm font-medium">{errorMsg}</p>
                                <Button variant="secondary" size="sm" onClick={startScanner} className="mt-2 text-black">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Retry
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <RefreshCw className="w-8 h-8 animate-spin mb-2 text-primary" />
                                <p className="text-sm">Accessing camera...</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleStop}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                </Button>
            </div>

            {!isSecureContext && !isLocalhost && (
                <p className="text-[10px] text-destructive text-center px-6 font-medium">
                    Webcam requires a secure connection (HTTPS).
                </p>
            )}

            <p className="text-xs text-muted-foreground italic text-center">
                Center the student's barcode in the square area.
            </p>
        </div>
    );
};

export default BarcodeScanner;
