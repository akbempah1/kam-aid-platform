import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/",
    "/monthly/:path*",
    "/weekly/:path*",
    "/branch-visit/:path*",
    "/shortages/:path*",
    "/history/:path*",
    "/settings/:path*",
  ],
};