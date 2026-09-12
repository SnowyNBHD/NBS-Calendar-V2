"use client";

import { useEffect, useState } from "react";
import { APP_TIMEZONE } from "@/lib/timezone";

export default function Clock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString([], { hour12: false, timeZone: APP_TIMEZONE }),
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Avoids a server/client render mismatch: the server has no "now".
  if (!time) return null;

  return <span className="nums">{time}</span>;
}
