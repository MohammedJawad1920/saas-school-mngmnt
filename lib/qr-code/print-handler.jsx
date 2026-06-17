// lib/qr-code/print-handler.js
export function createPrintHandler(contentRef, options = {}) {
  return {
    content: () => contentRef.current,
    documentTitle: options.organizationName
      ? `${options.organizationName} - Results QR Code`
      : "Results QR Code",
    pageStyle: `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  };
}
