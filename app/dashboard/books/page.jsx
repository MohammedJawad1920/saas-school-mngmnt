import { fetchData } from "@/lib/utils";
import LibraryDashboard from "@/components/LibraryDashboard";

export default async function Page() {
    const initialBooks = await fetchData("library/books", "", 0, "data");

    return <LibraryDashboard view="books" initialBooks={initialBooks} />;
}
