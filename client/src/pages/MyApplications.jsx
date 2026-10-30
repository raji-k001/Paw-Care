import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";

export default function MyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    api
      .get("/applications/my")
      .then((res) => setApps(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load applications"))
      .finally(() => setLoading(false));
  }, [refresh]);

  const withdraw = async (id) => {
    if (!window.confirm("Withdraw this application?")) return;
    try {
      await api.put(`/applications/${id}/withdraw`);
      setRefresh((n) => n + 1); // re-run the fetch
    } catch (err) {
      setError(err.response?.data?.message || "Could not withdraw");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">My applications</h1>
      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : apps.length === 0 ? (
        <p className="text-gray-500">
          You haven't applied yet. <Link to="/" className="text-orange-600">Find a pet</Link>
        </p>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <div key={app._id} className="flex gap-4 rounded-lg bg-white p-4 shadow">
              {app.pet?.images?.[0] ? (
                <img src={app.pet.images[0].url} alt="" className="h-20 w-20 rounded object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded bg-orange-50 text-2xl">🐾</div>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <Link to={`/pets/${app.pet?._id}`} className="font-semibold hover:text-orange-600">
                    {app.pet?.name || "Pet removed"}
                  </Link>
                  <StatusBadge status={app.status} />
                </div>
                <p className="text-xs text-gray-500">
                  Applied on {new Date(app.createdAt).toLocaleDateString()}
                </p>
                {app.status === "Approved" && app.visitDate && (
                  <p className="mt-1 text-sm text-green-700">
                    Visit scheduled: {new Date(app.visitDate).toLocaleDateString()}
                  </p>
                )}
                {app.status === "Rejected" && app.rejectionReason && (
                  <p className="mt-1 text-sm text-red-600">Reason: {app.rejectionReason}</p>
                )}
                {app.status === "Pending" && (
                  <button onClick={() => withdraw(app._id)}
                    className="mt-2 text-sm text-gray-500 underline hover:text-red-600">
                    Withdraw application
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}