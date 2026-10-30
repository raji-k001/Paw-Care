import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import RescueMap from "../components/RescueMap";

const input = "w-full rounded border border-gray-300 px-3 py-2";

export default function ReportRescue() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    category: "injured", species: "", urgency: "Medium", description: "", address: "",
  });
  const [position, setPosition] = useState(null); // [lat, lng]
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const findMyLocation = () => {
    if (!navigator.geolocation) return setError("Your browser does not support location");
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setError("Could not get your location. Please click on the map instead.")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!position) return setError("Please choose the location on the map");
    if (images.length > 5) return setError("You can upload at most 5 photos");

    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      data.append("lat", position[0]);
      data.append("lng", position[1]);
      images.forEach((file) => data.append("images", file));

      const res = await api.post("/rescues", data);
      navigate(`/rescues/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit the report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Report an animal in need</h1>
      <p className="mb-4 text-sm text-gray-500">
        For a life-threatening emergency, also call a local animal helpline or vet right away.
      </p>
      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-5 shadow">
        <div className="grid gap-3 sm:grid-cols-3">
          <select name="category" value={form.category} onChange={update} className={input}>
            <option value="injured">Injured</option>
            <option value="abandoned">Abandoned</option>
            <option value="other">Other</option>
          </select>
          <input name="species" required placeholder="Animal (dog, cat...) *"
            value={form.species} onChange={update} className={input} />
          <select name="urgency" value={form.urgency} onChange={update} className={input}>
            <option value="Low">Urgency: Low</option>
            <option value="Medium">Urgency: Medium</option>
            <option value="High">Urgency: High</option>
            <option value="Critical">Urgency: Critical</option>
          </select>
        </div>

        <textarea name="description" required rows="3" maxLength="1000"
          placeholder="Describe the animal's condition *" value={form.description}
          onChange={update} className={input} />

        <input name="address" placeholder="Landmark or address (optional)"
          value={form.address} onChange={update} className={input} />

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>Click the map to mark where the animal is *</span>
            <button type="button" onClick={findMyLocation}
              className="rounded border border-orange-600 px-2 py-1 text-orange-600 hover:bg-orange-50">
              Use my location
            </button>
          </div>
          <RescueMap position={position} onPick={(lat, lng) => setPosition([lat, lng])} />
          {position && (
            <p className="mt-1 text-xs text-gray-500">
              Selected: {position[0].toFixed(5)}, {position[1].toFixed(5)}
            </p>
          )}
        </div>

        <label className="block text-sm">
          Photos (up to 5)
          <input type="file" multiple accept="image/*"
            onChange={(e) => setImages(Array.from(e.target.files))}
            className="mt-1 block w-full text-sm" />
        </label>

        <button disabled={loading}
          className="w-full rounded bg-red-600 py-2 text-white hover:bg-red-700 disabled:opacity-50">
          {loading ? "Submitting..." : "Submit report"}
        </button>
      </form>
    </div>
  );
}