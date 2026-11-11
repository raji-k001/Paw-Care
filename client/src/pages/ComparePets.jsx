import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useCompare } from "../context/CompareContext";

const ROWS = [
  ["Species", (p) => p.species],
  ["Breed", (p) => p.breed],
  ["Age", (p) => (p.age != null ? `${p.age} years` : null)],
  ["Gender", (p) => p.gender],
  ["Size", (p) => p.size],
  ["Color", (p) => p.color],
  ["City", (p) => p.location],
  ["Shelter", (p) => p.shelter?.name],
  ["Vaccinated", (p) => (p.vaccinated ? "Yes" : "No")],
  ["Sterilized", (p) => (p.sterilized ? "Yes" : "No")],
  ["Status", (p) => p.status],
];

export default function ComparePets() {
  const [params, setParams] = useSearchParams();
  const compare = useCompare();
  const idsText = params.get("ids") || "";
  const count = idsText.split(",").filter(Boolean).length;

  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (count < 2) {
      setPets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get("/pets/compare", { params: { ids: idsText } })
      .then((res) => {
        setPets(res.data);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load the comparison"))
      .finally(() => setLoading(false));
  }, [idsText, count]);

  const remove = (id) => {
    compare.remove(id);
    const rest = idsText.split(",").filter((x) => x && x !== id);
    setParams(rest.length ? { ids: rest.join(",") } : {});
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/" className="text-sm text-orange-600">← Back to all pets</Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">Compare pets</h1>

      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {count < 2 ? (
        <p className="text-gray-500">Tick "Compare" on at least two pets, then press Compare now.</p>
      ) : loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full min-w-120 text-sm">
            <thead>
              <tr>
                <th className="w-28 p-3" />
                {pets.map((p) => (
                  <th key={p._id} className="p-3 text-left align-top">
                    {p.images?.[0] ? (
                      <img src={p.images[0].url} alt={p.name} className="mb-2 h-32 w-full rounded object-cover" />
                    ) : (
                      <div className="mb-2 flex h-32 items-center justify-center rounded bg-orange-50 text-4xl">🐾</div>
                    )}
                    <Link to={`/pets/${p._id}`} className="text-base font-semibold hover:text-orange-600">{p.name}</Link>
                    <button onClick={() => remove(p._id)} className="mt-1 block text-xs font-normal text-gray-500 underline">
                      Remove
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, get]) => (
                <tr key={label} className="border-t">
                  <td className="p-3 text-gray-500">{label}</td>
                  {pets.map((p) => (
                    <td key={p._id} className="p-3 capitalize">{get(p) || "-"}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t">
                <td className="p-3" />
                {pets.map((p) => (
                  <td key={p._id} className="p-3">
                    <Link to={`/pets/${p._id}`} className="rounded bg-orange-600 px-3 py-1.5 text-white hover:bg-orange-700">
                      View and adopt
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}