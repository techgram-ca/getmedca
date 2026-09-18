/** Mapbox Static Images pin (cheap, no JS map needed on a phone). */
export function staticMap(lat: number | null, lng: number | null, w = 600, h = 220) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (lat == null || lng == null || !token) return null;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+0f7a73(${lng},${lat})/${lng},${lat},14/${w}x${h}@2x?access_token=${token}`;
}

export function directionsUrl(address: string, lat: number | null, lng: number | null) {
  const q = lat != null && lng != null ? `${lat},${lng}` : encodeURIComponent(address);
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}
