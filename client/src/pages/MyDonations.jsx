import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { inr } from "../utils/money";

export default function MyDonations() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/donations/mine")
      .then((res) => setList(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load your donations"))
      .finally(() => setLoading(false));
  }, []);

  const total = list.filter((d) => d.status === "Paid").reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">My donations</h1>
      <p className="mb-4 text-sm text-gray-500">You have given {inr(total)} in total. Thank you! 🐾</p>

      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500">
          No donations yet. <Link to="/campaigns" className="text-orange-600">See campaigns</Link>
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((d) => (
            <div key={d._id} className="flex items-center justify-between rounded-lg bg-white p-4 shadow">
              <div>
                <Link to={`/campaigns/${d.campaign?._id}`} className="font-medium hover:text-orange-600">
                  {d.campaign?.title || "Campaign removed"}
                </Link>
                <p className="text-xs text-gray-500">
                  {new Date(d.paidAt || d.createdAt).toLocaleString()}
                  {d.anonymous && " · anonymous"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{inr(d.amount)}</p>
                {d.status === "Paid" ? (
                  <Link to={`/donations/${d._id}/receipt`} className="text-xs text-orange-600 underline">
                    Receipt
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400">Not completed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}