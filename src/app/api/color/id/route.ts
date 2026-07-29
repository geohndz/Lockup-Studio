import { NextResponse } from "next/server";

const UPSTREAM = "https://www.thecolorapi.com/id";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hex = searchParams.get("hex")?.replace(/^#/, "").trim();
  if (!hex || !/^[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(hex)) {
    return NextResponse.json(
      { error: "Valid hex query parameter required" },
      { status: 400 },
    );
  }

  const url = `${UPSTREAM}?hex=${encodeURIComponent(hex)}&format=json`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream color lookup failed" },
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
