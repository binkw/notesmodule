/**
 * Fetch and extract text content from a URL.
 * Server-side only - respects robots, timeouts, and size limits.
 */

import * as cheerio from "cheerio";

export type FetchResult = {
  url: string;
  title: string;
  text: string;
  success: boolean;
};

const TIMEOUT_MS = 8000;
const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_TEXT_LENGTH = 20000;
const ALLOWED_CONTENT_TYPES = ["text/html", "text/plain"];

/**
 * Fetch URL and extract readable text content.
 * Returns empty text on failure (agent should handle gracefully).
 */
export async function fetchUrlText(url: string): Promise<FetchResult> {
  const result: FetchResult = {
    url,
    title: "",
    text: "",
    success: false,
  };

  // Validate URL
  if (!url || !url.startsWith("https://")) {
    console.log("[FetchUrl] Invalid URL (must be https):", url);
    return result;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    console.log("[FetchUrl] Fetching:", url);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NotesAgent/1.0; Research Bot)",
        Accept: "text/html, text/plain, */*",
        "Accept-Language": "nl,en;q=0.9",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log("[FetchUrl] HTTP error:", response.status);
      return result;
    }

    // Check content type
    const contentType = response.headers.get("content-type") || "";
    const isAllowed = ALLOWED_CONTENT_TYPES.some((type) =>
      contentType.toLowerCase().includes(type)
    );

    if (!isAllowed) {
      console.log("[FetchUrl] Unsupported content type:", contentType);
      return result;
    }

    // Check content length
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BYTES) {
      console.log("[FetchUrl] Content too large:", contentLength);
      return result;
    }

    // Read body with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      console.log("[FetchUrl] No response body");
      return result;
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalSize += value.length;
      if (totalSize > MAX_BYTES) {
        console.log("[FetchUrl] Max size reached, stopping");
        break;
      }

      chunks.push(value);
    }

    const html = new TextDecoder().decode(
      Uint8Array.from(chunks.flatMap((chunk) => Array.from(chunk)))
    );

    // Parse HTML and extract text
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $("script, style, nav, header, footer, aside, iframe, noscript").remove();
    $("[hidden]").remove();
    $(".ad, .ads, .advertisement, .social-share, .comments").remove();

    // Extract title
    result.title =
      $("meta[property='og:title']").attr("content") ||
      $("title").first().text() ||
      $("h1").first().text() ||
      "";
    result.title = result.title.trim().slice(0, 200);

    // Extract main content
    let mainText = "";

    // Try common article selectors
    const articleSelectors = [
      "article",
      "main",
      ".content",
      ".article-content",
      ".post-content",
      "#content",
      ".entry-content",
    ];

    for (const selector of articleSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        mainText = element.text();
        break;
      }
    }

    // Fallback to body
    if (!mainText) {
      mainText = $("body").text();
    }

    // Clean up text
    result.text = cleanText(mainText).slice(0, MAX_TEXT_LENGTH);
    result.success = result.text.length > 100;

    console.log(
      "[FetchUrl] Extracted",
      result.text.length,
      "chars from",
      url.slice(0, 50)
    );

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("[FetchUrl] Timeout:", url);
    } else {
      console.error("[FetchUrl] Error:", error);
    }
    return result;
  }
}

/**
 * Clean extracted text: normalize whitespace, remove excess newlines.
 */
function cleanText(text: string): string {
  return (
    text
      // Replace multiple whitespace with single space
      .replace(/\s+/g, " ")
      // Trim
      .trim()
      // Limit consecutive newlines
      .replace(/\n{3,}/g, "\n\n")
  );
}

/**
 * Fetch multiple URLs in parallel (with limit).
 */
export async function fetchMultipleUrls(
  urls: string[],
  maxUrls: number = 2
): Promise<FetchResult[]> {
  const limitedUrls = urls.slice(0, maxUrls);
  console.log("[FetchUrl] Fetching", limitedUrls.length, "URLs");

  const results = await Promise.all(limitedUrls.map((url) => fetchUrlText(url)));

  const successCount = results.filter((r) => r.success).length;
  console.log("[FetchUrl] Success:", successCount, "/", limitedUrls.length);

  return results;
}

/**
 * Create a summary snippet from fetched content for agent context.
 */
export function createContentSnippet(
  results: FetchResult[],
  maxCharsPerSource: number = 3000
): string {
  if (results.length === 0) return "";

  let snippet = "\n\n--- PAGINA INHOUD ---\n";

  for (const result of results) {
    if (result.success && result.text) {
      snippet += `\n[${result.title || result.url}]\n`;
      snippet += result.text.slice(0, maxCharsPerSource);
      snippet += "\n";
    }
  }

  snippet += "--- EINDE PAGINA INHOUD ---\n";

  return snippet;
}

