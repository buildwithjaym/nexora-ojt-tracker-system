"use client";

import { useEffect, useState } from "react";

export default function AnimatedNumber({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Number(value) || 0;
    const duration = 700;
    const stepTime = 16;
    const steps = Math.max(duration / stepTime, 1);
    const increment = end / steps;

    const timer = setInterval(() => {
      start += increment;

      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <>{count.toLocaleString()}</>;
}