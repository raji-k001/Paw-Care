import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useCompare } from "../context/CompareContext";

const statusColor = {
  Available: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Adopted: "bg-gray-200 text-gray-600",
};

export default function PetCard({ pet }) {
  const { user } = useAuth();
  const { ids, toggle } = useFavorites();
  const compare = useCompare();
  const navigate = useNavigate();

  const liked = ids.has(pet._id);
  const picked = compare.ids.includes(pet._id);
  const full = compare.ids.length >= 3 && !picked;

  const onHeart = async () => {
    if (!user) return navigate("/login");
    const error = await toggle(pet._id);
    if (error) window.alert(error);
  };

  return (
    <div className="relative overflow-hidden rounded-lg bg-white shadow transition hover:shadow-lg">
      <button onClick={onHeart} aria-label={liked ? "Remove from favorites" : "Add to favorites"}
        className="absolute right-2 top-2 z-10 rounded-full bg-white/90 px-2 py-1 text-lg shadow">
        {liked ? "❤️" : "🤍"}
      </button>

      <Link to={`/pets/${pet._id}`} className="block">
        {pet.images?.[0] ? (
          <img src={pet.images[0].url} alt={pet.name} className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 items-center justify-center bg-orange-50 text-5xl">🐾</div>
        )}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{pet.name}</h3>
            <span className={`rounded px-2 py-0.5 text-xs ${statusColor[pet.status]}`}>{pet.status}</span>
          </div>
          <p className="text-sm text-gray-500">
            {pet.breed || pet.species} · {pet.gender} {pet.age != null && `· ${pet.age} yr`}
          </p>
          <p className="mt-1 text-sm text-gray-500">📍 {pet.location}</p>
          {pet.vaccinated && <p className="mt-1 text-xs text-green-600">✓ Vaccinated</p>}
        </div>
      </Link>

      <label className="flex items-center gap-2 border-t px-4 py-2 text-xs text-gray-600">
        <input type="checkbox" checked={picked} disabled={full} onChange={() => compare.toggle(pet._id)} />
        {full ? "Compare list is full (3 pets)" : "Compare"}
      </label>
    </div>
  );
}