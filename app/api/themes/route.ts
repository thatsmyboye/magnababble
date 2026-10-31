import { NextResponse } from "next/server";
import { isFreestyle } from "@/lib/game/scoring";
import { getServiceClient } from "@/lib/supabase/service";
import { handleRouteError } from "@/lib/api/helpers";

export interface ThemeSummary {
  theme: string;
  framed: number;
  freestyle: number;
}

/** Prompt themes with how many framed and freestyle prompts each has. */
export async function GET() {
  try {
    const sb = getServiceClient();
    const { data, error } = await sb.from("prompts").select("theme, sentence_frame");
    if (error) throw error;

    const byTheme = new Map<string, ThemeSummary>();
    for (const row of (data as { theme: string; sentence_frame: string }[] | null) ?? []) {
      const entry = byTheme.get(row.theme) ?? { theme: row.theme, framed: 0, freestyle: 0 };
      if (isFreestyle(row.sentence_frame)) entry.freestyle++;
      else entry.framed++;
      byTheme.set(row.theme, entry);
    }

    const themes = Array.from(byTheme.values()).sort(
      (a, b) => b.framed + b.freestyle - (a.framed + a.freestyle) || a.theme.localeCompare(b.theme)
    );
    // Content changes only with a migration; let the CDN cache it briefly.
    return NextResponse.json(
      { themes },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
    );
  } catch (err) {
    return handleRouteError("GET /api/themes", err);
  }
}
