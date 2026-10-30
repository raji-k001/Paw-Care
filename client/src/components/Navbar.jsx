import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isStaff = user && ["shelter_staff", "admin"].includes(user.role);
  const isResponder = user && ["volunteer", "shelter_staff", "admin"].includes(user.role);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const link = "hover:text-orange-600";

  return (
    <nav className="bg-white shadow">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="text-xl font-bold text-orange-600">🐾 PawCare</Link>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link to="/" className={link}>Find a Pet</Link>
          {user && (
            <>
              <Link to="/my-applications" className={link}>My Applications</Link>
              <Link to="/rescues/new" className="font-medium text-red-600 hover:text-red-700">Report Rescue</Link>
              <Link to="/rescues/mine" className={link}>My Reports</Link>
            </>
          )}
          {isResponder && <Link to="/rescues/assigned" className={link}>My Tasks</Link>}
          {isStaff && (
            <>
              <Link to="/staff/pets/new" className={link}>Add Pet</Link>
              <Link to="/staff/applications" className={link}>Review Applications</Link>
              <Link to="/rescues" className={link}>Rescue Cases</Link>
            </>
          )}
          {user ? (
            <>
            <NotificationBell />
    <span className="text-gray-500">{user.name} ({user.role})</span>
              <span className="text-gray-500">{user.name} ({user.role})</span>
              <button onClick={handleLogout}
                className="rounded bg-orange-600 px-3 py-1 text-white hover:bg-orange-700">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={link}>Login</Link>
              <Link to="/register"
                className="rounded bg-orange-600 px-3 py-1 text-white hover:bg-orange-700">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}