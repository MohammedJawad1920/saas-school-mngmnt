// lib/qr-code/download-handler.js
export function downloadQRCode(canvasSelector, filename = "QR-Code") {
  try {
    const canvas = document.querySelector(canvasSelector);
    if (!canvas) {
      throw new Error("QR code canvas not found");
    }

    const pngFile = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.download = `${filename}.png`;
    downloadLink.href = pngFile;
    downloadLink.click();
  } catch (error) {
    throw new Error("Failed to download QR code");
  }
}
