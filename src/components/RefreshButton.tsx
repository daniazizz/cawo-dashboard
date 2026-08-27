"use client";

import { useEffect, useState } from "react";

const COOLDOWN_SECONDS = 10;

export default function RefreshButton({
  onRefresh,
}: {
  onRefresh: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function handleClick() {
    if (secondsLeft > 0) return;
    setSecondsLeft(COOLDOWN_SECONDS);
    onRefresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={secondsLeft > 0}
      className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
    >
      {secondsLeft > 0 ? `Refresh (${secondsLeft}s)` : "Refresh"}
    </button>
  );
}
