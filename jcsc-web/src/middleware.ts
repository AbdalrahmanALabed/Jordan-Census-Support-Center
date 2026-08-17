import { withAuth } from "next-auth/middleware";
import { BASE_PATH } from "@/lib/base-path";

export default withAuth({
  pages: {
    signIn: `${BASE_PATH}/login`,
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/reports/:path*",
    "/report/:path*",
    "/cases/:path*",
    "/approval-center/:path*",
    "/issues/:path*",
    "/tickets/:path*",
    "/developer/:path*",
    "/deployment/:path*",
    "/testing/:path*",
    "/audit/:path*",
    "/search/:path*",
    "/email-templates/:path*",
    "/queues/:path*",
    "/users/:path*",
    "/roles/:path*",
    "/routing-rules/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/playbooks/:path*",
    "/shift-handover/:path*",
    "/knowledge-base/:path*",
    "/api/reports/:path*",
    "/api/cases/:path*",
    "/api/issues/:path*",
    "/api/notifications/:path*",
    "/api/users/:path*",
    "/api/dashboard/:path*",
  ],
};
