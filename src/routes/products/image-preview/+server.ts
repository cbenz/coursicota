import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const previewCache = new Map<string, string | null>();

function isAllowedProductUrl(value: string): boolean {
  try {
    const target = new URL(value);
    return (
      (target.protocol === "https:" || target.protocol === "http:") &&
      target.hostname.endsWith("carrefour.fr")
    );
  } catch {
    return false;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMetaImage(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtml(match[1]);
    }
  }

  return null;
}

export const GET: RequestHandler = async ({ url, fetch }) => {
  const productUrl = url.searchParams.get("url")?.trim();

  if (!productUrl) {
    return json({ imageUrl: null }, { status: 400 });
  }

  if (!isAllowedProductUrl(productUrl)) {
    return json({ imageUrl: null }, { status: 400 });
  }

  if (previewCache.has(productUrl)) {
    return json({ imageUrl: previewCache.get(productUrl) });
  }

  try {
    const response = await fetch(productUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      previewCache.set(productUrl, null);
      return json({ imageUrl: null });
    }

    const html = await response.text();
    const imageUrl = extractMetaImage(html);
    previewCache.set(productUrl, imageUrl);

    return json({ imageUrl });
  } catch {
    previewCache.set(productUrl, null);
    return json({ imageUrl: null });
  }
};
