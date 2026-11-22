/**
 * 服務方案：點方案卡片在彈窗裡顯示成品展示集（內容來自卡片內的 <template>），不換頁。
 * Esc：燈箱開著時先關燈箱，否則關彈窗。
 */
export function mountPlanModal(doc, { lightbox }) {
  const modal = doc.querySelector('[data-component="plan-modal"]');
  if (!modal) return null;

  const controller = new AbortController();
  const { signal } = controller;
  const title = modal.querySelector('#planModalTitle');
  const subtitle = modal.querySelector('#planModalSubtitle');
  const body = modal.querySelector('.plan-modal-body');

  const open = (template) => {
    title.textContent = template.dataset.title || '成品展示';
    subtitle.textContent = template.dataset.subtitle || '';
    body.replaceChildren(template.content.cloneNode(true));
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    doc.body.style.overflow = 'hidden';
  };

  const close = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    doc.body.style.overflow = '';
    lightbox?.close();
  };

  doc.addEventListener('click', (e) => {
    const link = e.target instanceof Element ? e.target.closest('a[data-plan]') : null;
    if (!link) return;
    const template = link.closest('.plan-card')?.querySelector('template.plan-showcase');
    if (!template) return;
    e.preventDefault();
    open(template);
  }, { signal });

  modal.querySelector('.plan-modal-close').addEventListener('click', close, { signal });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  }, { signal });
  doc.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !modal.classList.contains('open')) return;
    if (lightbox?.isOpen) return;
    close();
  }, { signal });

  return () => {
    controller.abort();
    if (modal.classList.contains('open')) close();
  };
}
