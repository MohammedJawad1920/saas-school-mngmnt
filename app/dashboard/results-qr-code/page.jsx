// app/dashboard/results-qr-code/page.jsx
import { Suspense } from "react";
import ResultsQRCodeView from "./_components/ResultsQRCodeView";
import { QRCodeSkeleton } from "./_components/QRCodeSkeleton";
import ErrorPage from "@/components/ErrorPage";

export default async function ResultsQRCodePage() {
  try {
    return (
      <Suspense fallback={<QRCodeSkeleton />}>
        <ResultsQRCodeView />
      </Suspense>
    );
  } catch (error) {
    console.error("Error loading QR code page:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while loading the QR code page."
      />
    );
  }
}

export const revalidate = 0;
