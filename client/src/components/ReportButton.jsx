import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const REASONS = [
  ["fake_listing", "Fake or misleading listing"],
  ["scam", "Scam or asks for money"],
  ["inappropriate", "Inappropriate content"],
  ["spam", "Spam"],
  ["animal_abuse", "Animal abuse or neglect"],
  ["other", "Other"],
];

export default function ReportButton({ targetType, targetId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("fake_listing");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await api.post("/flags", { targetType, targetId, reason, details });
      setMessage(res.data.message);
      setOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send the report");
    } finally {
      setBusy(false);
    }
  };

  if (message) return <p className="text-sm text-green-700">{message}</p>;

  return (
    <div className="text-sm">
      {!open ? (
        <button onClick={() => (user ? setOpen(true) : navigate("/login"))}
          className="text-gray-500 underline hover:text-red-600">
          🚩 Report this listing
        </button>
      ) : (
        <div className="space-y-2 rounded border border-red-200 bg-red-50 p-3">
          {error && <p className="rounded bg-red-100 p-2 text-red-700">{error}</p>}
          <select value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5">
            {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <textarea rows="2" maxLength="500" placeholder="What is wrong? (optional)" value={details}
            onChange={(e) => setDetails(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5" />
          <div className="flex gap-2">
            <button disabled={busy} onClick={submit}
              className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50">Send report</button>
            <button onClick={() => setOpen(false)} className="rounded border px-3 py-1">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
