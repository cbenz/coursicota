import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const previewCache = new Map<string, string | null>();
const execFileAsync = promisify(execFile);

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
		/<meta[^>]+property=["']og:image:url["'][^>]+content=["']([^"']+)["'][^>]*>/i,
		/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:url["'][^>]*>/i,
		/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
		/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i,
		/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
		/<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']image["'][^>]*>/i,
	];

	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match?.[1]) {
			return decodeHtml(match[1]);
		}
	}

	return null;
}

function toAbsoluteUrl(value: string, baseUrl: string): string | null {
	try {
		return new URL(value, baseUrl).toString();
	} catch {
		return null;
	}
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

		const html = await response.text();
		const rawImageUrl = extractMetaImage(html);
		const imageUrl = rawImageUrl
			? toAbsoluteUrl(rawImageUrl, productUrl)
			: null;

		if (imageUrl) {
			previewCache.set(productUrl, imageUrl);
			return json({ imageUrl });
		}

		// Fallback: Carrefour may return bot-protection HTML to Node fetch,
		// while curl still receives metadata with og:image.
		const { stdout } = await execFileAsync(
			"curl",
			[
				"-L",
				"-s",
				"-A",
				"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
				productUrl,
			],
			{ maxBuffer: 5 * 1024 * 1024 },
		);

		const curlRawImageUrl = extractMetaImage(stdout);
		const curlImageUrl = curlRawImageUrl
			? toAbsoluteUrl(curlRawImageUrl, productUrl)
			: null;

		if (curlImageUrl) {
			previewCache.set(productUrl, curlImageUrl);
			return json({ imageUrl: curlImageUrl });
		}

		return json({ imageUrl: null });
	} catch {
		return json({ imageUrl: null });
	}
};
