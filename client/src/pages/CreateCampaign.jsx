import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const input = "w-full rounded border border-gray-300 px-3 py-2";

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", category: "medical", goalAmount: "", endDate: "",
  });
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => value !== "" && body.append(key, value));
      if (image) body.append("image", image);

      const res = await api.post("/campaigns", body);
      navigate(`/campaigns/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create the campaign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">New fundraising campaign</h1>
      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-5 shadow">
        <input name="title" required maxLength="120" placeholder="Title * (e.g. Surgery for Bruno)"
          value={form.title} onChange={update} className={input} />
        <textarea name="description" required rows="5" maxLength="2000"
          placeholder="Tell the story and explain what the money will be used for *"
          value={form.description} onChange={update} className={input} />
        <div className="grid gap-3 sm:grid-cols-3">
          <select name="category" value={form.category} onChange={update} className={input}>
            <option value="medical">Medical treatment</option>
            <option value="food">Food</option>
            <option value="shelter">Shelter</option>
            <option value="other">Other</option>
          </select>
          <input name="goalAmount" type="number" required min="100" step="1" placeholder="Goal (₹) *"
            value={form.goalAmount} onChange={update} className={input} />
          <input name="endDate" type="date" value={form.endDate} onChange={update} className={input} />
        </div>
        <label className="block text-sm">
          Cover photo (optional)
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0] || null)}
            className="mt-1 block w-full text-sm" />
        </label>
        <button disabled={loading}
          className="w-full rounded bg-orange-600 py-2 text-white hover:bg-orange-700 disabled:opacity-50">
          {loading ? "Creating..." : "Create campaign"}
        </button>
      </form>
    </div>
  );
}