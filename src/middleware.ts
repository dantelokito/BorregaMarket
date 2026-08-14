import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { UserRole } from "@/lib/auth/token";
import { verifyToken, TOKEN_COOKIE } from "@/lib/auth/edge-token";
import {
  isAdminRoute,
  isProviderRoute,
  isClientRoute,
} from "@/lib/auth/permissions";

const PUBLIC_PATHS = ["/", "/login", "/registro", "/explorar", "/fruteria", "/carrito"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  let session = null;
  if (token) {
    try {
      session = verifyToken(token);
    } catch {
      // token inválido
    }
  }

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname === "/";

  if (isPublic) return NextResponse.next();

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute(pathname) && session.role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isProviderRoute(pathname) && session.role !== UserRole.PROVIDER) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isClientRoute(pathname) && session.role !== UserRole.CLIENT) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
