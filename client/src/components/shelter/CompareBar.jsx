import { Link, useLocation } from "react-router-dom";
import { useCompare } from "../context/CompareContext";

export default function CompareBar() {
  const { ids, clear } = useCompare();
  const { pathname } = useLocation();
  if (ids.length === 0 || pathname === "/compare") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-center gap-3 bg-white p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.15)] print:hidden">
      <span className="text-sm">
        {ids.length} pet(s) selected {ids.length < 2 && "(choose at least 2)"}
      </span>
      {ids.length >= 2 && (
        <Link to={`/compare?ids=${ids.join(",")}`}
          className="rounded bg-orange-600 px-4 py-1.5 text-sm text-white hover:bg-orange-700">
          Compare now
        </Link>
      )}
      <button onClick={clear} className="text-sm text-gray-500 underline">Clear</button>
    </div>
  );
}