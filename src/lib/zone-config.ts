import { ZoneConfig } from '@/types';

/**
 * All 5 candidate beach zones along the LA → Orange County coastline.
 * Set `enabled: true` on the 3 zones that have active YouTube live streams.
 * Stream URLs are placeholders — replace with real YouTube Live URLs before demo.
 */
export const ZONE_CONFIGS: ZoneConfig[] = [
  {
    id: 'santa-monica',
    name: 'Santa Monica Beach',
    shortName: 'Santa Monica',
    streamUrl: 'https://www.youtube.com/watch?v=qmE7U1YZPQA',
    enabled: true,
    lat: 34.008,
    lng: -118.497,
    noaa: {
      buoyStationId: '46221',    // Santa Monica Bay waverider buoy
      tideStationId: '9410840',  // Santa Monica tide station
    },
    mapPosition: { x: 95, y: 135 },
  },
  {
    id: 'venice',
    name: 'Venice Beach',
    shortName: 'Venice',
    streamUrl: 'https://www.youtube.com/watch?v=RGYlFjV-dtc',
    enabled: true,
    lat: 33.985,
    lng: -118.472,
    noaa: {
      buoyStationId: '46221',    // Santa Monica Bay waverider buoy (shared with Santa Monica)
      tideStationId: '9410840',  // Santa Monica tide station
    },
    mapPosition: { x: 115, y: 165 },
  },
  {
    id: 'manhattan',
    name: 'Manhattan Beach',
    shortName: 'Manhattan',
    streamUrl: 'https://www.youtube.com/watch?v=D4B4MdxLkQo',
    enabled: true,
    lat: 33.884,
    lng: -118.410,
    noaa: {
      buoyStationId: '46221',    // Santa Monica Bay waverider buoy (shared)
      tideStationId: '9410840',  // Santa Monica tide station (nearest)
    },
    mapPosition: { x: 155, y: 215 },
  },
  {
    id: 'huntington',
    name: 'Huntington Beach',
    shortName: 'Huntington',
    streamUrl: '',
    enabled: false,
    lat: 33.655,
    lng: -117.999,
    noaa: {
      buoyStationId: '46253',    // San Pedro South waverider buoy
      tideStationId: '9410660',  // Los Angeles tide station (nearest with anemometer)
    },
    mapPosition: { x: 340, y: 370 },
  },
  {
    id: 'newport',
    name: 'Newport Beach',
    shortName: 'Newport',
    streamUrl: '',
    enabled: false,
    lat: 33.593,
    lng: -117.881,
    noaa: {
      buoyStationId: '46222',    // San Pedro waverider buoy
      tideStationId: '9410580',  // Newport Beach tide station
    },
    mapPosition: { x: 390, y: 405 },
  },
  {
    id: 'laguna',
    name: 'Laguna Beach',
    shortName: 'Laguna',
    streamUrl: '',
    enabled: false,
    lat: 33.542,
    lng: -117.783,
    noaa: {
      buoyStationId: '46222',    // San Pedro waverider buoy (shared with Newport)
      tideStationId: '9410580',  // Newport Beach tide station (shared with Newport)
    },
    mapPosition: { x: 430, y: 440 },
  },
];

/** Get only the zones that are enabled for monitoring */
export function getEnabledZones(): ZoneConfig[] {
  return ZONE_CONFIGS.filter((z) => z.enabled);
}

/** Get a zone config by ID */
export function getZoneConfig(zoneId: string): ZoneConfig | undefined {
  return ZONE_CONFIGS.find((z) => z.id === zoneId);
}

/** Trio conditions — all sensitive for maximum detection */
export const TRIO_CONDITIONS = {
  PRIMARY: 'Are there any people visible on the beach or near the water? Even a single person counts.',
  SWIMMERS: 'Is anyone in or near the ocean water? Look for any person wading, swimming, or standing in the surf.',
  EMERGENCY: 'Are there any emergency vehicles, lifeguard trucks, or personnel in uniform visible?',
} as const;
