# Recipe Scaler

Web app for chefs and food technologists. You enter a recipe card (items, gross weight, loss percentage) once, and the app recalculates gross and net weight of every item for a different yield.

Live: https://patseluk-lang.github.io/recipe-scaler/

## Features

- Scaling to a target yield.
- Scaling from a limiting ingredient: enter how much of the scarcest ingredient you have, the other items follow.
- Enter either the loss percentage or the weighed net weight for an item, the other value is calculated. Losses can be negative (cereals that absorb water) or 100 % (bay leaf, bones that are removed after cooking).
- Items counted in pieces (eggs, buns) are calculated by weight and rounded to whole pieces, 0.5 rounds up.
- No built-in norms. Loss percentages and piece weights are entered by the user for their own kitchen.
- Recipe cards are saved in the browser (localStorage) and can be exported to a JSON file and imported on another device.
- Ukrainian and English interface, one file per language.
- No backend and no build step.

## Tech stack

- HTML, CSS, vanilla JavaScript, no frameworks or dependencies
- localStorage and the File API for saving, export and import
- Intl.NumberFormat and Intl.DateTimeFormat for numbers and dates in each language
- Node.js built-in test runner (node:test) for the calculation code
- GitHub Pages hosting

## Project structure

```
recipe-scaler/
├── index.html          # home page
├── calculator.html     # recipe card editor and scaling
├── recipes.html        # saved recipe cards: open, delete, export, import
├── css/style.css
├── js/
│   ├── scaler.js       # calculations, no DOM (also used by the tests)
│   ├── storage.js      # localStorage, JSON export and import
│   ├── i18n.js         # loading languages, translations, number formatting
│   ├── calculator.js   # calculator page
│   └── recipes.js      # "My recipe cards" page
├── lang/
│   ├── uk.js           # Ukrainian
│   └── en.js           # English
└── tests/
    └── scaler.test.js  # tests for js/scaler.js
```

## Formulas

| Value | Formula |
|---|---|
| Net weight | `gross * (1 - loss / 100)` |
| Loss from weighed net | `(1 - net / gross) * 100` |
| Factor for a target yield | `target yield / card yield` |
| Factor from a limiting ingredient | `amount available / amount in the card` (grams, or pieces for piece items) |
| Scaled gross weight | `gross * factor` |
| Pieces | `round(scaled gross / weight of one piece)`, 0.5 rounds up |

Loss is allowed from any negative value up to 100 %. Rice with a loss of -150 % gives net = gross * 2.5. A loss above 100 % would give a negative weight, so the app does not accept it.

## Run locally

The site is static, any local web server will do:

```bash
git clone https://github.com/patseluk-lang/recipe-scaler.git
cd recipe-scaler
python -m http.server 8000
```

Then open http://localhost:8000.

## Tests

Node.js 18 or newer:

```bash
node --test
```

## Adding a language

1. Copy `lang/en.js` to `lang/<code>.js` and translate the strings.
2. Add the code to the `LANGUAGES` list in `js/i18n.js`.

## Data

Recipe cards stay in the browser, there is no server and no account. Clearing the browser data deletes them, so keep an exported file as a backup.

## License

Copyright (c) 2026 Dmytro Patseliuk. All rights reserved. See [LICENSE](LICENSE).
