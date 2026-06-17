import { Suspense } from "react";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import RulesTopicsComponent from "@/components/RulesTopicsComponent";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";

export default async function RulesAndTopicsPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    return (
      <>
        <Header
          title="RULES & TOPICS"
          subTitle="Program Guidelines and Information"
        />
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <RulesTopicsComponent
            apiKey={apiKey}
            readOnly={activeRole !== "Program Committee"}
          />
        </Suspense>
      </>
    );
  } catch (error) {
    console.error("Error loading rules and topics page:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 60;
