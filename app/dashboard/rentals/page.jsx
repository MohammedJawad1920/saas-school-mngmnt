import { fetchData } from "@/lib/utils";
import LibraryDashboard from "@/components/LibraryDashboard";

export default async function Page() {
    const initialRentals = await fetchData("rental", "", 0, "data");

    return <LibraryDashboard view="rentals" initialRentals={initialRentals} />;
}
