/**
 * 型錄 tag 篩選：點某個 tag 只顯示含該 tag 的卡片；再點一次同一個 tag 回到全部。
 */
export function mountTagFilter(doc) {
  const bar = doc.querySelector('[data-component="tag-filter"]');
  if (!bar) return null;
  const grid = doc.querySelector(bar.dataset.target);
  if (!grid) return null;

  const controller = new AbortController();
  let current = 'all';

  const apply = (tag) => {
    current = tag;
    bar.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === tag);
    });
    grid.querySelectorAll('.gallery-card').forEach((card) => {
      const tags = JSON.parse(card.dataset.tags || '[]');
      card.hidden = tag !== 'all' && !tags.includes(tag);
    });
  };

  bar.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('[data-filter]') : null;
    if (!btn) return;
    const tag = btn.dataset.filter;
    apply(tag === current && tag !== 'all' ? 'all' : tag);
  }, { signal: controller.signal });

  return () => controller.abort();
}
