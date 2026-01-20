import { NavLink } from "react-router-dom";

const linkBase =
  "block rounded-[var(--ds-radius)] px-3 py-2 text-sm transition border border-transparent";
const linkActive =
  "bg-[rgba(79,124,255,0.15)] border-[var(--ds-border)] text-[var(--ds-text)]";
const linkIdle =
  "text-[var(--ds-muted)] hover:text-[var(--ds-text)] hover:bg-[rgba(255,255,255,0.04)]";

export function Sidebar() {
  return (
    <div className="h-full p-4 flex flex-col gap-6">
      <div>
        <div className="text-base font-semibold">NZAT</div>
        <div className="text-xs text-[var(--ds-muted)]">Jan 2026 MVP</div>
      </div>

      <nav className="flex flex-col gap-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkIdle}`
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/jobs"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkIdle}`
          }
        >
          Jobs
        </NavLink>

        <NavLink
          to="/invoice"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkIdle}`
          }
        >
          Invoice
        </NavLink>
      </nav>

      <div className="mt-auto text-xs text-[var(--ds-muted)]">v0.1 • Shell</div>
    </div>
  );
}
