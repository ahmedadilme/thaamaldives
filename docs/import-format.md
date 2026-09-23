# Import format — availability & rates CSV

The Admin **Imports** tab accepts a single CSV file per import. Download the ready-made
[`public/import-template.csv`](../public/import-template.csv) from the Imports tab and replace the
example rows.

## Columns

| Column | Required | Notes |
| --- | --- | --- |
| `Resort` | yes | Must match a property in the catalogue by name or slug (fuzzy, case/space-insensitive). Unknown resorts are reported as row errors. |
| `Room Type` | yes | Room **name** or **code** from that property's contract (e.g. `Sunrise Beach Villa` or `BV(Sunrise)`). |
| `Meal Plan` | no | Board code, e.g. `BB`, `HB`, `FB`, `AI`. Defaults to `BB`. |
| `Date From` | yes | `YYYY-MM-DD` (also accepts `DD.MM.YYYY`, `DD-Mon-YY`, `D Mon YYYY`). |
| `Date To` | yes | Same formats as `Date From`. Must be on or after `Date From`. |
| `Currency` | no | 3-letter code, defaults to `USD`. |
| `SGL Rate` | conditional | Single occupancy. Numbers may include `$`, commas or spaces. |
| `DBL Rate` | conditional | Double occupancy. |
| `TPL Rate` | no | Triple occupancy. |
| `QTRP Rate` | no | Quad occupancy. |
| `Extra Adult` | no | Extra adult supplement. |
| `Child Rate` | no | Child rate. |
| `Infant Rate` | no | Often `FOC` (free of charge) — keep it text. |
| `Available Rooms` | no | Whole number. Blank means “not reported”. `0` means sold out. |
| `Transfer Adult` | no | Round-trip transfer price for the first row of each resort in the file. |
| `Transfer Child` | no | Child transfer price. |
| `Availability Status` | no | `Available`, `On Request`, `Sold Out` or `Stop Sell`. Accepts `Open`/`Yes`, `Full`, `Closed` as aliases. |
| `Source` | no | Free-text provenance label kept with the imported rows. |

At least one of `SGL Rate`, `DBL Rate`, `TPL Rate`, `QTRP Rate`, `Extra Adult` or `Child Rate`
must carry a value — or `SGL`/`DBL` must say `On Request`.

**A room rate can never be free.** Blank or `0` in any price column means "no rate" — the cell is
stored as `N/A` and never shown as a price (no `$0` anywhere). If a row ends up with no real price
at all, it is rejected with `No rate defined for any occupancy`: enter a price or write `On Request`.

## How rows are interpreted

- **Rates** become one rate period per row, keyed by `resort + room + meal + Date From`.
- **Availability** is written for **every night** in the `Date From … Date To` range, so a single
  annual row (`2026-01-01` → `2026-12-31`) fills the whole year.
- **`On Request` is not sold out.** `On Request` means “we can ask the resort”; `SOLD_OUT` means no
  rooms. Leave `Available Rooms` blank when the resort has not reported a count.
- **Transfers** are taken from the first row for each resort that has a `Transfer Adult` value.
- Re-importing the same keys **updates** changed values and leaves identical rows unchanged; nothing
  is deleted by an import (use *Rollback to artifact* in Admin to reset).

## Publishing

Uploading validates and previews the change (drafted vs current, with new/changed/same badges).
Nothing touches the live site until **Publish**; **Discard** throws the draft away. Every import is
recorded in the import history with its row counts and errors, and any import can be rolled back to
the committed artifact.
