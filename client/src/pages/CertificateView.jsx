import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";

export default function CertificateView() {
  const { id } = useParams();
  const [cert, setCert] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/certificates/${id}`)
      .then((res) => setCert(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load the certificate"));
  }, [id]);

  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!cert) return <p className="p-6 text-gray-500">Loading...</p>;
  if (cert.status !== "Approved") return <p className="p-6">This request is {cert.status.toLowerCase()}.</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <button onClick={() => window.print()}
        className="mb-4 rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 print:hidden">
        Print or save as PDF
      </button>

      <div className="border-8 border-double border-orange-400 bg-white p-10 text-center">
        <p className="text-4xl">🐾</p>
        <h1 className="mt-2 text-3xl font-bold tracking-wide text-orange-600">PawCare</h1>
        <h2 className="mt-6 text-2xl font-semibold">Certificate of Participation</h2>
        <p className="mt-6 text-gray-600">This is to certify that</p>
        <p className="mt-2 text-4xl font-bold">{cert.volunteer.name}</p>
        <p className="mx-auto mt-4 max-w-lg text-gray-700">
          has volunteered <b>{cert.hoursAtRequest} hours</b> for animal rescue, care and welfare
          activities, and is recognised for their dedication and compassion.
        </p>
        <div className="mt-10 flex items-end justify-between text-sm text-gray-600">
          <div>
            <p>{new Date(cert.reviewedAt).toLocaleDateString()}</p>
            <p className="border-t pt-1">Date</p>
          </div>
          <div>
            <p>{cert.reviewedBy?.name}</p>
            <p className="border-t pt-1">Approved by</p>
          </div>
        </div>
        <p className="mt-6 text-xs text-gray-400">Certificate No. {cert.certificateNumber}</p>
      </div>
    </div>
  );
}