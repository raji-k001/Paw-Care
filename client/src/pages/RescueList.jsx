import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { UrgencyBadge, RescueStatusBadge } from "../components/RescueBadges";

const modes = {
  all: { title: "All rescue cases", url: "/rescues" },
  assigned: { title: "My assigned cases", url: "/rescues/assigned" },
  mine: { title: "My reports", url: "/rescues/mine" },
};

const select = "rounded border border-gray-300 px-3 py-1.5 text-sm";

export default function RescueList({ mode }) {
  const { title, url } = modes[mode];
  const [status, setStatus] = useState("");
  const [urgency, setUrgency] = useState("");
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = {};
    if (mode === "all") {
      if (status) params.status = status;
      if (urgency) params.urgency = urgency;
    }
    api
      .get(url, { params })
      .then((res) => setCases(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load cases"))
      .finally(() => setLoading(false));
  }, [mode, url, status, urgency]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {mode === "all" && (
          <div className="flex gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={select}>
              <option value="">Any status</option>
              <option>Reported</option>
              <option>Assigned</option>
              <option>In Progress</option>
              <option>Resolved</option>
            </select>
            <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className={select}>
              <option value="">Any urgency</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
        )}
      </div>

      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : cases.length === 0 ? (
        <p className="text-gray-500">
          No cases here yet.{" "}
          {mode === "mine" && <Link to="/rescues/new" className="text-orange-600">Report an animal</Link>}
        </p>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Link key={c._id} to={`/rescues/${c._id}`}
              className="flex gap-4 rounded-lg bg-white p-4 shadow transition hover:shadow-lg">
              {c.images?.[0] ? (
                <img src={c.images[0].url} alt="" className="h-20 w-20 rounded object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded bg-red-50 text-2xl">🚨</div>
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold capitalize">{c.species} · {c.category}</span>
                  <UrgencyBadge urgency={c.urgency} />
                  <RescueStatusBadge status={c.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{c.description}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {c.address && `📍 ${c.address} · `}
                  {new Date(c.createdAt).toLocaleString()}
                  {c.assignedTo && ` · Assigned to ${c.assignedTo.name}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}