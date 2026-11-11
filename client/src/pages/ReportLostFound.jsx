import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import RescueMap from "../components/RescueMap";

const input = "w-full rounded border border-gray-300 px-3 py-2 text-sm";
const today = () => new Date().toISOString().slice(0, 10);

export default function ReportLostFound() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: params.get("type") === "found" ? "found" : "lost",
    species: "dog", name: "", breed: "", color: "", gender: "unknown", size: "",
    markings: "", description: "", date: today(), address: "",
  });
  const [position, setPosition] = useState(null);
  const [images, setImages] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const lost = form.type === "lost";

  const findMyLocation = () => {
    if (!navigator.geolocation) return setError("Your browser does not support location");
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setError("Could not get your location. Please click on the map instead.")
    );
  };

  const send = async (confirm) => {
    setError("");
    if (!position) return setError("Please choose the location on the map");
    if (images.length > 5) return setError("You can upload at most 5 photos");

    setLoading(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => value !== "" && body.append(key, value));
      body.append("lat", position[0]);
      body.append("lng", position[1]);
      if (confirm) body.append("confirm", "true");
      images.forEach((file) => body.append("images", file));

      const res = await api.post("/lostfound", body);
      navigate(`/lostfound/${res.data._id}`);
    } catch (err) {
      if (err.response?.status === 409) setDuplicates(err.response.data.duplicates || []);
      else setError(err.response?.data?.message || "Could not submit the report");
    } finally {
      setLoading(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    setDuplicates([]);
    send(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">{lost ? "Report a lost pet" : "Report a found pet"}</h1>
      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      {duplicates.length > 0 && (
        <div className="mb-4 space-y-2 rounded border border-yellow-300 bg-yellow-50 p-4 text-sm">
          <p className="font-semibold">A similar report was posted nearby recently:</p>
          <ul className="list-inside list-disc">
            {duplicates.map((d) => (
              <li key={d._id}>
                <Link to={`/lostfound/${d._id}`} target="_blank" className="text-orange-600 underline">
                  {d.type} {d.species}, {d.color}
                </Link>{" "}
                ({new Date(d.createdAt).toLocaleDateString()})
              </li>
            ))}
          </ul>
          <p>If this is the same animal, please use that report. Otherwise you can still post yours.</p>
          <button onClick={() => send(true)} disabled={loading}
            className="rounded bg-orange-600 px-3 py-1.5 text-white disabled:opacity-50">
            Post my report anyway
          </button>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4 rounded-lg bg-white p-5 shadow">
        <div className="grid gap-3 sm:grid-cols-3">
          <select name="type" value={form.type} onChange={update} className={input}>
            <option value="lost">I lost a pet</option>
            <option value="found">I found a pet</option>
          </select>
          <select name="species" value={form.species} onChange={update} className={input}>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="bird">Bird</option>
            <option value="rabbit">Rabbit</option>
            <option value="other">Other</option>
          </select>
          {lost && <input name="name" placeholder="Pet's name" value={form.name} onChange={update} className={input} />}
          <input name="breed" placeholder="Breed" value={form.breed} onChange={update} className={input} />
          <input name="color" required placeholder="Colour * (e.g. brown and white)" value={form.color}
            onChange={update} className={input} />
          <select name="gender" value={form.gender} onChange={update} className={input}>
            <option value="unknown">Gender: not sure</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <select name="size" value={form.size} onChange={update} className={input}>
            <option value="">Size</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
          <label className="text-xs text-gray-600">
            {lost ? "When did it go missing? *" : "When did you find it? *"}
            <input type="date" name="date" required max={today()} value={form.date} onChange={update} className={input} />
          </label>
        </div>

        <input name="markings" maxLength="300" placeholder="Collar, scars or other markings"
          value={form.markings} onChange={update} className={input} />
        <textarea name="description" required rows="3" maxLength="1000"
          placeholder="Describe the animal and what happened *" value={form.description}
          onChange={update} className={input} />
        <input name="address" placeholder="Landmark or street" value={form.address} onChange={update} className={input} />

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>{lost ? "Click the map where it was last seen *" : "Click the map where you found it *"}</span>
            <button type="button" onClick={findMyLocation}
              className="rounded border border-orange-600 px-2 py-1 text-orange-600 hover:bg-orange-50">
              Use my location
            </button>
          </div>
          <RescueMap position={position} onPick={(lat, lng) => setPosition([lat, lng])} />
        </div>

        <label className="block text-sm">
          Photos (up to 5)
          <input type="file" multiple accept="image/*" onChange={(e) => setImages(Array.from(e.target.files))}
            className="mt-1 block w-full text-sm" />
        </label>

        <button disabled={loading}
          className="w-full rounded bg-orange-600 py-2 text-white hover:bg-orange-700 disabled:opacity-50">
          {loading ? "Submitting..." : "Submit report"}
        </button>
      </form>
    </div>
  );
}