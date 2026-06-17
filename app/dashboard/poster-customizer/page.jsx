// app/dashboard/poster-customizer/page.jsx
import { Suspense } from "react";
import PosterCustomizer from "@/components/PosterCustomizer";
import Header from "@/components/Header";
import ErrorPage from "@/components/ErrorPage";
import { cookies } from "next/headers";
import { Skeleton } from "@/components/ui/skeleton";

export default async function PosterCustomizerPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;

    // Role-based access control
    const canCustomizePoster = ["Admin", "Program Committee"].includes(
      activeRole
    );

    if (!canCustomizePoster) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-muted-foreground">
              Only Program Committee and Admins can customize posters.
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        <Header
          title="POSTER CUSTOMIZER"
          subTitle="Customize result poster layouts for your festival"
        />
        <Suspense fallback={<PosterCustomizerSkeleton />}>
          <PosterCustomizer isFullPage={true} />
        </Suspense>
      </>
    );
  } catch (error) {
    console.error("Error loading poster customizer:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while loading the poster customizer."
      />
    );
  }
}

function PosterCustomizerSkeleton() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

export const revalidate = 0;
