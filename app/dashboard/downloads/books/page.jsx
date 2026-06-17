import { cookies, headers } from "next/headers";
import Books from "@/components/Books";
import connectToDB from "@/lib/db";
import BookModel from "@/models/Book.js";

export default async function BooksPage() {
  const cookieStore = await cookies();
  const activeRole = cookieStore.get("active-role")?.value;
  const headersList = await headers();
  const isE2ETest = headersList.get("x-e2e-test") === "true";
  const apiKey = process.env.API_KEY;

  let books = [];
  if (!isE2ETest) {
    try {
      await connectToDB();
      const data = await BookModel.find({}).sort({ createdAt: -1 }).lean();
      books = JSON.parse(JSON.stringify(data));
    } catch (error) {
      console.error("Failed to fetch book data:", error);
      // Handle the error appropriately, maybe return an error message to the user
    }
  }

  return (
    <Books
      initialBooks={books}
      apiKey={apiKey}
      activeRole={activeRole}
    />
  );
}
