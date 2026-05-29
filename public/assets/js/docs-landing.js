const search = document.querySelector('#endpoint-search');
    const cards = [...document.querySelectorAll('.endpoint-card')];
    search.addEventListener('input', () => {
      const term = search.value.trim().toLowerCase();
      cards.forEach((card) => {
        card.hidden = term && ![card.dataset.method, card.dataset.path, card.dataset.summary].join(' ').includes(term);
      });
    });
    document.querySelector('#expand-all').addEventListener('click', () => cards.forEach((card) => { if (!card.hidden) card.open = true; }));
    document.querySelector('#collapse-all').addEventListener('click', () => cards.forEach((card) => { card.open = false; }));
    document.querySelectorAll('.copy-button').forEach((button) => button.addEventListener('click', async (event) => {
      event.preventDefault();
      await navigator.clipboard.writeText(button.dataset.copy);
      const old = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = old; }, 1200);
    }));
