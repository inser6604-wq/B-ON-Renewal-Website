(() => {
  if (customElements.get('bnon-shopify-detail')) return;

  customElements.define('bnon-shopify-detail', class extends HTMLElement {
    connectedCallback() {
      if (this.events) return;
      this.stage = this.querySelector('.bnon-shopify-detail__scroll-stage');
      this.media = this.querySelector('.bnon-shopify-detail__media');
      if (!this.stage || !this.media) return;
      this.screens = [...this.querySelectorAll('.bnon-shopify-detail__screen')]
        .map(viewport => ({ viewport, image: viewport.querySelector('img'), maxTravel: 0 }))
        .filter(screen => screen.image);
      this.events = new AbortController();
      const options = { signal: this.events.signal };
      this.mobile = window.matchMedia('(max-width: 767px)');
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.needsMeasure = true;
      this.visible = true;
      this.schedule = (measure = false) => {
        this.needsMeasure ||= measure;
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
          this.frame = null;
          if (!this.isConnected) return;
          if (this.needsMeasure) this.measure();
          this.paint();
        });
      };
      window.addEventListener('scroll', () => { if (this.visible) this.schedule(); }, { ...options, passive: true });
      window.addEventListener('resize', () => this.schedule(true), options);
      this.mobile.addEventListener('change', () => this.schedule(true), options);
      this.reducedMotion.addEventListener('change', () => this.schedule(true), options);
      this.screens.forEach(({ image }) => image.addEventListener('load', () => this.schedule(true), options));
      this.resizeObserver = new ResizeObserver(() => this.schedule(true));
      this.screens.forEach(({ viewport, image }) => {
        this.resizeObserver.observe(viewport);
        this.resizeObserver.observe(image);
      });
      const header = document.querySelector('bnon-header-controller');
      if (header) this.resizeObserver.observe(header);
      this.intersectionObserver = new IntersectionObserver(entries => {
        this.visible = entries.some(entry => entry.isIntersecting);
        this.schedule();
      }, { rootMargin: '200px 0px' });
      this.intersectionObserver.observe(this.stage);
      this.schedule(true);
    }

    measure() {
      this.needsMeasure = false;
      // As in the popup, travel is the actual rendered image height minus its
      // viewport height. Here only translateY changes; scrollTop is never set.
      this.screens.forEach(screen => {
        screen.maxTravel = Math.max(0, screen.image.offsetHeight - screen.viewport.clientHeight);
      });
      const headerHeight = document.querySelector('.bnon-header')?.getBoundingClientRect().height || 0;
      this.stickyTop = headerHeight + 24;
      this.style.setProperty('--detail-sticky-top', `${this.stickyTop}px`);
      const enabled = this.dataset.scrollEnabled === 'true'
        && (!this.mobile.matches || this.dataset.mobileScrollEnabled === 'true')
        && !this.reducedMotion.matches
        && this.screens.some(screen => screen.maxTravel > 0);
      this.classList.toggle('is-scroll-enabled', enabled);
      const range = Math.max(60, Math.min(300, Number(this.dataset.scrollRange) || 140));
      this.distance = enabled ? window.innerHeight * range / 100 * (this.mobile.matches ? .65 : 1) : 0;
      // Reserve at least the visible viewport: short mobile mockups must still
      // reach 100% even when the page has little content below the Hero.
      if (enabled) this.stage.style.height = `${Math.max(this.media.offsetHeight, window.innerHeight - this.stickyTop) + this.distance}px`;
      else this.stage.style.removeProperty('height');
    }

    paint() {
      const progress = this.distance > 0
        ? Math.max(0, Math.min(1, (this.stickyTop - this.stage.getBoundingClientRect().top) / this.distance))
        : 0;
      this.screens.forEach(({ image, maxTravel }) => {
        image.style.setProperty('--detail-image-offset', `${-maxTravel * progress}px`);
      });
    }

    disconnectedCallback() {
      this.events?.abort();
      this.events = null;
      this.resizeObserver?.disconnect();
      this.intersectionObserver?.disconnect();
      cancelAnimationFrame(this.frame);
      this.frame = null;
      this.stage?.style.removeProperty('height');
      this.classList.remove('is-scroll-enabled');
      this.screens?.forEach(({ image }) => image.style.removeProperty('--detail-image-offset'));
    }
  });
})();
