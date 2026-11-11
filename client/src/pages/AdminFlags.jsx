import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

function Row({ flag, onDone }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const review = async (action) => {
    setError("");
    if (action === "remove" && !note.trim()) return setError("Add a note explaining why the listing is removed");
    setBusy(true);
    try {
      await api.put(`/flags/${flag._id}/review`, { action, note });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update the report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold capitalize">
          {flag.reason.replaceAll("_", " ")}{" "}
          <span className="text-sm font-normal text-gray-500">on {flag.targetType}</span>
        </p>
        <span className="text-xs font-medium">{flag.status}</span>
      </div>

      <p className="text-sm">
        {flag.target.exists ? (
          <Link to={flag.target.link} className="text-orange-600 underline">{flag.target.label}</Link>
        ) : (
          <span className="text-gray-500">{flag.target.label}</span>
        )}
        {flag.status === "Open" && flag.openReports > 1 && (
          <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">{flag.openReports} open reports</span>
        )}
      </p>
      {flag.details && <p className="mt-1 text-sm text-gray-700">"{flag.details}"</p>}
      <p className="mt-1 text-xs text-gray-400">
        Reported by {flag.reportedBy?.name} ({flag.reportedBy?.email}) on {new Date(flag.createdAt).toLocaleDateString()}
      </p>
      {flag.reviewNote && <p className="mt-1 text-sm text-gray-600">Admin note: {flag.reviewNote}</p>}

      {flag.status === "Open" && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {error && <p className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
          <input placeholder="Note (required to remove)" value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm" />
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => review("remove")}
              className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50">
              Remove listing
            </button>
            <button disabled={busy} onClick={() => review("dismiss")}
              className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50">
              Dismiss report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminFlags() {
  const [status, setStatus] = useState("Open");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    api
      .get("/flags", { params: { status } })
      .then((res) => setList(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load reports"))
      .finally(() => setLoading(false));
  }, [status, refresh]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Reported listings</h1>
      <div className="mb-4 flex gap-2">
        {["Open", "Resolved", "Dismissed"].map((tab) => (
          <button key={tab} onClick={() => setStatus(tab)}
            className={`rounded px-3 py-1 text-sm ${status === tab ? "bg-orange-600 text-white" : "bg-white shadow hover:bg-orange-50"}`}>
            {tab}
          </button>
        ))}
      </div>
      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500">Nothing here.</p>
      ) : (
        <div className="space-y-3">
          {list.map((f) => <Row key={f._id} flag={f} onDone={() => setRefresh((n) => n + 1)} />)}
        </div>
      )}
    </div>
  );
}