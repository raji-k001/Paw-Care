import { useEffect, useState } from "react";
import api from "../api/axios";

export default function ShelterDirectory() {
  const [city, setCity] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      api
        .get("/shelters", { params: city ? { city } : {} })
        .then((res) => setList(res.data))
        .catch((err) => setError(err.response?.data?.message || "Could not load shelters"))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [city]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Animal shelters</h1>
        <input placeholder="Search by city" value={city} onChange={(e) => setCity(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm" />
      </div>

      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500">No shelters found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((s) => {
            const free = s.capacity - s.occupied;
            return (
              <div key={s._id} className="rounded-lg bg-white p-4 shadow">
                <h2 className="font-semibold">{s.name}</h2>
                <p className="text-sm text-gray-500">📍 {s.address}, {s.city}</p>
                {s.description && <p className="mt-2 text-sm text-gray-700">{s.description}</p>}
                <p className="mt-2 text-sm">
                  📞 <a href={`tel:${s.phone}`} className="text-orange-600">{s.phone}</a>
                  {s.email && (
                    <> · ✉️ <a href={`mailto:${s.email}`} className="text-orange-600">{s.email}</a></>
                  )}
                </p>
                <p className={`mt-2 text-xs font-medium ${free > 0 ? "text-green-700" : "text-red-600"}`}>
                  {free > 0 ? `${free} place(s) free` : "Currently full"} ({s.occupied} of {s.capacity} in care)
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}