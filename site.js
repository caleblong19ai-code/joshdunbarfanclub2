(function () {
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

  function markActiveNavigation() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.site-nav a').forEach((link) => {
      if (link.getAttribute('href') === current) link.setAttribute('aria-current', 'page');
    });
  }
})();