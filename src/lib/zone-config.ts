import { ZoneConfig } from '@/types';

/**
 * All 5 candidate beach zones along the LA → Orange County coastline.
 * Set `enabled: true` on the 3 zones that have active YouTube live streams.
 * Stream URLs are placeholders — replace with real YouTube Live URLs before demo.
 */
export const ZONE_CONFIGS: ZoneConfig[] = [
  {
    id: 'venice',
    name: 'Venice Beach',
    shortName: 'Venice',
    streamUrl: '', // TODO: Add YouTube Live URL
    enabled: false,
    lat: 33.985,
    lng: -118.472,
    noaa: {
      buoyStationId: '46221',    // Santa Monica Bay waverider buoy
      tideStationId: '9410840',  // Santa Monica tide station
    },
    mapPosition: { x: 115, y: 165 },
  },
  {
    id: 'santa-monica',
    name: 'Santa Monica Beach',
    shortName: 'Santa Monica',
    streamUrl: '', // TODO: Add YouTube Live URL
    enabled: false,
    lat: 34.008,
    lng: -118.497,
    noaa: {
      buoyStationId: '46221',    // Santa Monica Bay waverider buoy (shared with Venice)
      tideStationId: '9410840',  // Santa Monica tide station
    },
    mapPosition: { x: 95, y: 135 },
  },
  {
    id: 'huntington',
    name: 'Huntington Beach',
    shortName: 'Huntington',
    streamUrl: '', // TODO: Add YouTube Live URL
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
    streamUrl: '', // TODO: Add YouTube Live URL
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
    streamUrl: '', // TODO: Add YouTube Live URL
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

/** Trio conditions used across the system */
export const TRIO_CONDITIONS = {
  /** Primary condition — used with live-monitor (1 job per zone) */
  PRIMARY: 'Are there many people near the waterline? Look for groups of people standing or walking close to where the waves meet the sand.',

  /** Supplementary conditions — polled via check-once */
  SWIMMERS: 'Are there people swimming in the ocean? Look for people in the water past the wave break.',
  EMERGENCY: 'Are there emergency vehicles or personnel visible? Look for lifeguard trucks, ambulances, police cars, or people in uniform.',
} as const;
