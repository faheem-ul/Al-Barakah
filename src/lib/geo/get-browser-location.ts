export type GeoCoordinates = {
  latitude: number;
  longitude: number;
};

/**
 * Request browser GPS. Rejects on deny/timeout/unsupported — caller should fall back.
 */
export function getBrowserLocation(
  options?: PositionOptions
): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60_000,
        ...options,
      }
    );
  });
}
