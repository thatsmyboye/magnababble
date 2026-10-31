"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractRoomCode, ROOM_CODE_LENGTH } from "@/lib/utils";

/**
 * Compact "Have a code?" row for phones, near the top of the page. It just
 * opens the room; the room page asks for a name and handles bad codes.
 */
export function QuickJoin({ className }: { className?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const ready = code.length === ROOM_CODE_LENGTH;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) router.push(`/room/${code}`);
      }}
      className={className}
      aria-label="Join with a room code"
    >
      <label htmlFor="quick-join" className="block text-white/60 text-sm mb-1.5 text-center">
        Have a code?
      </label>
      <div className="flex gap-2">
        <Input
          id="quick-join"
          placeholder="BXKT"
          value={code}
          onChange={(e) => setCode(extractRoomCode(e.target.value))}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="uppercase tracking-[0.4em] font-black text-xl text-center"
        />
        <Button type="submit" variant="secondary" disabled={!ready} className="shrink-0 px-6">
          Join
        </Button>
      </div>
    </form>
  );
}
