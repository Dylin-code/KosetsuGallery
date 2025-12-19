import { SITE_VERSION } from './version.js';

function appendVersion(url) {
  if (!url) return url;
  const s = String(url);
  if (s.includes('?')) return s;
  return `${s}?v=${SITE_VERSION}`;
}

function versionStylesheets() {
  document.querySelectorAll('link[rel="stylesheet"][href]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!href.includes('css/style.css')) return;
    link.setAttribute('href', appendVersion(href));
  });
}

async function boot() {
  versionStylesheets();

  // Nav/Footer
  await import(`./main.js?v=${SITE_VERSION}`);

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const isPlanPage = window.location.pathname.includes('/plans/') && currentPath === 'index.html';

  if (currentPath === 'gallery.html') {
    await import(`./gallery.js?v=${SITE_VERSION}`);
  } else if (currentPath === 'services.html') {
    await import(`./services-showcase.js?v=${SITE_VERSION}`);
  } else if (isPlanPage) {
    const parts = window.location.pathname.split('/');
    const planKey = parts[parts.length - 2];
    const [dataModule, showcaseModule] = await Promise.all([
      import(`../plans/${planKey}/data.js?v=${SITE_VERSION}`),
      import(`./showcase.js?v=${SITE_VERSION}`)
    ]);
    showcaseModule.initShowcase({
      images: dataModule.IMAGES,
      title: dataModule.TITLE,
      subtitle: dataModule.SUBTITLE,
      backHref: '../../services.html'
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  boot().catch(() => {
    // no-op: allow page to render even if dynamic imports fail
  });
});

