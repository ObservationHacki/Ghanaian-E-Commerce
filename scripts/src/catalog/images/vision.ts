import type { VisionResult } from "./types";

const PROMPT = `You verify whether an image shows the correct laptop product.
Return ONLY JSON: {"match":boolean,"confidence":number,"reason":string}
confidence is 0..1. match=true only if the photo clearly shows that laptop model/family (same brand + series), not a banner, logo, keyboard-only crop, internals, or unrelated device.`;

function parseVisionJson(text: string): VisionResult {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { match: false, confidence: 0, reason: "unparseable" };
  try {
    const data = JSON.parse(m[0]) as VisionResult;
    return {
      match: Boolean(data.match),
      confidence: Number(data.confidence) || 0,
      reason: data.reason,
    };
  } catch {
    return { match: false, confidence: 0, reason: "json-error" };
  }
}

async function verifyOpenAI(
  title: string,
  imageUrl: string,
  apiKey: string,
  baseUrl?: string,
): Promise<VisionResult> {
  const endpoint = `${(baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `${PROMPT}\nProduct title: ${title}` },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI vision ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return parseVisionJson(data.choices?.[0]?.message?.content || "");
}

async function verifyGemini(
  title: string,
  imageBytes: Buffer,
  mimeType: string,
  apiKey: string,
): Promise<VisionResult> {
  const model = process.env.GEMINI_VISION_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${PROMPT}\nProduct title: ${title}` },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBytes.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: { temperature: 0 },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini vision ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseVisionJson(text);
}

export function visionConfigured(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY ||
      process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  );
}

/**
 * AI verification. Requires OPENAI_API_KEY or GEMINI_API_KEY (or Replit AI_INTEGRATIONS_*).
 * When --allow-unverified is set by the caller, they may skip this.
 */
export async function verifyImageMatch(opts: {
  productTitle: string;
  imageUrl: string;
  imageBytes: Buffer;
  mimeType: string;
}): Promise<VisionResult> {
  const openaiKey =
    process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const openaiBase = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const geminiKey =
    process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;

  if (openaiKey) {
    return verifyOpenAI(opts.productTitle, opts.imageUrl, openaiKey, openaiBase);
  }
  if (geminiKey) {
    return verifyGemini(
      opts.productTitle,
      opts.imageBytes,
      opts.mimeType,
      geminiKey,
    );
  }
  throw new Error(
    "No vision API key. Set OPENAI_API_KEY or GEMINI_API_KEY (or use --allow-unverified).",
  );
}
