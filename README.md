# Time Zoner

A React time-zone matcher. Pick a local time and a target time in 30-minute steps, and it lists the places where, at the same instant, the local time-of-day equals your target.

## Run

Install dependencies, then start the Vite dev server:

```sh
npm install
npm run dev
```

## Notes

- Uses your current date and DST rules via the browser `Intl` API.
- Includes IANA time-zone metadata so results can show place, city, time zone, and country.
- Falls back to browser-supported time zones if the bundled metadata is unavailable.
