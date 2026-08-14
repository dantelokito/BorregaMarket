import { cookies } from "next/headers";
import { verifyToken, TOKEN_COOKIE, type JwtPayload } from "./token";

export async function getServerSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
