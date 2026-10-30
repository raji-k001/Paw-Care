import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

function Row({ cert, onDone }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const review = async (status) => {
    setError("");
    setBusy(true);
    try {
      await api.put(`/certificates/${cert._id}/review`, { status, note });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update the request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{cert.volunteer?.name}</p>
          <p className="text-sm text-gray-500">
            {cert.volunteer?.email} · {cert.hoursAtRequest} hours · requested{" "}
            {new Date(cert.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className="text-sm font-medium">{cert.status}</span>
      </div>

      {cert.status === "Pending" && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {error && <p className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
          <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm" />
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => review("Approved")}
              className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50">
              Approve
            </button>
            <button disabled={busy} onClick={() => review("Rejected")}
              className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50">
              Reject
            </button>
          </div>
        </div>
      )}

      {cert.status === "Approved" && (
        <p className="mt-2 text-sm">
          No. {cert.certificateNumber} ·{" "}
          <Link to={`/certificates/${cert._id}`} className="text-orange-600 underline">View</Link>
        </p>
      )}
    </div>
  );
}

export default function AdminCertificates() {
  const [status, setStatus] = useState("Pending");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    api
      .get("/certificates", { params: status ? { status } : {} })
      .then((res) => setList(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load requests"))
      .finally(() => setLoading(false));
  }, [status, refresh]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Certificate requests</h1>
      <div className="mb-4 flex gap-2">
        {["Pending", "Approved", "Rejected", ""].map((tab) => (
          <button key={tab || "all"} onClick={() => setStatus(tab)}
            className={`rounded px-3 py-1 text-sm ${
              status === tab ? "bg-orange-600 text-white" : "bg-white shadow hover:bg-orange-50"
            }`}>
            {tab || "All"}
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
          {list.map((c) => <Row key={c._id} cert={c} onDone={() => setRefresh((n) => n + 1)} />)}
        </div>
      )}
    </div>
  );
}