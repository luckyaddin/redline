import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://redlinekw.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/private/", "/api/"] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
