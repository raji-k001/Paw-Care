import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const input = "w-full rounded border border-gray-300 px-3 py-2";

export default function AddPet() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", species: "dog", breed: "", age: "", gender: "unknown", size: "",
    color: "", location: "", description: "", vaccinated: false, sterilized: false,
  });
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (images.length > 5) return setError("You can upload at most 5 photos");

    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== "") data.append(key, String(value)); // skip empty fields
      });
      images.forEach((file) => data.append("images", file));

      const res = await api.post("/pets", data);
      navigate(`/pets/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not add pet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Add a pet</h1>
      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-5 shadow">
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Name *" value={form.name} onChange={update} className={input} />
          <select name="species" value={form.species} onChange={update} className={input}>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="bird">Bird</option>
            <option value="rabbit">Rabbit</option>
            <option value="other">Other</option>
          </select>
          <input name="breed" placeholder="Breed" value={form.breed} onChange={update} className={input} />
          <input name="age" type="number" min="0" step="0.5" placeholder="Age in years"
            value={form.age} onChange={update} className={input} />
          <select name="gender" value={form.gender} onChange={update} className={input}>
            <option value="unknown">Gender: unknown</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <select name="size" value={form.size} onChange={update} className={input}>
            <option value="">Size</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
          <input name="color" placeholder="Color" value={form.color} onChange={update} className={input} />
          <input name="location" required placeholder="City *" value={form.location} onChange={update} className={input} />
        </div>

        <textarea name="description" rows="3" maxLength="1000" placeholder="Description"
          value={form.description} onChange={update} className={input} />

        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="vaccinated" checked={form.vaccinated} onChange={update} />
            Vaccinated
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="sterilized" checked={form.sterilized} onChange={update} />
            Sterilized
          </label>
        </div>

        <label className="block text-sm">
          Photos (up to 5, 5 MB each)
          <input type="file" multiple accept="image/*"
            onChange={(e) => setImages(Array.from(e.target.files))}
            className="mt-1 block w-full text-sm" />
        </label>

        <button disabled={loading}
          className="w-full rounded bg-orange-600 py-2 text-white hover:bg-orange-700 disabled:opacity-50">
          {loading ? "Saving..." : "Add pet"}
        </button>
      </form>
    </div>
  );
}