"use client";

import { useEffect, useState } from "react";

function formatManilaNow() {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date());
}

type ManilaLiveClockProps = {
  initialTime: string;
};

export function ManilaLiveClock({ initialTime }: ManilaLiveClockProps) {
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    setTime(formatManilaNow());

    const interval = setInterval(() => {
      setTime(formatManilaNow());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
      Manila Time • {time}
    </span>
  );
}