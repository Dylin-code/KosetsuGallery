
import { IMAGES } from './data.js';

const grid = document.getElementById('galleryGrid');
const filterContainer = document.getElementById('filterContainer');
const lightbox = document.getElementById('lightbox');
const lbImg = lightbox.querySelector('img');
const lbCaption = lightbox.querySelector('.lb-caption');
let currentFilter = 'all';
let currentIndex = 0;
let filteredImages = [];

// 1. Initialize
function init() {
    generateFilterButtons();
    renderGallery();
    setupLightbox();
}

// 2. Generate Filter Buttons
function generateFilterButtons() {
    const tags = new Set();
    IMAGES.forEach(img => img.tags.forEach(tag => tags.add(tag)));

    // Custom sorting or grouping could go here
    Array.from(tags).sort().forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = tag;
        btn.dataset.filter = tag;
        btn.addEventListener('click', () => setFilter(tag, btn));
        filterContainer.appendChild(btn);
    });
}

// 3. Set Filter
function setFilter(tag, btn) {
    // Update UI
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Logic
    if (currentFilter === tag && tag !== 'all') {
        // Toggle off if clicking active tag (revert to all)
        currentFilter = 'all';
        btn.classList.remove('active');
        document.querySelector('[data-filter="all"]').classList.add('active');
    } else {
        currentFilter = tag;
    }

    renderGallery();
}

// 4. Render Gallery
function renderGallery() {
    grid.innerHTML = '';

    if (currentFilter === 'all') {
        filteredImages = IMAGES;
    } else {
        filteredImages = IMAGES.filter(img => img.tags.includes(currentFilter));
    }

    filteredImages.forEach((img, index) => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.innerHTML = `
      <img src="${img.thumb}" alt="${img.alt}" loading="lazy">
      <div class="gallery-overlay">
        <span>VIEW</span>
      </div>
    `;
        card.addEventListener('click', () => openLightbox(index));
        grid.appendChild(card);

        // Stagger animation
        setTimeout(() => card.classList.add('visible'), index * 50);
    });
}

// 5. Lightbox Logic
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
    lbImg.src = imgData.full;
    lbCaption.textContent = (imgData.tags || []).join(', ');
}

function prevImage() {
    currentIndex = (currentIndex - 1 + filteredImages.length) % filteredImages.length;
    updateLightboxContent();
}

function nextImage() {
    currentIndex = (currentIndex + 1) % filteredImages.length;
    updateLightboxContent();
}

// Start
document.addEventListener('DOMContentLoaded', () => {
    // The module script runs deferred by default, but init here to be safe
    init();
});

// Also bind to manual button click for "all"
document.querySelector('[data-filter="all"]').addEventListener('click', (e) => setFilter('all', e.target));
