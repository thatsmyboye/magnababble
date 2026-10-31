"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { RoomMode } from "@/lib/game/phases";
import {
  DEFAULT_SUBMIT_SECONDS,
  DEFAULT_VOTE_SECONDS,
  SUBMIT_SECONDS_OPTIONS,
  VOTE_SECONDS_OPTIONS,
  describeSettings,
  type RoomSettings,
} from "@/lib/game/settings";

interface ThemeSummary {
  theme: string;
  framed: number;
  freestyle: number;
}

interface HouseRulesProps {
  value: RoomSettings;
  mode: RoomMode;
  onChange: (next: RoomSettings) => void;
}

function Switch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-start gap-3 text-left rounded-lg px-1 py-1 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <span
        aria-hidden
        className={cn(
          "relative mt-0.5 inline-block w-9 h-5 shrink-0 rounded-full transition-colors",
          checked ? "bg-violet-500" : "bg-white/20"
        )}
      >
        <span
          className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", checked ? "left-[18px]" : "left-0.5")}
        />
      </span>
      <span>
        <span className="block text-sm text-white font-semibold">{label}</span>
        <span className="block text-xs text-white/50">{description}</span>
      </span>
    </button>
  );
}

function Segmented({
  label,
  options,
  value,
  onSelect,
  format,
}: {
  label: string;
  options: number[];
  value: number;
  onSelect: (n: number) => void;
  format: (n: number) => string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onSelect(n)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
            value === n
              ? "bg-violet-600 border-violet-400 text-white"
              : "bg-white/5 border-white/15 text-white/70 hover:bg-white/10"
          )}
        >
          {format(n)}
        </button>
      ))}
    </div>
  );
}

/** Optional house rules, tucked behind an "Advanced" toggle in the create form. */
export function HouseRules({ value, mode, onChange }: HouseRulesProps) {
  const [open, setOpen] = useState(false);
  const [themes, setThemes] = useState<ThemeSummary[] | null>(null);
  const [themeError, setThemeError] = useState(false);

  useEffect(() => {
    if (!open || themes) return;
    fetch("/api/themes")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { themes: ThemeSummary[] }) => setThemes(d.themes))
      .catch(() => setThemeError(true));
  }, [open, themes]);

  const submit = value.submitSeconds ?? DEFAULT_SUBMIT_SECONDS;
  const vote = value.voteSeconds ?? DEFAULT_VOTE_SECONDS;
  const chosen = new Set(value.themes ?? []);
  const summary = describeSettings(value);

  function set(patch: Partial<RoomSettings>) {
    const next: RoomSettings = { ...value, ...patch };
    // Store only non-defaults so "no house rules" stays an empty object.
    if (next.submitSeconds === DEFAULT_SUBMIT_SECONDS) delete next.submitSeconds;
    if (next.voteSeconds === DEFAULT_VOTE_SECONDS) delete next.voteSeconds;
    if (next.themes && next.themes.length === 0) delete next.themes;
    if (!next.specialRounds) delete next.specialRounds;
    if (!next.familyFriendly) delete next.familyFriendly;
    onChange(next);
  }

  function toggleTheme(theme: string) {
    const nextThemes = new Set(chosen);
    if (nextThemes.has(theme)) nextThemes.delete(theme);
    else nextThemes.add(theme);
    set({ themes: Array.from(nextThemes) });
  }

  // Warn when the chosen themes can't supply the chosen style on their own.
  const picked = (themes ?? []).filter((t) => chosen.has(t.theme));
  const framedCount = picked.reduce((n, t) => n + t.framed, 0);
  const freeCount = picked.reduce((n, t) => n + t.freestyle, 0);
  const thin =
    picked.length > 0 &&
    ((mode !== "freestyle" && framedCount === 0) || (mode !== "frames" && freeCount === 0));

  return (
    <div className="rounded-xl border border-white/10 bg-black/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white/70 hover:text-white"
      >
        <span>
          Advanced
          {summary.length > 0 && <span className="ml-2 text-violet-300">{summary.join(" · ")}</span>}
        </span>
        <span aria-hidden className={cn("transition-transform", open && "rotate-180")}>
          ▾
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              <div>
                <p className="text-sm text-white/60 mb-1.5">Time to write</p>
                <Segmented
                  label="Time to write"
                  options={SUBMIT_SECONDS_OPTIONS}
                  value={submit}
                  onSelect={(n) => set({ submitSeconds: n })}
                  format={(n) => `${n}s`}
                />
                <p className="text-white/40 text-xs mt-1">Freestyle rounds get 50% more.</p>
              </div>

              <div>
                <p className="text-sm text-white/60 mb-1.5">Time to vote</p>
                <Segmented
                  label="Time to vote"
                  options={VOTE_SECONDS_OPTIONS}
                  value={vote}
                  onSelect={(n) => set({ voteSeconds: n })}
                  format={(n) => `${n}s`}
                />
              </div>

              <div className="space-y-2">
                <Switch
                  label="Special rounds"
                  description="Surprise speed and chaos rounds, and a double-points finale."
                  checked={Boolean(value.specialRounds)}
                  onChange={(on) => set({ specialRounds: on })}
                />
                <Switch
                  label="Family-friendly"
                  description="Leaves out dating prompts and a few edgier words."
                  checked={Boolean(value.familyFriendly)}
                  onChange={(on) => set({ familyFriendly: on })}
                />
              </div>

              <div>
                <p className="text-sm text-white/60 mb-1.5">Themes</p>
                {themeError && <p className="text-red-300 text-xs">Couldn&apos;t load themes. All themes will be used.</p>}
                {!themes && !themeError && <p className="text-white/40 text-xs">Loading themes…</p>}
                {themes && (
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Themes">
                    <button
                      type="button"
                      aria-pressed={chosen.size === 0}
                      onClick={() => set({ themes: [] })}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        chosen.size === 0
                          ? "bg-violet-600 border-violet-400 text-white"
                          : "bg-white/5 border-white/15 text-white/70 hover:bg-white/10"
                      )}
                    >
                      All themes
                    </button>
                    {themes.map((t) => (
                      <button
                        key={t.theme}
                        type="button"
                        aria-pressed={chosen.has(t.theme)}
                        onClick={() => toggleTheme(t.theme)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          chosen.has(t.theme)
                            ? "bg-violet-600 border-violet-400 text-white"
                            : "bg-white/5 border-white/15 text-white/70 hover:bg-white/10"
                        )}
                      >
                        {t.theme}
                      </button>
                    ))}
                  </div>
                )}
                {thin && (
                  <p className="text-amber-300 text-xs mt-1.5">
                    These themes are short on{" "}
                    {mode !== "freestyle" && framedCount === 0 ? "fill-the-blank" : "freestyle"} prompts, so other
                    themes will fill in.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
