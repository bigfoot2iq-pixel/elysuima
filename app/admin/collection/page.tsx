import { redirect } from "next/navigation";

/**
 * The collection console is now the first section of the admin page.
 * Keep the old route working for bookmarks and external links.
 */
export default function CollectionAdminPage() {
  redirect("/admin#collection");
}
