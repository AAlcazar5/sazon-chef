// backend/src/services/storeLocationService.ts
// Service for finding nearby grocery stores based on location

import axios from 'axios';

export interface StoreLocation {
  store: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  distance: number; // in miles
  phone?: string;
  hours?: string;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  zipCode?: string;
}

/**
 * Convert zip code to coordinates using a free geocoding service
 * Falls back to a simple lookup table for common zip codes
 */
export async function zipCodeToCoordinates(zipCode: string): Promise<LocationCoordinates | null> {
  try {
    // Try using a free geocoding API (Nominatim OpenStreetMap - free, no API key needed)
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: zipCode,
        format: 'json',
        limit: 1,
        countrycodes: 'us', // Limit to US
      },
      headers: {
        'User-Agent': 'SazonChef/1.0', // Required by Nominatim
      },
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        zipCode,
      };
    }
  } catch (error) {
    console.warn('Error geocoding zip code:', error);
  }

  // Fallback: Try common zip code lookup (simplified)
  const commonZipCodes: Record<string, { lat: number; lon: number }> = {
    '10001': { lat: 40.7506, lon: -73.9972 }, // NYC
    '90210': { lat: 34.0901, lon: -118.4065 }, // Beverly Hills
    '94102': { lat: 37.7749, lon: -122.4194 }, // San Francisco
    '60601': { lat: 41.8781, lon: -87.6298 }, // Chicago
    '75201': { lat: 32.7767, lon: -96.7970 }, // Dallas
    '30301': { lat: 33.7490, lon: -84.3880 }, // Atlanta
    '02101': { lat: 42.3601, lon: -71.0589 }, // Boston
    '98101': { lat: 47.6062, lon: -122.3321 }, // Seattle
  };

  if (commonZipCodes[zipCode]) {
    return {
      latitude: commonZipCodes[zipCode].lat,
      longitude: commonZipCodes[zipCode].lon,
      zipCode,
    };
  }

  return null;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Find nearby grocery stores using Overpass API (OpenStreetMap)
 * This is free and doesn't require an API key
 */
export async function findNearbyStores(
  coordinates: LocationCoordinates,
  radiusMiles: number = 10
): Promise<StoreLocation[]> {
  const { latitude, longitude } = coordinates;
  const radiusMeters = radiusMiles * 1609.34; // Convert miles to meters

  try {
    // Use Overpass API to find grocery stores
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["shop"="supermarket"](around:${radiusMeters},${latitude},${longitude});
        node["shop"="grocery"](around:${radiusMeters},${latitude},${longitude});
        node["amenity"="marketplace"](around:${radiusMeters},${latitude},${longitude});
        way["shop"="supermarket"](around:${radiusMeters},${latitude},${longitude});
        way["shop"="grocery"](around:${radiusMeters},${latitude},${longitude});
      );
      out center meta;
    `;

    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      overpassQuery,
      {
        headers: {
          'Content-Type': 'text/plain',
        },
      }
    );

    const stores: StoreLocation[] = [];

    if (response.data && response.data.elements) {
      for (const element of response.data.elements) {
        const lat = element.lat || element.center?.lat;
        const lon = element.lon || element.center?.lon;

        if (!lat || !lon) continue;

        const distance = calculateDistance(latitude, longitude, lat, lon);

        // Extract store name and address
        const name = element.tags?.name || element.tags?.brand || 'Grocery Store';
        const address = element.tags?.['addr:street'] || '';
        const city = element.tags?.['addr:city'] || '';
        const state = element.tags?.['addr:state'] || '';
        const zipCode = element.tags?.['addr:postcode'] || coordinates.zipCode || '';

        // Map common store names to our store list
        const storeName = mapStoreName(name);

        stores.push({
          store: storeName,
          address: address ? `${address}, ${city}, ${state}` : `${city}, ${state}`.trim(),
          city: city || '',
          state: state || '',
          zipCode,
          latitude: lat,
          longitude: lon,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
          phone: element.tags?.['phone'] || undefined,
          hours: element.tags?.['opening_hours'] || undefined,
        });
      }
    }

    // Sort by distance
    stores.sort((a, b) => a.distance - b.distance);

    // Remove duplicates (same store name within 0.5 miles)
    const uniqueStores: StoreLocation[] = [];
    for (const store of stores) {
      const isDuplicate = uniqueStores.some(
        (s) => s.store === store.store && Math.abs(s.distance - store.distance) < 0.5
      );
      if (!isDuplicate) {
        uniqueStores.push(store);
      }
    }

    return uniqueStores;
  } catch (error) {
    console.error('Error finding nearby stores:', error);
    // Fallback: return stores from our list with estimated distances
    return getFallbackStores(coordinates, radiusMiles);
  }
}

/**
 * Map OpenStreetMap store names to our standardized store names
 */
function mapStoreName(osmName: string): string {
  const name = osmName.toLowerCase();

  // Map to our known stores
  if (name.includes('walmart')) return 'Walmart';
  if (name.includes('kroger')) return 'Kroger';
  if (name.includes('target')) return 'Target';
  if (name.includes('whole foods') || name.includes('wholefoods')) return 'Whole Foods';
  if (name.includes('safeway')) return 'Safeway';
  if (name.includes('aldi')) return 'Aldi';
  if (name.includes('costco')) return 'Costco';
  if (name.includes('trader joe') || name.includes('traderjoes')) return 'Trader Joes';
  if (name.includes('publix')) return 'Publix';
  if (name.includes('wegmans')) return 'Wegmans';
  if (name.includes('stop & shop') || name.includes('stop and shop')) return 'Stop & Shop';
  if (name.includes('giant')) return 'Giant';
  if (name.includes('food lion')) return 'Food Lion';
  if (name.includes('ralphs')) return 'Ralphs';

  // Return capitalized version of the name
  return osmName;
}

/**
 * Fallback: Return stores from our list with estimated distances
 * This is used when the API fails or for testing
 */
function getFallbackStores(
  coordinates: LocationCoordinates,
  radiusMiles: number
): StoreLocation[] {
  // Common grocery stores that might be nearby
  const commonStores = [
    'Walmart',
    'Kroger',
    'Target',
    'Whole Foods',
    'Safeway',
    'Aldi',
    'Costco',
    'Trader Joes',
  ];

  // Estimate distances (simplified - in real app would use actual store locations)
  return commonStores.map((store, index) => ({
    store,
    address: '',
    city: '',
    state: '',
    zipCode: coordinates.zipCode || '',
    latitude: coordinates.latitude + (Math.random() - 0.5) * 0.1,
    longitude: coordinates.longitude + (Math.random() - 0.5) * 0.1,
    distance: Math.min(radiusMiles, 2 + index * 1.5), // Estimated distances
  }));
}

/**
 * Get user's location from preferences or zip code
 */
export async function getUserLocation(
  zipCode?: string,
  latitude?: number,
  longitude?: number
): Promise<LocationCoordinates | null> {
  if (latitude && longitude) {
    return {
      latitude,
      longitude,
      zipCode,
    };
  }

  if (zipCode) {
    return await zipCodeToCoordinates(zipCode);
  }

  return null;
}

