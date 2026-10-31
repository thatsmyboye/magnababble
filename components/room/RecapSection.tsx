"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sentence } from "@/components/ui/sentence";
import type { Recap } from "@/lib/game/types";

interface RecapSectionProps {
  code: string;
  recap: Recap;
  myPlayerId: string;
}

type ShareState = "idle" | "working" | "shared" | "downloaded" | "failed";

/** Best sentence of the night, every round's winner, and a share button. */
export function RecapSection({ code, recap, myPlayerId }: RecapSectionProps) {
  const [share, setShare] = useState<ShareState>("idle");
  const imageUrl = `/api/rooms/${code}/recap-image`;

  async function handleShare() {
    setShare("working");
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], `magnababble-${code}.png`, { type: "image/png" });

      // Phones: the native share sheet with the image attached.
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "Magnababble recap",
            text: recap.best ? `Best of the night: ${recap.best.text.replace(/[[\]]/g, "")}` : "Our Magnababble game",
          });
          setShare("shared");
        } catch {
          setShare("idle"); // cancelled the share sheet
        }
        return;
      }

      // Desktop: save the image.
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 5_000);
      setShare("downloaded");
    } catch {
      setShare("failed");
    }
  }

  const label = {
    idle: "Share the recap",
    working: "Preparing image…",
    shared: "Shared!",
    downloaded: "Image saved",
    failed: "Couldn't make the image. Try again",
  }[share];

  return (
    <section aria-labelledby="recap-heading" className="w-full mb-8">
      <h2 id="recap-heading" className="sr-only">
        Game recap
      </h2>

      {recap.best && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="rounded-2xl border-2 border-yellow-400/50 bg-yellow-500/10 px-5 py-4 mb-4 text-center shadow-lg shadow-yellow-500/10"
        >
          <p className="text-yellow-300 text-xs font-black uppercase tracking-widest mb-2">Best of the night</p>
          <p className="text-white text-xl font-bold leading-relaxed">
            <Sentence text={recap.best.text} tileClassName="bg-yellow-400/20 text-yellow-100" />
          </p>
          <p className="mt-2 text-yellow-200 text-sm flex items-center justify-center gap-2">
            <Avatar id={recap.best.player_id} name={recap.best.player_name} size="sm" />
            {recap.best.player_id === myPlayerId ? "You" : recap.best.player_name} · {recap.best.votes}{" "}
            {recap.best.votes === 1 ? "vote" : "votes"} · round {recap.best.round_number}
          </p>
        </motion.div>
      )}

      {recap.rounds.length > 0 && (
        <details className="group rounded-2xl bg-white/5 border border-white/10 mb-4">
          <summary className="cursor-pointer list-none px-5 py-3 flex items-center justify-between text-white/80 font-semibold">
            Round by round
            <span aria-hidden className="text-white/40 transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <ol className="px-5 pb-4 space-y-3">
            {recap.rounds.map((r) => (
              <li key={r.round_number}>
                <p className="text-white/40 text-xs">
                  Round {r.round_number} · {r.theme}
                </p>
                <p className="text-white/60 text-xs mb-1">{r.prompt}</p>
                {r.winners.length === 0 ? (
                  <p className="text-white/40 text-sm italic">No votes this round</p>
                ) : (
                  r.winners.map((w) => (
                    <p key={`${w.player_id}-${w.text}`} className="text-white text-sm leading-relaxed">
                      <Sentence text={w.text} />{" "}
                      <span className="text-violet-300 text-xs whitespace-nowrap">
                        {w.player_id === myPlayerId ? "you" : w.player_name} · {w.votes}
                        {r.winners.length > 1 ? " · tied" : ""}
                      </span>
                    </p>
                  ))
                )}
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="flex flex-col items-center gap-1">
        <Button variant="secondary" onClick={handleShare} disabled={share === "working"}>
          {label}
        </Button>
        <a href={imageUrl} target="_blank" rel="noreferrer" className="text-white/40 text-xs underline">
          Open the image
        </a>
      </div>
    </section>
  );
}
