import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

const input = "w-full rounded border border-gray-300 px-3 py-2";

export default function ApplyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [form, setForm] = useState({
    housingType: "house",
    ownsHome: "true",
    hasYard: false,
    otherPets: false,
    householdSize: 1,
    hoursAlonePerDay: 4,
    experience: "",
    reason: "",
  });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get(`/pets/${id}`)
      .then((res) => setPet(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load pet"));
  }, [id]);

  const update = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (files.length > 3) return setError("You can upload at most 3 documents");

    setLoading(true);
    try {
      const data = new FormData();
      data.append("petId", id);
      Object.entries(form).forEach(([key, value]) => data.append(key, String(value)));
      files.forEach((file) => data.append("documents", file)); // same name as upload.array("documents")

      await api.post("/applications", data); // axios sets the multipart header for us
      navigate("/my-applications");
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit application");
    } finally {
      setLoading(false);
    }
  };

  if (!pet) return <p className="p-6 text-gray-500">{error || "Loading..."}</p>;
  if (pet.status === "Adopted") {
    return <p className="p-6">This pet has already been adopted. <Link to="/" className="text-orange-600">Find another pet</Link></p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to={`/pets/${id}`} className="text-sm text-orange-600">← Back to {pet.name}</Link>
      <h1 className="mt-2 mb-4 text-2xl font-bold">Adopt {pet.name}</h1>

      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-5 shadow">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Housing type
            <select name="housingType" value={form.housingType} onChange={update} className={input}>
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-sm">
            Do you own or rent?
            <select name="ownsHome" value={form.ownsHome} onChange={update} className={input}>
              <option value="true">I own my home</option>
              <option value="false">I rent</option>
            </select>
          </label>
          <label className="text-sm">
            People in your household
            <input type="number" min="1" required name="householdSize"
              value={form.householdSize} onChange={update} className={input} />
          </label>
          <label className="text-sm">
            Hours the pet is alone per day
            <input type="number" min="0" max="24" name="hoursAlonePerDay"
              value={form.hoursAlonePerDay} onChange={update} className={input} />
          </label>
        </div>

        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="hasYard" checked={form.hasYard} onChange={update} />
            I have a yard
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="otherPets" checked={form.otherPets} onChange={update} />
            I have other pets
          </label>
        </div>

        <label className="block text-sm">
          Pet care experience
          <textarea name="experience" rows="3" maxLength="1000" value={form.experience}
            onChange={update} className={input} />
        </label>

        <label className="block text-sm">
          Why do you want to adopt {pet.name}? *
          <textarea name="reason" rows="3" required maxLength="1000" value={form.reason}
            onChange={update} className={input} />
        </label>

        <label className="block text-sm">
          Supporting documents (ID proof, rental permission... up to 3, image or PDF, 5 MB each)
          <input type="file" multiple accept="image/*,.pdf"
            onChange={(e) => setFiles(Array.from(e.target.files))}
            className="mt-1 block w-full text-sm" />
        </label>

        <button disabled={loading}
          className="w-full rounded bg-orange-600 py-2 text-white hover:bg-orange-700 disabled:opacity-50">
          {loading ? "Submitting..." : "Submit application"}
        </button>
      </form>
    </div>
  );
}