"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, memo } from "react";
import { FileText, Network, Settings } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { href: "/app/notes", label: "Notes", icon: <FileText className="h-[18px] w-[18px]" /> },
  { href: "/app/mindmap", label: "Mindmap", icon: <Network className="h-[18px] w-[18px]" /> },
  { href: "/app/settings", label: "Instellingen", icon: <Settings className="h-[18px] w-[18px]" /> },
];

const STORAGE_KEY = "sidebarCollapsed";

// Memoized nav item to prevent re-renders
const NavItem = memo(function NavItem({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`
        group relative flex items-center gap-3
        h-11 px-3 rounded-[var(--radius-md)]
        text-[14px] font-medium
        transition-all duration-[var(--motion-fast)] ease-[var(--motion-ease)]
        ${collapsed ? "justify-center" : ""}
        ${active
          ? "bg-accent-muted text-accent"
          : "text-text-secondary hover:bg-surface-hover hover:text-foreground"
        }
      `}
    >
      {/* Active indicator (left border) */}
      <span
        className={`
          absolute left-0 top-1/2 -translate-y-1/2
          h-6 w-[3px] rounded-r-full
          bg-accent
          transition-all duration-[var(--motion-fast)]
          ${active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"}
        `}
      />

      {/* Icon */}
      <span className="flex-shrink-0">{item.icon}</span>

      {/* Label - animated slide/fade */}
      <span
        className={`
          whitespace-nowrap overflow-hidden
          transition-all duration-[var(--motion-normal)] ease-[var(--motion-ease)]
          ${collapsed
            ? "w-0 opacity-0 translate-x-[-8px]"
            : "w-auto opacity-100 translate-x-0"
          }
        `}
      >
        {item.label}
      </span>
    </Link>
  );
});

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  // Load state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setCollapsed(true);
    }
    setMounted(true);
  }, []);

  // Keyboard shortcut: Cmd+B / Ctrl+B
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapsed]);

  // Sidebar dimensions
  const width = mounted ? (collapsed ? "64px" : "240px") : "240px";

  return (
    <aside
      style={{ width }}
      className="
        flex h-full flex-col
        bg-surface border-r border-border
        transition-[width] duration-[var(--motion-normal)] ease-[var(--motion-ease)]
        will-change-[width]
      "
    >
      {/* Header with toggle */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-border">
        <button
          onClick={toggleCollapsed}
          className="
            flex h-9 w-9 items-center justify-center
            rounded-[var(--radius-md)]
            text-muted
            transition-all duration-[var(--motion-fast)]
            hover:bg-surface-hover hover:text-foreground
            active:scale-95
          "
          title={collapsed ? "Sidebar uitklappen (⌘B)" : "Sidebar inklappen (⌘B)"}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`
              transition-transform duration-[var(--motion-normal)] ease-[var(--motion-ease)]
              ${collapsed ? "rotate-180" : "rotate-0"}
            `}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Logo / title - fades when collapsed */}
        <div
          className={`
            overflow-hidden
            transition-all duration-[var(--motion-normal)] ease-[var(--motion-ease)]
            ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}
          `}
        >
          <span className="text-[13px] font-semibold text-foreground whitespace-nowrap">
            AI Notes
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              active={pathname.startsWith(item.href)}
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      {/* Footer - keyboard hint */}
      <div
        className={`
          border-t border-border px-3 py-3
          transition-all duration-[var(--motion-normal)]
          ${collapsed ? "opacity-0" : "opacity-100"}
        `}
      >
        <div className="flex items-center justify-center">
          <span className="text-[11px] text-muted whitespace-nowrap">
            ⌘B toggle
          </span>
        </div>
      </div>
    </aside>
  );
}
