import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* --- inline icon set (no external icon package needed) --- */
function iconWrap(paths) {
  return function Icon(props) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {paths}
      </svg>
    );
  };
}
const GridIcon = iconWrap(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </>,
);
const BoxIcon = iconWrap(
  <>
    <path d="M21 8L12 3 3 8v8l9 5 9-5V8z" />
    <path d="M3 8l9 5 9-5" />
    <path d="M12 13v8" />
  </>,
);
const ArrowDownIcon = iconWrap(
  <>
    <path d="M12 4v16" />
    <path d="M6 14l6 6 6-6" />
  </>,
);
const ArrowUpIcon = iconWrap(
  <>
    <path d="M12 20V4" />
    <path d="M6 10l6-6 6 6" />
  </>,
);
const LayersIcon = iconWrap(
  <>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </>,
);
const HistoryIcon = iconWrap(
  <>
    <path d="M3 12a9 9 0 109-9" />
    <path d="M3 4v5h5" />
    <path d="M12 7v5l4 2" />
  </>,
);
const TagIcon = iconWrap(
  <>
    <path d="M20.5 12.3l-8-8H4v8.5l8 8a1.5 1.5 0 002 0l6.5-6.5a1.5 1.5 0 000-2z" />
    <circle cx="8.5" cy="8.5" r="1.2" />
  </>,
);
const ChartIcon = iconWrap(
  <>
    <path d="M4 20V10" />
    <path d="M12 20V4" />
    <path d="M20 20v-7" />
  </>,
);
const CogIcon = iconWrap(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </>,
);
const LogoutIcon = iconWrap(
  <>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </>,
);
const MenuIcon = iconWrap(
  <>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </>,
);

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: GridIcon },
  { to: "/products", label: "Products", icon: BoxIcon },
  { to: "/stock-in", label: "Stock In", icon: ArrowDownIcon },
  { to: "/stock-out", label: "Stock Out", icon: ArrowUpIcon },
  { to: "/current-stock", label: "Current Stock", icon: LayersIcon },
  { to: "/stock-movement", label: "Stock Movement", icon: HistoryIcon },
  { to: "/categories", label: "Categories", icon: TagIcon },
  { to: "/reports", label: "Reports", icon: ChartIcon },
  { to: "/settings", label: "Settings", icon: CogIcon },
];

export default function Layout({ children, title }) {
  const { profile, user, signOut, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const initials = (profile?.full_name || user?.email || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-surface-muted">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-ink-950 text-white transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 px-6 border-b border-white/10">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal text-white font-display font-bold text-sm">
            NS
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            Bank Town PoP | Start Internet
          </span>
        </div>

        <nav className="mt-4 flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-signal text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-3">
          <button
            onClick={handleLogout}
            className="focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
          >
            <LogoutIcon className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-border bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="focus-ring rounded-md p-1.5 text-ink-700 hover:bg-surface-muted lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-ink-900">
                {profile?.full_name || user?.email}
              </p>
              <p className="text-xs capitalize text-ink-700/60">
                {profile?.role || (isAdmin ? "admin" : "staff")}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-light text-signal-dark font-semibold text-sm">
              {initials}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>

        <footer className="border-t border-surface-border py-6 text-center text-xs text-ink-700/60">
          Developed by Hos9 for Arham General Store
        </footer>
      </div>
    </div>
  );
}
