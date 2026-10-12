/*
 * Recipe Scaler — saving recipe cards in the browser (localStorage)
 * and moving them between devices with a JSON file.
 */
(function () {
  'use strict';

  const KEY = 'recipe-scaler.cards.v1';
  const FILE_FORMAT = 'recipe-scaler';
  const FILE_VERSION = 1;

  function readAll() {
    try {
      const raw = localStorage.getItem(KEY);
      const cards = raw ? JSON.parse(raw) : [];
      return Array.isArray(cards) ? cards : [];
    } catch (e) {
      return [];
    }
  }

  /** Returns true when the cards were written, false when the browser refused. */
  function writeAll(cards) {
    try {
      localStorage.setItem(KEY, JSON.stringify(cards));
      return true;
    } catch (e) {
      return false;
    }
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function list() {
    return readAll().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  function get(id) {
    return readAll().find((card) => card.id === id) || null;
  }

  /** Inserts or replaces a card. Returns the saved card, or null when saving failed. */
  function save(card) {
    const cards = readAll();
    const saved = Object.assign({}, card, {
      id: card.id || newId(),
      updatedAt: new Date().toISOString(),
    });
    const index = cards.findIndex((c) => c.id === saved.id);
    if (index >= 0) cards[index] = saved;
    else cards.push(saved);
    return writeAll(cards) ? saved : null;
  }

  function remove(id) {
    return writeAll(readAll().filter((card) => card.id !== id));
  }

  /** Brings a card from a file to the expected shape; returns null if it is not a recipe card. */
  function normalize(card) {
    if (!card || typeof card !== 'object' || !Array.isArray(card.items)) return null;
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);
    const items = card.items.map((item) => {
      const piece = item && item.type === 'piece';
      const base = {
        name: String((item && item.name) || ''),
        type: piece ? 'piece' : 'weight',
        waste: num(item && item.waste),
      };
      if (piece) {
        base.count = num(item.count);
        base.pieceWeight = num(item.pieceWeight);
      } else {
        base.gross = num(item && item.gross);
      }
      return base;
    });
    return {
      id: typeof card.id === 'string' && card.id ? card.id : newId(),
      name: String(card.name || ''),
      yield: num(card.yield),
      items,
      updatedAt: typeof card.updatedAt === 'string' ? card.updatedAt : new Date().toISOString(),
    };
  }

  /** Downloads all saved cards as one JSON file. */
  function exportFile() {
    const data = {
      format: FILE_FORMAT,
      version: FILE_VERSION,
      exportedAt: new Date().toISOString(),
      cards: readAll(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recipe-scaler-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Reads cards from a file chosen by the user. Cards with the same id are replaced,
   * new ones are added. Resolves with the number of imported cards; rejects on a bad file.
   */
  function importFile(file) {
    return file.text().then((text) => {
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('format');
      }
      const incoming = Array.isArray(data) ? data : data && data.cards;
      if (!Array.isArray(incoming)) throw new Error('format');
      const cards = incoming.map(normalize).filter(Boolean);
      if (cards.length === 0) throw new Error('empty');
      const existing = readAll();
      cards.forEach((card) => {
        const index = existing.findIndex((c) => c.id === card.id);
        if (index >= 0) existing[index] = card;
        else existing.push(card);
      });
      if (!writeAll(existing)) throw new Error('storage');
      return cards.length;
    });
  }

  window.CardStore = { list, get, save, remove, exportFile, importFile };
})();
