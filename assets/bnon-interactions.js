/* Geometry adapted from the preserved bnon-universe-3d-planets-bigger.html.
 * Each custom element owns its frame, observer and listeners. Shopify section
 * replacement triggers disconnect/connect, so editor reloads cannot leak loops.
 */
var bnonDesktopHomeEntrance = element => element.closest("#MainContent[data-template='index']")
  && window.matchMedia('(min-width: 1024px)').matches;
// Homepage sections used to begin at 72% opacity. Combined with an observer that
// could fire as soon as one pixel entered the viewport, that made their entrance
// look like the tail end of an animation. Keep this adjustment exclusive to the
// desktop homepage (the hero does not use these helpers), but wait until a
// meaningful portion is visible and always animate from a clear initial state.
var bnonEntranceThreshold = (element, fallback) => bnonDesktopHomeEntrance(element)
  ? Math.max(fallback, .15)
  : fallback;
var bnonEntranceDuration = (element, duration) => bnonDesktopHomeEntrance(element)
  ? Math.round(duration * 1.68)
  : duration;
var bnonEntranceEasing = (element, fallback) => bnonDesktopHomeEntrance(element)
  ? 'cubic-bezier(.22, .65, .25, 1)'
  : fallback;
// A small amount of initial visibility prevents a visible "off → on" flash
// when the observer starts an animation as the section reaches the viewport.
// It is still far enough from the finished state to make the motion readable.
var bnonEntranceStartOpacity = element => bnonDesktopHomeEntrance(element) ? .35 : 0;

if (!customElements.get('bnon-hero-universe')) {
  class BnonHeroUniverse extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.ringA = this.querySelector('[data-bnon-ring-a]');
      this.ringB = this.querySelector('[data-bnon-ring-b]');
      this.planetA = this.querySelector('[data-bnon-planet-a]');
      this.planetB = this.querySelector('[data-bnon-planet-b]');
      this.toggle = this.querySelector('[data-bnon-motion-toggle]');
      this.label = this.querySelector('[data-bnon-motion-label]');
      if (![this.ringA, this.ringB, this.planetA, this.planetB, this.toggle, this.label].every(Boolean)) return;

      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.small = window.matchMedia('(max-width: 480px)');
      this.animateOnSmall = this.matches('.bnon-hero__universe, .bnon-contact__universe');
      this.frame = null;
      this.time = 0;
      this.lastTime = null;
      // SVG paths are generated point-by-point. Keep the hero's established
      // cadence untouched; only the lower Contact SVG yields scroll headroom.
      this.mainPage = Boolean(this.closest("#MainContent[data-template='index']"))
        && this.matches('.bnon-contact__universe');
      this.lastDrawTime = -Infinity;
      this.drawInterval = this.mainPage ? 1000 / 45 : 0;
      this.paused = false;
      this.visible = false;
      this.failed = false;
      this.removeAttribute('data-bnon-motion-failed');
      this.tick = (now) => {
        this.frame = null;
        if (!this.canAnimate()) return;
        if (this.lastTime !== null) this.time += Math.min(now - this.lastTime, 100) / 1000;
        this.lastTime = now;
        if (!this.drawInterval || now - this.lastDrawTime >= this.drawInterval) {
          if (!this.draw(this.time)) return;
          this.lastDrawTime = now;
        }
        this.frame = requestAnimationFrame(this.tick);
      };
      this.toggle.addEventListener('click', () => {
        this.paused = !this.paused;
        this.sync();
      }, options);
      this.reduced.addEventListener('change', () => this.sync(), options);
      this.small.addEventListener('change', () => this.sync(), options);
      document.addEventListener('visibilitychange', () => this.sync(), options);
      this.draw(0);
      this.observer = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        this.sync();
      });
      this.observer.observe(this);
      this.sync();
    }

    disconnectedCallback() {
      this.stop();
      this.observer?.disconnect();
      this.controller?.abort();
      this.controller = null;
    }

    canAnimate() {
      return this.isConnected && this.visible && !document.hidden && !this.paused &&
        !this.reduced.matches && (this.animateOnSmall || !this.small.matches) && !this.failed;
    }

    stop() {
      if (this.frame !== null && this.frame !== undefined) cancelAnimationFrame(this.frame);
      this.frame = null;
      this.lastTime = null;
      this.lastDrawTime = -Infinity;
    }

    sync() {
      const staticMode = this.reduced.matches || (!this.animateOnSmall && this.small.matches);
      this.toggle.hidden = staticMode || this.failed;
      this.label.textContent = this.paused ? '애니메이션 재생' : '애니메이션 일시정지';
      if (staticMode) {
        this.time = 0;
        this.draw(0);
      }
      if (this.canAnimate()) {
        if (this.frame === null) this.frame = requestAnimationFrame(this.tick);
      } else {
        this.stop();
      }
    }

    point(theta, rx, ry, rz) {
      const x = 180 * Math.cos(theta);
      const y = 180 * Math.sin(theta);
      const y1 = y * Math.cos(rx);
      const z1 = y * Math.sin(rx);
      const x2 = x * Math.cos(ry) + z1 * Math.sin(ry);
      const z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
      const scale = 760 / (760 - z2);
      return {
        x: (x2 * Math.cos(rz) - y1 * Math.sin(rz)) * scale,
        y: (x2 * Math.sin(rz) + y1 * Math.cos(rz)) * scale,
        z: z2,
      };
    }

    ring(rx, ry, rz) {
      let path = '';
      for (let i = 0; i <= 180; i++) {
        const point = this.point(i / 180 * Math.PI * 2, rx, ry, rz);
        path += `${i === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)} `;
      }
      return `${path}Z`;
    }

    draw(time) {
      if (this.failed) return false;
      try {
        const deg = Math.PI / 180;
        const a = time * Math.PI * 2 / 2.55;
        const b = -time * Math.PI * 2 / 3.15;
        const arx = (67 + Math.sin(a * 0.52) * 11) * deg;
        const arz = 24 * deg;
        const bry = (61 + Math.sin(b * 0.47) * 9) * deg;
        const brz = -28 * deg;
        this.ringA.setAttribute('d', this.ring(arx, a, arz));
        this.ringB.setAttribute('d', this.ring(b, bry, brz));
        const pa = this.point(a * 1.18 + 0.35, arx, a, arz);
        const pb = this.point(-b * 1.07 + 3.4, b, bry, brz);
        [[this.planetA, pa], [this.planetB, pb]].forEach(([planet, point]) => {
          planet.setAttribute('cx', point.x);
          planet.setAttribute('cy', point.y);
          planet.style.opacity = String(0.48 + (point.z / 180 + 1) * 0.26);
        });
        return true;
      } catch {
        this.failed = true;
        this.stop();
        this.toggle.hidden = true;
        this.setAttribute('data-bnon-motion-failed', '');
        return false;
      }
    }
  }

  customElements.define('bnon-hero-universe', BnonHeroUniverse);
}

if (!customElements.get('bnon-our-universe')) {
  class BnonOurUniverse extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.cards = Array.from(this.querySelectorAll('[data-bnon-universe-card-tilt]'));
      this.viewport = this.querySelector('.bnon-our-universe__viewport');
      if (!this.cards.length || !this.viewport) return;

      this.controller = new AbortController();
      this.desktopPointer = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const options = { signal: this.controller.signal };
      this.viewport.addEventListener('pointermove', event => this.trackPointer(event), options);
      this.viewport.addEventListener('pointerleave', () => this.resetActive(), options);
      this.desktopPointer.addEventListener('change', () => {
        if (!this.desktopPointer.matches) this.resetActive();
      }, options);
      this.reduced.addEventListener('change', () => {
        if (this.reduced.matches) this.finishEntrance();
      }, options);
      this.setupEntrance();
    }

    setupEntrance() {
      this.intro = this.querySelector('.bnon-our-universe__intro');
      this.statValues = Array.from(this.querySelectorAll('.bnon-our-universe__stat-value'));
      this.countTargets = new Map(this.statValues.map(value => {
        const match = value.textContent.trim().match(/^(\d+)(.*)$/);
        return [value, match ? { target: Number(match[1]), suffix: match[2] } : null];
      }));
      this.statDetails = Array.from(this.querySelectorAll('.bnon-our-universe__stat :is(.bnon-our-universe__stat-title, .bnon-our-universe__stat-description)'));
      this.entranceObserver = new IntersectionObserver(entries => {
        if (this.entrancePlayed || !entries.some(entry => entry.isIntersecting)) return;
        this.entrancePlayed = true;
        this.entranceObserver.disconnect();
        if (this.reduced.matches) return this.finishEntrance();

        this.entranceAnimations = [];
        const animate = (element, frames, options) => {
          if (element?.animate) this.entranceAnimations.push(element.animate(frames, options));
        };
        animate(this.querySelector('.bnon-our-universe__heading'), [
          { opacity: bnonEntranceStartOpacity(this), transform: 'translateY(15px)' }, { opacity: 1, transform: 'none' },
        ], { duration: bnonEntranceDuration(this, 600), easing: bnonEntranceEasing(this, 'cubic-bezier(.22, 1, .36, 1)'), fill: 'backwards' });
        animate(this.querySelector('.bnon-our-universe__description'), [
          { opacity: bnonEntranceStartOpacity(this), transform: 'translateY(15px)' }, { opacity: 1, transform: 'none' },
        ], { duration: bnonEntranceDuration(this, 600), delay: 90, easing: bnonEntranceEasing(this, 'cubic-bezier(.22, 1, .36, 1)'), fill: 'backwards' });
        this.cards.forEach((card, index) => animate(card, [{ opacity: bnonEntranceStartOpacity(this) }, { opacity: 1 }], {
          duration: bnonEntranceDuration(this, 500), delay: 180 + index * 35, easing: bnonEntranceEasing(this, 'ease-out'), fill: 'backwards',
        }));
        this.statValues.forEach((value, index) => this.countUp(value, 250 + index * 80));
        this.statDetails.forEach((detail, index) => animate(detail, [
          { opacity: bnonEntranceStartOpacity(this), transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' },
        ], { duration: bnonEntranceDuration(this, 500), delay: 350 + index * 60, easing: bnonEntranceEasing(this, 'cubic-bezier(.22, 1, .36, 1)'), fill: 'backwards' }));
      }, { threshold: bnonEntranceThreshold(this, .15) });
      this.entranceObserver.observe(this);
    }

    countUp(element, delay) {
      const count = this.countTargets.get(element);
      if (!count) return;
      const { target, suffix } = count;
      const start = performance.now() + delay;
      const duration = bnonEntranceDuration(this, 1350);
      let lastPaint = -Infinity;
      const tick = now => {
        if (!this.isConnected || this.reduced.matches) return this.finishCount(element, target, suffix);
        const progress = Math.max(0, Math.min(1, (now - start) / duration));
        // Text replacement can force style work; a 30fps counter remains
        // visually smooth while keeping scroll frames available during entry.
        if (now - lastPaint >= 1000 / 30 || progress === 1) {
          element.textContent = `${Math.round(target * (1 - (1 - progress) ** 3))}${suffix}`;
          lastPaint = now;
        }
        if (progress < 1) this.countFrames.push(requestAnimationFrame(tick));
      };
      element.textContent = `0${suffix}`;
      this.countFrames ||= [];
      this.countFrames.push(requestAnimationFrame(tick));
    }

    finishCount(element, target, suffix) {
      element.textContent = `${target}${suffix}`;
    }

    finishEntrance() {
      this.entranceObserver?.disconnect();
      this.entranceAnimations?.forEach(animation => animation.cancel());
      this.countFrames?.forEach(frame => cancelAnimationFrame(frame));
      this.statValues?.forEach(value => {
        const count = this.countTargets?.get(value);
        if (count) this.finishCount(value, count.target, count.suffix);
      });
    }

    trackPointer(event) {
      if (!this.desktopPointer.matches) return;
      const point = { x: event.clientX, y: event.clientY };
      const card = this.closestCard(point);
      if (!card) return this.resetActive();
      if (this.activeCard && this.activeCard !== card) this.reset(this.activeCard);
      this.activeCard = card;
      this.pointerPosition = point;
      if (this.tiltFrame) return;
      this.tiltFrame = requestAnimationFrame(() => {
        this.tiltFrame = null;
        this.tilt(this.activeCard, this.pointerPosition);
      });
    }

    closestCard(point) {
      let closest = null;
      let closestDistance = Infinity;
      this.cards.forEach(card => {
        const bounds = card.getBoundingClientRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        const distance = Math.hypot(point.x - centerX, point.y - centerY);
        // Starts about 80px beyond a desktop card edge, before direct hover.
        const proximity = Math.max(100, Math.max(bounds.width, bounds.height) * 1.15);
        if (distance < proximity && distance < closestDistance) {
          closest = card;
          closestDistance = distance;
        }
      });
      return closest;
    }

    tilt(card, point) {
      if (!card || !point) return;
      const bounds = card.getBoundingClientRect();
      const x = Math.max(-.5, Math.min(.5, (point.x - bounds.left) / bounds.width - .5));
      const y = Math.max(-.5, Math.min(.5, (point.y - bounds.top) / bounds.height - .5));
      card.style.setProperty('--bnon-universe-cursor-tilt-x', `${(y * 16).toFixed(2)}deg`);
      card.style.setProperty('--bnon-universe-cursor-tilt-y', `${(-x * 16).toFixed(2)}deg`);
      card.style.transitionDuration = '.12s';
    }

    resetActive() {
      if (!this.activeCard) return;
      this.reset(this.activeCard);
      this.activeCard = null;
      this.pointerPosition = null;
    }

    reset(card) {
      card.style.removeProperty('--bnon-universe-cursor-tilt-x');
      card.style.removeProperty('--bnon-universe-cursor-tilt-y');
      card.style.removeProperty('transition-duration');
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.tiltFrame);
      this.finishEntrance();
      this.cards?.forEach(card => this.reset(card));
      this.controller?.abort();
      this.controller = null;
    }
  }

  customElements.define('bnon-our-universe', BnonOurUniverse);
}

if (!customElements.get('bnon-contact-entrance')) {
  class BnonContactEntrance extends HTMLElement {
    connectedCallback() {
      if (this.observer) return;
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.observer = new IntersectionObserver(entries => {
        if (this.played || !entries.some(entry => entry.isIntersecting)) return;
        this.played = true;
        this.observer.disconnect();
        if (this.reduced.matches) return;

        this.animations = [];
        const enter = (selector, delay, distance = 15, duration = 600) => {
          const element = this.querySelector(selector);
          if (!element?.animate) return;
          this.animations.push(element.animate([
            { opacity: bnonEntranceStartOpacity(this), transform: `translateY(${distance}px)` },
            { opacity: 1, transform: 'none' },
          ], { duration: bnonEntranceDuration(this, duration), delay, easing: bnonEntranceEasing(this, 'cubic-bezier(.22, 1, .36, 1)'), fill: 'backwards' }));
        };
        enter('.bnon-contact__heading', 0);
        enter('.bnon-contact__title', 90);
        enter('.bnon-contact__description', 180);
        enter('.bnon-contact__note', 180);
        enter('.bnon-contact__actions', 280);

        const universe = this.querySelector('.bnon-contact__universe');
        if (universe?.animate) {
          const restingOpacity = getComputedStyle(universe).opacity;
          this.animations.push(universe.animate([{ opacity: bnonEntranceStartOpacity(this) }, { opacity: restingOpacity }], {
            duration: bnonEntranceDuration(this, 600), delay: 390, easing: bnonEntranceEasing(this, 'ease-out'), fill: 'backwards',
          }));
        }
        ['.bnon-contact__bubble--one', '.bnon-contact__bubble--two', '.bnon-contact__bubble--three']
          .forEach((selector, index) => enter(selector, 620 + index * 130, 20, 500));
      }, { threshold: bnonEntranceThreshold(this, .15) });
      this.observer.observe(this);
    }

    disconnectedCallback() {
      this.observer?.disconnect();
      this.animations?.forEach(animation => animation.cancel());
    }
  }

  customElements.define('bnon-contact-entrance', BnonContactEntrance);
}

if (!customElements.get('bnon-main-portfolio')) {
  class BnonMainPortfolio extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;

      this.tabs = Array.from(this.querySelectorAll('[data-bnon-project-tab]'));
      this.panels = Array.from(this.querySelectorAll('[data-bnon-project-panel]'));
      this.current = this.querySelector('[data-bnon-project-current]');
      this.previousButton = this.querySelector('[data-bnon-project-previous]');
      this.nextButton = this.querySelector('[data-bnon-project-next]');
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.sectionId = this.closest('.shopify-section')?.id?.replace('shopify-section-', '') || '';
      if (!this.tabs.length || !this.panels.length || !this.current) return;

      this.controller = new AbortController();
const options = { signal: this.controller.signal };

      this.tabs.forEach((tab) => {
        tab.addEventListener('click', () => this.activate(tab), options);
        tab.addEventListener('keydown', (event) => this.onKeydown(event, tab), options);
      });
      this.previousButton?.addEventListener('click', () => this.moveProject(-1), options);
      this.nextButton?.addEventListener('click', () => this.moveProject(1), options);

// Portfolio swipe / drag
let startX = 0;
let startY = 0;
let dragging = false;

const startSwipe = (x, y) => {
  startX = x;
  startY = y;
  dragging = true;
};

const endSwipe = (x, y) => {
  if (!dragging) return;
  dragging = false;

  const deltaX = x - startX;
  const deltaY = y - startY;

  // 짧은 움직임 / 세로 움직임은 무시
  if (Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

  const tabs = Array.from(this.tabs);

  const activeIndex = tabs.findIndex(
    (tab) => tab.getAttribute('aria-selected') === 'true'
  );

  if (activeIndex < 0) return;

  const nextIndex =
    deltaX < 0
      ? Math.min(activeIndex + 1, tabs.length - 1)
      : Math.max(activeIndex - 1, 0);

  if (nextIndex !== activeIndex) {
    this.activate(tabs[nextIndex]);
  }
};

// Mobile / Tablet
this.addEventListener(
  'touchstart',
  (event) => {
    const touch = event.touches[0];
    startSwipe(touch.clientX, touch.clientY);
  },
  { passive: true, signal: this.controller.signal }
);

this.addEventListener(
  'touchend',
  (event) => {
    const touch = event.changedTouches[0];
    endSwipe(touch.clientX, touch.clientY);
  },
  { passive: true, signal: this.controller.signal }
);

// Desktop
this.addEventListener(
  'pointerdown',
  (event) => {
    if (event.pointerType === 'touch') return;
    if (event.target.closest('a, button, [role="tab"]')) return;

    startSwipe(event.clientX, event.clientY);
  },
  options
);

this.addEventListener(
  'pointerup',
  (event) => {
    if (event.pointerType === 'touch') return;

    endSwipe(event.clientX, event.clientY);
  },
  options
);
      this.reduced.addEventListener('change', () => this.updateNextHint(), options);
      document.addEventListener('shopify:block:select', (event) => this.onBlockSelect(event), options);
      this.updateNextHint();
      // Warm background images before switching to a previously hidden panel.
      this.querySelectorAll('.bnon-main-portfolio__background-image').forEach(image => {
        image.loading = 'eager';
      });
      if (!this.hasEntered) {
        this.entryObserver = new IntersectionObserver(entries => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          this.hasEntered = true;
          this.entryObserver.disconnect();
          if (!this.reduced.matches) {
            this.entryAnimation = this.querySelector('.bnon-main-portfolio__stage')?.animate(
              [{ opacity: bnonEntranceStartOpacity(this) }, { opacity: 1 }], { duration: bnonEntranceDuration(this, 500), easing: bnonEntranceEasing(this, 'ease-out') }
            );
          }
        }, { threshold: bnonEntranceThreshold(this, 0) });
        this.entryObserver.observe(this);
      }
    }

    disconnectedCallback() {
      this.transitionTimer && clearTimeout(this.transitionTimer);
      this.entryObserver?.disconnect();
      this.entryAnimation?.cancel();
      this.counterAnimation?.cancel();
      this.controller?.abort();
      this.controller = null;
    }

    onKeydown(event, tab) {
      const index = this.tabs.indexOf(tab);
      let nextIndex = index;
      if (event.key === 'ArrowRight') nextIndex = Math.min(index + 1, this.tabs.length - 1);
      else if (event.key === 'ArrowLeft') nextIndex = Math.max(index - 1, 0);
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = this.tabs.length - 1;
      else return;

      event.preventDefault();
      const nextTab = this.tabs[nextIndex];
      this.activate(nextTab);
      nextTab.focus();
    }

    onBlockSelect(event) {
      if (this.sectionId && event.detail.sectionId !== this.sectionId) return;
      const tab = this.tabs.find((item) => item.dataset.bnonProjectId === event.detail.blockId);
      if (tab) this.activate(tab);
    }

    syncActiveTabIntoView(tab) {
      // Only phones use a scrollable tab row. Tablet keeps every tab visible,
      // while desktop deliberately retains its existing layout.
      if (!window.matchMedia('(max-width: 767px)').matches) return;
      const viewport = this.querySelector('.bnon-main-portfolio__tabs-wrap');
      if (!viewport) return;

      const target = tab.offsetLeft + tab.offsetWidth / 2 - viewport.clientWidth / 2;
      viewport.scrollTo({
        left: target,
        behavior: this.reduced.matches ? 'auto' : 'smooth',
      });
    }

    activate(tab) {
      const nextId = tab.dataset.bnonProjectId;
      const nextPanel = this.panels.find((panel) => panel.dataset.bnonProjectId === nextId);
      const activeTab = this.tabs.find((item) => item.getAttribute('aria-selected') === 'true');
      if (!nextPanel || tab === activeTab) return;

      this.transitionTimer && clearTimeout(this.transitionTimer);
      this.tabs.forEach((item) => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });

      // Retarget in-flight fades from their current opacity; no queued activation frames.
      // Leaving panels remain visible only for compositing, never keyboard/pointer input.
      this.panels.forEach(panel => {
        panel.inert = panel !== nextPanel;
        if (panel !== nextPanel && !panel.hidden) {
          panel.classList.remove('is-active');
          panel.classList.add('is-leaving');
        }
      });
      nextPanel.hidden = false;
      nextPanel.classList.remove('is-leaving');
      void nextPanel.offsetWidth;
      nextPanel.classList.add('is-active');

      this.transitionTimer = window.setTimeout(() => {
        this.panels.forEach((panel) => {
          if (panel === nextPanel) return;
          panel.hidden = true;
          panel.classList.remove('is-active', 'is-leaving');
        });
      }, this.reduced.matches ? 0 : 650);

      this.counterAnimation?.cancel();
      this.current.textContent = String(this.tabs.indexOf(tab) + 1).padStart(2, '0');
      if (!this.reduced.matches) {
        this.counterAnimation = this.current.animate(
          [{ opacity: .25 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' }
        );
      }
      this.syncActiveTabIntoView(tab);
      this.updateNextHint();
    }

    moveProject(direction) {
      const activeIndex = this.tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
      const nextTab = this.tabs[activeIndex + direction];
      if (nextTab) this.activate(nextTab);
    }

    updateNextHint() {
      const activeIndex = this.tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
      this.previousButton && (this.previousButton.disabled = activeIndex <= 0);
      this.nextButton && (this.nextButton.disabled = activeIndex >= this.tabs.length - 1);
      this.tabs.forEach((tab) => tab.removeAttribute('data-bnon-next-hint'));
      if (this.dataset.enableNextHint !== 'true' || this.reduced.matches) return;

      const nextTab = this.tabs[activeIndex + 1];
      if (!nextTab) return;
      nextTab.setAttribute('data-bnon-next-hint', '');
    }
  }

  customElements.define('bnon-main-portfolio', BnonMainPortfolio);
}

if (!customElements.get('bnon-what-we-do')) {
  class BnonWhatWeDo extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;

      this.items = Array.from(this.querySelectorAll('[data-bnon-service-item]'));
      this.triggers = Array.from(this.querySelectorAll('[data-bnon-service-trigger]'));
      this.panels = Array.from(this.querySelectorAll('[data-bnon-service-panel]'));
      this.sectionId = this.closest('.shopify-section')?.id?.replace('shopify-section-', '') || '';

      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.setupEntrance(options);
      if (!this.items.length || !this.triggers.length) return;
      this.triggers.forEach((trigger) => trigger.addEventListener('click', () => this.activate(trigger), options));
      document.addEventListener('shopify:block:select', (event) => this.onBlockSelect(event), options);
    }

    disconnectedCallback() {
      this.entranceObserver?.disconnect();
      this.entranceAnimations?.forEach(animation => animation.cancel());
      this.controller?.abort();
      this.controller = null;
    }

    setupEntrance(options) {
      if (this.entrancePlayed) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const stopEntrance = () => {
        if (!reduced.matches) return;
        this.entrancePlayed = true;
        this.entranceObserver?.disconnect();
        this.entranceAnimations?.forEach(animation => animation.cancel());
      };
      // No hidden base styles: content stays accessible without animation support.
      if (reduced.matches || !('IntersectionObserver' in window)) {
        this.entrancePlayed = true;
        return;
      }
      reduced.addEventListener('change', stopEntrance, options);
      this.entranceObserver = new IntersectionObserver(entries => {
        if (this.entrancePlayed || !entries.some(entry => entry.isIntersecting)) return;
        this.entrancePlayed = true;
        this.entranceObserver.disconnect();
        if (reduced.matches) return;
        this.entranceAnimations = [];
        [
          ['eyebrow', 15],
          ['heading', 20],
          ['description', 15],
          ['accordion', 30],
        ].forEach(([part, distance], index) => {
          const element = this.querySelector(`.bnon-what-we-do__${part}`);
          if (!element?.animate) return;
          // Only the outer accordion container moves; its panels retain their own transitions.
          this.entranceAnimations.push(element.animate([
            { opacity: bnonEntranceStartOpacity(this), transform: `translateY(${distance}px)` },
            { opacity: 1, transform: 'none' },
          ], {
            duration: bnonEntranceDuration(this, 750),
            delay: index * (bnonDesktopHomeEntrance(this) ? 135 : 120),
            easing: bnonEntranceEasing(this, 'cubic-bezier(.22, 1, .36, 1)'),
            fill: 'backwards',
          }));
        });
      }, { threshold: bnonEntranceThreshold(this, 0) });
      this.entranceObserver.observe(this);
    }

    onBlockSelect(event) {
      if (this.sectionId && event.detail.sectionId !== this.sectionId) return;
      const trigger = this.triggers.find((item) => item.dataset.bnonServiceId === event.detail.blockId);
      if (trigger) this.activate(trigger);
    }

    activate(trigger) {
      const current = this.triggers.find((item) => item.getAttribute('aria-expanded') === 'true');
      if (current === trigger) return;

      this.triggers.forEach((item) => {
        const open = item === trigger;
        item.setAttribute('aria-expanded', String(open));
        const serviceItem = item.closest('[data-bnon-service-item]');
        serviceItem?.classList.toggle('is-open', open);
        const panel = serviceItem?.querySelector('[data-bnon-service-panel]');
        panel?.setAttribute('aria-hidden', String(!open));
        serviceItem?.querySelectorAll('[data-bnon-service-link]').forEach((link) => {
          link.tabIndex = open ? 0 : -1;
        });
      });
    }
  }

  customElements.define('bnon-what-we-do', BnonWhatWeDo);
}

if (!customElements.get('bnon-process')) {
  class BnonProcess extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;

      this.triggers = Array.from(this.querySelectorAll('[data-bnon-process-trigger]'));
      this.panels = Array.from(this.querySelectorAll('[data-bnon-process-panel]'));
      this.images = Array.from(this.querySelectorAll('[data-bnon-process-image]'));
      this.progress = this.querySelector('[data-bnon-process-progress]');
      this.mobileBottomProgress = this.querySelector('[data-bnon-process-mobile-bottom-progress]');
      this.previousButton = this.querySelector('[data-bnon-process-previous]');
      this.nextButton = this.querySelector('[data-bnon-process-next]');
      this.sectionId = this.closest('.shopify-section')?.id?.replace('shopify-section-', '') || '';
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.currentIndex = 0;
      this.visible = false;
      this.timer = null;
      this.layerTimers = new Map();
      if (!this.triggers.length || !this.panels.length || !this.progress) return;

      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.triggers.forEach((trigger) => trigger.addEventListener('click', () => this.activate(this.triggers.indexOf(trigger), true), options));
      this.previousButton?.addEventListener('click', () => this.activate(this.currentIndex - 1, true), options);
      this.nextButton?.addEventListener('click', () => this.activate(this.currentIndex + 1, true), options);
      document.addEventListener('visibilitychange', () => this.syncAutoplay(), options);
      document.addEventListener('shopify:block:select', (event) => this.onBlockSelect(event), options);
      this.reduced.addEventListener('change', () => this.syncAutoplay(), options);
      this.reduced.addEventListener('change', () => {
        if (this.reduced.matches) this.entranceAnimations?.forEach(animation => animation.cancel());
      }, options);
      this.observer = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        this.syncAutoplay();
      }, { threshold: 0.2 });
      this.observer.observe(this);
      this.entranceObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) this.playEntrance();
      }, { threshold: bnonEntranceThreshold(this, .2) });
      this.entranceObserver.observe(this);
      this.updateProgress(true);
      this.updateStepArrows();
      this.syncAutoplay();
    }

    disconnectedCallback() {
      this.stopAutoplay();
      this.entranceAnimations?.forEach(animation => animation.cancel());
      this.layerTimers?.forEach((timer) => clearTimeout(timer));
      this.layerTimers?.clear();
      this.observer?.disconnect();
      this.entranceObserver?.disconnect();
      this.controller?.abort();
      this.controller = null;
    }

    playEntrance() {
      if (this.entrancePlayed) return;
      this.entrancePlayed = true;
      this.entranceObserver?.disconnect();
      if (this.reduced.matches) return;
      this.entranceAnimations = [];
      [
        ['.bnon-process__intro', 'translateY(15px)', 0],
        ['.bnon-process__panel.is-active > :not(.bnon-process__confirm-text)', 'translateY(15px)', 100],
        ['.bnon-process__media', 'translateX(20px)', 200],
        ['.bnon-process__panel.is-active .bnon-process__confirm-text, .bnon-process__steps', null, 300],
      ].forEach(([selector, transform, delay]) => {
        this.querySelectorAll(selector).forEach(element => {
          if (!element.animate) return;
          const frames = transform
            ? [{ opacity: bnonEntranceStartOpacity(this), transform }, { opacity: 1, transform: 'none' }]
            : [{ opacity: bnonEntranceStartOpacity(this) }, { opacity: 1 }];
          this.entranceAnimations.push(element.animate(frames, {
            duration: bnonEntranceDuration(this, 600), delay, easing: bnonEntranceEasing(this, 'cubic-bezier(.22, 1, .36, 1)'), fill: 'backwards',
          }));
        });
      });
    }

    onBlockSelect(event) {
      if (this.sectionId && event.detail.sectionId !== this.sectionId) return;
      const index = this.triggers.findIndex((trigger) => trigger.dataset.bnonProcessId === event.detail.blockId);
      if (index >= 0) this.activate(index, true);
    }

    canAutoplay() {
      return this.dataset.enableAutoplay === 'true' && !this.reduced.matches && this.visible && !document.hidden && this.triggers.length > 1;
    }

    syncAutoplay() {
      this.stopAutoplay();
      if (!this.canAutoplay()) return;
      const interval = Number(this.dataset.autoplayInterval) || 5000;
      this.timer = window.setTimeout(() => this.activate((this.currentIndex + 1) % this.triggers.length), interval);
    }

    stopAutoplay() {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
    }

    activate(index, userInitiated = false) {
      if (index < 0 || index >= this.triggers.length) return;
      const previousIndex = this.currentIndex;
      const changed = index !== previousIndex;
      this.currentIndex = index;
      this.stopAutoplay();

      this.triggers.forEach((trigger, triggerIndex) => {
        const active = triggerIndex === index;
        trigger.classList.toggle('is-active', active);
        trigger.setAttribute('aria-current', active ? 'step' : 'false');
      });
      this.panels.forEach((panel, panelIndex) => this.toggleLayer(panel, panelIndex === index, changed));
      this.images.forEach((image, imageIndex) => this.toggleLayer(image, imageIndex === index, changed));
      this.updateProgress(changed && index < previousIndex);
      this.updateStepArrows();
      this.syncAutoplay();
    }

    updateStepArrows() {
      this.previousButton && (this.previousButton.disabled = this.currentIndex <= 0);
      this.nextButton && (this.nextButton.disabled = this.currentIndex >= this.triggers.length - 1);
    }

    toggleLayer(layer, active, animate) {
      const existingTimer = this.layerTimers.get(layer);
      if (existingTimer) clearTimeout(existingTimer);
      this.layerTimers.delete(layer);
      if (active) {
        layer.hidden = false;
        layer.classList.remove('is-leaving');
        // Commit the current opacity before retargeting; no stale activation frame can win.
        if (animate && !this.reduced.matches) void layer.offsetWidth;
        layer.classList.add('is-active');
        return;
      }
      if (!layer.classList.contains('is-active') && !layer.classList.contains('is-leaving')) return;
      layer.classList.remove('is-active');
      if (!animate || this.reduced.matches) {
        layer.hidden = true;
        return;
      }
      layer.classList.add('is-leaving');
      const timer = window.setTimeout(() => {
        layer.hidden = true;
        layer.classList.remove('is-leaving');
        this.layerTimers.delete(layer);
      }, 450);
      this.layerTimers.set(layer, timer);
    }

    updateProgress(skipTransition) {
      const isFinalStep = this.currentIndex === this.triggers.length - 1;
      const fraction = isFinalStep ? 1 : (this.currentIndex + 0.5) / this.triggers.length;
      const mobileTopProgress = [0.1875, 0.5625, 1, 1, 1][this.currentIndex] ?? 1;
      const mobileBottomProgress = [0, 0, 0, 0.5, 1][this.currentIndex] ?? 1;
      this.progress.dataset.step = String(this.currentIndex + 1);
      this.progress.toggleAttribute('data-mobile-top-complete', this.currentIndex >= 2);
      this.progress.classList.toggle('has-mobile-top-dot', this.currentIndex < 2);
      this.progress.classList.toggle('is-resetting', skipTransition);
      this.progress.style.setProperty('--bnon-process-progress', String(fraction));
      this.progress.style.setProperty('--bnon-process-mobile-top-progress', String(mobileTopProgress));
      this.mobileBottomProgress?.toggleAttribute('data-active-track', this.currentIndex >= 3);
      this.mobileBottomProgress?.toggleAttribute('data-complete', this.currentIndex === 4);
      this.mobileBottomProgress?.classList.toggle('has-mobile-bottom-dot', this.currentIndex === 3);
      this.mobileBottomProgress?.style.setProperty('--bnon-process-mobile-bottom-progress', `${mobileBottomProgress * 100}%`);
      if (skipTransition) {
        void this.progress.offsetWidth;
        requestAnimationFrame(() => this.progress.classList.remove('is-resetting'));
      }
    }
  }

  customElements.define('bnon-process', BnonProcess);
}

if (!customElements.get('bnon-faq')) {
  class BnonFaq extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;

      this.triggers = Array.from(this.querySelectorAll('[data-bnon-faq-trigger]'));
      this.sectionId = this.closest('.shopify-section')?.id?.replace('shopify-section-', '') || '';
      if (!this.triggers.length) return;

      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.triggers.forEach((trigger) => trigger.addEventListener('click', () => this.activate(trigger), options));
      document.addEventListener('shopify:block:select', (event) => this.onBlockSelect(event), options);
      this.setupEntrance();
    }

    setupEntrance() {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.entranceObserver = new IntersectionObserver(entries => {
        if (this.entrancePlayed || !entries.some(entry => entry.isIntersecting)) return;
        this.entrancePlayed = true;
        this.entranceObserver.disconnect();
        if (reduced.matches) return;
        this.entranceAnimations = [
          [this.querySelector('.bnon-faq__intro'), 'translateX(-15px)', 0],
          [this.querySelector('.bnon-faq__accordion'), 'translateX(15px)', 100],
        ].flatMap(([element, transform, delay]) => element?.animate ? [element.animate([
          { opacity: bnonEntranceStartOpacity(this), transform }, { opacity: 1, transform: 'none' },
        ], { duration: bnonEntranceDuration(this, 650), delay, easing: bnonEntranceEasing(this, 'cubic-bezier(.22, 1, .36, 1)'), fill: 'backwards' })] : []);
      }, { threshold: bnonEntranceThreshold(this, .15) });
      this.entranceObserver.observe(this);
    }

    disconnectedCallback() {
      this.entranceObserver?.disconnect();
      this.entranceAnimations?.forEach(animation => animation.cancel());
      this.controller?.abort();
      this.controller = null;
    }

    onBlockSelect(event) {
      if (this.sectionId && event.detail.sectionId !== this.sectionId) return;
      const trigger = this.triggers.find((item) => item.dataset.bnonFaqId === event.detail.blockId);
      if (trigger) this.activate(trigger);
    }

    activate(trigger) {
      if (trigger.getAttribute('aria-expanded') === 'true') return;

      this.triggers.forEach((item) => {
        const open = item === trigger;
        item.setAttribute('aria-expanded', String(open));
        const faqItem = item.closest('[data-bnon-faq-item]');
        faqItem?.classList.toggle('is-open', open);
        faqItem?.querySelector('[data-bnon-faq-panel]')?.setAttribute('aria-hidden', String(!open));
      });
    }
  }

  customElements.define('bnon-faq', BnonFaq);
}

if (!customElements.get('bnon-review')) {
  class BnonReview extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;

      this.viewport = this.querySelector('[data-bnon-review-viewport]');
      this.cards = Array.from(this.querySelectorAll('[data-bnon-review-card]'));
      this.current = this.querySelector('[data-bnon-review-current]');
      this.total = this.querySelector('[data-bnon-review-total]');
      this.sectionId = this.closest('.shopify-section')?.id?.replace('shopify-section-', '') || '';
      if (!this.viewport || !this.cards.length || !this.current || !this.total) return;

      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.enableAutoplay = this.dataset.enableAutoplay === 'true' && !this.reduced.matches;
      this.autoplaySpeed = Number.parseInt(this.dataset.autoplaySpeed, 10) || 5000;
      this.isVisible = true;
      this.total.textContent = String(this.cards.length).padStart(2, '0');
      this.addEventListener('dragstart', (event) => this.preventNativeDrag(event), { capture: true, ...options });
      this.viewport.addEventListener('scroll', () => this.updateCurrent(), options);
      this.viewport.addEventListener('pointerdown', (event) => this.onPointerDown(event), options);
      this.viewport.addEventListener('pointermove', (event) => this.onPointerMove(event), options);
      this.viewport.addEventListener('pointerup', (event) => this.onPointerUp(event), options);
      this.viewport.addEventListener('pointercancel', (event) => this.onPointerCancel(event), options);
      this.viewport.addEventListener('click', (event) => this.onClick(event), options);
      this.viewport.addEventListener('keydown', (event) => this.onKeydown(event), options);
      document.addEventListener('shopify:block:select', (event) => this.onBlockSelect(event), options);
      document.addEventListener('visibilitychange', () => this.syncAutoplay(), options);
      window.addEventListener('resize', () => this.onResize(), options);
      this.observer = new IntersectionObserver((entries) => {
        this.isVisible = entries[0]?.isIntersecting || false;
        this.syncAutoplay();
      }, { threshold: 0.2 });
      this.observer.observe(this);
      this.setupEntrance();
      this.updateCurrent();
      this.syncAutoplay();
    }

    disconnectedCallback() {
      if (this.frame) cancelAnimationFrame(this.frame);
      window.clearTimeout(this.autoplayTimer);
      this.observer?.disconnect();
      this.entranceObserver?.disconnect();
      this.entranceAnimations?.forEach(animation => animation.cancel());
      this.observer = null;
      this.controller?.abort();
      this.controller = null;
    }

    setupEntrance() {
      this.entranceObserver = new IntersectionObserver(entries => {
        if (this.entrancePlayed || !entries.some(entry => entry.isIntersecting)) return;
        this.entrancePlayed = true;
        this.entranceObserver.disconnect();
        if (this.reduced.matches) return;
        const animate = (element, frames, options) => {
          if (element?.animate) (this.entranceAnimations ||= []).push(element.animate(frames, options));
        };
        animate(this.querySelector('.bnon-review__intro'), [
          { opacity: bnonEntranceStartOpacity(this), transform: 'translateY(15px)' }, { opacity: 1, transform: 'none' },
        ], { duration: bnonEntranceDuration(this, 600), easing: bnonEntranceEasing(this, 'cubic-bezier(.22, 1, .36, 1)'), fill: 'backwards' });
        animate(this.querySelector('.bnon-review__count'), [{ opacity: bnonEntranceStartOpacity(this) }, { opacity: 1 }], {
          duration: bnonEntranceDuration(this, 500), delay: bnonDesktopHomeEntrance(this) ? 100 : 80, easing: bnonEntranceEasing(this, 'ease-out'), fill: 'backwards',
        });
        this.cards.slice(0, 3).forEach((card, index) => animate(card, [
          { opacity: bnonEntranceStartOpacity(this), transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' },
        ], { duration: bnonEntranceDuration(this, 600), delay: (bnonDesktopHomeEntrance(this) ? 200 : 160) + index * (bnonDesktopHomeEntrance(this) ? 110 : 100), easing: bnonEntranceEasing(this, 'cubic-bezier(.22, 1, .36, 1)'), fill: 'backwards' }));
      }, { threshold: bnonEntranceThreshold(this, .15) });
      this.entranceObserver.observe(this);
    }

    preventNativeDrag(event) {
      if (event.target.closest?.('[data-bnon-review-card]')) event.preventDefault();
    }

    onPointerDown(event) {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      this.drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: this.viewport.scrollLeft,
        direction: null,
      };
    }

    onPointerMove(event) {
      const drag = this.drag;
      if (!drag || event.pointerId !== drag.pointerId || drag.direction === 'vertical') return;
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;

      if (!drag.direction) {
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 8) return;
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          drag.direction = 'vertical';
          return;
        }
        drag.direction = 'horizontal';
        this.viewport.classList.add('is-dragging');
        this.viewport.setPointerCapture?.(event.pointerId);
      }

      event.preventDefault();
      if (this.isMobileSwipe()) {
        this.viewport.scrollLeft = drag.startScrollLeft - deltaX;
        this.updateCurrent();
      }
    }

    onPointerUp(event) {
      const drag = this.drag;
      if (!drag || (event?.pointerId !== undefined && event.pointerId !== drag.pointerId)) return;
      this.drag = null;

      if (drag.direction === 'horizontal') {
        this.viewport.classList.remove('is-dragging');
        if (this.viewport.hasPointerCapture?.(drag.pointerId)) {
          this.viewport.releasePointerCapture(drag.pointerId);
        }
        const deltaX = (event?.clientX || drag.startX) - drag.startX;
        if (this.isMobileSwipe()) {
          if (Math.abs(deltaX) >= 8) {
            this.preventClick = true;
            window.setTimeout(() => { this.preventClick = false; }, 0);
          }
          this.scrollToGroup(this.currentGroup());
          this.restartAutoplay();
          return;
        }
        if (Math.abs(deltaX) >= 50) {
          this.preventClick = true;
          window.setTimeout(() => { this.preventClick = false; }, 0);
          const direction = deltaX < 0 ? 1 : -1;
          const nextGroup = Math.max(0, Math.min(this.groupCount() - 1, this.currentGroup() + direction));
          this.scrollToGroup(nextGroup);
          this.restartAutoplay();
        }
      }
    }

    onPointerCancel(event) {
      if (!this.drag || event.pointerId !== this.drag.pointerId) return;
      if (this.drag.direction === 'horizontal') {
        this.viewport.classList.remove('is-dragging');
        if (this.isMobileSwipe()) this.scrollToGroup(this.currentGroup());
      }
      if (this.viewport.hasPointerCapture?.(this.drag.pointerId)) {
        this.viewport.releasePointerCapture(this.drag.pointerId);
      }
      this.drag = null;
    }

    onClick(event) {
      if (!this.preventClick) return;
      event.preventDefault();
      event.stopPropagation();
      this.preventClick = false;
    }

    onKeydown(event) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const group = this.currentGroup();
      if (event.key === 'ArrowLeft') this.scrollToGroup(Math.max(0, group - 1));
      if (event.key === 'ArrowRight') this.scrollToGroup(Math.min(this.groupCount() - 1, group + 1));
      if (event.key === 'Home') this.scrollToGroup(0);
      if (event.key === 'End') this.scrollToGroup(this.groupCount() - 1);
      this.restartAutoplay();
    }

    onBlockSelect(event) {
      if (this.sectionId && event.detail.sectionId !== this.sectionId) return;
      const index = this.cards.findIndex((card) => card.dataset.bnonReviewId === event.detail.blockId);
      if (index >= 0) {
        this.scrollToGroup(Math.floor(index / this.cardsPerView()));
        this.restartAutoplay();
      }
    }

    cardsPerView() {
      if (window.matchMedia('(min-width: 1024px)').matches) return 3;
      if (window.matchMedia('(min-width: 768px)').matches) return 2;
      return 1;
    }

    isMobileSwipe() {
      return window.matchMedia('(max-width: 767px)').matches;
    }

    groupCount() {
      return Math.ceil(this.cards.length / this.cardsPerView());
    }

    currentGroup() {
      const firstGroupCard = this.cards[this.cardsPerView()] || this.cards[0];
      const pageWidth = firstGroupCard.offsetLeft || this.viewport.clientWidth || 1;
      return Math.max(0, Math.min(this.groupCount() - 1, Math.round(this.viewport.scrollLeft / pageWidth)));
    }

    updateCurrent() {
      if (this.frame) return;
      this.frame = requestAnimationFrame(() => {
        this.frame = null;
        const lastVisible = Math.min(this.cards.length, (this.currentGroup() + 1) * this.cardsPerView());
        this.current.textContent = String(lastVisible).padStart(2, '0');
      });
    }

    scrollToGroup(group, behavior = 'smooth') {
      const card = this.cards[group * this.cardsPerView()];
      if (!card) return;
      this.viewport.scrollTo({ left: card.offsetLeft, behavior });
    }

    onResize() {
      this.scrollToGroup(this.currentGroup(), 'auto');
      this.updateCurrent();
    }

    restartAutoplay() {
      window.clearTimeout(this.autoplayTimer);
      this.syncAutoplay();
    }

    syncAutoplay() {
      window.clearTimeout(this.autoplayTimer);
      if (!this.enableAutoplay || !this.isVisible || document.hidden) return;
      this.autoplayTimer = window.setTimeout(() => {
        const nextGroup = this.currentGroup() >= this.groupCount() - 1 ? 0 : this.currentGroup() + 1;
        this.scrollToGroup(nextGroup);
        this.syncAutoplay();
      }, this.autoplaySpeed);
    }
  }

  customElements.define('bnon-review', BnonReview);
}
