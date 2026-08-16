(() => {
  'use strict';

  const PINNED_KEY = 'okf-beginner-guide-sidebar-pinned-v1';
  const COLLAPSED_KEY = 'okf-beginner-guide-sidebar-collapsed-v1';
  const FRAGMENT_TARGET_CLASS = 'fragment-target';
  const desktop = window.matchMedia('(min-width: 761px)');
  const root = document.documentElement;
  const sidebar = document.querySelector('[data-guide-sidebar]');
  const toolbar = document.querySelector('[data-guide-sidebar-toolbar]');
  const pinButton = document.querySelector('[data-guide-sidebar-pin]');
  const pinLabel = document.querySelector('[data-guide-sidebar-pin-label]');
  const pinMark = pinButton?.querySelector('.guide-sidebar__pin-mark');

  if (
    !(sidebar instanceof HTMLElement) ||
    !(toolbar instanceof HTMLElement) ||
    !(pinButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  toolbar.hidden = false;

  const readStorage = (storage, key) => {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  };

  const writeStorage = (storage, key, value) => {
    try {
      storage.setItem(key, value);
    } catch {
      // The guide remains fully usable when a browser blocks storage.
    }
  };

  let pinned = readStorage(window.localStorage, PINNED_KEY) === 'true';

  const applyState = () => {
    const collapsed =
      desktop.matches &&
      !pinned &&
      readStorage(window.sessionStorage, COLLAPSED_KEY) === 'true';

    root.dataset.guideSidebarCollapsed = String(collapsed);
    root.dataset.guideSidebarPinned = String(pinned);
    pinButton.setAttribute('aria-pressed', String(pinned));

    const label = pinned ? 'Unpin learning path' : 'Pin learning path open';
    pinButton.setAttribute('aria-label', label);
    pinButton.title = label;
    if (pinLabel instanceof HTMLElement) {
      pinLabel.textContent = label;
    }
    if (pinMark instanceof HTMLElement) {
      pinMark.textContent = pinned ? '\u25cf' : '\u25cb';
    }
  };

  const rememberCollapsedNavigation = () => {
    if (!desktop.matches || pinned) {
      return;
    }
    writeStorage(window.sessionStorage, COLLAPSED_KEY, 'true');
    root.dataset.guideSidebarCollapsed = 'true';
  };

  const restoreFragmentInArticle = () => {
    document
      .querySelectorAll(`.${FRAGMENT_TARGET_CLASS}`)
      .forEach((element) => {
        element.classList.remove(FRAGMENT_TARGET_CLASS);
      });

    if (!window.location.hash || window.location.hash === '#') {
      return;
    }
    let identifier;
    try {
      identifier = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(identifier);
    if (
      !(target instanceof HTMLElement) ||
      !target.matches('[data-section-heading]')
    ) {
      return;
    }

    target.classList.add(FRAGMENT_TARGET_CLASS);
    const previousScrollBehaviour = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
    target.focus({ preventScroll: true });
    window.requestAnimationFrame(() => {
      root.style.scrollBehavior = previousScrollBehaviour;
    });
  };

  const restoreGuidePosition = () => {
    window.requestAnimationFrame(() => {
      sidebar
        .querySelector('a[aria-current="page"]')
        ?.scrollIntoView({ block: 'nearest' });
      restoreFragmentInArticle();
    });
  };

  pinButton.addEventListener('click', () => {
    pinned = !pinned;
    writeStorage(window.localStorage, PINNED_KEY, String(pinned));
    writeStorage(window.sessionStorage, COLLAPSED_KEY, String(!pinned));
    applyState();
  });

  document
    .querySelectorAll('.guide-sidebar a, .chapter-nav a')
    .forEach((link) => {
      link.addEventListener('click', (event) => {
        if (
          event instanceof MouseEvent &&
          (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        ) {
          return;
        }
        rememberCollapsedNavigation();
      });
    });

  desktop.addEventListener('change', applyState);
  window.addEventListener('pageshow', () => {
    pinned = readStorage(window.localStorage, PINNED_KEY) === 'true';
    applyState();
    restoreGuidePosition();
  });
  window.addEventListener('hashchange', restoreGuidePosition);
  window.addEventListener('popstate', restoreGuidePosition);
  window.addEventListener('storage', (event) => {
    if (event.key === PINNED_KEY) {
      pinned = event.newValue === 'true';
      applyState();
    }
  });

  applyState();
  restoreGuidePosition();
})();
