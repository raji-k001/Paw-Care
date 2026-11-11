import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { inr } from "../utils/money";

const categoryIcons = { medical: "💊", food: "🍖", shelter: "🏠", other: "🐾" };

export function ProgressBar({ raised, goal }) {
  const pct = Math.min(100, Math.round((raised / goal) * 100));
  return (
    <div>
      <div className="h-2 overflow-hidden rounded bg-gray-200">
        <div className="h-full bg-orange-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-gray-600">
        <b>{inr(raised)}</b> raised of {inr(goal)} · {pct}%
      </p>
    </div>
  );
}

export default function Campaigns() {
  const [status, setStatus] = useState("Active");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get("/campaigns", { params: { status } })
      .then((res) => setList(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load campaigns"))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Help an animal in need</h1>
      <p className="mb-4 text-sm text-gray-500">Every campaign shows where the money goes.</p>

      <div className="mb-4 flex gap-2">
        {["Active", "Completed"].map((tab) => (
          <button key={tab} onClick={() => setStatus(tab)}
            className={`rounded px-3 py-1 text-sm ${
              status === tab ? "bg-orange-600 text-white" : "bg-white shadow hover:bg-orange-50"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500">No {status.toLowerCase()} campaigns right now.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <Link key={c._id} to={`/campaigns/${c._id}`}
              className="overflow-hidden rounded-lg bg-white shadow transition hover:shadow-lg">
              {c.image?.url ? (
                <img src={c.image.url} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center bg-orange-50 text-5xl">
                  {categoryIcons[c.category]}
                </div>
              )}
              <div className="space-y-2 p-4">
                <p className="text-xs uppercase text-gray-500">{c.category}</p>
                <h3 className="font-semibold">{c.title}</h3>
                <ProgressBar raised={c.raisedAmount} goal={c.goalAmount} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}