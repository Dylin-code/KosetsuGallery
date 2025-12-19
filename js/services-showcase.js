import { SITE_VERSION } from './version.js';

const PLAN_DATA = {
  'hanfu-classic': {
    dataPath: 'plans/hanfu-classic/data.js'
  },
  'couple-kimono': {
    dataPath: 'plans/couple-kimono/data.js'
  },
  'han-wedding': {
    dataPath: 'plans/han-wedding/data.js'
  },
  'studio-kimono': {
    dataPath: 'plans/studio-kimono/data.js'
  }
};

const modal = document.getElementById('planModal');
const modalClose = document.getElementById('planModalClose');
const modalTitle = document.getElementById('planModalTitle');
const modalSubtitle = document.getElementById('planModalSubtitle');
const grid = document.getElementById('planShowcaseGrid');
const empty = document.getElementById('planShowcaseEmpty');

const lightbox = document.getElementById('lightbox');
const lbImg = lightbox.querySelector('img');
const lbCaption = lightbox.querySelector('.lb-caption');

let orderedImages = [];
let currentIndex = 0;

function sortImagesByOrder(images) {
  return images
    .map((img, originalIndex) => ({ img, originalIndex }))
    .sort((a, b) => {
      const orderA = Number(a.img?.order);
      const orderB = Number(b.img?.order);
      const hasA = Number.isFinite(orderA);
      const hasB = Number.isFinite(orderB);

      if (hasA && hasB && orderA !== orderB) return orderA - orderB;
      if (hasA !== hasB) return hasA ? -1 : 1;
      return a.originalIndex - b.originalIndex;
    })
    .map((x) => x.img);
}

function resolveAssetPath(path, baseDir) {
  if (!path) return '';
  const value = String(path);
  if (/^(https?:)?\/\//.test(value) || value.startsWith('/')) return value;
  if (value.startsWith('./')) return baseDir + value.slice(2);
  return baseDir + value;
}

function withResolvedPaths(images, baseDir) {
  return (Array.isArray(images) ? images : []).map((img) => ({
    ...img,
    thumb: resolveAssetPath(img.thumb, baseDir),
    full: resolveAssetPath(img.full, baseDir)
  }));
}

function openModal() {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  closeLightbox();
}

function setupModal() {
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lightbox.classList.contains('open')) closeLightbox();
      else if (modal.classList.contains('open')) closeModal();
    }
  });
}

function setupLightbox() {
  lightbox.querySelector('.lb-close').addEventListener('click', closeLightbox);
  lightbox.querySelector('.lb-prev').addEventListener('click', (e) => {
    e.stopPropagation();
    prevImage();
  });
  lightbox.querySelector('.lb-next').addEventListener('click', (e) => {
    e.stopPropagation();
    nextImage();
  });
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
  });
}

function openLightbox(index) {
  if (!orderedImages.length) return;
  currentIndex = index;
  updateLightboxContent();
  lightbox.classList.add('open');
}

function closeLightbox() {
  lightbox.classList.remove('open');
}

function updateLightboxContent() {
  const imgData = orderedImages[currentIndex];
  if (!imgData) return;
  lbImg.src = imgData.full;
  const caption =
    imgData.caption ||
    (Array.isArray(imgData.tags) ? imgData.tags.join(', ') : '') ||
    '';
  lbCaption.textContent = caption;
}

function prevImage() {
  if (!orderedImages.length) return;
  currentIndex = (currentIndex - 1 + orderedImages.length) % orderedImages.length;
  updateLightboxContent();
}

function nextImage() {
  if (!orderedImages.length) return;
  currentIndex = (currentIndex + 1) % orderedImages.length;
  updateLightboxContent();
}

function renderGrid(images) {
  grid.innerHTML = '';
  empty.hidden = images.length > 0;

  images.forEach((img, index) => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.innerHTML = `
      <img src="${img.thumb}" alt="${img.alt || ''}" loading="lazy">
      <div class="gallery-overlay"><span>VIEW</span></div>
    `;
    card.addEventListener('click', () => openLightbox(index));
    grid.appendChild(card);
    setTimeout(() => card.classList.add('visible'), index * 25);
  });
}

async function loadPlan(planKey) {
  const plan = PLAN_DATA[planKey];
  if (!plan) return;

  const baseDir = plan.dataPath.split('/').slice(0, -1).join('/') + '/';
  const module = await import(`../${plan.dataPath}?v=${SITE_VERSION}`);

  const title = module.TITLE || '成品展示';
  const subtitle = module.SUBTITLE || '點擊縮圖可放大查看';
  const images = withResolvedPaths(module.IMAGES || [], baseDir);

  modalTitle.textContent = title;
  modalSubtitle.textContent = subtitle;

  orderedImages = sortImagesByOrder(images);
  currentIndex = 0;

  renderGrid(orderedImages);
  openModal();
}

function setupPlanLinks() {
  document.querySelectorAll('[data-plan]').forEach((link) => {
    link.addEventListener('click', async (e) => {
      const planKey = link.dataset.plan;
      if (!planKey) return;
      e.preventDefault();
      try {
        await loadPlan(planKey);
      } catch (err) {
        // fallback to navigation if module load fails
        window.location.href = link.getAttribute('href');
      }
    });
  });
}

let started = false;
function start() {
  if (started) return;
  started = true;
  setupModal();
  setupLightbox();
  setupPlanLinks();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
