import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const TABS = [["lost", "Lost pets"], ["found", "Found pets"], ["mine", "My reports"]];
const typeColor = { lost: "bg-red-100 text-red-700", found: "bg-green-100 text-green-700" };

export default function LostFound() {
  const { user } = useAuth();
  const [tab, setTab] = useState("lost");
  const [species, setSpecies] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tab === "mine" && !user) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const request =
      tab === "mine"
        ? api.get("/lostfound/mine")
        : api.get("/lostfound", { params: { type: tab, ...(species && { species }) } });
    request
      .then((res) => setList(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load reports"))
      .finally(() => setLoading(false));
  }, [tab, species, user]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Lost and found pets</h1>
        <div className="flex gap-2">
          <Link to="/lostfound/new?type=lost" className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">
            I lost a pet
          </Link>
          <Link to="/lostfound/new?type=found" className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700">
            I found a pet
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(([value, label]) => (
          <button key={value} onClick={() => setTab(value)}
            className={`rounded px-3 py-1 text-sm ${tab === value ? "bg-orange-600 text-white" : "bg-white shadow hover:bg-orange-50"}`}>
            {label}
          </button>
        ))}
        {tab !== "mine" && (
          <select value={species} onChange={(e) => setSpecies(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm">
            <option value="">Any species</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="bird">Bird</option>
            <option value="rabbit">Rabbit</option>
            <option value="other">Other</option>
          </select>
        )}
      </div>

      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {tab === "mine" && !user ? (
        <p className="text-gray-500"><Link to="/login" className="text-orange-600">Login</Link> to see your reports.</p>
      ) : loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500">No reports here.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <Link key={r._id} to={`/lostfound/${r._id}`}
              className="overflow-hidden rounded-lg bg-white shadow transition hover:shadow-lg">
              {r.images?.[0] ? (
                <img src={r.images[0].url} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center bg-orange-50 text-5xl">🐾</div>
              )}
              <div className="space-y-1 p-4">
                <div className="flex items-center justify-between">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${typeColor[r.type]}`}>{r.type}</span>
                  {tab === "mine" && <span className="text-xs text-gray-500">{r.status}</span>}
                </div>
                <p className="font-semibold capitalize">{r.name || r.breed || r.species} · {r.color}</p>
                <p className="text-xs text-gray-500">
                  {r.address && `📍 ${r.address} · `}{new Date(r.date).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}