import { redirect } from "next/navigation";

export default function LegacyAdminRoute() {
  redirect("/private/kuwait/login");
}
