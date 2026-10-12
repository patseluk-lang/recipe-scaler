// Run from the project folder with: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/scaler.js');

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

const card = {
  name: 'Syrnyky',
  yield: 1150,
  items: [
    { name: 'Cottage cheese', type: 'weight', gross: 1000, waste: 0 },
    { name: 'Flour', type: 'weight', gross: 120, waste: 0 },
    { name: 'Sugar', type: 'weight', gross: 80, waste: 0 },
    { name: 'Egg', type: 'piece', count: 3, pieceWeight: 50, waste: 12 },
  ],
};

test('parseNumber accepts comma and dot, empty is NaN', () => {
  assert.equal(S.parseNumber('1,5'), 1.5);
  assert.equal(S.parseNumber(' 2.25 '), 2.25);
  assert.ok(Number.isNaN(S.parseNumber('')));
  assert.ok(Number.isNaN(S.parseNumber('abc')));
});

test('roundHalfUp: exactly 0.5 goes up', () => {
  assert.equal(S.roundHalfUp(2.5), 3);
  assert.equal(S.roundHalfUp(2.49), 2);
  assert.equal(S.roundHalfUp(2.16), 2);
  assert.equal(S.roundHalfUp(0.5), 1);
  assert.equal(S.roundHalfUp(3 * 0.5), 2); // 1.5
});

test('net weight from gross and waste', () => {
  close(S.netFromGross(1000, 25), 750);
  close(S.netFromGross(150, 12), 132);
});

test('negative loss: cereals absorb water and gain weight', () => {
  close(S.netFromGross(0.158, -150), 0.395); // rice
  assert.deepEqual(S.validateItem({ name: 'Rice', type: 'weight', gross: 0.158, waste: -150 }), []);
});

test('scaling to a target yield', () => {
  const k = S.factorByYield(card.yield, 828);
  close(k, 0.72);
  const r = S.scaleCard(card, k);
  close(r.yield, 828);
  close(r.items[0].gross, 720);
  close(r.items[1].gross, 86.4);
  close(r.items[2].gross, 57.6);
  close(r.items[3].gross, 108); // 3 eggs x 50 g x 0.72
  close(r.items[3].net, 95.04);
  assert.equal(r.items[3].pieces, 2); // 2.16 -> 2
});

test('scaling from a limiting ingredient by weight', () => {
  const k = S.factorByLimit(card.items[0], 650);
  close(k, 0.65);
  const r = S.scaleCard(card, k);
  close(r.items[0].gross, 650);
  close(r.yield, 747.5);
});

test('scaling from a limiting ingredient counted in pieces', () => {
  const k = S.factorByLimit(card.items[3], 5);
  const r = S.scaleCard(card, k);
  assert.equal(r.items[3].pieces, 5);
  close(r.items[0].gross, 1000 * 5 / 3);
});

test('half a piece rounds up after scaling', () => {
  const r = S.scaleCard(card, 0.5); // 1.5 eggs
  assert.equal(r.items[3].pieces, 2);
});

test('100 % loss: the item is removed after cooking (bay leaf, bones)', () => {
  close(S.netFromGross(2, 100), 0);
  assert.deepEqual(S.validateItem({ name: 'Bay leaf', type: 'weight', gross: 2, waste: 100 }), []);
  const r = S.scaleCard({ yield: 1000, items: [{ name: 'Bones', type: 'weight', gross: 500, waste: 100 }] }, 2);
  close(r.items[0].gross, 1000);
  close(r.items[0].net, 0);
});

test('validation catches missing and impossible values', () => {
  assert.deepEqual(S.validateItem({ name: 'Milk', type: 'weight', gross: 100, waste: 0 }), []);
  assert.deepEqual(S.validateItem({ name: '', type: 'weight', gross: 0, waste: 150 }), ['name', 'gross', 'waste']);
  assert.deepEqual(S.validateItem({ name: 'Egg', type: 'piece', count: NaN, pieceWeight: 50, waste: 0 }), ['count']);
  assert.equal(S.validateCard(card).ok, true);
  assert.equal(S.validateCard({ yield: 0, items: card.items }).ok, false);
  assert.equal(S.validateCard({ yield: 100, items: [] }).ok, false);
});

test('totals of a card and of a scaled result', () => {
  const t = S.cardTotals(card.items);
  close(t.gross, 1350);
  close(t.net, 1200 + 132);
  const r = S.scaleCard(card, 0.72);
  const rt = S.resultTotals(r.items);
  close(rt.gross, 1350 * 0.72);
});
