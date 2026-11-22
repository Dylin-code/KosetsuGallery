/** 右下角回到最上方按鈕：捲動超過 300px 才出現。 */
export function mountToTop(doc) {
  const button = doc.querySelector('[data-component="to-top"]');
  if (!button) return null;

  const controller = new AbortController();
  const update = () => button.classList.toggle('show', window.scrollY > 300);

  update();
  window.addEventListener('scroll', update, { passive: true, signal: controller.signal });
  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, { signal: controller.signal });

  return () => controller.abort();
}
