"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "../lib/navigation";

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const activeHref = items
    .filter((item) => pathname === item.href || (item.href !== "/" && pathname?.startsWith(`${item.href}/`)))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

  return (
    <nav className="sidebarNav" aria-label="Primary navigation">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            href={item.href}
            key={item.href}
            className={active ? "sidebarNavItem sidebarNavItemActive" : "sidebarNavItem"}
            aria-current={active ? "page" : undefined}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
