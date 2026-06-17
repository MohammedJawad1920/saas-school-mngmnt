import { fetchData } from "@/lib/utils";
import LibraryDashboard from "@/components/LibraryDashboard";

export default async function Page() {
    const counts = await fetchData("library/books/bookCounts", "", 0, "data");
    const categories = await fetchData("library/books/categories", "", 0, "data");
    const languages = await fetchData("library/books/languages", "", 0, "data");
    const pendingRentals = await fetchData("rental?status=pending", "", 0, "data");
    const initialBooks = await fetchData("library/books", "", 0, "data");

    return <LibraryDashboard
        view="dashboard"
        counts={counts}
        categories={categories}
        languages={languages}
        initialPendingRentals={pendingRentals}
        initialBooks={initialBooks}
    />;
}
