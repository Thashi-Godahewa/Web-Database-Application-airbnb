(async function loadNavbar() {
  const placeholder = document.getElementById('navbar-placeholder');

  if (!placeholder) {
    return;
  }

  try {
    const response = await fetch('/navbar.html');
    if (!response.ok) {
      return;
    }

    const html = await response.text();
    placeholder.outerHTML = html;

    const activeKey = placeholder.dataset.active;
    if (!activeKey) {
      return;
    }

    const activeItem = document.querySelector(`[data-nav="${activeKey}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  } catch (error) {
    // Keep page usable even if navbar include fails.
  }
})();
