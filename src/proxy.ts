import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next.js 16 uses `proxy.ts` (the renamed `middleware.ts`). Clerk's middleware
// is a default export + `config`, which matches the proxy file convention.
const isProtectedRoute = createRouteMatcher([
  "/onboarding(.*)",
  "/admin(.*)",
  "/dashboard(.*)",
  "/quick-sale(.*)",
  "/sales(.*)",
  "/expenses(.*)",
  "/products(.*)",
  "/suppliers(.*)",
  "/reports(.*)",
  "/cash-close(.*)",
  "/team(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
