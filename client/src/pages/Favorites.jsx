import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import PetCard from "../components/PetCard";
import { useFavorites } from "../context/FavoritesContext";

export default function Favorites() {
  const { ids } = useFavorites();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/favorites")
      .then((res) => setPets(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load favorites"))
      .finally(() => setLoading(false));
  }, []);

  // A pet disappears from this page as soon as you un-heart it
  const shown = pets.filter((p) => ids.has(p._id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-20">
      <h1 className="mb-4 text-2xl font-bold">My favorites</h1>
      {error && <p className="mb-3 rounded bg-red-100 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="text-gray-500">
          No favorites yet. Tap the heart on a pet you like. <Link to="/" className="text-orange-600">Find a pet</Link>
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((pet) => <PetCard key={pet._id} pet={pet} />)}
        </div>
      )}
    </div>
  );
}