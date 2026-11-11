import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const input = "rounded border border-gray-300 px-3 py-1.5 text-sm";

function Card({ shelter, onDone }) {
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (request, success) => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await request();
      setMessage(success || res.data?.message || "Done");
      setEmail("");
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const review = (status) => {
    if (status === "Rejected" && !reason.trim()) return setError("Please enter a reason for rejecting");
    run(() => api.put(`/shelters/${shelter._id}/review`, { status, reason }));
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{shelter.name}</h2>
        <span className="text-xs font-medium">{shelter.status}</span>
      </div>
      <p className="text-sm text-gray-500">{shelter.address}, {shelter.city} · capacity {shelter.capacity}</p>
      <p className="text-sm text-gray-500">
        Owner: {shelter.owner?.name} ({shelter.owner?.email}) · {shelter.phone}
      </p>
      {shelter.description && <p className="mt-1 text-sm text-gray-700">{shelter.description}</p>}
      {shelter.status === "Rejected" && <p className="mt-1 text-sm text-red-600">Reason: {shelter.rejectionReason}</p>}

      {message && <p className="mt-2 rounded bg-green-100 p-2 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-2 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}

      {shelter.status === "Pending" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
          <button disabled={busy} onClick={() => review("Approved")}
            className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50">
            Approve
          </button>
          <input placeholder="Reason for rejection" value={reason} onChange={(e) => setReason(e.target.value)}
            className={`${input} flex-1`} />
          <button disabled={busy} onClick={() => review("Rejected")}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50">
            Reject
          </button>
        </div>
      )}

      {shelter.status === "Approved" && (
        <div className="mt-3 space-y-2 border-t pt-3">
          <p className="text-sm">
            {shelter.occupied} of {shelter.capacity} places used ·{" "}
            <Link to={`/shelter?shelterId=${shelter._id}`} className="text-orange-600 underline">Open shelter tools</Link>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input type="email" placeholder="Add staff by account email" value={email}
              onChange={(e) => setEmail(e.target.value)} className={`${input} flex-1`} />
            <button disabled={busy || !email}
              onClick={() => run(() => api.put(`/shelters/${shelter._id}/staff`, { email }))}
              className="rounded bg-orange-600 px-3 py-1 text-sm text-white disabled:opacity-50">
              Add staff
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminShelters() {
  const [status, setStatus] = useState("Pending");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    api
      .get("/shelters/admin/all", { params: status ? { status } : {} })
      .then((res) => setList(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load shelters"))
      .finally(() => setLoading(false));
  }, [status, refresh]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Manage shelters</h1>
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
          {list.map((s) => <Card key={s._id} shelter={s} onDone={() => setRefresh((n) => n + 1)} />)}
        </div>
      )}
    </div>
  );
}