(() => {
  if (customElements.get('bnon-shopify-detail')) return;

  // Page-local, once-only entrances. No hidden CSS or changes to shared assets.
  const revealed = new WeakSet();
  class DetailEntrances {
    constructor(root) {
      this.root = root;
      this.events = new AbortController();
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.animations = new Map();
      this.targets = new Map();
      this.observer = new IntersectionObserver(entries => {
        entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
          if (!isIntersecting) return;
          const config = this.targets.get(target);
          if (!config || !this.root.contains(target) || revealed.has(target)) return;
          if (intersectionRatio + .001 < config.threshold && target.getBoundingClientRect().height <= window.innerHeight - 24) return;
          this.observer.unobserve(target);
          revealed.add(target);
          if (this.reduced.matches || target.contains(document.activeElement)) this.finishEntrance(target);
          else this.animations.get(target)?.play();
        });
      }, { threshold: [0, .08, .45], rootMargin: '0px 0px -24px 0px' });
      this.reduced.addEventListener('change', () => {
        this.animations.forEach(animation => animation.cancel());
        this.animations.clear();
        this.refresh();
      }, { signal: this.events.signal });
      root.addEventListener('focusin', event => {
        this.animations.forEach((animation, target) => {
          if (!target.contains(event.target)) return;
          revealed.add(target);
          this.observer.unobserve(target);
          this.finishEntrance(target);
        });
      }, { signal: this.events.signal });
      // Theme-editor section replacement/reordering must not leave stale observers.
      ['shopify:section:load', 'shopify:section:reorder'].forEach(type => {
        document.addEventListener(type, () => this.refresh(), { signal: this.events.signal });
      });
      this.mutations = new MutationObserver(records => {
        if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
          node.nodeType === 1 && node.matches('.shopify-section')))) this.refresh();
      });
      this.mutations.observe(root, { childList: true });
      this.refresh();
    }

    prepareEntrance(target, { rise, duration, delay }) {
      if (this.animations.has(target)) return;
      const from = { opacity: 0 };
      const to = { opacity: 1 };
      // Opacity-only entrances must never replace layout transforms (e.g. PAYMENT's result).
      if (rise) {
        const base = getComputedStyle(target).transform;
        from.transform = `${base === 'none' ? '' : `${base} `}translateY(${rise}px)`;
        to.transform = base;
      }
      // Prepare the first frame before entry: never show content, hide it, then fade it in.
      // The same animation is played once by the observer, not recreated on intersection.
      const animation = target.animate([from, to], { duration, delay, easing: 'ease-out', fill: 'both' });
      animation.pause();
      animation.currentTime = 0;
      this.animations.set(target, animation);
      animation.onfinish = () => {
        if (this.animations.get(target) === animation) this.finishEntrance(target);
      };
    }

    finishEntrance(target) {
      const animation = this.animations.get(target);
      if (!animation) return;
      animation.onfinish = null;
      animation.cancel();
      this.animations.delete(target);
    }

    refresh() {
      this.observer.disconnect();
      this.animations.forEach((animation, target) => {
        if (this.root.contains(target)) return;
        animation.cancel();
        this.animations.delete(target);
      });
      this.targets.clear();
      const groups = [
        ['.bnon-shopify-detail__heading, .bnon-shopify-detail__subtitle, .bnon-shopify-detail__description, .bnon-shopify-detail__contact', 0, 450, 90],
        ['.bnon-shopify-build__label-row, .bnon-shopify-build__title, .bnon-shopify-build__copy', 16],
        ['.bnon-shopify-build__pillar', 0, 1100, 300, .45],
        ['.bnon-shopify-mission__label-row, .bnon-shopify-mission__heading, .bnon-shopify-mission__copy, .bnon-shopify-mission__partner', 16],
        ['.bnon-shopify-process__label-row', 16],
        ['.bnon-shopify-process__navigation', 0],
        ['.bnon-shopify-benefits__label-row, .bnon-shopify-benefits__intro', 16],
        ['.bnon-shopify-benefits__card', 0],
        ['.bnon-shopify-payment__label-row, .bnon-shopify-payment__heading', 16],
        ['.bnon-shopify-payment__flow, .bnon-shopify-payment__result', 0],
        ['.bnon-shopify-faq__label-row', 16],
        ['.bnon-shopify-faq__group', 0],
        ['.bnon-marketing-detail__card', 0],
        ['.bnon-marketing-detail__caption', 16],
      ];
      groups.forEach(([selector, rise, duration = 600, stagger = 100, threshold = .08]) => {
        this.root.querySelectorAll(selector).forEach((target, index) => {
          this.targets.set(target, { rise, duration, delay: Math.min(index, 4) * stagger, threshold });
          if (this.reduced.matches) revealed.add(target);
          else if (!revealed.has(target)) {
            this.prepareEntrance(target, this.targets.get(target));
            this.observer.observe(target);
          }
        });
      });
    }

    disconnect() {
      this.events.abort();
      this.observer.disconnect();
      this.mutations.disconnect();
      this.animations.forEach(animation => animation.cancel());
      this.animations.clear();
    }
  }

  customElements.define('bnon-shopify-detail', class extends HTMLElement {
    connectedCallback() {
      if (this.events) return;
      this.syncBreadcrumbs();
      // Other service Heroes reuse the same once-only copy/gallery entrances,
      // without starting the Shopify-specific mockup scroll controller.
      if (this.hasAttribute('data-intro-only')) {
        this.events = new AbortController();
        const main = this.closest('#MainContent');
        if (main) this.entrances = new DetailEntrances(main);
        return;
      }
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
      this.mobileAnimations = [];
      this.mobileProgress ??= 0;
      this.mobileVisible = false;
      const main = this.closest('#MainContent');
      if (main) this.entrances = new DetailEntrances(main);
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
      window.addEventListener('scroll', () => { if (this.visible && !this.mobile.matches) this.schedule(); }, { ...options, passive: true });
      window.addEventListener('resize', () => this.schedule(true), options);
      this.mobile.addEventListener('change', () => this.schedule(true), options);
      this.reducedMotion.addEventListener('change', () => this.schedule(true), options);
      document.addEventListener('visibilitychange', () => this.syncMobilePlayback(), options);
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
      this.mobileObserver = new IntersectionObserver(entries => {
        this.mobileVisible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .1);
        this.syncMobilePlayback();
      }, { threshold: [0, .1] });
      this.mobileObserver.observe(this.media);
      this.schedule(true);
    }

    syncBreadcrumbs() {
      // Only this detail section owns these overrides; shared layout and other pages stay untouched.
      const breadcrumbs = document.querySelector('[data-bnon-breadcrumbs]');
      if (!breadcrumbs) return;
      const home = breadcrumbs.querySelector('.bnon-breadcrumbs__link');
      const current = breadcrumbs.querySelector('.bnon-breadcrumbs__current');
      if (home && this.hasAttribute('data-breadcrumb-home-label')) home.textContent = this.dataset.breadcrumbHomeLabel;
      if (home && this.dataset.breadcrumbHomeLink) home.setAttribute('href', this.dataset.breadcrumbHomeLink);
      if (current && this.hasAttribute('data-breadcrumb-current-label')) current.textContent = this.dataset.breadcrumbCurrentLabel;
      if (this.hasAttribute('data-breadcrumb-separator')) {
        breadcrumbs.querySelectorAll('.bnon-breadcrumbs__separator').forEach(separator => {
          separator.textContent = this.dataset.breadcrumbSeparator;
        });
      }
      if (this.hasAttribute('data-breadcrumb-label')) breadcrumbs.setAttribute('aria-label', this.dataset.breadcrumbLabel);
    }

    measure() {
      this.needsMeasure = false;
      this.stopMobilePlayback();
      // As in the popup, travel is the actual rendered image height minus its
      // viewport height. Here only translateY changes; scrollTop is never set.
      this.screens.forEach(screen => {
        screen.maxTravel = Math.max(0, screen.image.getBoundingClientRect().height - screen.viewport.getBoundingClientRect().height);
      });
      const headerHeight = document.querySelector('.bnon-header')?.getBoundingClientRect().height || 0;
      this.stickyTop = headerHeight + 24;
      this.style.setProperty('--detail-sticky-top', `${this.stickyTop}px`);
      const enabled = this.dataset.scrollEnabled === 'true'
        && !this.mobile.matches
        && !this.reducedMotion.matches
        && this.screens.some(screen => screen.maxTravel > 0);
      this.classList.toggle('is-scroll-enabled', enabled);
      const range = Math.max(60, Math.min(300, Number(this.dataset.scrollRange) || 140));
      this.distance = enabled ? window.innerHeight * range / 100 : 0;
      // Sticky release and image completion now coincide, with no extra viewport-sized tail.
      if (enabled) this.stage.style.height = `${this.media.getBoundingClientRect().height + this.distance}px`;
      else this.stage.style.removeProperty('height');
      this.mobileEnabled = this.mobile.matches && this.dataset.mobileScrollEnabled === 'true'
        && this.dataset.mobileAutoplayEnabled !== 'false' && !this.reducedMotion.matches
        && this.screens.every(({ image }) => image.complete && image.naturalWidth > 0)
        && this.screens.some(screen => screen.maxTravel > 0);
      if (this.mobileEnabled) {
        // Keep editor values intact at 2.0592x speed (20% faster than the prior 1.716x rate).
        this.mobileDuration = Math.max(5000, Math.min(60000, Number(this.dataset.mobileAutoplayDuration) || 18000)) / 2.0592;
        this.mobileAnimations = this.screens.map(({ image, maxTravel }) => {
          const animation = image.animate([
            { transform: 'translateY(0px)' },
            { transform: `translateY(${-maxTravel}px)` },
          ], { duration: this.mobileDuration, easing: 'ease-in-out', fill: 'both' });
          animation.pause();
          animation.currentTime = this.mobileProgress * this.mobileDuration;
          animation.onfinish = () => {
            this.mobileProgress = 1;
            this.classList.remove('is-mobile-playing');
          };
          return animation;
        });
        this.syncMobilePlayback();
      }
    }

    stopMobilePlayback() {
      const animation = this.mobileAnimations?.[0];
      if (animation && this.mobileDuration) this.mobileProgress = Math.max(0, Math.min(1, (animation.currentTime || 0) / this.mobileDuration));
      this.mobileAnimations?.forEach(item => item.cancel());
      this.mobileAnimations = [];
      this.classList.remove('is-mobile-playing');
    }

    syncMobilePlayback() {
      const playing = this.mobileEnabled && this.mobileVisible && !document.hidden && !this.reducedMotion.matches && this.mobileProgress < 1;
      this.classList.toggle('is-mobile-playing', !!playing);
      this.mobileAnimations.forEach(animation => {
        if (playing && animation.playState !== 'running' && animation.playState !== 'finished') animation.play();
        else if (!playing && animation.playState === 'running') animation.pause();
      });
    }

    paint() {
      if (this.mobileEnabled) return;
      const progress = this.distance > 0
        ? Math.max(0, Math.min(1, (this.stickyTop - this.stage.getBoundingClientRect().top) / this.distance))
        : 0;
      this.screens.forEach(({ image, maxTravel }) => {
        image.style.setProperty('--detail-image-offset', `${-maxTravel * progress}px`);
      });
    }

    disconnectedCallback() {
      this.stopMobilePlayback();
      this.entrances?.disconnect();
      this.events?.abort();
      this.events = null;
      this.resizeObserver?.disconnect();
      this.intersectionObserver?.disconnect();
      this.mobileObserver?.disconnect();
      cancelAnimationFrame(this.frame);
      this.frame = null;
      this.stage?.style.removeProperty('height');
      this.classList.remove('is-scroll-enabled');
      this.screens?.forEach(({ image }) => image.style.removeProperty('--detail-image-offset'));
    }
  });
})();
