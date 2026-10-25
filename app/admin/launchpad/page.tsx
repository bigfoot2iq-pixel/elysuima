import { redirect } from "next/navigation";

/**
 * The launchpad settings are folded into the NFT Collection section now.
 * Keep the old route working for bookmarks and external links.
 */
export default function LaunchpadAdminPage() {
  redirect("/admin#collection");
}
