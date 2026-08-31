import { redirect } from "next/navigation";

export default function AccountIndexRoute() {
  redirect("/account/dashboard");
}
