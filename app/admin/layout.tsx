"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, X } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!pathname.startsWith("/admin/students")) {
      setQuery("");
    }
  }, [pathname]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) {
      toast.error("Please enter a search term.");
      return;
    }

    router.push(`/admin/students?search=${encodeURIComponent(trimmed)}`);
    toast.success(`Searching for "${trimmed}"`);
  }

  function clearSearch() {
    setQuery("");
    if (pathname.startsWith("/admin/students")) {
      router.push("/admin/students");
      toast("Search cleared.");
    }
  }

  return (
    <div>{children}</div>
  );
}