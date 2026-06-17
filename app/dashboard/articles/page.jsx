import Header from "@/components/Header";
import ArticlesManagement from "@/components/ArticlesManagement";
import { fetchData } from "@/lib/utils";
import ErrorPage from "@/components/ErrorPage";

export default async function ArticlesPage() {
  try {
    const apiKey = process.env.API_KEY;
    const initialArticles = await fetchData("articles", "", 0);

    return (
      <>
        <Header title="ARTICLES" subTitle="Manage and Publish Latest Articles" />
        <ArticlesManagement
          apiKey={apiKey}
          initialArticles={initialArticles}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading articles:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing articles."
      />
    );
  }
}

export const revalidate = 0;
