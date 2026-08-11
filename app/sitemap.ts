import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://redlinekw.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: siteUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/services`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/about`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/contact`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/quote`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/track`, lastModified, changeFrequency: "weekly", priority: 0.9 },
  ];
}
