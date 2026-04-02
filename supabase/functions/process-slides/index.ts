import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Expected multipart/form-data with a PDF file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "No file field found in form data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return new Response(
        JSON.stringify({ error: "Only PDF files are supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Simple PDF text extraction — parse page-by-page using PDF structure
    const text = new TextDecoder("latin1").decode(bytes);
    const slides = extractPagesFromPdf(text, bytes);

    return new Response(JSON.stringify({ slides }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-slides error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface SlideData {
  slide_number: number;
  content: string;
}

/**
 * Extract text content from PDF pages.
 * Uses a lightweight approach: finds page boundaries via /Type /Page objects,
 * then extracts text from content streams using text operators (Tj, TJ, ', ").
 */
function extractPagesFromPdf(text: string, _bytes: Uint8Array): SlideData[] {
  // Find all stream...endstream blocks
  const streams: string[] = [];
  let searchStart = 0;
  while (true) {
    const streamStart = text.indexOf("stream\r\n", searchStart);
    const streamStartAlt = streamStart === -1 ? text.indexOf("stream\n", searchStart) : streamStart;
    const idx = streamStart !== -1 && (streamStartAlt === -1 || streamStart <= streamStartAlt) ? streamStart : streamStartAlt;
    if (idx === -1) break;

    const contentStart = idx + (text[idx + 6] === "\r" ? 8 : 7);
    const endIdx = text.indexOf("endstream", contentStart);
    if (endIdx === -1) break;

    streams.push(text.substring(contentStart, endIdx));
    searchStart = endIdx + 9;
  }

  // Extract text from streams using PDF text operators
  const pageTexts: string[] = [];

  for (const stream of streams) {
    const extracted = extractTextFromStream(stream);
    if (extracted.trim().length > 0) {
      pageTexts.push(extracted.trim());
    }
  }

  // If we found text streams, group them into pages
  // Try to find /Type /Page occurrences to count pages
  const pageCount = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;

  if (pageTexts.length === 0) {
    // Fallback: return single slide with whatever text we can find
    const fallbackText = extractAllVisibleText(text);
    if (fallbackText.trim()) {
      return [{ slide_number: 1, content: fallbackText.trim() }];
    }
    return [{ slide_number: 1, content: "(No extractable text found in this PDF)" }];
  }

  // If we have roughly the same number of text blocks as pages, map 1:1
  if (pageCount > 0 && pageTexts.length >= pageCount) {
    const slidesPerPage = Math.ceil(pageTexts.length / pageCount);
    const slides: SlideData[] = [];
    for (let i = 0; i < pageCount; i++) {
      const start = i * slidesPerPage;
      const end = Math.min(start + slidesPerPage, pageTexts.length);
      const content = pageTexts.slice(start, end).join("\n");
      slides.push({ slide_number: i + 1, content });
    }
    return slides;
  }

  // Otherwise each text block is a slide
  return pageTexts.map((content, i) => ({
    slide_number: i + 1,
    content,
  }));
}

function extractTextFromStream(stream: string): string {
  const parts: string[] = [];

  // Match text showing operators: (text) Tj, [(text)] TJ, (text) ', (text) "
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let m;
  while ((m = tjRegex.exec(stream)) !== null) {
    parts.push(decodePdfString(m[1]));
  }

  // TJ arrays: [(text) num (text) ...] TJ
  const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
  while ((m = tjArrayRegex.exec(stream)) !== null) {
    const inner = m[1];
    const strRegex = /\(([^)]*)\)/g;
    let sm;
    const tjParts: string[] = [];
    while ((sm = strRegex.exec(inner)) !== null) {
      tjParts.push(decodePdfString(sm[1]));
    }
    parts.push(tjParts.join(""));
  }

  return parts.join(" ").replace(/\s+/g, " ");
}

function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function extractAllVisibleText(text: string): string {
  const parts: string[] = [];
  const regex = /\(([^)]{2,})\)\s*Tj/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    parts.push(decodePdfString(m[1]));
  }
  return parts.join(" ").replace(/\s+/g, " ");
}
