"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type StudentWelcomeToastProps = {
  firstName: string;
};

export function StudentWelcomeToast({
  firstName,
}: StudentWelcomeToastProps) {
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;

    toast.success(`Welcome back, ${firstName}!`, {
      description: "You are viewing the live student dashboard in Philippine time.",
      duration: 3500,
    });
  }, [firstName]);

  return null;
}