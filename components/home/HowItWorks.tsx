import { tileColorClass } from "@/lib/game/tile-style";
import { cn } from "@/lib/utils";

function MiniTile({ word, category, className }: { word: string; category: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md border text-white text-xs font-semibold",
        tileColorClass(category),
        className
      )}
    >
      {word}
    </span>
  );
}

const STEPS = [
  {
    title: "Get a prompt and a hand of tiles",
    body: "Everyone gets the same prompt and their own random words.",
    art: (
      <div className="flex flex-wrap justify-center gap-1.5">
        <MiniTile word="raccoon" category="noun" className="-rotate-3" />
        <MiniTile word="smugly" category="adverb" className="rotate-2" />
        <MiniTile word="cursed" category="adjective" className="-rotate-1" />
        <MiniTile word="yodeling" category="verb" className="rotate-3" />
      </div>
    ),
  },
  {
    title: "Build something ridiculous",
    body: "Fill the blanks, or go freestyle and write the whole sentence.",
    art: (
      <p className="text-white/80 text-sm font-semibold leading-relaxed text-center">
        My <MiniTile word="raccoon" category="noun" /> is <MiniTile word="smugly" category="adverb" />{" "}
        <MiniTile word="yodeling" category="verb" />
      </p>
    ),
  },
  {
    title: "Vote for the funniest",
    body: "Entries are anonymous. One point per vote, most points wins.",
    art: (
      <div className="flex items-center justify-center gap-2">
        <span className="rounded-lg border-2 border-violet-300 bg-violet-600 px-3 py-1 text-white text-xs font-bold">
          ✓ Voted
        </span>
        <span className="text-yellow-300 text-lg font-black">+1</span>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works" className="w-full max-w-2xl">
      <h2 id="how-it-works" className="text-white font-bold text-lg mb-3 text-center">
        How it works
      </h2>
      <ol className="grid gap-3 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <div className="h-16 flex items-center justify-center rounded-xl bg-black/20 px-2">{step.art}</div>
            <div>
              <p className="text-white font-semibold text-sm">
                <span className="text-violet-300 mr-1">{i + 1}.</span>
                {step.title}
              </p>
              <p className="text-white/50 text-xs mt-1">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
