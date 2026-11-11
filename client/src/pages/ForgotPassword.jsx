import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-lg bg-white p-6 shadow">
      <h1 className="mb-2 text-2xl font-bold">Forgot password</h1>
      <p className="mb-4 text-sm text-gray-500">Enter your email and we will send you a reset link.</p>
      {message && <p className="mb-3 rounded bg-green-100 p-2 text-sm text-green-700">{message}</p>}
      {error && <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={submit} className="space-y-3">
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2" />
        <button disabled={loading}
          className="w-full rounded bg-orange-600 py-2 text-white hover:bg-orange-700 disabled:opacity-50">
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="mt-4 text-sm"><Link to="/login" className="text-orange-600">← Back to login</Link></p>
    </div>
  );
}