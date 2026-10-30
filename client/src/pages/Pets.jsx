import { useEffect, useState } from "react";
import api from "../api/axios";
import PetCard from "../components/PetCard";

const initialFilters = {
  search: "", species: "", gender: "", size: "",
  location: "", vaccinated: "", status: "Available",
};

const inputClass = "rounded border border-gray-300 px-3 py-2 text-sm";

export default function Pets() {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ pets: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1); // a new filter always starts from page 1
  };

  useEffect(() => {
    let ignore = false; // prevents an old slow response from overwriting a newer one
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = { page, limit: 9 };
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params[key] = value; // skip empty filters
        });
        const res = await api.get("/pets", { params });
        if (!ignore) setResult(res.data);
      } catch (err) {
        if (!ignore) setError(err.response?.data?.message || "Could not load pets");
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 300); // wait 300 ms after typing stops

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [filters, page]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Find your new best friend</h1>

      <div className="mb-6 grid gap-3 rounded-lg bg-white p-4 shadow sm:grid-cols-2 lg:grid-cols-4">
        <input name="search" value={filters.search} onChange={handleChange}
          placeholder="Search name or breed" className={inputClass} />
        <input name="location" value={filters.location} onChange={handleChange}
          placeholder="City" className={inputClass} />
        <select name="species" value={filters.species} onChange={handleChange} className={inputClass}>
          <option value="">Any species</option>
          <option value="dog">Dog</option>
          <option value="cat">Cat</option>
          <option value="bird">Bird</option>
          <option value="rabbit">Rabbit</option>
          <option value="other">Other</option>
        </select>
        <select name="gender" value={filters.gender} onChange={handleChange} className={inputClass}>
          <option value="">Any gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <select name="size" value={filters.size} onChange={handleChange} className={inputClass}>
          <option value="">Any size</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
        <select name="vaccinated" value={filters.vaccinated} onChange={handleChange} className={inputClass}>
          <option value="">Vaccination: any</option>
          <option value="true">Vaccinated only</option>
        </select>
        <select name="status" value={filters.status} onChange={handleChange} className={inputClass}>
          <option value="">Any status</option>
          <option value="Available">Available</option>
          <option value="Pending">Pending</option>
          <option value="Adopted">Adopted</option>
        </select>
        <button onClick={() => { setFilters(initialFilters); setPage(1); }}
          className="rounded border border-orange-600 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50">
          Clear filters
        </button>
      </div>

      {error && <p className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading pets...</p>
      ) : result.pets.length === 0 ? (
        <p className="text-gray-500">No pets match these filters.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-500">{result.total} pets found</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.pets.map((pet) => <PetCard key={pet._id} pet={pet} />)}
          </div>
          <div className="mt-6 flex items-center justify-center gap-4">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="rounded border px-3 py-1 disabled:opacity-40">Previous</button>
            <span className="text-sm">Page {result.page} of {result.pages}</span>
            <button disabled={page >= result.pages} onClick={() => setPage(page + 1)}
              className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        </>
      )}
    </div>
  );
}