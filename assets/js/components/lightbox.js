/**
 * 燈箱：放大檢視、左右切換、Esc／點背景關閉。
 * 開啟或切換時會發出 `kosetsu:lightbox-show` 事件（admin 用來掛編輯面板）。
 */
export class Lightbox {
  constructor(element) {
    this.el = element;
    this.img = element.querySelector('.lb-image');
    this.caption = element.querySelector('.lb-caption');
    this.items = [];
    this.index = 0;
    this.controller = new AbortController();

    const { signal } = this.controller;
    element.querySelector('.lb-close').addEventListener('click', () => this.close(), { signal });
    element.querySelector('.lb-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      this.step(-1);
    }, { signal });
    element.querySelector('.lb-next').addEventListener('click', (e) => {
      e.stopPropagation();
      this.step(1);
    }, { signal });
    element.addEventListener('click', (e) => {
      if (e.target === element) this.close();
    }, { signal });
    document.addEventListener('keydown', (e) => this.onKey(e), { signal });
  }

  get isOpen() {
    return this.el.classList.contains('open');
  }

  /** @param {{src: string, caption?: string, alt?: string, source?: Element}[]} items */
  open(items, index = 0) {
    if (!items.length) return;
    this.items = items;
    if (!this.isOpen) this.previousOverflow = document.body.style.overflow;
    this.show(index);
    this.el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (!this.isOpen) return;
    this.el.classList.remove('open');
    document.body.style.overflow = this.previousOverflow || '';
    this.el.dispatchEvent(new CustomEvent('kosetsu:lightbox-close', { bubbles: true }));
  }

  step(delta) {
    if (!this.items.length) return;
    this.show((this.index + delta + this.items.length) % this.items.length);
  }

  show(index) {
    this.index = index;
    const item = this.items[index];
    this.img.src = item.src;
    this.img.alt = item.alt || '';
    this.caption.textContent = item.caption || '';
    this.el.dispatchEvent(new CustomEvent('kosetsu:lightbox-show', {
      bubbles: true,
      detail: { item, index },
    }));
  }

  onKey(e) {
    if (!this.isOpen) return;
    if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]')) return;
    if (e.key === 'Escape') this.close();
    if (e.key === 'ArrowLeft') this.step(-1);
    if (e.key === 'ArrowRight') this.step(1);
  }

  destroy() {
    this.controller.abort();
    if (this.isOpen) {
      this.el.classList.remove('open');
      document.body.style.overflow = this.previousOverflow || '';
    }
  }
}
