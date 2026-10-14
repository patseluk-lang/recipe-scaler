// Calculation core. No DOM here, so the same file runs in the browser
// (window.Scaler) and in Node for the tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Scaler = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // "1,5" and "1.5" both work; empty input gives NaN.
  // \u2212 is the minus sign that comes with text pasted from Word or a spreadsheet.
  function parseNumber(value) {
    if (typeof value === 'number') return value;
    if (value === null || value === undefined) return NaN;
    const text = String(value).trim().replace(/\s+/g, '').replace(',', '.').replace('\u2212', '-');
    if (text === '') return NaN;
    return Number(text);
  }

  // 2.5 -> 3, 2.49 -> 2. The small epsilon protects against 2.4999999 from float maths.
  function roundHalfUp(value) {
    return Math.floor(value + 0.5 + 1e-9);
  }

  function netFromGross(gross, wastePercent) {
    return gross * (1 - wastePercent / 100);
  }

  // Loss % from weighed gross and net: 158 g -> 118.5 g gives 25 %.
  function lossFromNet(gross, net) {
    if (!(gross > 0) || !Number.isFinite(net)) return NaN;
    return (1 - net / gross) * 100;
  }

  function itemGross(item) {
    if (item.type === 'piece') return item.count * item.pieceWeight;
    return item.gross;
  }

  // grams for weight items, pieces for piece items
  function itemBaseAmount(item) {
    return item.type === 'piece' ? item.count : item.gross;
  }

  function factorByYield(baseYield, targetYield) {
    return targetYield / baseYield;
  }

  function factorByLimit(item, available) {
    return available / itemBaseAmount(item);
  }

  // Returns the names of the wrong fields, empty array if the item is fine.
  function validateItem(item) {
    const errors = [];
    const positive = (n) => Number.isFinite(n) && n > 0;
    if (!item.name || !String(item.name).trim()) errors.push('name');
    if (item.type === 'piece') {
      if (!positive(item.count)) errors.push('count');
      if (!positive(item.pieceWeight)) errors.push('pieceWeight');
    } else if (!positive(item.gross)) {
      errors.push('gross');
    }
    // Losses may be negative: cereals absorb water and gain weight (rice -150 % -> net = gross x 2.5).
    // 100 % is allowed: the item goes into the pot and is removed (bay leaf, bones), net = 0.
    if (!Number.isFinite(item.waste) || item.waste > 100) errors.push('waste');
    return errors;
  }

  function validateCard(card) {
    const yieldOk = Number.isFinite(card.yield) && card.yield > 0;
    const items = card.items.map(validateItem);
    const ok = yieldOk && card.items.length > 0 && items.every((e) => e.length === 0);
    return { ok, yield: yieldOk, items };
  }

  function scaleCard(card, k) {
    return {
      k,
      yield: card.yield * k,
      items: card.items.map((item) => {
        const gross = itemGross(item) * k;
        const result = {
          name: item.name,
          type: item.type,
          gross,
          net: netFromGross(gross, item.waste),
        };
        if (item.type === 'piece') {
          result.pieces = roundHalfUp(gross / item.pieceWeight);
        }
        return result;
      }),
    };
  }

  function resultTotals(items) {
    return items.reduce(
      (acc, item) => {
        acc.gross += item.gross;
        acc.net += item.net;
        return acc;
      },
      { gross: 0, net: 0 }
    );
  }

  return {
    parseNumber,
    roundHalfUp,
    netFromGross,
    lossFromNet,
    itemGross,
    itemBaseAmount,
    factorByYield,
    factorByLimit,
    validateItem,
    validateCard,
    scaleCard,
    resultTotals,
  };
});
