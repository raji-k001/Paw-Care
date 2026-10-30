import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";

const tabs = ["Pending", "Approved", "Rejected", "Withdrawn", ""];

function ReviewCard({ app, onDone }) {
  const [visitDate, setVisitDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const review = async (status) => {
    setError("");
    if (status === "Rejected" && !reason.trim()) {
      return setError("Please enter a reason for rejecting");
    }
    setBusy(true);
    try {
      await api.put(`/applications/${app._id}/review`, {
        status,
        rejectionReason: reason,
        visitDate: visitDate || undefined,
      });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update application");
    } finally {
      setBusy(false);
    }
  };

  const rows = [
    ["Housing", `${app.housingType}, ${app.ownsHome ? "owns" : "rents"}${app.hasYard ? ", has yard" : ""}`],
    ["Household size", app.householdSize],
    ["Other pets", app.otherPets ? "Yes" : "No"],
    ["Hours alone / day", app.hoursAlonePerDay],
    ["Experience", app.experience],
    ["Reason", app.reason],
  ];

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <Link to={`/pets/${app.pet?._id}`} className="font-semibold hover:text-orange-600">
          {app.pet?.name || "Pet removed"}
        </Link>
        <StatusBadge status={app.status} />
      </div>
      <p className="text-sm text-gray-500">
        {app.applicant?.name} · {app.applicant?.email} {app.applicant?.phone && `· ${app.applicant.phone}`}
      </p>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, value]) =>
          value !== undefined && value !== "" ? (
            <div key={label} className="contents">
              <dt className="text-gray-500">{label}</dt>
              <dd>{value}</dd>
            </div>
          ) : null
        )}
      </dl>

      {app.documents?.length > 0 && (
        <p className="mt-2 text-sm">
          Documents:{" "}
          {app.documents.map((d, i) => (
            <a key={d.public_id} href={d.url} target="_blank" rel="noreferrer"
              className="mr-2 text-orange-600 underline">
              File {i + 1}
            </a>
          ))}
        </p>
      )}

      {app.status === "Rejected" && app.rejectionReason && (
        <p className="mt-2 text-sm text-red-600">Reason: {app.rejectionReason}</p>
      )}
      {app.status === "Approved" && app.visitDate && (
        <p className="mt-2 text-sm text-green-700">
          Visit: {new Date(app.visitDate).toLocaleDateString()}
        </p>
      )}

      {app.status === "Pending" && (
        <div className="mt-4 space-y-3 border-t pt-3">
          {error && <p className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-sm" />
            <button disabled={busy} onClick={() => review("Approved")}
              className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50">
              Approve
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input placeholder="Reason for rejection" value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm" />
            <button disabled={busy} onClick={() => review("Rejected")}
              className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50">
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManageApplications() {
  const [status, setStatus] = useState("Pending");
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    api
      .get("/applications", { params: status ? { status } : {} })
      .then((res) => setApps(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load applications"))
      .finally(() => setLoading(false));
  }, [status, refresh]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Review applications</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
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
      ) : apps.length === 0 ? (
        <p className="text-gray-500">No {status.toLowerCase()} applications.</p>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => (
            <ReviewCard key={app._id} app={app} onDone={() => setRefresh((n) => n + 1)} />
          ))}
        </div>
      )}
    </div>
  );
}