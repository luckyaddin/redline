const GCC_LOCATIONS = [
  { terms: ["shuwaikh"], latitude: 29.3475, longitude: 47.9356 },
  { terms: ["mina abdullah"], latitude: 28.965, longitude: 48.18 },
  { terms: ["shuaiba"], latitude: 29.0402, longitude: 48.1371 },
  { terms: ["kuwait"], latitude: 29.3759, longitude: 47.9774 },
  { terms: ["dubai"], latitude: 25.2048, longitude: 55.2708 },
  { terms: ["abu dhabi"], latitude: 24.4539, longitude: 54.3773 },
  { terms: ["doha", "qatar"], latitude: 25.2854, longitude: 51.531 },
  { terms: ["riyadh"], latitude: 24.7136, longitude: 46.6753 },
  { terms: ["dammam"], latitude: 26.4207, longitude: 50.0888 },
  { terms: ["jeddah"], latitude: 21.4858, longitude: 39.1925 },
  { terms: ["saudi arabia"], latitude: 24.7136, longitude: 46.6753 },
  { terms: ["manama", "bahrain"], latitude: 26.2235, longitude: 50.5876 },
  { terms: ["muscat", "oman"], latitude: 23.588, longitude: 58.3829 },
] as const;

export function coordinatesForLocation(
  location: string,
  fallback: { latitude: number; longitude: number },
) {
  const normalized = location.toLowerCase();
  const match = GCC_LOCATIONS.find((point) => point.terms.some((term) => normalized.includes(term)));
  return match ? { latitude: match.latitude, longitude: match.longitude } : fallback;
}
