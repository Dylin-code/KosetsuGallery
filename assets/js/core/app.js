import { Lightbox } from '../components/lightbox.js';
import { mountLightboxGrids } from '../components/lightbox-grid.js';
import { mountTagFilter } from '../components/tag-filter.js';
import { mountPlanModal } from '../components/plan-modal.js';
import { mountToTop } from '../components/to-top.js';
import { redirectLegacyGalleryUrl } from '../components/legacy-urls.js';

/**
 * 每個元件都是 mount(root, deps) → cleanup 的函式；
 * unmount 會清掉所有事件監聽，讓局部重新整理後可以安全地重新掛載。
 */
export function createApp(doc) {
  let cleanups = [];
  let lightbox = null;

  return {
    get lightbox() {
      return lightbox;
    },

    mount() {
      this.unmount();
      redirectLegacyGalleryUrl(doc);

      const lightboxEl = doc.getElementById('lightbox');
      lightbox = lightboxEl ? new Lightbox(lightboxEl) : null;
      if (lightbox) cleanups.push(() => lightbox.destroy());

      const deps = { doc, lightbox };
      cleanups.push(
        mountLightboxGrids(doc, deps),
        mountTagFilter(doc, deps),
        mountPlanModal(doc, deps),
        mountToTop(doc, deps),
      );
    },

    unmount() {
      cleanups.forEach((cleanup) => cleanup && cleanup());
      cleanups = [];
      lightbox = null;
    },
  };
}
