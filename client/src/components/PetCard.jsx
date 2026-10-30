import { Link } from "react-router-dom";

const statusColor = {
  Available: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Adopted: "bg-gray-200 text-gray-600",
};

export default function PetCard({ pet }) {
  return (
    <Link
      to={`/pets/${pet._id}`}
      className="overflow-hidden rounded-lg bg-white shadow transition hover:shadow-lg"
    >
      {pet.images?.[0] ? (
        <img src={pet.images[0].url} alt={pet.name} className="h-48 w-full object-cover" />
      ) : (
        <div className="flex h-48 items-center justify-center bg-orange-50 text-5xl">🐾</div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{pet.name}</h3>
          <span className={`rounded px-2 py-0.5 text-xs ${statusColor[pet.status]}`}>
            {pet.status}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          {pet.breed || pet.species} · {pet.gender} {pet.age != null && `· ${pet.age} yr`}
        </p>
        <p className="mt-1 text-sm text-gray-500">📍 {pet.location}</p>
        {pet.vaccinated && <p className="mt-1 text-xs text-green-600">✓ Vaccinated</p>}
      </div>
    </Link>
  );
}