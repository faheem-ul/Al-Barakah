"use server";

export type PrefillShippingAddress = {
  address1: string;
  address2: string;
  city: string;
  province: string;
  provinceCode: string;
  zip: string;
  country: string;
};

type NominatimAddress = {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  path?: string;
  building?: string;
  amenity?: string;
  shop?: string;
  office?: string;
  tourism?: string;
  leisure?: string;
  residential?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  district?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  state_district?: string;
  region?: string;
  postcode?: string;
  country_code?: string;
};

type NominatimResponse = {
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
};

type OverpassElement = {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Map common Pakistan region names from Nominatim → Shopify province codes. */
const PK_PROVINCE_CODES: Record<string, string> = {
  punjab: "PB",
  sindh: "SD",
  balochistan: "BA",
  baluchistan: "BA",
  "khyber pakhtunkhwa": "KP",
  kpk: "KP",
  "khyber-pakhtunkhwa": "KP",
  islamabad: "IS",
  "islamabad capital territory": "IS",
  "azad jammu and kashmir": "JK",
  "azad kashmir": "JK",
  "gilgit-baltistan": "GB",
  "gilgit baltistan": "GB",
};

const PK_CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Gujranwala",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Hyderabad",
  "Bahawalpur",
  "Sargodha",
  "Sukkur",
  "Larkana",
  "Sheikhupura",
  "Rahim Yar Khan",
  "Gujrat",
  "Jhang",
  "Mardan",
  "Kasur",
  "Okara",
  "Sahiwal",
  "Wah Cantonment",
  "Dera Ghazi Khan",
  "Mirpur Khas",
  "Nawabshah",
  "Mingora",
  "Chiniot",
  "Kamoke",
  "Hafizabad",
  "Kohat",
  "Jacobabad",
  "Shikarpur",
  "Muzaffargarh",
  "Khanewal",
  "Gojra",
  "Bahawalnagar",
  "Abbottabad",
  "Muridke",
  "Pakpattan",
  "Jaranwala",
  "Chishtian",
  "Daska",
  "Mandi Bahauddin",
  "Ahmadpur East",
  "Kamalia",
  "Toba Tek Singh",
  "Vehari",
  "Jhelum",
  "Taxila",
  "Attock",
  "Khanpur",
  "Muzaffarabad",
  "Gilgit",
  "Skardu",
  "Gwadar",
  "Turbat",
];

function resolvePkProvinceCode(provinceName: string): string {
  const key = provinceName.trim().toLowerCase();
  if (!key) return "";
  if (PK_PROVINCE_CODES[key]) return PK_PROVINCE_CODES[key];
  for (const [name, code] of Object.entries(PK_PROVINCE_CODES)) {
    if (key.includes(name)) return code;
  }
  return "";
}

function clean(value?: string | null): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasUrduOrArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function looksLikeTehsilOrAdminUnit(text: string): boolean {
  const v = text.toLowerCase();
  return (
    v.includes("tehsil") ||
    v.includes("تحصيل") ||
    v.includes("تحصیل") ||
    v.includes("district") ||
    v.includes("ضلع") ||
    v.includes("town committee") ||
    v.includes("union council")
  );
}

function findKnownCity(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    const value = clean(candidate);
    if (!value) continue;
    const lower = value.toLowerCase();
    for (const city of PK_CITIES) {
      if (lower === city.toLowerCase() || lower.includes(city.toLowerCase())) {
        return city;
      }
    }
  }
  return "";
}

function sameText(a: string, b: string): boolean {
  const x = clean(a).toLowerCase();
  const y = clean(b).toLowerCase();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function looksLikeRoadName(text: string): boolean {
  const v = text.toLowerCase();
  return /\b(boulevard|blvd|road|rd\.?|street|st\.?|avenue|ave\.?|lane|ln\.?|drive|dr\.?|way|highway|motorway|expressway|main blvd|main boulevard)\b/.test(
    v
  );
}

function resolveCity(a: NominatimAddress, displayName?: string): string {
  const fromKnown = findKnownCity(
    a.city,
    a.town,
    a.municipality,
    a.county,
    a.state_district,
    displayName
  );
  if (fromKnown) return fromKnown;

  for (const candidate of [a.city, a.town, a.municipality, a.village]) {
    const value = clean(candidate);
    if (!value) continue;
    if (looksLikeTehsilOrAdminUnit(value)) continue;
    if (hasUrduOrArabic(value)) continue;
    return value;
  }
  return "";
}

function resolveStreetAddress(a: NominatimAddress, city: string): string {
  const road = clean(a.road || a.pedestrian || a.footway || a.path);
  if (road) return road;

  for (const area of [
    a.residential,
    a.neighbourhood,
    a.suburb,
    a.quarter,
    a.city_district,
    a.district,
  ]
    .map(clean)
    .filter(Boolean)) {
    if (city && sameText(area, city)) continue;
    if (looksLikeTehsilOrAdminUnit(area) && hasUrduOrArabic(area)) continue;
    return area;
  }
  return "";
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Free Overpass lookup for a nearby named building / office / shop.
 * Can fill Apartment when the place exists in OpenStreetMap (not Google-only).
 */
async function findNearbyPlaceName(
  latitude: number,
  longitude: number,
  street: string,
  city: string
): Promise<string> {
  const radius = 75;
  const query = `
[out:json][timeout:8];
(
  node(around:${radius},${latitude},${longitude})[name][office];
  node(around:${radius},${latitude},${longitude})[name][shop];
  node(around:${radius},${latitude},${longitude})[name][amenity];
  node(around:${radius},${latitude},${longitude})[name][building];
  node(around:${radius},${latitude},${longitude})[name][company];
  way(around:${radius},${latitude},${longitude})[name][building];
  way(around:${radius},${latitude},${longitude})[name][office];
  way(around:${radius},${latitude},${longitude})[name][shop];
  way(around:${radius},${latitude},${longitude})[name][amenity];
);
out center 12;
`.trim();

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Accept: "application/json",
        "User-Agent":
          "AlBarakahHoney/1.0 (checkout-prefill; contact@albarakah)",
      },
      body: `data=${encodeURIComponent(query)}`,
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn("[geo] Overpass HTTP", response.status);
      return "";
    }

    const data = (await response.json()) as { elements?: OverpassElement[] };
    const elements = data.elements ?? [];
    if (!elements.length) return "";

    let bestName = "";
    let bestDist = Number.POSITIVE_INFINITY;

    for (const el of elements) {
      const name = clean(el.tags?.name);
      if (!name) continue;
      if (looksLikeRoadName(name)) continue;
      if (sameText(name, street) || sameText(name, city)) continue;
      if (looksLikeTehsilOrAdminUnit(name)) continue;

      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (elLat == null || elLon == null) continue;

      const dist = haversineMeters(latitude, longitude, elLat, elLon);
      if (dist < bestDist) {
        bestDist = dist;
        // Prefer “Name, House No” when addr tags exist
        const house = clean(el.tags?.["addr:housenumber"] || el.tags?.housenumber);
        const unit = clean(el.tags?.["addr:unit"] || el.tags?.level || el.tags?.["addr:floor"]);
        bestName = [name, house ? `No. ${house}` : "", unit]
          .filter(Boolean)
          .join(", ");
      }
    }

    return bestName;
  } catch (error) {
    console.warn("[geo] Overpass nearby place failed", error);
    return "";
  }
}

function finalizeAddress(parts: {
  address1: string;
  address2: string;
  city: string;
  province: string;
  provinceCode: string;
  zip: string;
  country: string;
}): PrefillShippingAddress {
  let { address1, address2, city } = parts;

  // Never duplicate street into apartment.
  if (address2 && address1 && sameText(address2, address1)) {
    address2 = "";
  }
  if (address2 && looksLikeRoadName(address2) && !address1) {
    address1 = address2;
    address2 = "";
  }
  if (address2 && looksLikeRoadName(address2) && sameText(address2, address1)) {
    address2 = "";
  }
  if (address2 && city && sameText(address2, city)) {
    address2 = "";
  }

  return {
    address1: clean(address1),
    address2: clean(address2),
    city: clean(city),
    province: clean(parts.province),
    provinceCode: clean(parts.provinceCode),
    zip: clean(parts.zip),
    country: parts.country || "PK",
  };
}

/**
 * Free reverse-geocode:
 * 1) Nominatim → street / city / zip
 * 2) Overpass nearby named place → apartment (only if mapped in OSM)
 *
 * Cannot match Google Maps business names that only exist in Google’s database.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<PrefillShippingAddress | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("extratags", "1");
    url.searchParams.set("namedetails", "1");
    url.searchParams.set("zoom", "18");
    url.searchParams.set("accept-language", "en");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent":
          "AlBarakahHoney/1.0 (checkout-prefill; contact@albarakah)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[geo] Nominatim HTTP", response.status);
      return null;
    }

    const data = (await response.json()) as NominatimResponse;
    const a = data.address;
    if (!a) return null;

    const city = resolveCity(a, data.display_name);
    const address1 = resolveStreetAddress(a, city);

    // Structured apartment only (house no / building tags) — never the road name.
    let address2 = "";
    const house = clean(a.house_number);
    const building = clean(a.building);
    if (house && !sameText(house, address1)) {
      address2 = house.startsWith("No.") ? house : `No. ${house}`;
    } else if (
      building &&
      !sameText(building, address1) &&
      !looksLikeRoadName(building) &&
      building.toLowerCase() !== "yes"
    ) {
      address2 = building;
    }

    // Nearby OSM named office/building (free). May be empty if not mapped.
    if (!address2) {
      const nearby = await findNearbyPlaceName(
        latitude,
        longitude,
        address1,
        city
      );
      if (nearby) address2 = nearby;
    }

    const province = clean(a.state || a.state_district || a.region);
    const zip = clean(a.postcode);
    const country = (a.country_code || "pk").toUpperCase();
    const provinceCode =
      country === "PK" ? resolvePkProvinceCode(province) : "";

    const finalized = finalizeAddress({
      address1,
      address2,
      city,
      province,
      provinceCode,
      zip,
      country: country || "PK",
    });

    if (!finalized.city && !finalized.address1 && !finalized.address2) {
      return null;
    }

    return finalized;
  } catch (error) {
    console.error("[geo] reverseGeocode failed", error);
    return null;
  }
}
