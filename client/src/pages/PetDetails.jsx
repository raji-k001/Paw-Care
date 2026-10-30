import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function PetDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [pet, setPet] = useState(null);
  const [error, setError] = useState("");
  const [mainImage, setMainImage] = useState(0);

  useEffect(() => {
    api
      .get(`/pets/${id}`)
      .then((res) => setPet(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load pet"));
  }, [id]);

  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!pet) return <p className="p-6 text-gray-500">Loading...</p>;

  const details = [
    ["Species", pet.species], ["Breed", pet.breed], ["Age", pet.age != null && `${pet.age} years`],
    ["Gender", pet.gender], ["Size", pet.size], ["Color", pet.color],
    ["Location", pet.location], ["Vaccinated", pet.vaccinated ? "Yes" : "No"],
    ["Sterilized", pet.sterilized ? "Yes" : "No"],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link to="/" className="text-sm text-orange-600">← Back to all pets</Link>
      <div className="mt-3 grid gap-6 rounded-lg bg-white p-5 shadow md:grid-cols-2">
        <div>
          {pet.images.length > 0 ? (
            <>
              <img src={pet.images[mainImage].url} alt={pet.name}
                className="h-72 w-full rounded object-cover" />
              <div className="mt-2 flex gap-2">
                {pet.images.map((img, i) => (
                  <img key={img.public_id} src={img.url} alt="" onClick={() => setMainImage(i)}
                    className={`h-16 w-16 cursor-pointer rounded object-cover ${i === mainImage ? "ring-2 ring-orange-500" : ""}`} />
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-72 items-center justify-center rounded bg-orange-50 text-6xl">🐾</div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold">{pet.name}</h1>
          <p className="mb-3 text-sm text-gray-500">Status: {pet.status}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {details.map(([label, value]) =>
              value ? (
                <div key={label} className="contents">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="capitalize">{value}</dd>
                </div>
              ) : null
            )}
          </dl>
          {pet.description && <p className="mt-4 text-gray-700">{pet.description}</p>}
          <p className="mt-4 text-sm text-gray-500">Listed by {pet.addedBy?.name}</p>

          {pet.status === "Adopted" ? (
            <p className="mt-5 rounded bg-gray-100 p-3 text-gray-600">This pet has been adopted 🎉</p>
          ) : user ? (
            <button disabled className="mt-5 rounded bg-orange-300 px-4 py-2 text-white">
              Apply to adopt (coming in Step 6)
            </button>
          ) : (
            <Link to="/login" className="mt-5 inline-block rounded bg-orange-600 px-4 py-2 text-white">
              Login to apply
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}