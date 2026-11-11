import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isStaff = user && ["shelter_staff", "admin"].includes(user.role);
  const isMedical = user && ["shelter_staff", "veterinarian", "admin"].includes(user.role);
  const isResponder = user && ["volunteer", "shelter_staff", "admin"].includes(user.role);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const link = "hover:text-orange-600";

  return (
    <nav className="bg-white shadow print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="text-xl font-bold text-orange-600">🐾 PawCare</Link>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link to="/" className={link}>Find a Pet</Link>
          <Link to="/campaigns" className={link}>Donate</Link>
          <Link to="/shelters" className={link}>Shelters</Link>
          <Link to="/lostfound" className={link}>Lost &amp; Found</Link>
          {user && (
            <>
              <Link to="/my-applications" className={link}>My Applications</Link>
              <Link to="/my-donations" className={link}>My Donations</Link>
              <Link to="/rescues/new" className="font-medium text-red-600 hover:text-red-700">Report Rescue</Link>
              <Link to="/rescues/mine" className={link}>My Reports</Link>
            </>
          )}
          {user && user.role !== "veterinarian" && <Link to="/shelter" className={link}>My Shelter</Link>}

{isResponder && <Link to="/rescues/assigned" className={link}>My Rescue Cases</Link>}
          {isResponder && <Link to="/rescues/assigned" className={link}>My Rescue Cases</Link>}
          {user?.role === "volunteer" && (
            <>
              <Link to="/volunteer" className={link}>Volunteer Hub</Link>
              <Link to="/volunteer/tasks" className={link}>My Shifts</Link>
            </>
          )}
          {isStaff && (
            <>
              <Link to="/staff/pets/new" className={link}>Add Pet</Link>
              <Link to="/staff/applications" className={link}>Review Applications</Link>
              <Link to="/rescues" className={link}>Rescue Cases</Link>
              <Link to="/staff/volunteers" className={link}>Volunteers</Link>
              <Link to="/staff/tasks" className={link}>Volunteer Tasks</Link>
              <Link to="/campaigns/new" className={link}>New Campaign</Link>
              {isMedical && <Link to="/medical" className={link}>Medical</Link>}
            </>
          )}
        
        {user?.role === "admin" && (
  <>
    <Link to="/admin/dashboard" className={`${link} font-medium`}>Dashboard</Link>
    <Link to="/admin/shelters" className={link}>Manage Shelters</Link>
    <Link to="/admin/certificates" className={link}>Certificates</Link>
    <Link to="/favorites" className={link}>Favorites</Link>
    <Link to="/admin/reports" className={link}>Reports</Link>
  </>
)}

          {user ? (
            <>
              <NotificationBell />
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