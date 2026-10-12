/*
 * Recipe Scaler — "My recipe cards" page: list, open, delete, export, import.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const els = {
    list: $('cards-list'),
    empty: $('cards-empty'),
    status: $('cards-status'),
    exportButton: $('export-cards'),
    importFile: $('import-file'),
  };

  function setStatus(text, isError) {
    els.status.textContent = text;
    els.status.classList.toggle('status-error', Boolean(isError));
  }

  function render() {
    const cards = CardStore.list();
    els.list.innerHTML = '';
    els.empty.hidden = cards.length > 0;
    els.exportButton.disabled = cards.length === 0;

    cards.forEach((card) => {
      const name = card.name || I18n.t('cards.untitled');
      const li = document.createElement('li');
      li.className = 'card-item';

      const info = document.createElement('div');
      const title = document.createElement('h2');
      title.className = 'card-title';
      const link = document.createElement('a');
      link.href = 'calculator.html?id=' + encodeURIComponent(card.id);
      link.textContent = name;
      title.appendChild(link);

      const meta = document.createElement('p');
      meta.className = 'card-meta';
      meta.textContent = I18n.t('cards.meta', {
        yield: I18n.formatNumber(card.yield, 1),
        count: card.items.length,
      });

      const updated = document.createElement('p');
      updated.className = 'card-meta muted';
      updated.textContent = I18n.t('cards.updated', { date: I18n.formatDate(card.updatedAt) });

      info.append(title, meta, updated);

      const actions = document.createElement('div');
      actions.className = 'card-actions';
      const open = document.createElement('a');
      open.className = 'button';
      open.href = link.href;
      open.textContent = I18n.t('cards.open');
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button button-danger';
      remove.textContent = I18n.t('cards.delete');
      remove.addEventListener('click', () => {
        if (!window.confirm(I18n.t('cards.confirmDelete', { name }))) return;
        CardStore.remove(card.id);
        render();
        setStatus(I18n.t('cards.deleted', { name }), false);
      });
      actions.append(open, remove);

      li.append(info, actions);
      els.list.appendChild(li);
    });
  }

  els.exportButton.addEventListener('click', () => {
    CardStore.exportFile();
  });

  els.importFile.addEventListener('change', () => {
    const file = els.importFile.files[0];
    if (!file) return;
    CardStore.importFile(file)
      .then((count) => {
        render();
        setStatus(I18n.t('cards.imported', { count }), false);
      })
      .catch((error) => {
        const key = {
          empty: 'cards.importEmpty',
          storage: 'cards.importStorage',
        }[error.message] || 'cards.importFormat';
        setStatus(I18n.t(key), true);
      })
      .finally(() => {
        els.importFile.value = '';
      });
  });

  document.addEventListener('langchange', () => {
    render();
    setStatus('', false);
  });

  I18n.ready.then(render);
})();
