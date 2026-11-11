import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const input = "w-full rounded border border-gray-300 px-3 py-2";

export default function RegisterShelter() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", description: "", address: "", city: "", phone: "", email: "", capacity: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/shelters", form);
      navigate("/shelter");
    } catch (err) {
      setError(err.response?.data?.message || "Could not register the shelter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Register your shelter</h1>
      <p className="mb-4 text-sm text-gray-500">An admin reviews every registration before it goes live.</p>
      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={submit} className="space-y-4 rounded-lg bg-white p-5 shadow">
        <input name="name" required maxLength="120" placeholder="Shelter name *" value={form.name}
          onChange={update} className={input} />
        <textarea name="description" rows="3" maxLength="1000" placeholder="About your shelter"
          value={form.description} onChange={update} className={input} />
        <input name="address" required placeholder="Address *" value={form.address} onChange={update} className={input} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="city" required placeholder="City *" value={form.city} onChange={update} className={input} />
          <input name="capacity" type="number" required min="1" step="1" placeholder="Capacity (animals) *"
            value={form.capacity} onChange={update} className={input} />
          <input name="phone" required placeholder="Phone *" value={form.phone} onChange={update} className={input} />
          <input name="email" type="email" placeholder="Shelter email" value={form.email} onChange={update} className={input} />
        </div>
        <button disabled={loading}
          className="w-full rounded bg-orange-600 py-2 text-white hover:bg-orange-700 disabled:opacity-50">
          {loading ? "Submitting..." : "Submit for approval"}
        </button>
      </form>
    </div>
  );
}
