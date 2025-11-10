import { api, useMocks } from "./api";
import vehiclesMock from "@/mocks/vehicles.json";

const LOCAL_VEHICLES_KEY = "bm_vehicle_list";
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/640x360?text=Ve%C3%ADculo";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function generateFallbackId(prefix = "vehicle") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeVehicle(raw) {
  if (!raw) return null;

  const source = raw.vehicle ?? raw;
  const candidateId =
    source.id ?? source._id ?? source.vehicle_id ?? source.slug ?? source.code ?? source.uid;
  const id = candidateId ? String(candidateId) : generateFallbackId();

  const gallery = ensureArray(source.images ?? source.gallery ?? source.photos).filter(Boolean);
  const cover = source.imageUrl ?? source.image_url ?? gallery[0] ?? PLACEHOLDER_IMAGE;
  const normalizedGallery = gallery.length ? gallery : cover ? [cover] : [];

  const mileage = toNumber(source.mileage ?? source.km ?? source.odometer, 0);

  const sellerRaw = source.sellerId ?? source.seller_id ?? null;

  const normalized = {
    id,
    title: source.title ?? "",
    brand: source.brand ?? "",
    model: source.model ?? "",
    version: source.version ?? source.trim ?? "",
    year: toNumber(source.year ?? source.modelYear, 0),
    price: toNumber(source.price ?? source.value, 0),
    mileage,
    km: mileage,
    fuelType: source.fuel_type ?? source.fuelType ?? source.fuel ?? "",
    fuel: source.fuel ?? source.fuel_type ?? "",
    transmission: source.transmission ?? source.gearbox ?? source.shift ?? "",
    doors: source.doors ?? null,
    color: source.color ?? "",
    location: source.location ?? source.city ?? "",
    description: source.description ?? "",
    features: Array.isArray(source.features) ? source.features : [],
    images: normalizedGallery,
    gallery: normalizedGallery,
    imageUrl: cover,
    contactEmail: source.contactEmail ?? source.contact_email ?? "",
    contactPhone: source.contactPhone ?? source.contact_phone ?? "",
    contactWhatsapp: Boolean(source.contactWhatsapp ?? source.contact_whatsapp ?? false),
    sellerId: sellerRaw != null ? String(sellerRaw) : null,
    createdAt: source.createdAt ?? source.created_at ?? null,
    updatedAt: source.updatedAt ?? source.updated_at ?? null,
  };

  return normalized;
}

function readLocalVehicles() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_VEHICLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((vehicle) => normalizeVehicle(vehicle)).filter(Boolean);
  } catch (error) {
    console.warn("Erro ao ler lista de veículos salvos", error);
    return [];
  }
}

function dedupeVehicles(list) {
  const seen = new Set();
  return list.filter((vehicle) => {
    if (!vehicle?.id) return false;
    if (seen.has(vehicle.id)) return false;
    seen.add(vehicle.id);
    return true;
  });
}

function combineVehicles() {
  const locals = readLocalVehicles();
  const mocks = vehiclesMock.map((vehicle) => normalizeVehicle(vehicle)).filter(Boolean);
  return dedupeVehicles([...locals, ...mocks]);
}

function mapFiltersToApi(params = {}) {
  const query = {};
  const {
    q,
    brand,
    color,
    doors,
    location,
    minPrice,
    maxPrice,
    page,
    pageSize,
  } = params;

  if (q) query.q = q;
  if (brand) query.brand = brand;
  if (color) query.color = color;
  if (location) query.location = location;

  if (doors !== undefined && doors !== null && String(doors).trim() !== "") {
    const numericDoors = Number(doors);
    if (Number.isFinite(numericDoors)) {
      query.doors = numericDoors;
    }
  }

  if (minPrice !== undefined && minPrice !== null) {
    const numericMin = Number(minPrice);
    if (Number.isFinite(numericMin)) {
      query.min_price = numericMin;
    }
  }
  if (maxPrice !== undefined && maxPrice !== null) {
    const numericMax = Number(maxPrice);
    if (Number.isFinite(numericMax)) {
      query.max_price = numericMax;
    }
  }

  if (page !== undefined && page !== null) {
    const numericPage = Number(page);
    if (Number.isFinite(numericPage)) {
      query.page = numericPage;
    }
  }
  if (pageSize !== undefined && pageSize !== null) {
    const numericPageSize = Number(pageSize);
    if (Number.isFinite(numericPageSize)) {
      query.page_size = numericPageSize;
    }
  }

  return query;
}

export async function listVehicles(params = {}) {
  if (useMocks) {
    await delay(300);
    const {
      q = "",
      brand = "",
      minPrice = 0,
      maxPrice = Number.MAX_SAFE_INTEGER,
      page = 1,
      pageSize = 12,
      color = "",
      doors = "",
      location = "",
    } = params;

    const normalizedDoors = String(doors).trim();

    const items = combineVehicles()
      .filter((vehicle) => {
        const price = toNumber(vehicle.price, 0);
        return price >= minPrice && price <= maxPrice;
      })
      .filter((vehicle) =>
        !brand || vehicle.brand?.toLowerCase().includes(String(brand).toLowerCase())
      )
      .filter((vehicle) =>
        !q || `${vehicle.title} ${vehicle.description}`.toLowerCase().includes(String(q).toLowerCase())
      )
      .filter((vehicle) =>
        !color || vehicle.color?.toLowerCase().includes(String(color).toLowerCase())
      )
      .filter((vehicle) =>
        !normalizedDoors || String(vehicle.doors) === normalizedDoors
      )
      .filter((vehicle) =>
        !location || vehicle.location?.toLowerCase().includes(String(location).toLowerCase())
      );

    const total = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    return { items: pageItems, total };
  }

  const query = mapFiltersToApi(params);
  const { data } = await api.get("/vehicles", { params: query });
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    items: items.map((vehicle) => normalizeVehicle(vehicle)).filter(Boolean),
    total: Number(data?.total ?? items.length ?? 0),
  };
}

export async function getVehicleById(id) {
  if (useMocks) {
    await delay(200);
    const localMatch = readLocalVehicles().find((vehicle) => String(vehicle.id) === String(id));
    if (localMatch) return localMatch;
    const mock = vehiclesMock.find((vehicle) => String(vehicle.id) === String(id));
    return normalizeVehicle(mock);
  }

  const { data } = await api.get(`/vehicles/${id}`);
  return normalizeVehicle(data);
}

export async function getRecommendations(baseId) {
  if (useMocks) {
    await delay(200);
    const all = combineVehicles();
    const base = all.find((vehicle) => String(vehicle.id) === String(baseId));
    if (!base) return [];
    return all
      .filter((vehicle) => vehicle.id !== base.id)
      .sort(
        (a, b) =>
          Math.abs(toNumber(a.price) - toNumber(base.price)) -
          Math.abs(toNumber(b.price) - toNumber(base.price))
      )
      .slice(0, 6);
  }

  const { data } = await api.get(`/vehicles/${baseId}/recommendations`);
  if (!Array.isArray(data)) return [];
  return data.map((vehicle) => normalizeVehicle(vehicle)).filter(Boolean);
}

export { LOCAL_VEHICLES_KEY };
