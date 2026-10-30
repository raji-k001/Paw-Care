import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", role: "adopter",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full rounded border border-gray-300 px-3 py-2";

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-lg bg-white p-6 shadow">
      <h1 className="mb-4 text-2xl font-bold">Create account</h1>
      {error && <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="name" required placeholder="Full name" value={form.name} onChange={update} className={input} />
        <input name="email" type="email" required placeholder="Email" value={form.email} onChange={update} className={input} />
        <input name="phone" placeholder="Phone (optional)" value={form.phone} onChange={update} className={input} />
        <input name="password" type="password" required minLength={6} placeholder="Password (min 6)"
          value={form.password} onChange={update} className={input} />
        <select name="role" value={form.role} onChange={update} className={input}>
          <option value="adopter">I want to adopt</option>
          <option value="volunteer">I want to volunteer</option>
        </select>
        <button disabled={loading}
          className="w-full rounded bg-orange-600 py-2 text-white hover:bg-orange-700 disabled:opacity-50">
          {loading ? "Creating..." : "Register"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        Already registered? <Link to="/login" className="text-orange-600">Login</Link>
      </p>
    </div>
  );
}