import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";

export default async function Home() {
  await requireUser();
  redirect("/lancamento");
}
