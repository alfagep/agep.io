(() => {
  const mobileQuery = window.matchMedia("(max-width: 680px)");
  const body = document.body;
  const header = document.querySelector(".site-header");
  const reader = document.querySelector(".book-reader-section");
  const mobileToc = document.querySelector(".reader-mobile-toc");
  const tocDetails = mobileToc?.querySelector("details");

  if (!header || !reader || !mobileToc) {
    return;
  }

  const hiddenClass = "reader-ui-hidden";
  const visibleClass = "reader-ui-visible";
  const scrollThreshold = 10;
  let lastScrollY = window.scrollY;
  let ticking = false;

  const setReaderMeasurements = () => {
    const headerHeight = Math.ceil(header.getBoundingClientRect().height);
    const tocHeight = Math.ceil(mobileToc.getBoundingClientRect().height);
    body.style.setProperty("--reader-header-height", `${headerHeight}px`);
    body.style.setProperty("--reader-mobile-hide-shift", `-${headerHeight + tocHeight + 26}px`);
  };

  const showReaderUi = () => {
    body.classList.add(visibleClass);
    body.classList.remove(hiddenClass);
  };

  const hideReaderUi = () => {
    if (tocDetails?.open) {
      showReaderUi();
      return;
    }

    body.classList.add(hiddenClass);
    body.classList.remove(visibleClass);
  };

  const resetReaderUi = () => {
    body.classList.remove(hiddenClass, visibleClass);
  };

  const isInsideReader = (scrollY) => {
    const readerTop = reader.getBoundingClientRect().top + window.scrollY;
    return scrollY + header.getBoundingClientRect().height >= readerTop;
  };

  const updateReaderUi = () => {
    ticking = false;

    if (!mobileQuery.matches) {
      resetReaderUi();
      return;
    }

    setReaderMeasurements();

    const currentY = Math.max(window.scrollY, 0);
    const delta = currentY - lastScrollY;

    if (currentY <= 4 || !isInsideReader(currentY)) {
      showReaderUi();
      lastScrollY = currentY;
      return;
    }

    if (Math.abs(delta) < scrollThreshold) {
      return;
    }

    if (delta > 0) {
      hideReaderUi();
    } else {
      showReaderUi();
    }

    lastScrollY = currentY;
  };

  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateReaderUi);
    }
  };

  tocDetails?.addEventListener("toggle", () => {
    if (tocDetails.open) {
      setReaderMeasurements();
      showReaderUi();
    }
  });

  mobileToc.addEventListener("click", (event) => {
    const link = event.target.closest("a");

    if (!link) {
      return;
    }

    if (tocDetails?.open) {
      tocDetails.open = false;
    }

    showReaderUi();
  });

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener("change", updateReaderUi);
  } else {
    mobileQuery.addListener(updateReaderUi);
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", updateReaderUi, { passive: true });
  window.addEventListener("orientationchange", updateReaderUi);
  window.addEventListener("hashchange", showReaderUi);

  updateReaderUi();
})();
