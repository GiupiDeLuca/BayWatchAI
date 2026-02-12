import { BuoyData, TideData, TidePrediction, EnvironmentalData, ZoneConfig } from '@/types';

// ===== NDBC Buoy Data (Fixed-Width Text) =====

const NDBC_BASE = 'https://www.ndbc.noaa.gov/data/realtime2';

/**
 * Fetch latest observation from an NDBC buoy station.
 * The .txt file is fixed-width with 2 header rows, then data rows (newest first).
 * Columns: YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
 * Missing values are represented as 'MM' or '99.0' or '999.0'.
 */
export async function fetchBuoyData(stationId: string): Promise<BuoyData> {
  const url = `${NDBC_BASE}/${stationId}.txt`;
  const now = new Date().toISOString();

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`[noaa] NDBC ${stationId} → ${res.status}`);
      return emptyBuoy(stationId, now);
    }

    const text = await res.text();
    const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('#'));

    if (lines.length === 0) {
      console.warn(`[noaa] NDBC ${stationId}: no data rows`);
      return emptyBuoy(stationId, now);
    }

    // First non-header line is the most recent observation
    const cols = lines[0].trim().split(/\s+/);

    // Column indices (0-based):
    // 0:YY 1:MM 2:DD 3:hh 4:mm 5:WDIR 6:WSPD 7:GST 8:WVHT 9:DPD 10:APD 11:MWD 12:PRES 13:ATMP 14:WTMP
    return {
      stationId,
      waveHeight: parseNdbc(cols[8]),      // WVHT in meters
      wavePeriod: parseNdbc(cols[9]),      // DPD in seconds
      windSpeed: parseNdbc(cols[6]),       // WSPD in m/s
      windDirection: parseNdbc(cols[5]),   // WDIR in degrees
      waterTemp: parseNdbc(cols[14]),      // WTMP in Celsius
      airTemp: parseNdbc(cols[13]),        // ATMP in Celsius
      fetchedAt: now,
    };
  } catch (err) {
    console.error(`[noaa] NDBC ${stationId} fetch error:`, err);
    return emptyBuoy(stationId, now);
  }
}

/** Parse an NDBC value. Returns null for missing data markers. */
function parseNdbc(value: string | undefined): number | null {
  if (!value) return null;
  if (value === 'MM' || value === 'N/A') return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  // NDBC uses 99.0, 999.0, 9999.0 as missing markers depending on column
  if (num === 99.0 || num === 999.0 || num === 9999.0 || num === 99.00 || num === 999.00) return null;
  return num;
}

function emptyBuoy(stationId: string, fetchedAt: string): BuoyData {
  return {
    stationId,
    waveHeight: null,
    wavePeriod: null,
    windSpeed: null,
    windDirection: null,
    waterTemp: null,
    airTemp: null,
    fetchedAt,
  };
}

// ===== CO-OPS Tides & Currents (JSON API) =====

const COOPS_BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

/**
 * Fetch current water level and today's tide predictions from a CO-OPS station.
 */
export async function fetchTideData(stationId: string): Promise<TideData> {
  const now = new Date().toISOString();

  try {
    // Fetch current water level and predictions in parallel
    const [levelResult, predResult, windResult] = await Promise.allSettled([
      fetchCoopsProduct(stationId, 'water_level', { date: 'latest' }),
      fetchCoopsProduct(stationId, 'predictions', { date: 'today', interval: 'hilo' }),
      fetchCoopsProduct(stationId, 'wind', { date: 'latest' }),
    ]);

    // Parse current water level
    let currentLevel: number | null = null;
    if (levelResult.status === 'fulfilled' && levelResult.value?.data?.[0]) {
      currentLevel = parseFloat(levelResult.value.data[0].v);
      if (isNaN(currentLevel)) currentLevel = null;
    }

    // Parse tide predictions
    const predictions: TidePrediction[] = [];
    if (predResult.status === 'fulfilled' && predResult.value?.predictions) {
      for (const p of predResult.value.predictions) {
        predictions.push({
          time: p.t,
          level: parseFloat(p.v),
          type: p.type === 'H' ? 'H' : 'L',
        });
      }
    }

    // Determine tide state (rising or falling)
    const tideState = determineTideState(predictions);

    return {
      stationId,
      currentLevel,
      predictions,
      tideState,
      fetchedAt: now,
    };
  } catch (err) {
    console.error(`[noaa] CO-OPS ${stationId} fetch error:`, err);
    return {
      stationId,
      currentLevel: null,
      predictions: [],
      tideState: 'unknown',
      fetchedAt: now,
    };
  }
}

/**
 * Fetch wind data from a CO-OPS station.
 * Returns wind speed in knots and direction in degrees.
 */
export async function fetchWindFromCoops(stationId: string): Promise<{
  speed: number | null;
  direction: number | null;
  gusts: number | null;
}> {
  try {
    const data = await fetchCoopsProduct(stationId, 'wind', { date: 'latest' });
    if (data?.data?.[0]) {
      const entry = data.data[0];
      return {
        speed: parseFloat(entry.s) || null,       // speed in knots
        direction: parseFloat(entry.d) || null,    // direction in degrees
        gusts: parseFloat(entry.g) || null,        // gust speed in knots
      };
    }
  } catch (err) {
    console.error(`[noaa] CO-OPS wind ${stationId}:`, err);
  }
  return { speed: null, direction: null, gusts: null };
}

/** Generic CO-OPS data fetcher */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchCoopsProduct(
  stationId: string,
  product: string,
  extra: Record<string, string> = {},
): Promise<any> {
  const params = new URLSearchParams({
    station: stationId,
    product,
    datum: 'MLLW',
    units: 'english',
    time_zone: 'lst_ldt',
    format: 'json',
    application: 'BaywatchAI',
    ...extra,
  });

  const res = await fetch(`${COOPS_BASE}?${params}`, { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`CO-OPS ${product} for ${stationId}: ${res.status}`);
  }
  return res.json();
}

/** Determine if tide is rising or falling based on predictions and current time */
function determineTideState(predictions: TidePrediction[]): 'rising' | 'falling' | 'unknown' {
  if (predictions.length < 2) return 'unknown';

  const now = new Date();
  // Find the next prediction after now
  for (let i = 0; i < predictions.length; i++) {
    const predTime = new Date(predictions[i].time);
    if (predTime > now) {
      // If next event is a High tide, water is currently rising
      return predictions[i].type === 'H' ? 'rising' : 'falling';
    }
  }
  return 'unknown';
}

// ===== Combined Fetch =====

/**
 * Fetch all environmental data for a zone (buoy + tide + wind).
 * Wind is sourced from CO-OPS station (buoys don't have anemometers).
 */
export async function fetchAllEnvironmental(config: ZoneConfig): Promise<EnvironmentalData> {
  const [buoyData, tideData, windData] = await Promise.allSettled([
    fetchBuoyData(config.noaa.buoyStationId),
    fetchTideData(config.noaa.tideStationId),
    fetchWindFromCoops(config.noaa.tideStationId),
  ]);

  const buoy = buoyData.status === 'fulfilled' ? buoyData.value : null;
  const tide = tideData.status === 'fulfilled' ? tideData.value : null;
  const wind = windData.status === 'fulfilled' ? windData.value : null;

  // Merge wind data from CO-OPS into buoy data (since buoys don't report wind)
  if (buoy && wind) {
    if (buoy.windSpeed === null && wind.speed !== null) {
      // Convert knots to m/s for consistency with buoy format
      buoy.windSpeed = wind.speed * 0.514444;
    }
    if (buoy.windDirection === null && wind.direction !== null) {
      buoy.windDirection = wind.direction;
    }
  }

  return { buoy, tide };
}
