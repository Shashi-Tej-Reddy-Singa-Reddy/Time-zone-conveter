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
  return Math.min(1410, Math.round(minutes / 30) * 30);
}

function getLocalTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Local';
  }
}

function getSupportedTimeZones() {
  const metadataZones = getTimeZonePlaces()
    .filter((item) => !item.canonicalTz)
    .map((item) => item.tz);
  if (metadataZones.length) return metadataZones;

  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      const tzs = Intl.supportedValuesOf('timeZone');
      if (Array.isArray(tzs) && tzs.length) return tzs;
    } catch {}
  }
  // Fallback: a concise but representative set
  return [
    'Pacific/Midway','Pacific/Honolulu','America/Anchorage','America/Los_Angeles','America/Denver','America/Chicago','America/New_York','America/Toronto','America/Sao_Paulo','Atlantic/Azores','Europe/London','Europe/Dublin','Europe/Lisbon','Europe/Paris','Europe/Berlin','Europe/Madrid','Europe/Amsterdam','Europe/Stockholm','Europe/Athens','Africa/Cairo','Africa/Johannesburg','Europe/Moscow','Asia/Dubai','Asia/Karachi','Asia/Kolkata','Asia/Kathmandu','Asia/Dhaka','Asia/Bangkok','Asia/Shanghai','Asia/Hong_Kong','Asia/Tokyo','Asia/Seoul','Australia/Perth','Australia/Adelaide','Australia/Sydney','Pacific/Noumea','Pacific/Auckland'
  ];
}

function getTimeZonePlaces() {
  return Array.isArray(window.TIME_ZONE_PLACES) ? window.TIME_ZONE_PLACES : [];
}

function getPlaceMap() {
  return new Map(getTimeZonePlaces().map((item) => [item.tz, item]));
}

function zoneRegion(tz) {
  const first = tz.split('/')[0];
  // Normalize a few common prefixes
  const map = { 'America': 'Americas', 'Atlantic': 'Americas', 'Pacific': 'Pacific', 'Indian': 'Indian', 'Europe': 'Europe', 'Africa': 'Africa', 'Asia': 'Asia', 'Australia': 'Australia', 'Antarctica': 'Antarctica', 'Etc': 'Etc' };
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
  // otherParts include day/month/year; compare with localDate to show -1, 0, +1 markers
  const y = Number(otherParts.find(p => p.type === 'year')?.value) || localDate.getFullYear();
  const m = Number(otherParts.find(p => p.type === 'month')?.value) || (localDate.getMonth()+1);
  const d = Number(otherParts.find(p => p.type === 'day')?.value) || localDate.getDate();
  const cmp = new Date(Date.UTC(y, m-1, d));
  const base = new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()));
  const diffDays = Math.round((cmp - base) / 86400000);
  if (diffDays === 0) return 'same day';
  if (diffDays === 1) return '+1 day';
  if (diffDays === -1) return '-1 day';
  return (diffDays > 0 ? `+${diffDays}` : `${diffDays}`) + ' days';
}

document.addEventListener('DOMContentLoaded', () => {
  const localMinuteEl = document.getElementById('localMinute');
  const targetMinuteEl = document.getElementById('targetMinute');
  const localMinuteLabel = document.getElementById('localMinuteLabel');
  const targetMinuteLabel = document.getElementById('targetMinuteLabel');
  const localLocationEl = document.getElementById('localLocation');
  const localTzEl = document.getElementById('localTz');
  const resultsEl = document.getElementById('results');
  const resultCountEl = document.getElementById('resultCount');

  const placeMap = getPlaceMap();
  const localTz = getLocalTimeZone();
  const localMeta = placeMap.get(localTz);
  localTzEl.textContent = localTz;
  localLocationEl.textContent = localMeta
    ? `${zoneCity(localMeta.canonicalTz || localTz)}, ${zoneCountries(localMeta)}`
    : zoneCity(localTz);

  const now = new Date();
  const initMinute = roundToHalfHour(now.getHours() * 60 + now.getMinutes());
  localMinuteEl.value = String(initMinute);
  targetMinuteEl.value = String(initMinute);

  function updateLabels() {
    localMinuteLabel.textContent = fmtMinutes(localMinuteEl.value);
    targetMinuteLabel.textContent = fmtMinutes(targetMinuteEl.value);
  }

  function compute() {
    updateLabels();

    const localSelection = minutesToHM(localMinuteEl.value);
    const targetSelection = minutesToHM(targetMinuteEl.value);

    const today = new Date();
    const anchor = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      localSelection.hour, localSelection.minute, 0, 0
    ); // Local date at selected hour and minute

    const tzs = getSupportedTimeZones();

    const fmt = (tz) => new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).formatToParts(anchor);

    const groups = new Map(); // region -> items

    for (const tz of tzs) {
      let parts;
      try { parts = fmt(tz); } catch { continue; }
      const hour = Number(parts.find(p => p.type === 'hour')?.value ?? '0');
      const minute = Number(parts.find(p => p.type === 'minute')?.value ?? '0');
      const match = hour === targetSelection.hour && minute === targetSelection.minute;
      if (!match) continue;

      const meta = placeMap.get(tz);
      const region = zoneRegion(tz);
      const city = zoneCity(tz);
      const place = zonePlace(tz, meta);
      const country = zoneCountries(meta);
      const timeThere = fmtHM(hour, minute);
      const dateDiff = fmtDateDiff(anchor, parts);

      if (!groups.has(region)) groups.set(region, []);
      groups.get(region).push({ tz, city, place, country, timeThere, dateDiff });
    }

    // Render
    const regionNames = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
    let total = 0;
    resultsEl.innerHTML = '';
    for (const region of regionNames) {
      const items = groups.get(region).sort((a, b) => {
        return a.country.localeCompare(b.country) || a.city.localeCompare(b.city);
      });
      total += items.length;
      const groupEl = document.createElement('div');
      groupEl.className = 'group';
      const title = document.createElement('div');
      title.className = 'group-title';
      title.textContent = `${region} (${items.length})`;
      groupEl.appendChild(title);

      for (const it of items) {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `
          <div class="cell" data-label="Place">${it.place}</div>
          <div class="cell" data-label="City">${it.city}</div>
          <div class="cell" data-label="Time Zone">${it.tz}</div>
          <div class="cell" data-label="Country">${it.country}</div>
          <div class="cell" data-label="Time">${it.timeThere}</div>
          <div class="cell muted" data-label="Date Diff">${it.dateDiff}</div>
        `;
        groupEl.appendChild(row);
      }
      resultsEl.appendChild(groupEl);
    }
    resultCountEl.textContent = String(total);
  }

  // Events
  localMinuteEl.addEventListener('input', compute);
  targetMinuteEl.addEventListener('input', compute);

  // Initial compute
  compute();
});
