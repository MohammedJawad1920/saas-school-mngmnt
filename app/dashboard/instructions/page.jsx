import { Suspense } from "react";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import InstructionsComponent from "@/components/InstructionsComponent";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";

export default async function InstructionsPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    // Fetch settings which contain instructions
    const settings = await fetchData("settings", "", 0);

    return (
      <>
        <Header
          title="FESTIVAL INSTRUCTIONS"
          subTitle="Guidelines and Important Information"
        />
        <Suspense fallback={<div className="p-4">Loading instructions...</div>}>
          <InstructionsComponent
            data={settings?.festival?.instructions || ""}
            apiKey={apiKey}
            readOnly={activeRole !== "Program Committee"}
          />
        </Suspense>
      </>
    );
  } catch (error) {
    console.error("Error loading instructions page:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while loading instructions."
      />
    );
  }
}

export const dynamic = "force-dynamic";
