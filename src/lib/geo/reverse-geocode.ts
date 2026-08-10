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

type NominatimResponse = {
  address?: {
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    state_district?: string;
    postcode?: string;
    country_code?: string;
  };
  display_name?: string;
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

function resolvePkProvinceCode(provinceName: string): string {
  const key = provinceName.trim().toLowerCase();
  if (!key) return "";
  if (PK_PROVINCE_CODES[key]) return PK_PROVINCE_CODES[key];
  for (const [name, code] of Object.entries(PK_PROVINCE_CODES)) {
    if (key.includes(name)) return code;
  }
  return "";
}

/**
 * Reverse-geocode coordinates via OpenStreetMap Nominatim (server-side).
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
    url.searchParams.set("zoom", "18");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
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

    const street = [a.house_number, a.road].filter(Boolean).join(" ").trim();
    const address1 =
      street ||
      a.neighbourhood ||
      a.suburb ||
      data.display_name?.split(",")[0]?.trim() ||
      "";

    const city =
      a.city || a.town || a.village || a.municipality || a.county || "";
    const province = a.state || a.state_district || "";
    const zip = a.postcode || "";
    const country = (a.country_code || "pk").toUpperCase();
    const provinceCode =
      country === "PK" ? resolvePkProvinceCode(province) : "";

    if (!city && !address1) return null;

    return {
      address1: address1 || city,
      address2: "",
      city: city || address1,
      province,
      provinceCode,
      zip,
      country: country || "PK",
    };
  } catch (error) {
    console.error("[geo] reverseGeocode failed", error);
    return null;
  }
}
