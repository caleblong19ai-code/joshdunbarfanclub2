(() => {
  const BODYBUILDER_SILHOUETTE = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/SRD_Posing_Bodybuilder.svg';

  const styles = document.createElement('style');
  styles.textContent = `
    .classified-figure--asset {
      position: absolute;
      left: 50%;
      bottom: -4%;
      width: min(84%, 310px) !important;
      height: 94% !important;
      object-fit: contain;
      object-position: center bottom;
      background: transparent !important;
      filter: brightness(0) saturate(100%) contrast(1.35) drop-shadow(0 22px 22px rgba(0,0,0,.48)) !important;
      transform: translateX(-50%) scale(1.06);
      transform-origin: 50% 100%;
      transition: transform .22s ease;
      z-index: 2;
    }

    .classified-figure--asset.pose-flex { width: min(90%, 330px) !important; transform: translateX(-50%) scale(1.12); }
    .classified-figure--asset.pose-side { width: min(80%, 295px) !important; transform: translateX(-50%) scaleX(.94) rotate(1.5deg); }
    .classified-figure--asset.pose-shaker { transform: translateX(-50%) scale(1.1) rotate(-1deg); }
    .classified-figure--asset.pose-belt { width: min(88%, 325px) !important; transform: translateX(-50%) scale(1.1); }

    .media-card:hover .classified-figure--asset { transform: translateX(-50%) scale(1.14) !important; }
    .media-card:hover .classified-figure--asset.pose-side { transform: translateX(-50%) scaleX(.96) scale(1.09) rotate(1.5deg) !important; }

    .case-preview .classified-figure--asset {
      width: min(88%, 380px) !important;
      height: 96% !important;
      bottom: -5%;
      transform: translateX(-50%) scale(1.12);
    }

    @media (max-width: 620px) {
      .classified-figure--asset { width: min(88%, 285px) !important; transform: translateX(-50%) scale(1.02); }
      .classified-figure--asset.pose-flex,
      .classified-figure--asset.pose-belt { width: min(94%, 305px) !important; }
      .media-card:hover .classified-figure--asset { transform: translateX(-50%) scale(1.05) !important; }
      .case-preview .classified-figure--asset { width: min(92%, 320px) !important; transform: translateX(-50%) scale(1.04); }
    }
  `;
  document.head.appendChild(styles);

  function replaceDrawnFigures(root = document) {
    root.querySelectorAll('.classified-frame').forEach((frame) => {
      const figure = frame.querySelector('.classified-figure:not(.classified-figure--asset)');
      if (!figure || figure.classList.contains('pose-bean')) return;

      const pose = [...figure.classList].find((name) => name.startsWith('pose-')) || 'pose-front';
      const image = document.createElement('img');
      image.className = `classified-figure classified-figure--asset ${pose}`;
      image.src = BODYBUILDER_SILHOUETTE;
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      image.decoding = 'async';
      image.loading = 'lazy';
      figure.replaceWith(image);
    });
  }

  const observer = new MutationObserver(() => replaceDrawnFigures());
  observer.observe(document.body, { childList: true, subtree: true });
  replaceDrawnFigures();
})();
