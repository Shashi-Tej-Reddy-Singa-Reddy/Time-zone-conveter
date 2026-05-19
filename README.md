# Time Zoner

A tiny, static time-zone matcher. Pick a local time and a target time in 30-minute steps, and it lists the places where, at the same instant, the local time-of-day equals your target.

## Run

Open the page directly:

- Double-click `index.html` or right-click and open in your browser.

Or serve locally (prevents any cross-origin quirks):

```sh
# macOS has Python 3 — run a quick server
cd "time zoner"
python3 -m http.server 8080
# then visit http://localhost:8080/
```

## Notes

- Uses your current date and DST rules via the browser `Intl` API.
- Includes IANA time-zone metadata so results can show place, city, time zone, and country.
- Falls back to browser-supported time zones if the bundled metadata is unavailable.
