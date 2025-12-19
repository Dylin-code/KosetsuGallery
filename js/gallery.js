
import { IMAGES } from './data.js';

const CATEGORY_CONFIG = {
    hanfu: {
        label: '漢服',
        tags: ['漢服', 'æ¼¢æ?'],
        inferredTags: ['戰國袍', '漢', '唐', '宋', '明', '漢元素']
    },
    kimono: {
        label: '和服',
        tags: ['和服', '?Œæ?'],
        inferredTags: ['振袖', '訪問着', '訪問', '浴衣', '小紋', '袴', '打掛']
    }
};

const HANFU_TAG_ORDER = ['戰國袍', '漢', '唐', '宋', '明', '男款', '其他'];

const grid = document.getElementById('galleryGrid');
const filterContainer = document.getElementById('filterContainer');
const categoryGate = document.getElementById('categoryGate');
const galleryControls = document.getElementById('galleryControls');
const gallerySection = document.getElementById('gallerySection');
const catalogSubtitle = document.getElementById('catalogSubtitle');
const toTopButton = document.getElementById('toTop');

const lightbox = document.getElementById('lightbox');
const lbImg = lightbox.querySelector('img');
const lbCaption = lightbox.querySelector('.lb-caption');

let activeCategory = null;
let categoryImages = [];
let currentFilter = 'all';
let currentIndex = 0;
let filteredImages = [];

function init() {
    setupLightbox();
    setupCategoryGate();
    decorateCategoryCards();
    setupToTop();
    syncFromUrl({ replaceState: true });

    window.addEventListener('popstate', () => syncFromUrl({ replaceState: true }));
}

function setupToTop() {
    if (!toTopButton) return;

    const updateVisibility = () => {
        toTopButton.classList.toggle('show', window.scrollY > 300);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    toTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function setupCategoryGate() {
    categoryGate.querySelectorAll('[data-category]').forEach((button) => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;
            enterCategory(category);
        });
    });
}

function decorateCategoryCards() {
    categoryGate.querySelectorAll('[data-category]').forEach((button) => {
        const existing = getComputedStyle(button).getPropertyValue('--bg-image').trim();
        if (existing && existing !== 'none') return;

        const category = button.dataset.category;
        const preview = getCategoryImages(category)[0];
        if (!preview) return;
        button.style.setProperty('--bg-image', `url("${preview.thumb}")`);
    });
}

function syncFromUrl({ replaceState }) {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    if (category && CATEGORY_CONFIG[category]) {
        enterCategory(category, { replaceState });
    } else {
        showCategoryGate({ replaceState });
    }
}

function showCategoryGate({ replaceState } = {}) {
    closeLightbox();
    activeCategory = null;
    categoryImages = [];
    currentFilter = 'all';
    filteredImages = [];
    currentIndex = 0;

    grid.innerHTML = '';
    filterContainer.innerHTML = '';

    categoryGate.hidden = false;
    galleryControls.hidden = true;
    gallerySection.hidden = true;
    if (catalogSubtitle) catalogSubtitle.textContent = '請先選擇分類：漢服 / 和服';

    setUrlCategory(null, { replaceState });
}

function enterCategory(category, { replaceState } = {}) {
    if (!CATEGORY_CONFIG[category]) return;

    closeLightbox();
    activeCategory = category;
    categoryImages = getCategoryImages(category);
    currentFilter = 'all';

    categoryGate.hidden = true;
    galleryControls.hidden = false;
    gallerySection.hidden = false;
    if (catalogSubtitle) catalogSubtitle.textContent = `目前分類：${CATEGORY_CONFIG[category].label}`;

    setUrlCategory(category, { replaceState });
    buildFilterBar();
    renderGallery();
}

function setUrlCategory(category, { replaceState } = {}) {
    const url = new URL(window.location.href);
    if (category) url.searchParams.set('category', category);
    else url.searchParams.delete('category');

    if (replaceState) history.replaceState({}, '', url);
    else history.pushState({}, '', url);
}

function getCategoryImages(category) {
    const config = CATEGORY_CONFIG[category];
    if (!config) return [];

    const explicitTags = new Set(config.tags);
    const inferredTags = new Set(config.inferredTags || []);

    const hasExplicitCategory = (img, cfg) =>
        (img.tags || []).some((tag) => cfg.tags.includes(tag));

    const hasAnyExplicitCategory = (img) =>
        Object.values(CATEGORY_CONFIG).some((cfg) => hasExplicitCategory(img, cfg));

    const isInCategory = (img) => {
        if ((img.tags || []).some((tag) => explicitTags.has(tag))) return true;
        if (hasAnyExplicitCategory(img)) return false;
        return (img.tags || []).some((tag) => inferredTags.has(tag));
    };

    return sortImagesByOrder(IMAGES.filter(isInCategory));
}

function buildFilterBar() {
    filterContainer.innerHTML = '';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'filter-btn filter-back';
    backBtn.textContent = '← 分類';
    backBtn.addEventListener('click', () => showCategoryGate());
    filterContainer.appendChild(backBtn);

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'filter-btn active';
    allBtn.textContent = '全部';
    allBtn.dataset.filter = 'all';
    allBtn.addEventListener('click', () => setFilter('all', allBtn));
    filterContainer.appendChild(allBtn);

    const excluded = new Set([...(CATEGORY_CONFIG[activeCategory]?.tags || [])]);
    const tags = new Set();
    categoryImages.forEach((img) => (img.tags || []).forEach((tag) => {
        if (!excluded.has(tag)) tags.add(tag);
    }));

    Array.from(tags)
        .sort((a, b) => sortTagsForCategory(a, b, activeCategory))
        .forEach((tag) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'filter-btn';
            btn.textContent = tag;
            btn.dataset.filter = tag;
            btn.addEventListener('click', () => setFilter(tag, btn));
            filterContainer.appendChild(btn);
        });
}

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

function sortTagsForCategory(a, b, category) {
    if (category === 'hanfu') return sortHanfuTags(a, b);
    return String(a).localeCompare(String(b), 'zh-Hant');
}

function sortHanfuTags(a, b) {
    const keyA = getHanfuTagSortKey(a);
    const keyB = getHanfuTagSortKey(b);

    if (keyA.group !== keyB.group) return keyA.group - keyB.group;
    if (keyA.group === 0 && keyA.num !== keyB.num) return keyA.num - keyB.num;
    if (keyA.group === 1 && keyA.rank !== keyB.rank) return keyA.rank - keyB.rank;
    return keyA.text.localeCompare(keyB.text, 'zh-Hant');
}

function getHanfuTagSortKey(tag) {
    const text = String(tag);
    const num = /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : null;
    if (num !== null && Number.isFinite(num)) return { group: 0, num, rank: 0, text: '' };

    const rank = HANFU_TAG_ORDER.indexOf(text);
    if (rank !== -1) return { group: 1, num: 0, rank, text: '' };

    return { group: 2, num: 0, rank: 0, text };
}

function setFilter(tag, btn) {
    filterContainer.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    if (currentFilter === tag && tag !== 'all') {
        currentFilter = 'all';
        btn.classList.remove('active');
        filterContainer.querySelector('[data-filter="all"]')?.classList.add('active');
    } else {
        currentFilter = tag;
    }

    renderGallery();
}

function renderGallery() {
    grid.innerHTML = '';

    if (!activeCategory) return;

    if (currentFilter === 'all') {
        filteredImages = categoryImages;
    } else {
        filteredImages = categoryImages.filter((img) => (img.tags || []).includes(currentFilter));
    }

    filteredImages.forEach((img, index) => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.innerHTML = `
      <img src="${img.thumb}" alt="${img.alt || ''}" loading="lazy">
      <div class="gallery-overlay">
        <span>VIEW</span>
      </div>
    `;
        card.addEventListener('click', () => openLightbox(index));
        grid.appendChild(card);
        setTimeout(() => card.classList.add('visible'), index * 50);
    });
}

function setupLightbox() {
    lightbox.querySelector('.lb-close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.lb-prev').addEventListener('click', (e) => { e.stopPropagation(); prevImage(); });
    lightbox.querySelector('.lb-next').addEventListener('click', (e) => { e.stopPropagation(); nextImage(); });
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('open')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === 'ArrowRight') nextImage();
        }
    });
}

function openLightbox(index) {
    if (!filteredImages.length) return;
    currentIndex = index;
    updateLightboxContent();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
}

function updateLightboxContent() {
    const imgData = filteredImages[currentIndex];
    if (!imgData) return;
    lbImg.src = imgData.full;
    lbCaption.textContent = (imgData.tags || []).join(', ');
}

function prevImage() {
    if (!filteredImages.length) return;
    currentIndex = (currentIndex - 1 + filteredImages.length) % filteredImages.length;
    updateLightboxContent();
}

function nextImage() {
    if (!filteredImages.length) return;
    currentIndex = (currentIndex + 1) % filteredImages.length;
    updateLightboxContent();
}

document.addEventListener('DOMContentLoaded', init);
