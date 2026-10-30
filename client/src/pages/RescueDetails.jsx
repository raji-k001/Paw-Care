import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import RescueMap from "../components/RescueMap";
import { UrgencyBadge, RescueStatusBadge } from "../components/RescueBadges";

export default function RescueDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [rescue, setRescue] = useState(null);
  const [responders, setResponders] = useState([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const isStaff = ["shelter_staff", "admin"].includes(user.role);

  useEffect(() => {
    api
      .get(`/rescues/${id}`)
      .then((res) => setRescue(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load case"));
  }, [id, refresh]);

  useEffect(() => {
    if (isStaff) {
      api.get("/users/responders").then((res) => setResponders(res.data)).catch(() => {});
    }
  }, [isStaff]);

  const run = async (request) => {
    setError("");
    setBusy(true);
    try {
      await request();
      setNote("");
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const assign = () => run(() => api.put(`/rescues/${id}/assign`, { assigneeId }));
  const setStatus = (status) => run(() => api.put(`/rescues/${id}/status`, { status, note }));

  if (!rescue) return <p className="p-6 text-gray-500">{error || "Loading..."}</p>;

  const isAssignee = rescue.assignedTo?._id === user._id;
  const canAct = rescue.status !== "Resolved" && (isStaff || isAssignee);
  const position = [rescue.location.coordinates[1], rescue.location.coordinates[0]]; // [lat, lng]

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link to={isStaff ? "/rescues" : "/rescues/mine"} className="text-sm text-orange-600">← Back</Link>

      <div className="mt-3 space-y-5 rounded-lg bg-white p-5 shadow">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold capitalize">{rescue.species} · {rescue.category}</h1>
          <UrgencyBadge urgency={rescue.urgency} />
          <RescueStatusBadge status={rescue.status} />
        </div>

        <p className="text-gray-700">{rescue.description}</p>
        {rescue.address && <p className="text-sm text-gray-500">📍 {rescue.address}</p>}
        <p className="text-sm text-gray-500">
          Reported by {rescue.reportedBy.name} on {new Date(rescue.createdAt).toLocaleString()}
          {(isStaff || isAssignee) && rescue.reportedBy.phone && ` · ${rescue.reportedBy.phone}`}
        </p>
        {rescue.assignedTo && (
          <p className="text-sm">Assigned to: <b>{rescue.assignedTo.name}</b> ({rescue.assignedTo.role})</p>
        )}

        {rescue.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {rescue.images.map((img) => (
              <a key={img.public_id} href={img.url} target="_blank" rel="noreferrer">
                <img src={img.url} alt="" className="h-28 w-28 rounded object-cover" />
              </a>
            ))}
          </div>
        )}

        <RescueMap position={position} />

        {error && <p className="rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

        {isStaff && rescue.status !== "Resolved" && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="">Choose a volunteer or staff member</option>
              {responders.map((r) => (
                <option key={r._id} value={r._id}>{r.name} ({r.role})</option>
              ))}
            </select>
            <button disabled={!assigneeId || busy} onClick={assign}
              className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {rescue.assignedTo ? "Reassign" : "Assign"}
            </button>
          </div>
        )}

        {canAct && (
          <div className="space-y-3 border-t pt-4">
            {rescue.status === "Assigned" && (
              <button disabled={busy} onClick={() => setStatus("In Progress")}
                className="rounded bg-yellow-500 px-3 py-2 text-sm text-white hover:bg-yellow-600 disabled:opacity-50">
                Start working on this case
              </button>
            )}
            {(rescue.status === "In Progress" || isStaff) && (
              <div className="flex flex-wrap items-center gap-2">
                <input value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Resolution note (required)"
                  className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm" />
                <button disabled={busy} onClick={() => setStatus("Resolved")}
                  className="rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50">
                  Mark resolved
                </button>
              </div>
            )}
          </div>
        )}

        {rescue.resolutionNote && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Resolution: {rescue.resolutionNote}
          </p>
        )}

        <div className="border-t pt-4">
          <h2 className="mb-2 font-semibold">History</h2>
          <ul className="space-y-2 text-sm">
            {[...rescue.history].reverse().map((h) => (
              <li key={h._id} className="flex gap-3">
                <span className="w-36 shrink-0 text-gray-400">{new Date(h.at).toLocaleString()}</span>
                <span>
                  <b>{h.status}</b>
                  {h.by && ` · ${h.by.name}`}
                  {h.note && ` — ${h.note}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}