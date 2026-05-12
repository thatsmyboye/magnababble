import { CreateRoom } from "@/components/home/CreateRoom";
import { JoinRoom } from "@/components/home/JoinRoom";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-6xl font-black tracking-tight text-white mb-2">
          Magna<span className="text-violet-400">babble</span>
        </h1>
        <p className="text-white/50 text-lg">
          Fill in the blanks. Win the crowd.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">New Game</h2>
          <CreateRoom />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Join Game</h2>
          <JoinRoom />
        </div>
      </div>

      <p className="mt-10 text-white/30 text-sm text-center max-w-sm">
        No account needed. Share the room code with friends and play together in real time.
      </p>
    </main>
  );
}
