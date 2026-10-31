import { CreateRoom } from "@/components/home/CreateRoom";
import { HeroDemo } from "@/components/home/HeroDemo";
import { HowItWorks } from "@/components/home/HowItWorks";
import { JoinRoom } from "@/components/home/JoinRoom";
import { QuickJoin } from "@/components/home/QuickJoin";
import { MotionToggle } from "@/components/ui/motion-provider";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/game/engine-constants";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 md:py-14">
      <div className="mb-5 text-center">
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-2">
          Magna<span className="text-violet-400">babble</span>
        </h1>
        <p className="text-white/60 text-lg">Fill in the blanks. Win the crowd.</p>
      </div>

      <div className="w-full mb-3">
        <HeroDemo />
      </div>
      <p className="text-white/40 text-sm text-center mb-6 md:mb-10">
        {MIN_PLAYERS}–{MAX_PLAYERS} players · no account needed · phones, tablets or laptops
      </p>

      {/* Phones: joining is one field away, right under the demo. */}
      <QuickJoin className="w-full max-w-sm mb-8 md:hidden" />

      <div className="grid md:grid-cols-[1.15fr_1fr] gap-6 w-full max-w-2xl items-start mb-10">
        <div className="bg-violet-500/10 border-2 border-violet-400/40 rounded-2xl p-6 shadow-xl shadow-violet-950/40">
          <h2 className="text-2xl font-black text-white mb-1">Start a game</h2>
          <p className="text-white/50 text-sm mb-4">You&apos;ll get a code and QR to share.</p>
          <CreateRoom />
        </div>

        <div className="hidden md:block bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Join a game</h2>
          <JoinRoom />
        </div>
      </div>

      <HowItWorks />

      <div className="mt-10 flex flex-col items-center gap-2">
        <p className="text-white/30 text-sm text-center max-w-sm">
          Share the room link or QR code and play together in real time.
        </p>
        <MotionToggle />
      </div>
    </main>
  );
}
