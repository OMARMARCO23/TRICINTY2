"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Bot, Settings } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/history", label: "History", Icon: History },
  { href: "/coach", label: "AI Coach", Icon: Bot },
  { href: "/settings", label: "Settings", Icon: Settings }
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="btm-nav z-50">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className={active ? "active" : ""}>
            <Icon className="h-5 w-5" />
            <span className="btm-nav-label">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
