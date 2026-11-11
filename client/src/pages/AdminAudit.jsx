import { useEffect, useState } from "react";
import api from "../api/axios";

const TYPES = ["", "shelter", "application", "certificate", "flag", "volunteer", "medical"];

export default function AdminAudit() {
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ logs: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get("/audit", { params: { page, ...(type && { targetType: type }) } })
      .then((res) => {
        setData(res.data);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load the audit log"))
      .finally(() => setLoading(false));
  }, [type, page]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Audit log</h1>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm capitalize">
          {TYPES.map((t) => <option key={t} value={t}>{t || "All actions"}</option>)}
        </select>
      </div>
      <p className="mb-3 text-sm text-gray-500">{data.total} recorded action(s). Entries cannot be edited or deleted here.</p>

      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : data.logs.length === 0 ? (
        <p className="text-gray-500">Nothing recorded yet.</p>
      ) : (
        <>
          <ul className="divide-y rounded-lg bg-white shadow">
            {data.logs.map((l) => (
              <li key={l._id} className="p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <b>{l.actorName}</b>{" "}
                    <span className="text-xs text-gray-500">({l.actorRole?.replace("_", " ")})</span>
                  </span>
                  <span className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1">
                  <span className="mr-2 rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">{l.action}</span>
                  {l.summary}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-center gap-4">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="rounded border px-3 py-1 disabled:opacity-40">Previous</button>
            <span className="text-sm">Page {data.page} of {data.pages}</span>
            <button disabled={page >= data.pages} onClick={() => setPage(page + 1)}
              className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        </>
      )}
    </div>
  );
}