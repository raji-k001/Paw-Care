import { useEffect, useState } from "react";
import api from "../api/axios";

export default function StaffVolunteers() {
  const [filter, setFilter] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    api
      .get("/volunteers", { params: filter ? { verified: filter } : {} })
      .then((res) => setList(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load volunteers"))
      .finally(() => setLoading(false));
  }, [filter, refresh]);

  const setVerified = async (id, verified) => {
    setError("");
    try {
      await api.put(`/volunteers/${id}/verify`, { verified });
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update verification");
    }
  };

  const tabs = [["", "All"], ["false", "Needs verification"], ["true", "Verified"]];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Volunteers</h1>
      <div className="mb-4 flex gap-2">
        {tabs.map(([value, label]) => (
          <button key={label} onClick={() => setFilter(value)}
            className={`rounded px-3 py-1 text-sm ${
              filter === value ? "bg-orange-600 text-white" : "bg-white shadow hover:bg-orange-50"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500">No volunteers here yet.</p>
      ) : (
        <div className="space-y-3">
          {list.map((v) => (
            <div key={v._id} className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{v.user.name}</p>
                  <p className="text-sm text-gray-500">
                    {v.user.email} {v.user.phone && `· ${v.user.phone}`} {v.city && `· ${v.city}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${v.verified ? "text-green-600" : "text-yellow-600"}`}>
                    {v.verified ? "✓ Verified" : "Not verified"}
                  </span>
                  <button onClick={() => setVerified(v._id, !v.verified)}
                    className={`rounded px-3 py-1 text-sm text-white ${
                      v.verified ? "bg-gray-500 hover:bg-gray-600" : "bg-green-600 hover:bg-green-700"
                    }`}>
                    {v.verified ? "Remove verification" : "Verify"}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm">
                <b>Skills:</b> {v.skills.join(", ") || "none listed"} · <b>Available:</b>{" "}
                {v.availableDays.join(", ") || "not set"} ({v.preferredTime})
              </p>
              <p className="text-sm text-gray-500">
                {v.hours} hours · {v.completedTasks} tasks completed
              </p>
              {v.bio && <p className="mt-1 text-sm text-gray-600">{v.bio}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}