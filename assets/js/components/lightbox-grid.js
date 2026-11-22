/**
 * 點擊任何 [data-lightbox-grid] 裡的卡片就開燈箱（事件委派，彈窗裡動態放入的格子也有效）。
 * 只會把目前看得到的卡片（未被篩選隱藏）放進燈箱。
 */
export function mountLightboxGrids(doc, { lightbox }) {
  if (!lightbox) return null;
  const controller = new AbortController();

  const openFrom = (card) => {
    const grid = card.closest('[data-lightbox-grid]');
    const cards = [...grid.querySelectorAll('.gallery-card')].filter((c) => !c.hidden);
    const items = cards.map((c) => ({
      src: c.dataset.full,
      caption: c.dataset.caption || '',
      alt: c.querySelector('img')?.alt || '',
      source: c,
    }));
    lightbox.open(items, Math.max(cards.indexOf(card), 0));
  };

  const findCard = (target) =>
    target instanceof Element ? target.closest('[data-lightbox-grid] .gallery-card') : null;

  doc.addEventListener('click', (e) => {
    const card = findCard(e.target);
    if (card) openFrom(card);
  }, { signal: controller.signal });

  doc.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = findCard(e.target);
    if (card && e.target === card) {
      e.preventDefault();
      openFrom(card);
    }
  }, { signal: controller.signal });

  return () => controller.abort();
}
