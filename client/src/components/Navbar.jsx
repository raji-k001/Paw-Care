import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const link = "hover:text-orange-600";

function Dropdown({ label, items, align = "left", children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className={`${link} flex items-center gap-1`}>
        {label} <span className="text-xs">▾</span>
      </button>
      {open && (
        <div className={`absolute z-50 mt-2 min-w-52 rounded-lg bg-white py-1 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}>
          {items.map((item) => (
            <Link key={item.to} to={item.to} className="block px-4 py-2 text-sm hover:bg-orange-50">
              {item.label}
            </Link>
          ))}
          {children}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  const role = user?.role;
  const isStaff = role === "shelter_staff" || role === "admin";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const accountItems = user
    ? [
        { to: "/my-applications", label: "My Applications" },
        { to: "/favorites", label: "Favorites" },
        { to: "/my-donations", label: "My Donations" },
        { to: "/rescues/mine", label: "My Rescue Reports" },
        ...(["volunteer", "shelter_staff", "admin"].includes(role)
          ? [{ to: "/rescues/assigned", label: "My Rescue Cases" }]
          : []),
        ...(role === "volunteer"
          ? [{ to: "/volunteer", label: "Volunteer Hub" }, { to: "/volunteer/tasks", label: "My Shifts" }]
          : []),
        ...(!["veterinarian", "admin"].includes(role) ? [{ to: "/shelter", label: "My Shelter" }] : []),
      ]
    : [];

  const staffItems = [
    ...(isStaff
      ? [
          { to: "/staff/pets/new", label: "Add Pet" },
          { to: "/staff/applications", label: "Review Applications" },
          { to: "/rescues", label: "Rescue Cases" },
          { to: "/staff/volunteers", label: "Volunteers" },
          { to: "/staff/tasks", label: "Volunteer Tasks" },
          { to: "/campaigns/new", label: "New Campaign" },
        ]
      : []),
    ...(["shelter_staff", "veterinarian", "admin"].includes(role)
      ? [{ to: "/medical", label: "Medical Records" }]
      : []),
  ];

  const adminItems =
    role === "admin"
      ? [
          { to: "/admin/dashboard", label: "Dashboard" },
          { to: "/admin/shelters", label: "Manage Shelters" },
          { to: "/admin/certificates", label: "Certificates" },
          { to: "/admin/reports", label: "Reported Listings" },
          { to: "/admin/audit", label: "Audit Log" },
        ]
      : [];

  const mainLinks = [
    { to: "/", label: "Find a Pet" },
    { to: "/shelters", label: "Shelters" },
    { to: "/lostfound", label: "Lost & Found" },
    { to: "/campaigns", label: "Donate" },
  ];

  const groups = [
    { label: role === "veterinarian" ? "Vet tools" : "Staff", items: staffItems },
    { label: "Admin", items: adminItems },
  ].filter((g) => g.items.length > 0);

  const roleText = role ? role.replace("_", " ") : "";

  return (
    <nav className="bg-white shadow print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="text-xl font-bold text-orange-600">🐾 PawCare</Link>

        {/* Desktop */}
        <div className="hidden flex-1 items-center justify-between gap-4 text-sm md:flex">
          <div className="flex items-center gap-4">
            {mainLinks.map((l) => <Link key={l.to} to={l.to} className={link}>{l.label}</Link>)}
            {user && (
              <Link to="/rescues/new" className="font-medium text-red-600 hover:text-red-700">Report Rescue</Link>
            )}
            {groups.map((g) => <Dropdown key={g.label} label={g.label} items={g.items} />)}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <NotificationBell />
                <Dropdown label={`${user.name} (${roleText})`} items={accountItems} align="right">
                  <button onClick={handleLogout}
                    className="block w-full border-t px-4 py-2 text-left text-sm text-red-600 hover:bg-orange-50">
                    Logout
                  </button>
                </Dropdown>
              </>
            ) : (
              <>
                <Link to="/login" className={link}>Login</Link>
                <Link to="/register" className="rounded bg-orange-600 px-3 py-1 text-white hover:bg-orange-700">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-3 md:hidden">
          {user && <NotificationBell />}
          <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu" className="text-2xl">
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="space-y-4 border-t px-4 py-4 text-sm md:hidden">
          <div className="flex flex-col gap-2">
            {mainLinks.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
            {user && <Link to="/rescues/new" className="font-medium text-red-600">Report Rescue</Link>}
          </div>
          {user && accountItems.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase text-gray-400">{user.name} ({roleText})</p>
              {accountItems.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
            </div>
          )}
          {groups.map((g) => (
            <div key={g.label} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase text-gray-400">{g.label}</p>
              {g.items.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
            </div>
          ))}
          {user ? (
            <button onClick={handleLogout} className="text-red-600">Logout</button>
          ) : (
            <div className="flex gap-4">
              <Link to="/login">Login</Link>
              <Link to="/register" className="font-medium text-orange-600">Register</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}