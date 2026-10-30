import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [13.0827, 80.2707]; // used until a point is chosen

function ClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function MoveTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 15));
  }, [position, map]);
  return null;
}

// position = [lat, lng] or null
export default function RescueMap({ position, onPick }) {
  return (
    <MapContainer
      center={position || DEFAULT_CENTER}
      zoom={position ? 15 : 12}
      className="h-72 w-full rounded"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onPick && <ClickHandler onPick={onPick} />}
      {position && (
        <>
          <CircleMarker center={position} radius={10}
            pathOptions={{ color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.8 }} />
          <MoveTo position={position} />
        </>
      )}
    </MapContainer>
  );
}