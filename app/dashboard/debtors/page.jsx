import { cookies, headers } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import connectToDB from "@/lib/db";
import Batch from "@/models/Batch";
import Class from "@/models/Class";
import DebtCategory from "@/models/DebtCategory";
import { sortClasses } from "@/lib/utils";
import DebtorsClient from "./DebtorsClient";

export const dynamic = "force-dynamic";

export default async function DebtorsPage() {
  try {
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active-role")?.value;

    if (activeRole !== "Org Admin") {
      return (
        <ErrorPage
          statusCode={403}
          title="Access Denied"
          description="Only Org Admins can access the Debtors page."
        />
      );
    }

    await connectToDB();

    const [batchesData, classesData, categoriesData] = await Promise.all([
      Batch.find().select("id name startYear endYear").sort({ startYear: 1 }).lean(),
      Class.find().select("id name").lean(),
      DebtCategory.find().sort({ name: 1 }).lean(),
    ]);

    classesData.sort((a, b) => sortClasses(a, b));

    const batches    = JSON.parse(JSON.stringify(batchesData));
    const classes    = JSON.parse(JSON.stringify(classesData));
    const categories = JSON.parse(JSON.stringify(categoriesData));

    return (
      <div className="flex flex-col space-y-2">
        <Header
          title="DEBTORS"
          subTitle="Manage student debt records"
        />
        <DebtorsClient
          batches={batches}
          classes={classes}
          categories={categories}
          apiKey={process.env.APIKEY}
        />
      </div>
    );
  } catch (error) {
    console.error("Error loading debtors page:", error);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred."
      />
    );
  }
}
