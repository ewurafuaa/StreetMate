// Thin wrapper around Google's Places API (New) and Geocoding API:
// search suggestions, a place's coordinates, and the address of a GPS point.

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://places.googleapis.com/v1';
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export class PlacesError extends Error {}

export type PlaceSuggestion = {
  placeId: string;
  name: string;
  secondary: string;
  distanceMeters?: number;
};

type AutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId: string;
      text?: { text: string };
      structuredFormat?: {
        mainText?: { text: string };
        secondaryText?: { text: string };
      };
      distanceMeters?: number;
    };
  }[];
};

// One session = the typing plus the final tap. Google bills a session as a unit,
// so a fresh token is created for each new search and reused only within it.
export function newSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });
}

function requireKey(): string {
  if (!API_KEY) {
    throw new PlacesError('Search is not set up yet: the Places API key is missing from .env.local.');
  }
  return API_KEY;
}

async function send(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new PlacesError("Couldn't reach Google. Check your internet connection.");
  }
  if (res.ok) return res;

  let detail = '';
  try {
    detail = (await res.json())?.error?.message ?? '';
  } catch {
    // Response had no JSON body; the status code is all we have.
  }
  console.warn('[Places]', res.status, detail);

  if (res.status === 400 || res.status === 403) {
    throw new PlacesError('Google rejected the request. Check the Places key and that Places API (New) is enabled.');
  }
  if (res.status === 429) {
    throw new PlacesError('Too many searches. Wait a moment and try again.');
  }
  throw new PlacesError('Search failed. Please try again.');
}

export async function autocompletePlaces(
  input: string,
  center: { lat: number; lng: number },
  sessionToken: string
): Promise<PlaceSuggestion[]> {
  const key = requireKey();
  const point = { latitude: center.lat, longitude: center.lng };

  const res = await send(`${BASE_URL}/places:autocomplete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({
      input,
      sessionToken,
      // Ghana only. Remove this line to allow searches in other countries.
      includedRegionCodes: ['gh'],
      languageCode: 'en',
      // Ranks nearby places higher and lets Google report distance from this point.
      origin: point,
      locationBias: { circle: { center: point, radius: 50000 } },
    }),
  });

  const data = (await res.json()) as AutocompleteResponse;

  return (data.suggestions ?? []).flatMap((s) => {
    const p = s.placePrediction;
    if (!p) return [];
    return [
      {
        placeId: p.placeId,
        name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
        secondary: p.structuredFormat?.secondaryText?.text ?? '',
        distanceMeters: p.distanceMeters,
      },
    ];
  });
}

// Only the coordinates are requested. The name is already known from the suggestion,
// and asking for less keeps this call in Google's cheapest tier.
export async function getPlaceLocation(
  placeId: string,
  sessionToken?: string
): Promise<{ lat: number; lng: number }> {
  const key = requireKey();
  const query = sessionToken ? `?sessionToken=${sessionToken}` : '';

  const res = await send(`${BASE_URL}/places/${encodeURIComponent(placeId)}${query}`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'location' },
  });

  const data = (await res.json()) as { location?: { latitude: number; longitude: number } };
  if (!data.location) throw new PlacesError("Couldn't get the location for that place.");
  return { lat: data.location.latitude, lng: data.location.longitude };
}

type GeocodeResponse = {
  status: string;
  error_message?: string;
  results?: { formatted_address: string }[];
};

// Turns GPS coordinates into a readable address. Never throws: if anything fails
// (no key, Geocoding API not enabled, no internet) it returns the coordinates as text.
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  if (!API_KEY) return fallback;

  const lookup = async (resultType?: string): Promise<string | null> => {
    const filter = resultType ? `&result_type=${encodeURIComponent(resultType)}` : '';
    const res = await fetch(`${GEOCODE_URL}?latlng=${lat},${lng}&language=en${filter}&key=${API_KEY}`);
    const data = (await res.json()) as GeocodeResponse;

    if (data.status !== 'OK') {
      if (data.status !== 'ZERO_RESULTS') console.warn('[Geocoding]', data.status, data.error_message);
      return null;
    }
    return data.results?.[0]?.formatted_address ?? null;
  };

  try {
    // First try for a street, neighbourhood or area name. Where Google only has a
    // plus code (like "GR4J+2X"), the unfiltered lookup is the second attempt.
    const address =
      (await lookup('street_address|route|intersection|neighborhood|sublocality')) ?? (await lookup());
    return address ? address.replace(/, Ghana$/, '') : fallback;
  } catch {
    return fallback;
  }
}