/** 舊版網址相容：gallery.html?category=hanfu → /gallery/hanfu.html */
export function redirectLegacyGalleryUrl(doc) {
  if (doc.body.dataset.page !== 'gallery') return;
  const category = new URLSearchParams(window.location.search).get('category');
  if (!category || !/^[a-z0-9-]+$/.test(category)) return;
  const target = doc.querySelector(`.category-card[href$="/${category}.html"]`);
  if (target) window.location.replace(target.getAttribute('href'));
}
