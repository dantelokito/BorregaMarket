import { getServerSession } from "@/lib/auth/get-server-session";
import { Header } from "./Header";

export async function HeaderWrapper() {
  const session = await getServerSession();

  const user = session
    ? {
        id: session.sub,
        email: session.email,
        name: session.name,
        role: session.role as "CLIENT" | "PROVIDER" | "ADMIN",
      }
    : null;

  return <Header user={user} />;
}
