// Calculator page. Inputs are kept as the text the user typed and parsed
// on every change, so "0," in the middle of typing is not lost.
(function () {
  'use strict';

  const S = window.Scaler;
  const $ = (id) => document.getElementById(id);

  const els = {
    name: $('card-name'),
    yield: $('card-yield'),
    body: $('items-body'),
    totalGross: $('total-gross'),
    totalNet: $('total-net'),
    addItem: $('add-item'),
    newCard: $('new-card'),
    saveCard: $('save-card'),
    saveStatus: $('save-status'),
    loadMessage: $('load-message'),
    modeYield: $('mode-yield'),
    modeLimit: $('mode-limit'),
    target: $('target-yield'),
    limitItem: $('limit-item'),
    limitAmount: $('limit-amount'),
    limitAmountLabel: $('limit-amount-label'),
    factorBox: $('factor-box'),
    factorValue: $('factor-value'),
    newYield: $('new-yield'),
    waiting: $('result-waiting'),
    resultWrap: $('result-wrap'),
    resultBody: $('result-body'),
    resultGross: $('result-gross'),
    resultNet: $('result-net'),
  };

  let state = emptyState();

  function emptyRow() {
    // driver: which of the two linked fields the chef typed last, loss % or net weight.
    // The other one is calculated from it.
    return { name: '', type: 'weight', gross: '', count: '', pieceWeight: '', waste: '0', net: '', driver: 'waste' };
  }

  function emptyState() {
    return { id: null, name: '', yield: '', rows: [emptyRow(), emptyRow(), emptyRow()] };
  }

  // 1.5 -> "1,5" for the Ukrainian interface
  function toText(value, digits) {
    if (!Number.isFinite(value)) return '';
    const factor = Math.pow(10, digits === undefined ? 3 : digits);
    const text = String(Math.round(value * factor) / factor);
    return I18n.lang === 'uk' ? text.replace('.', ',') : text;
  }

  function stateFromCard(card) {
    return {
      id: card.id,
      name: card.name,
      yield: toText(card.yield),
      rows: card.items.map((item) => ({
        name: item.name,
        type: item.type === 'piece' ? 'piece' : 'weight',
        gross: toText(item.gross),
        count: toText(item.count),
        pieceWeight: toText(item.pieceWeight),
        waste: toText(item.waste),
        net: Number.isFinite(item.net) ? toText(item.net) : '',
        driver: Number.isFinite(item.net) ? 'net' : 'waste',
      })),
    };
  }

  function itemFromRow(row) {
    const item = { name: row.name.trim(), type: row.type };
    if (row.type === 'piece') {
      item.count = S.parseNumber(row.count);
      item.pieceWeight = S.parseNumber(row.pieceWeight);
    } else {
      item.gross = S.parseNumber(row.gross);
    }
    if (row.driver === 'net') {
      // keep the weighed net as typed, so it comes back unchanged after saving
      item.net = S.parseNumber(row.net);
      item.waste = S.lossFromNet(S.itemGross(item), item.net);
    } else {
      item.waste = row.waste.trim() === '' ? 0 : S.parseNumber(row.waste);
    }
    return item;
  }

  // empty rows are skipped, not reported as errors
  function isBlank(row) {
    return !row.name.trim() && !row.gross.trim() && !row.count.trim() && !row.pieceWeight.trim() && !row.net.trim();
  }

  function currentCard() {
    const used = state.rows
      .map((row, index) => ({ row, index }))
      .filter((entry) => !isBlank(entry.row));
    return {
      card: {
        id: state.id,
        name: state.name.trim(),
        yield: S.parseNumber(state.yield),
        items: used.map((entry) => itemFromRow(entry.row)),
      },
      rowIndexes: used.map((entry) => entry.index),
    };
  }

  function input(field, value, labelKey, extraClass) {
    const el = document.createElement('input');
    el.type = 'text';
    el.autocomplete = 'off';
    el.value = value;
    el.dataset.field = field;
    if (field !== 'name') el.inputMode = 'decimal';
    if (labelKey) el.setAttribute('aria-label', I18n.t(labelKey));
    if (extraClass) el.className = extraClass;
    return el;
  }

  function unit(key) {
    const span = document.createElement('span');
    span.className = 'unit';
    span.textContent = I18n.t(key);
    return span;
  }

  function renderRow(row, index) {
    const tr = document.createElement('tr');
    tr.dataset.index = index;

    const nameCell = document.createElement('td');
    nameCell.appendChild(input('name', row.name, 'col.name', 'input-name'));

    const typeCell = document.createElement('td');
    const select = document.createElement('select');
    select.dataset.field = 'type';
    select.setAttribute('aria-label', I18n.t('col.type'));
    ['weight', 'piece'].forEach((type) => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = I18n.t('type.' + type);
      select.appendChild(option);
    });
    select.value = row.type;
    typeCell.appendChild(select);

    const amountCell = document.createElement('td');
    const amount = document.createElement('div');
    amount.className = 'amount';
    if (row.type === 'piece') {
      amount.append(
        input('count', row.count, 'amount.count', 'input-num input-short'),
        unit('unit.pcs'),
        document.createTextNode('\u00d7'),
        input('pieceWeight', row.pieceWeight, 'amount.pieceWeight', 'input-num input-short'),
        unit('unit.gPerPc')
      );
    } else {
      amount.append(input('gross', row.gross, 'amount.gross', 'input-num'), unit('unit.g'));
    }
    amountCell.appendChild(amount);

    const wasteCell = document.createElement('td');
    wasteCell.className = 'num';
    wasteCell.appendChild(input('waste', row.waste, 'col.waste', 'input-num input-short'));

    const grossCell = document.createElement('td');
    grossCell.className = 'num computed';
    grossCell.dataset.out = 'gross';

    const netCell = document.createElement('td');
    netCell.className = 'num';
    netCell.appendChild(input('net', row.net, 'col.net', 'input-num'));

    const removeCell = document.createElement('td');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-button';
    remove.dataset.action = 'remove';
    remove.setAttribute('aria-label', I18n.t('calc.removeItem'));
    remove.title = I18n.t('calc.removeItem');
    remove.textContent = '\u00d7';
    removeCell.appendChild(remove);

    tr.append(nameCell, typeCell, amountCell, grossCell, wasteCell, netCell, removeCell);
    return tr;
  }

  function renderRows() {
    els.body.innerHTML = '';
    state.rows.forEach((row, index) => els.body.appendChild(renderRow(row, index)));
  }

  function renderAll() {
    els.name.value = state.name;
    els.yield.value = state.yield;
    renderRows();
    update();
  }

  function fmt(value) {
    return I18n.formatNumber(value, 1);
  }

  function updateRowOutputs() {
    let totalGross = 0;
    let totalNet = 0;
    let anyValid = false;
    state.rows.forEach((row, index) => {
      const tr = els.body.querySelector('tr[data-index="' + index + '"]');
      if (!tr) return;
      const item = itemFromRow(row);
      const errors = S.validateItem(Object.assign({}, item, { name: item.name || '-' }));
      const grossOut = tr.querySelector('[data-out="gross"]');
      const gross = S.itemGross(item);
      // fill in the field the chef did not type: net from loss %, or loss % from net
      if (row.driver === 'net') {
        row.waste = toText(item.waste, 2);
        tr.querySelector('[data-field="waste"]').value = row.waste;
      } else {
        row.net = gross > 0 && Number.isFinite(item.waste) ? toText(S.netFromGross(gross, item.waste)) : '';
        tr.querySelector('[data-field="net"]').value = row.net;
      }
      if (errors.length === 0) {
        const net = S.netFromGross(gross, item.waste);
        grossOut.textContent = fmt(gross);
        totalGross += gross;
        totalNet += net;
        anyValid = true;
      } else {
        grossOut.textContent = '-';
      }
    });
    els.totalGross.textContent = anyValid ? fmt(totalGross) : '-';
    els.totalNet.textContent = anyValid ? fmt(totalNet) : '-';
  }

  function updateLimitOptions() {
    const previous = els.limitItem.value;
    els.limitItem.innerHTML = '';
    state.rows.forEach((row, index) => {
      if (isBlank(row)) return;
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = row.name.trim() || I18n.t('calc.unnamedItem', { n: index + 1 });
      els.limitItem.appendChild(option);
    });
    if ([...els.limitItem.options].some((o) => o.value === previous)) {
      els.limitItem.value = previous;
    }
    const row = state.rows[Number(els.limitItem.value)];
    const unitKey = row && row.type === 'piece' ? 'unit.pcs' : 'unit.g';
    els.limitAmountLabel.textContent = I18n.t('calc.limitAmount', { unit: I18n.t(unitKey) });
  }

  function mode() {
    return document.querySelector('input[name="mode"]:checked').value;
  }

  function computeFactor(card, rowIndexes) {
    if (mode() === 'yield') {
      const target = S.parseNumber(els.target.value);
      return target > 0 ? S.factorByYield(card.yield, target) : NaN;
    }
    const rowIndex = Number(els.limitItem.value);
    const position = rowIndexes.indexOf(rowIndex);
    const available = S.parseNumber(els.limitAmount.value);
    if (position < 0 || !(available > 0)) return NaN;
    return S.factorByLimit(card.items[position], available);
  }

  function updateResult() {
    const { card, rowIndexes } = currentCard();
    const check = S.validateCard(card);
    const k = check.ok ? computeFactor(card, rowIndexes) : NaN;

    if (!Number.isFinite(k) || k <= 0) {
      els.factorBox.hidden = true;
      els.resultWrap.hidden = true;
      els.waiting.hidden = false;
      return;
    }

    const scaled = S.scaleCard(card, k);
    els.resultBody.innerHTML = '';
    scaled.items.forEach((item) => {
      const tr = document.createElement('tr');
      const cells = [
        item.name,
        fmt(item.gross),
        fmt(item.net),
        item.type === 'piece' ? String(item.pieces) : '',
      ];
      cells.forEach((text, i) => {
        const cell = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) cell.scope = 'row';
        else cell.className = 'num';
        cell.textContent = text;
        tr.appendChild(cell);
      });
      els.resultBody.appendChild(tr);
    });
    const sums = S.resultTotals(scaled.items);
    els.resultGross.textContent = fmt(sums.gross);
    els.resultNet.textContent = fmt(sums.net);

    els.factorValue.textContent = '\u00d7 ' + I18n.formatNumber(k, 3);
    els.newYield.textContent = I18n.t('calc.newYield', { value: fmt(scaled.yield) });
    els.factorBox.hidden = false;
    els.resultWrap.hidden = false;
    els.waiting.hidden = true;
  }

  function update() {
    updateRowOutputs();
    updateLimitOptions();
    updateResult();
  }

  function markErrors() {
    const { card, rowIndexes } = currentCard();
    const check = S.validateCard(card);
    els.yield.setAttribute('aria-invalid', String(!check.yield));
    els.body.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    check.items.forEach((errors, position) => {
      const tr = els.body.querySelector('tr[data-index="' + rowIndexes[position] + '"]');
      const row = state.rows[rowIndexes[position]];
      errors.forEach((error) => {
        const field = error === 'waste' && row.driver === 'net' ? 'net' : error;
        const el = tr && tr.querySelector('[data-field="' + field + '"]');
        if (el) el.setAttribute('aria-invalid', 'true');
      });
    });
    if (card.items.length === 0) {
      const first = els.body.querySelector('[data-field="name"]');
      if (first) first.setAttribute('aria-invalid', 'true');
    }
    return check.ok;
  }

  function setStatus(text, isError) {
    els.saveStatus.textContent = text;
    els.saveStatus.classList.toggle('status-error', Boolean(isError));
  }

  function save() {
    if (!markErrors()) {
      setStatus(I18n.t('calc.fixErrors'), true);
      const firstBad = document.querySelector('[aria-invalid="true"]');
      if (firstBad) firstBad.focus();
      return;
    }
    const { card } = currentCard();
    const saved = CardStore.save(card);
    if (!saved) {
      setStatus(I18n.t('calc.saveError'), true);
      return;
    }
    state.id = saved.id;
    history.replaceState(null, '', '?id=' + encodeURIComponent(saved.id));
    const time = new Intl.DateTimeFormat(document.documentElement.lang, { timeStyle: 'short' }).format(new Date());
    setStatus(I18n.t('calc.saved', { time }), false);
  }

  function onRowEvent(event) {
    const el = event.target;
    const tr = el.closest('tr[data-index]');
    if (!tr || !el.dataset.field) return;
    const row = state.rows[Number(tr.dataset.index)];
    row[el.dataset.field] = el.value;
    if (el.dataset.field === 'net' || el.dataset.field === 'waste') {
      row.driver = el.dataset.field;
      tr.querySelectorAll('[data-field="net"], [data-field="waste"]').forEach((f) => f.removeAttribute('aria-invalid'));
    }
    el.removeAttribute('aria-invalid');
    if (el.dataset.field === 'type') {
      const fresh = renderRow(row, Number(tr.dataset.index));
      tr.replaceWith(fresh);
      const focusTarget = fresh.querySelector('[data-field="type"]');
      if (focusTarget) focusTarget.focus();
    }
    setStatus('', false);
    update();
  }

  els.body.addEventListener('input', onRowEvent);
  els.body.addEventListener('change', (event) => {
    if (event.target.dataset.field === 'type') onRowEvent(event);
  });

  els.body.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="remove"]');
    if (!button) return;
    const index = Number(button.closest('tr').dataset.index);
    state.rows.splice(index, 1);
    if (state.rows.length === 0) state.rows.push(emptyRow());
    renderRows();
    update();
    const rows = els.body.querySelectorAll('tr');
    const next = rows[Math.min(index, rows.length - 1)];
    if (next) next.querySelector('[data-action="remove"]').focus();
  });

  els.addItem.addEventListener('click', () => {
    state.rows.push(emptyRow());
    const tr = renderRow(state.rows[state.rows.length - 1], state.rows.length - 1);
    els.body.appendChild(tr);
    tr.querySelector('[data-field="name"]').focus();
    update();
  });

  els.name.addEventListener('input', () => {
    state.name = els.name.value;
    setStatus('', false);
  });
  els.yield.addEventListener('input', () => {
    state.yield = els.yield.value;
    els.yield.removeAttribute('aria-invalid');
    setStatus('', false);
    update();
  });

  els.saveCard.addEventListener('click', save);

  els.newCard.addEventListener('click', () => {
    state = emptyState();
    history.replaceState(null, '', location.pathname);
    els.target.value = '';
    els.limitAmount.value = '';
    els.loadMessage.hidden = true;
    els.yield.removeAttribute('aria-invalid');
    setStatus('', false);
    renderAll();
    els.name.focus();
  });

  document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const limit = mode() === 'limit';
      els.modeLimit.hidden = !limit;
      els.modeYield.hidden = limit;
      update();
    });
  });
  els.target.addEventListener('input', update);
  els.limitAmount.addEventListener('input', update);
  els.limitItem.addEventListener('change', update);

  function retype(text) {
    const value = S.parseNumber(text);
    return Number.isFinite(value) ? toText(value) : text;
  }

  document.addEventListener('langchange', () => {
    // decimal comma in Ukrainian, dot in English
    state.yield = retype(state.yield);
    els.yield.value = state.yield;
    state.rows.forEach((row) => {
      ['gross', 'count', 'pieceWeight', 'waste', 'net'].forEach((field) => {
        row[field] = retype(row[field]);
      });
    });
    renderRows();
    update();
  });

  I18n.ready.then(() => {
    const id = new URLSearchParams(location.search).get('id');
    if (id) {
      const card = CardStore.get(id);
      if (card) {
        state = stateFromCard(card);
      } else {
        els.loadMessage.setAttribute('data-i18n', 'calc.notFound');
        els.loadMessage.textContent = I18n.t('calc.notFound');
        els.loadMessage.hidden = false;
        history.replaceState(null, '', location.pathname);
      }
    }
    renderAll();
  });
})();
