import { useMemo, useState } from 'react';
import { TIME_ZONE_PLACES } from './time-zone-data.js';

const MAX_MINUTE = 1410;
const STEP_MINUTES = 30;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function fmtHM(h, m) {
  return `${pad2(h)}:${pad2(m)}`;
}

function minutesToHM(totalMinutes) {
  const minutes = Number(totalMinutes);
  return {
    hour: Math.floor(minutes / 60),
    minute: minutes % 60
  };
}

function fmtMinutes(totalMinutes) {
  const { hour, minute } = minutesToHM(totalMinutes);
  return fmtHM(hour, minute);
}

function roundToHalfHour(minutes) {
  return Math.min(MAX_MINUTE, Math.round(minutes / STEP_MINUTES) * STEP_MINUTES);
}

function getInitialMinute() {
  const now = new Date();
  return roundToHalfHour(now.getHours() * 60 + now.getMinutes());
}

function getLocalTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Local';
  }
}

function getSupportedTimeZones() {
  const metadataZones = TIME_ZONE_PLACES
    .filter((item) => !item.canonicalTz)
    .map((item) => item.tz);

  if (metadataZones.length) return metadataZones;

  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      const tzs = Intl.supportedValuesOf('timeZone');
      if (Array.isArray(tzs) && tzs.length) return tzs;
    } catch {
      // Fall through to the compact fallback list.
    }
  }

  return [
    'Pacific/Midway',
    'Pacific/Honolulu',
    'America/Anchorage',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'America/Toronto',
    'America/Sao_Paulo',
    'Atlantic/Azores',
    'Europe/London',
    'Europe/Dublin',
    'Europe/Lisbon',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Stockholm',
    'Europe/Athens',
    'Africa/Cairo',
    'Africa/Johannesburg',
    'Europe/Moscow',
    'Asia/Dubai',
    'Asia/Karachi',
    'Asia/Kolkata',
    'Asia/Kathmandu',
    'Asia/Dhaka',
    'Asia/Bangkok',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Australia/Perth',
    'Australia/Adelaide',
    'Australia/Sydney',
    'Pacific/Noumea',
    'Pacific/Auckland'
  ];
}

function zoneRegion(tz) {
  const first = tz.split('/')[0];
  const map = {
    America: 'Americas',
    Atlantic: 'Americas',
    Pacific: 'Pacific',
    Indian: 'Indian',
    Europe: 'Europe',
    Africa: 'Africa',
    Asia: 'Asia',
    Australia: 'Australia',
    Antarctica: 'Antarctica',
    Etc: 'Etc'
  };
  return map[first] || first;
}

function zoneCity(tz) {
  const parts = tz.split('/');
  const last = parts[parts.length - 1];
  return last.replaceAll('_', ' ');
}

function zonePlace(tz, meta) {
  if (meta?.place) return meta.place;
  return zoneCity(meta?.canonicalTz || tz);
}

function zoneCountries(meta) {
  return meta?.countries?.length ? meta.countries.join(', ') : 'Unknown';
}

function fmtDateDiff(localDate, otherParts) {
  const y = Number(otherParts.find((p) => p.type === 'year')?.value) || localDate.getFullYear();
  const m = Number(otherParts.find((p) => p.type === 'month')?.value) || localDate.getMonth() + 1;
  const d = Number(otherParts.find((p) => p.type === 'day')?.value) || localDate.getDate();
  const cmp = new Date(Date.UTC(y, m - 1, d));
  const base = new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()));
  const diffDays = Math.round((cmp - base) / 86400000);

  if (diffDays === 0) return 'same day';
  if (diffDays === 1) return '+1 day';
  if (diffDays === -1) return '-1 day';
  return `${diffDays > 0 ? '+' : ''}${diffDays} days`;
}

function buildMatches(localMinute, targetMinute, placeMap, timeZones) {
  const localSelection = minutesToHM(localMinute);
  const targetSelection = minutesToHM(targetMinute);
  const today = new Date();
  const anchor = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    localSelection.hour,
    localSelection.minute,
    0,
    0
  );

  const groups = new Map();

  for (const tz of timeZones) {
    let parts;
    try {
      parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).formatToParts(anchor);
    } catch {
      continue;
    }

    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

    if (hour !== targetSelection.hour || minute !== targetSelection.minute) {
      continue;
    }

    const meta = placeMap.get(tz);
    const region = zoneRegion(tz);
    const item = {
      tz,
      city: zoneCity(tz),
      place: zonePlace(tz, meta),
      country: zoneCountries(meta),
      timeThere: fmtHM(hour, minute),
      dateDiff: fmtDateDiff(anchor, parts)
    };

    if (!groups.has(region)) groups.set(region, []);
    groups.get(region).push(item);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, items]) => ({
      region,
      items: items.sort((a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city))
    }));
}

export default function App() {
  const initialMinute = useMemo(() => getInitialMinute(), []);
  const [localMinute, setLocalMinute] = useState(initialMinute);
  const [targetMinute, setTargetMinute] = useState(initialMinute);

  const placeMap = useMemo(() => new Map(TIME_ZONE_PLACES.map((item) => [item.tz, item])), []);
  const timeZones = useMemo(() => getSupportedTimeZones(), []);
  const localTz = useMemo(() => getLocalTimeZone(), []);
  const localMeta = placeMap.get(localTz);
  const localLocation = localMeta
    ? `${zoneCity(localMeta.canonicalTz || localTz)}, ${zoneCountries(localMeta)}`
    : zoneCity(localTz);

  const groups = useMemo(
    () => buildMatches(localMinute, targetMinute, placeMap, timeZones),
    [localMinute, targetMinute, placeMap, timeZones]
  );
  const resultCount = groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <>
      <header className="header">
        <h1>Time Zoner</h1>
        <p className="subtitle">Find where another local time aligns with your time</p>
      </header>

      <main className="container">
        <section className="panel">
          <h2>Your Local Time</h2>
          <div className="slider-row">
            <label htmlFor="localMinute">Time here</label>
            <input
              id="localMinute"
              type="range"
              min="0"
              max={MAX_MINUTE}
              step={STEP_MINUTES}
              value={localMinute}
              onChange={(event) => setLocalMinute(Number(event.target.value))}
            />
            <output htmlFor="localMinute">{fmtMinutes(localMinute)}</output>
          </div>
          <p className="meta">Detected location: <span>{localLocation}</span></p>
          <p className="meta">Detected time zone: <span>{localTz}</span></p>
        </section>

        <section className="panel">
          <h2>Target Time In Other Places</h2>
          <div className="slider-row">
            <label htmlFor="targetMinute">Time there</label>
            <input
              id="targetMinute"
              type="range"
              min="0"
              max={MAX_MINUTE}
              step={STEP_MINUTES}
              value={targetMinute}
              onChange={(event) => setTargetMinute(Number(event.target.value))}
            />
            <output htmlFor="targetMinute">{fmtMinutes(targetMinute)}</output>
          </div>
        </section>

        <section className="results panel">
          <div className="results-header">
            <h2>Matches</h2>
            <div className="summary">
              <span>{resultCount}</span> places match
            </div>
          </div>

          <div className="legend">
            <span className="chip">Place</span>
            <span className="chip">City</span>
            <span className="chip">Time Zone</span>
            <span className="chip">Country</span>
            <span className="chip">Time</span>
            <span className="chip">Date Diff</span>
          </div>

          <div>
            {groups.map((group) => (
              <div className="group" key={group.region}>
                <div className="group-title">{group.region} ({group.items.length})</div>
                {group.items.map((item) => (
                  <div className="row" key={item.tz}>
                    <div className="cell" data-label="Place">{item.place}</div>
                    <div className="cell" data-label="City">{item.city}</div>
                    <div className="cell" data-label="Time Zone">{item.tz}</div>
                    <div className="cell" data-label="Country">{item.country}</div>
                    <div className="cell" data-label="Time">{item.timeThere}</div>
                    <div className="cell muted" data-label="Date Diff">{item.dateDiff}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          At the same instant as your selected local time, these places show the selected target time.
          Results use your current date and DST rules.
        </p>
      </footer>
    </>
  );
}
