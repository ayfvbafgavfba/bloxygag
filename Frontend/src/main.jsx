import ReactDOM from 'react-dom/client'
import React from 'react'
import App from './App'
import numeral from 'numeral'
import './global.css'

if (typeof window !== 'undefined') {
  window.numeral = numeral
}

// Attach fallback handler to images that fail to load.
function attachImageFallback(img) {
  if (!img || img._hasFallback) return;
  img._hasFallback = true;
  img.addEventListener('error', function () {
    try {
      const src = img.getAttribute('src') || '';
      // If src already points to raw.githubusercontent, don't loop
      if (/raw\.githubusercontent\.com/i.test(src)) return;
      const parts = src.split('/');
      const filename = parts[parts.length - 1] || '';
      if (filename) {
        img.src = `https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/${filename}`;
      } else {
        img.src = '/images/pet-placeholder.svg';
      }
    } catch (e) {
      img.src = '/images/pet-placeholder.svg';
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    document.querySelectorAll('img').forEach(attachImageFallback);
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes) {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === 1) {
              if (n.tagName === 'IMG') attachImageFallback(n);
              n.querySelectorAll && n.querySelectorAll('img').forEach(attachImageFallback);
            }
          });
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App></App>
  </React.StrictMode>
)