
const NAV_HTML = `
<nav class="navbar">
  <div class="container nav-inner">
    <a href="index.html" class="brand">
      <img src="logo_small.png" alt="香雪花間" class="logo-small">
      <span>香雪花間</span>
    </a>
    <div class="nav-links">
      <a href="index.html">首頁</a>
      <a href="about.html">關於我們</a>
      <a href="gallery.html">服裝型錄</a>
      <a href="services.html">租賃服務</a>
      <a href="contact.html">預約諮詢</a>
    </div>
  </div>
</nav>
`;

const FOOTER_HTML = `
<footer>
  <div class="container">
    <div class="brand">
      <img src="logo.png" alt="香雪花間" class="logo-full" style="height:120px;">
    </div>
    <p>Copyright © 2025 Kosetsu Studio. All rights reserved.</p>
    <p style="margin-top:0.5rem; font-size:0.8rem; color:var(--text-muted);">
      <a href="https://www.instagram.com/kosetsuhanama/">Instagram</a> • <a href="https://www.facebook.com/kosetsuhanama">Facebook</a> 
    </p>
  </div>
</footer>
`;

document.addEventListener('DOMContentLoaded', () => {
  // Inject Nav and Footer if placeholders exist, or prepend/append
  // However, simpler to just inject into body if we want consistent layout, 
  // but to avoid FOUC (Flash of Unstyled Content), hardcoding in HTML is better for production.
  // For this v2 prototype, injecting is fine for speed and consistency.

  const body = document.body;

  // Inject Nav at top
  const headerPlaceholder = document.createElement('div');
  headerPlaceholder.innerHTML = NAV_HTML;
  body.insertBefore(headerPlaceholder.firstElementChild, body.firstChild);

  // Inject Footer at bottom
  const footerPlaceholder = document.createElement('div');
  footerPlaceholder.innerHTML = FOOTER_HTML;
  body.appendChild(footerPlaceholder.firstElementChild);

  // Highlight active link
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });
});
