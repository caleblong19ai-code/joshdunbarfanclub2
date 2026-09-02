(function () {
  if (document.body.matches('.archive-page, .daily-page, .metrics-page')) {
    const pageStyles = document.createElement('link');
    pageStyles.rel = 'stylesheet';
    pageStyles.href = 'archive.css';
    document.head.appendChild(pageStyles);
  }

  if (document.body.matches('.spicy-page')) {
    const silhouetteStyles = document.createElement('link');
    silhouetteStyles.rel = 'stylesheet';
    silhouetteStyles.href = 'spicy-silhouette-v2.css';
    document.head.appendChild(silhouetteStyles);
  }

  const navSlot = document.querySelector('[data-nav-slot]');
  if (navSlot) {
    fetch('navbar.html')
      .then((response) => {
        if (!response.ok) throw new Error(`Navbar request failed: ${response.status}`);
        return response.text();
      })
      .then((markup) => {
        navSlot.innerHTML = markup;
        markActiveNavigation();
      })
      .catch((error) => console.error('Unable to load site navigation.', error));
  }

  document.querySelectorAll('[data-current-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  document.addEventListener('click', (event) => {
    document.querySelectorAll('.nav-group[open]').forEach((group) => {
      if (!group.contains(event.target)) group.removeAttribute('open');
    });
  });

  if ((window.location.pathname.split('/').pop() || 'index.html') === 'livecam.html') {
    enhanceLivecamPlatinumHandoff();
    const menaceScript = document.createElement('script');
    menaceScript.src = 'bean-menace.js';
    menaceScript.defer = true;
    document.head.appendChild(menaceScript);
  }

  function enhanceLivecamPlatinumHandoff() {
    const sequence = document.querySelector('[data-connection]');
    const status = sequence?.querySelector('strong');
    const clearancePanel = document.querySelector('[data-clearance-panel]');
    const platinumButton = document.querySelector('[data-platinum]');
    const denialMessage = document.querySelector('[data-denial-message]');
    if (!sequence || !status || !clearancePanel || !platinumButton || !denialMessage) return;

    const styles = document.createElement('style');
    styles.textContent = `
      .uplink-cta{margin-top:18px;padding:16px;border:1px solid rgba(224,194,124,.48);background:rgba(195,168,106,.09);color:#d8d1c0;font-family:var(--mono);font-size:.64rem;line-height:1.65;text-transform:uppercase;letter-spacing:.055em}
      .uplink-cta strong{display:block;margin:0 0 5px;color:var(--gold2);font-size:.72rem;letter-spacing:.075em}
      .clearance-panel.uplink-ready{border-color:rgba(224,194,124,.72);box-shadow:0 0 0 1px rgba(224,194,124,.16),0 0 34px rgba(195,168,106,.11)}
      .clearance-panel.uplink-ready .clearance-button:not(:disabled){box-shadow:0 0 0 3px rgba(224,194,124,.12)}
    `;
    document.head.appendChild(styles);

    let promoted = false;
    const promotePlatinum = () => {
      if (promoted || !status.textContent.includes('UPLINK ACTIVE')) return;
      promoted = true;
      status.textContent = 'UPLINK ACTIVE // PLATINUM CLEARANCE REQUIRED';

      const cta = document.createElement('div');
      cta.className = 'uplink-cta';
      cta.innerHTML = '<strong>Connection established. Live feed remains locked.</strong>Join the Platinum Tier to request final camera authorization from Bean. Continue in the Platinum Access panel.';
      sequence.appendChild(cta);

      denialMessage.textContent = 'Connection successful. Live feed locked — join Platinum Tier to continue.';
      denialMessage.classList.add('active');
      platinumButton.textContent = 'Join Platinum Tier to Continue';
      clearancePanel.classList.add('uplink-ready');

      if (window.matchMedia('(max-width: 980px)').matches) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.setTimeout(() => clearancePanel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }), 180);
      }
    };

    const observer = new MutationObserver(promotePlatinum);
    observer.observe(status, { childList: true, characterData: true, subtree: true });
    promotePlatinum();
  }

  function markActiveNavigation() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.site-nav a').forEach((link) => {
      if (link.getAttribute('href') === current) link.setAttribute('aria-current', 'page');
    });
  }
})();