# Recipe Scaler

A web app for chefs and food technologists that scales a recipe card (technological card) to any yield.
Enter the card once — items, gross weight and waste percentage — and get the gross and net weight of every item for a new yield.

**Live demo:** https://patseluk-lang.github.io/recipe-scaler/

## Features

- **Two ways to scale**
  - to a target yield;
  - from a limiting ingredient: enter how much of the scarcest ingredient you have, and every other item is scaled to match.
- **Gross / net weights** — net weight is calculated from gross weight and the waste percentage of each item.
- **Items counted in pieces** (eggs, buns) are calculated by weight and rounded to whole pieces, 0.5 rounds up.
- **No built-in norms** — waste percentages and piece weights are entered by the user for their own kitchen and produce.
- **Saved recipe cards** — stored in the browser (localStorage); export to a JSON file and import it on another device.
- **Interface languages** — Ukrainian and English; each language is a separate file.
- Works without a backend and without a build step.

## Tech stack

- HTML, CSS, vanilla JavaScript (no frameworks, no dependencies)
- `localStorage` and the File API for saving, exporting and importing cards
- `Intl.NumberFormat` / `Intl.DateTimeFormat` for locale-aware numbers and dates
- Node.js built-in test runner (`node:test`) for the calculation core
- GitHub Pages for hosting

## Project structure

```
recipe-scaler/
├── index.html          # home page
├── calculator.html     # recipe card editor and scaling
├── recipes.html        # saved recipe cards: open, delete, export, import
├── css/style.css
├── js/
│   ├── scaler.js       # calculation core: pure functions, no DOM
│   ├── storage.js      # localStorage, JSON export / import
│   ├── i18n.js         # language loading, translation, number formatting
│   ├── calculator.js   # calculator page
│   └── recipes.js      # "My recipe cards" page
├── lang/
│   ├── uk.js           # Ukrainian
│   └── en.js           # English
└── tests/
    └── scaler.test.js  # tests for the calculation core
```

## How the calculation works

| Value | Formula |
|---|---|
| Net weight | `gross × (1 − waste% / 100)` |
| Factor for a target yield | `target yield / card yield` |
| Factor from a limiting ingredient | `amount available / amount in the card` (grams, or pieces for items counted in pieces) |
| Scaled gross weight | `gross × factor` |
| Pieces | `round(scaled gross / weight of one piece)`, 0.5 rounds up |

## Run locally

The site is static. Clone the repository and serve the folder with any static server, for example:

```bash
git clone https://github.com/patseluk-lang/recipe-scaler.git
cd recipe-scaler
python -m http.server 8000
```

Then open http://localhost:8000.

## Tests

Requires Node.js 18 or newer:

```bash
node --test
```

## Adding a language

1. Copy `lang/en.js` to `lang/<code>.js` and translate the strings.
2. Add the language code to the `LANGUAGES` list in `js/i18n.js`.

## Data and privacy

Recipe cards never leave the browser: there is no server and no account. Clearing the browser data deletes them, so use **Export to file** to keep a copy.
