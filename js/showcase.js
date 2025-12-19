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

export function initShowcase({
  images,
  title,
  subtitle,
  backHref = '../../services.html'
}) {
  const pageTitle = document.getElementById('showcaseTitle');
  const pageSubtitle = document.getElementById('showcaseSubtitle');
  const backLink = document.getElementById('showcaseBack');
  const grid = document.getElementById('showcaseGrid');

  const lightbox = document.getElementById('lightbox');
  const lbImg = lightbox.querySelector('img');
  const lbCaption = lightbox.querySelector('.lb-caption');

  if (pageTitle) pageTitle.textContent = title || '成品展示';
  if (pageSubtitle && subtitle) pageSubtitle.textContent = subtitle;
  if (backLink) backLink.setAttribute('href', backHref);

  const ordered = sortImagesByOrder(Array.isArray(images) ? images : []);
  let currentIndex = 0;

  function setupLightbox() {
    lightbox.querySelector('.lb-close').addEventListener('click', closeLightbox);
    lightbox
      .querySelector('.lb-prev')
      .addEventListener('click', (e) => {
        e.stopPropagation();
        prevImage();
      });
    lightbox
      .querySelector('.lb-next')
      .addEventListener('click', (e) => {
        e.stopPropagation();
        nextImage();
      });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    });
  }

  function openLightbox(index) {
    if (!ordered.length) return;
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
    const imgData = ordered[currentIndex];
    if (!imgData) return;
    lbImg.src = imgData.full;
    const caption =
      imgData.caption ||
      (Array.isArray(imgData.tags) ? imgData.tags.join(', ') : '') ||
      '';
    lbCaption.textContent = caption;
  }

  function prevImage() {
    if (!ordered.length) return;
    currentIndex = (currentIndex - 1 + ordered.length) % ordered.length;
    updateLightboxContent();
  }

  function nextImage() {
    if (!ordered.length) return;
    currentIndex = (currentIndex + 1) % ordered.length;
    updateLightboxContent();
  }

  function render() {
    grid.innerHTML = '';
    ordered.forEach((img, index) => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.innerHTML = `
        <img src="${img.thumb}" alt="${img.alt || ''}" loading="lazy">
        <div class="gallery-overlay"><span>VIEW</span></div>
      `;
      card.addEventListener('click', () => openLightbox(index));
      grid.appendChild(card);
      setTimeout(() => card.classList.add('visible'), index * 35);
    });
  }

  setupLightbox();
  render();
}

