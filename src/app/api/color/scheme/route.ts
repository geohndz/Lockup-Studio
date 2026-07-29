import { NextResponse } from "next/server";

const UPSTREAM = "https://www.thecolorapi.com/scheme";

const MODES = new Set([
  "monochrome",
  "monochrome-dark",
  "monochrome-light",
  "analogic",
  "complement",
  "analogic-complement",
  "triad",
  "quad",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hex = searchParams.get("hex")?.replace(/^#/, "").trim();
  const mode = searchParams.get("mode")?.trim() || "monochrome";
  const countRaw = Number(searchParams.get("count") || "5");
  const count = Number.isFinite(countRaw)
    ? Math.min(12, Math.max(2, Math.round(countRaw)))
    : 5;

  if (!hex || !/^[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(hex)) {
    return NextResponse.json(
      { error: "Valid hex query parameter required" },
      { status: 400 },
    );
  }
  if (!MODES.has(mode)) {
    return NextResponse.json({ error: "Invalid scheme mode" }, { status: 400 });
  }

  const url = `${UPSTREAM}?hex=${encodeURIComponent(hex)}&mode=${encodeURIComponent(mode)}&count=${count}&format=json`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream scheme lookup failed" },
        { status: res.status },
      );
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach The Color API" },
      { status: 502 },
    );
  }
}
