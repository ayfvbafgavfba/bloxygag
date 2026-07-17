import ReactDOM from 'react-dom/client'
import React from 'react'
import App from './App'
import numeral from 'numeral'
import './global.css'

if (typeof window !== 'undefined') {
  window.numeral = numeral
}

// Attach fallback handler to images that fail to load.
const FALLBACK_IMAGE = '/images/pet-placeholder.svg';

function attachImageFallback(img) {
  if (!img || img._hasFallback) return;
  img._hasFallback = true;
  img.addEventListener('error', function () {
    try {
      const src = (img.getAttribute('src') || '').trim();
      if (!src) {
        img.src = FALLBACK_IMAGE;
        return;
      }

      if (/raw\.githubusercontent\.com/i.test(src) || /pet-placeholder\.svg$/i.test(src)) {
        return;
      }

      const gag2GithubUrl = (() => {
        const parts = src.split('/');
        const filename = parts[parts.length - 1] || '';
        if (!filename) return null;
        if (/\.(png|jpe?g|webp|svg)$/i.test(filename)) {
          return `https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/${filename}`;
        }
        return null;
      })();

      if (gag2GithubUrl) {
        img.src = gag2GithubUrl;
      } else {
        img.src = FALLBACK_IMAGE;
      }
    } catch (e) {
      img.src = FALLBACK_IMAGE;
    }
  });
}

function attachFallbacksToExistingImages() {
  document.querySelectorAll('img').forEach(attachImageFallback);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachFallbacksToExistingImages);
  } else {
    attachFallbacksToExistingImages();
  }

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
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App></App>
  </React.StrictMode>
)