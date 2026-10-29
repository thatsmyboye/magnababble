import { CreateRoom } from "@/components/home/CreateRoom";
import { JoinRoom } from "@/components/home/JoinRoom";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-6xl font-black tracking-tight text-white mb-2">
          Magna<span className="text-violet-400">babble</span>
        </h1>
        <p className="text-white/50 text-lg">Fill in the blanks. Win the crowd.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl items-start">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">New game</h2>
          <CreateRoom />
        </div>

        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Join game</h2>
            <JoinRoom />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-white/60 space-y-2">
            <h2 className="text-white font-bold text-base">How it works</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>Everyone gets a prompt and a hand of word tiles.</li>
              <li>Fill the blanks, or build a whole sentence freestyle.</li>
              <li>Sentences are shown anonymously. Vote for the best one.</li>
              <li>One point per vote. Most points after the last round wins.</li>
            </ol>
          </div>
        </div>
      </div>

      <p className="mt-10 text-white/30 text-sm text-center max-w-sm">
        No account needed. Share the room link with friends and play together in real time.
      </p>
    </main>
  );
}
