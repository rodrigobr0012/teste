import { api } from "./api";
import { normalizeVehicle } from "./vehicles";

function buildFavorite(vehicle) {
  const normalized = normalizeVehicle(vehicle);
  if (!normalized) return null;
  return normalized;
}

export async function listFavorites() {
  const { data } = await api.get("/favorites");
  if (!Array.isArray(data)) return [];
  return data
    .map((favorite) => buildFavorite(favorite?.vehicle ?? favorite))
    .filter(Boolean);
}

export async function createFavorite(vehicleId) {
  const { data } = await api.post("/favorites", { vehicle_id: vehicleId });
  return buildFavorite(data?.vehicle ?? data);
}

export async function deleteFavorite(vehicleId) {
  await api.delete(`/favorites/${vehicleId}`);
}
