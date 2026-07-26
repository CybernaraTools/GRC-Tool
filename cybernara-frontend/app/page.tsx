import { redirect } from "next/navigation";
import { loginPath } from "../src/lib/auth";
import { readSessionContext } from "../src/lib/session";

export default async function Home() {
  const session = await readSessionContext();
  if (!session) {
    redirect(loginPath("/"));
  }
  if (session.kind === "platform") {
    redirect("/platform/tenants");
  }

  redirect("/dashboard");
}
