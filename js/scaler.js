/*
 * Recipe Scaler — calculation core.
 * Pure functions, no DOM access. Works in the browser (window.Scaler)
 * and in Node.js (module.exports) so it can be covered by tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Scaler = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Parses user input; accepts both "1,5" and "1.5". Returns NaN for empty input. */
  function parseNumber(value) {
    if (typeof value === 'number') return value;
    if (value === null || value === undefined) return NaN;
    const text = String(value).trim().replace(/\s+/g, '').replace(',', '.');
    if (text === '') return NaN;
    return Number(text);
  }

  /** Rounds to the nearest whole number; exactly .5 goes up (rule 0.5). */
  function roundHalfUp(value) {
    return Math.floor(value + 0.5 + 1e-9);
  }

  /** Net weight from gross weight and waste percentage. */
  function netFromGross(gross, wastePercent) {
    return gross * (1 - wastePercent / 100);
  }

  /** Gross weight of one item in grams. Piece items: count x weight of one piece. */
  function itemGross(item) {
    if (item.type === 'piece') return item.count * item.pieceWeight;
    return item.gross;
  }

  /** Base amount of an item in its own unit: grams for weight items, pieces for piece items. */
  function itemBaseAmount(item) {
    return item.type === 'piece' ? item.count : item.gross;
  }

  /** Coefficient for scaling to a target yield. */
  function factorByYield(baseYield, targetYield) {
    return targetYield / baseYield;
  }

  /** Coefficient from a limiting ingredient: the amount available divided by the amount in the card. */
  function factorByLimit(item, available) {
    return available / itemBaseAmount(item);
  }

  /** Checks a single item. Returns a list of error codes (empty list = valid). */
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
    if (!Number.isFinite(item.waste) || item.waste < 0 || item.waste >= 100) errors.push('waste');
    return errors;
  }

  /** Checks a whole card. Returns { ok, yield, items: [errors per item] }. */
  function validateCard(card) {
    const yieldOk = Number.isFinite(card.yield) && card.yield > 0;
    const items = card.items.map(validateItem);
    const ok = yieldOk && card.items.length > 0 && items.every((e) => e.length === 0);
    return { ok, yield: yieldOk, items };
  }

  /** Scales every item of a card by coefficient k. */
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

  /** Sums of gross and net weight over card items (count/pieceWeight/gross + waste). */
  function cardTotals(items) {
    return items.reduce(
      (acc, item) => {
        const gross = itemGross(item);
        acc.gross += gross;
        acc.net += netFromGross(gross, item.waste);
        return acc;
      },
      { gross: 0, net: 0 }
    );
  }

  /** Sums of gross and net weight over scaled items (already carry gross and net). */
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
    itemGross,
    itemBaseAmount,
    factorByYield,
    factorByLimit,
    validateItem,
    validateCard,
    scaleCard,
    cardTotals,
    resultTotals,
  };
});
