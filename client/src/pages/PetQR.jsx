import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import QRCode from "qrcode";
import api from "../api/axios";

export default function PetQR() {
  const { id } = useParams();
  const [pet, setPet] = useState(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");

  // After deployment, set VITE_PUBLIC_URL to your website address
  const base = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
  const url = `${base}/pets/${id}`;

  useEffect(() => {
    api
      .get(`/pets/${id}`)
      .then((res) => setPet(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load the pet"));
    QRCode.toDataURL(url, { width: 320, margin: 1 })
      .then(setQr)
      .catch(() => setError("Could not create the QR code"));
  }, [id, url]);

  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!pet || !qr) return <p className="p-6 text-gray-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 space-y-2 print:hidden">
        <Link to={`/pets/${id}`} className="text-sm text-orange-600">← Back to {pet.name}</Link>
        {base.includes("localhost") && (
          <p className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
            This QR code points to <b>localhost</b>, so it only works on this computer. Print real tags from your
            deployed website.
          </p>
        )}
        <button onClick={() => window.print()}
          className="rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700">
          Print tag
        </button>
      </div>

      <div className="space-y-3 border-4 border-double border-orange-400 bg-white p-6 text-center">
        <p className="text-3xl">🐾</p>
        <h1 className="text-2xl font-bold">{pet.name}</h1>
        <img src={qr} alt={`QR code for ${pet.name}`} className="mx-auto h-56 w-56" />
        <p className="text-sm text-gray-600">Scan to see {pet.name}'s profile</p>
        {pet.shelter && (
          <div className="border-t pt-3 text-sm">
            <p className="font-semibold">{pet.shelter.name}</p>
            <p className="text-gray-600">Emergency contact: {pet.shelter.phone}</p>
          </div>
        )}
        <p className="break-all text-xs text-gray-400">{url}</p>
      </div>
    </div>
  );
}