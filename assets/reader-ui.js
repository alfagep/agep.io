(() => {
  const mobileQuery = window.matchMedia("(max-width: 680px)");
  const body = document.body;
  const header = document.querySelector(".site-header");
  const reader = document.querySelector(".book-reader-section");
  const mobileToc = document.querySelector(".reader-mobile-toc");
  const tocDetails = mobileToc?.querySelector("details");
  const readerSections = Array.from(document.querySelectorAll(".book-text > .chapter, .book-text > .part-divider"));

  if (!header || !reader || !mobileToc) {
    return;
  }

  const storageKey = "agep:absolute-stake:reader-position:v1";
  const hiddenClass = "reader-ui-hidden";
  const visibleClass = "reader-ui-visible";
  const scrollThreshold = 10;
  let lastScrollY = window.scrollY;
  let lastSaveAt = 0;
  let restoringReadingPlace = false;
  let restoredReadingPlace = false;
  let ticking = false;

  const getElementTop = (element) => element.getBoundingClientRect().top + window.scrollY;

  const getMaxScrollY = () =>
    Math.max(0, Math.max(document.documentElement.scrollHeight, body.scrollHeight) - window.innerHeight);

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
    const readerTop = getElementTop(reader);
    return scrollY + header.getBoundingClientRect().height >= readerTop;
  };

  const getActiveReaderSection = (scrollY) => {
    if (!readerSections.length) {
      return null;
    }

    const scanLine = scrollY + Math.min(window.innerHeight * 0.38, 240);
    let activeSection = readerSections[0];

    for (const section of readerSections) {
      if (getElementTop(section) <= scanLine) {
        activeSection = section;
      } else {
        break;
      }
    }

    return activeSection;
  };

  const readStoredPlace = () => {
    try {
      const rawPlace = window.localStorage.getItem(storageKey);

      if (!rawPlace) {
        return null;
      }

      const place = JSON.parse(rawPlace);

      if (!place || typeof place.sectionId !== "string") {
        return null;
      }

      return place;
    } catch {
      return null;
    }
  };

  const saveReadingPlace = (scrollY, force = false) => {
    if (!mobileQuery.matches || restoringReadingPlace || !readerSections.length || !isInsideReader(scrollY)) {
      return;
    }

    const now = Date.now();

    if (!force && now - lastSaveAt < 500) {
      return;
    }

    const activeSection = getActiveReaderSection(scrollY);

    if (!activeSection?.id) {
      return;
    }

    const sectionTop = getElementTop(activeSection);

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          sectionId: activeSection.id,
          sectionOffset: Math.max(0, Math.round(scrollY - sectionTop)),
          scrollY: Math.round(scrollY),
          savedAt: now,
        }),
      );
      lastSaveAt = now;
    } catch {
      // Private browsing modes can block localStorage; reading still works without memory.
    }
  };

  const restoreReadingPlace = () => {
    if (restoredReadingPlace || !mobileQuery.matches || window.location.hash) {
      return;
    }

    const savedPlace = readStoredPlace();

    if (!savedPlace) {
      return;
    }

    const targetSection = document.getElementById(savedPlace.sectionId);

    if (!targetSection) {
      return;
    }

    const rawOffset = Number(savedPlace.sectionOffset);
    const sectionOffset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;
    const targetY = Math.min(getMaxScrollY(), Math.max(0, getElementTop(targetSection) + sectionOffset));

    if (targetY < getElementTop(reader) - 32) {
      return;
    }

    restoringReadingPlace = true;
    restoredReadingPlace = true;
    showReaderUi();
    window.scrollTo({ top: targetY, behavior: "auto" });
    lastScrollY = targetY;

    window.setTimeout(() => {
      restoringReadingPlace = false;
      lastScrollY = window.scrollY;
      updateReaderUi();
    }, 160);
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

    saveReadingPlace(currentY);

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
    mobileQuery.addEventListener("change", () => {
      updateReaderUi();
      restoreReadingPlace();
    });
  } else {
    mobileQuery.addListener(() => {
      updateReaderUi();
      restoreReadingPlace();
    });
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", updateReaderUi, { passive: true });
  window.addEventListener("orientationchange", updateReaderUi);
  window.addEventListener("hashchange", showReaderUi);
  window.addEventListener("pagehide", () => saveReadingPlace(window.scrollY, true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      saveReadingPlace(window.scrollY, true);
    }
  });

  if (document.readyState === "complete") {
    window.requestAnimationFrame(restoreReadingPlace);
  } else {
    window.addEventListener("load", () => window.requestAnimationFrame(restoreReadingPlace), { once: true });
  }

  updateReaderUi();
})();
