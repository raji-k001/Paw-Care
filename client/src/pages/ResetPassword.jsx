import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("The two passwords do not match");

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", { token, password });
      setMessage(res.data.message);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset the password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-lg bg-white p-6 shadow">
      <h1 className="mb-4 text-2xl font-bold">Choose a new password</h1>
      {message && <p className="mb-3 rounded bg-green-100 p-2 text-sm text-green-700">{message}</p>}
      {error && <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={submit} className="space-y-3">
        <input type="password" required minLength={6} placeholder="New password (min 6)" value={password}
          onChange={(e) => setPassword(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
        <input type="password" required minLength={6} placeholder="Repeat the password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
        <button disabled={loading}
          className="w-full rounded bg-orange-600 py-2 text-white hover:bg-orange-700 disabled:opacity-50">
          {loading ? "Saving..." : "Save new password"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Link expired? <Link to="/forgot-password" className="text-orange-600">Ask for a new one</Link>
      </p>
    </div>
  );
}