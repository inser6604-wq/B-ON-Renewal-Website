/* Geometry adapted from the preserved bnon-universe-3d-planets-bigger.html.
 * Each custom element owns its frame, observer and listeners. Shopify section
 * replacement triggers disconnect/connect, so editor reloads cannot leak loops.
 */
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
      this.frame = null;
      this.time = 0;
      this.lastTime = null;
      this.paused = false;
      this.visible = false;
      this.failed = false;
      this.removeAttribute('data-bnon-motion-failed');
      this.tick = (now) => {
        this.frame = null;
        if (!this.canAnimate()) return;
        if (this.lastTime !== null) this.time += Math.min(now - this.lastTime, 100) / 1000;
        this.lastTime = now;
        if (this.draw(this.time)) this.frame = requestAnimationFrame(this.tick);
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
        !this.reduced.matches && !this.small.matches && !this.failed;
    }

    stop() {
      if (this.frame !== null && this.frame !== undefined) cancelAnimationFrame(this.frame);
      this.frame = null;
      this.lastTime = null;
    }

    sync() {
      const staticMode = this.reduced.matches || this.small.matches;
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

if (!customElements.get('bnon-main-portfolio')) {
  class BnonMainPortfolio extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;

      this.tabs = Array.from(this.querySelectorAll('[data-bnon-project-tab]'));
      this.panels = Array.from(this.querySelectorAll('[data-bnon-project-panel]'));
      this.current = this.querySelector('[data-bnon-project-current]');
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.sectionId = this.closest('.shopify-section')?.id?.replace('shopify-section-', '') || '';
      if (!this.tabs.length || !this.panels.length || !this.current) return;

      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.tabs.forEach((tab) => {
        tab.addEventListener('click', () => this.activate(tab), options);
        tab.addEventListener('keydown', (event) => this.onKeydown(event, tab), options);
      });
      this.reduced.addEventListener('change', () => this.updateNextHint(), options);
      document.addEventListener('shopify:block:select', (event) => this.onBlockSelect(event), options);
      this.updateNextHint();
    }

    disconnectedCallback() {
      this.transitionTimer && clearTimeout(this.transitionTimer);
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

    activate(tab) {
      const nextId = tab.dataset.bnonProjectId;
      const nextPanel = this.panels.find((panel) => panel.dataset.bnonProjectId === nextId);
      const activeTab = this.tabs.find((item) => item.getAttribute('aria-selected') === 'true');
      const activePanel = this.panels.find((panel) => panel.classList.contains('is-active'));
      if (!nextPanel || tab === activeTab) return;

      this.transitionTimer && clearTimeout(this.transitionTimer);
      this.tabs.forEach((item) => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });

      nextPanel.hidden = false;
      nextPanel.classList.remove('is-leaving');
      requestAnimationFrame(() => nextPanel.classList.add('is-active'));

      if (activePanel) {
        activePanel.classList.remove('is-active');
        activePanel.classList.add('is-leaving');
      }

      this.transitionTimer = window.setTimeout(() => {
        this.panels.forEach((panel) => {
          if (panel === nextPanel) return;
          panel.hidden = true;
          panel.classList.remove('is-active', 'is-leaving');
        });
      }, this.reduced.matches ? 0 : 700);

      this.current.textContent = String(this.tabs.indexOf(tab) + 1).padStart(2, '0');
      this.updateNextHint();
    }

    updateNextHint() {
      this.tabs.forEach((tab) => tab.removeAttribute('data-bnon-next-hint'));
      if (this.dataset.enableNextHint !== 'true' || this.reduced.matches) return;

      const activeIndex = this.tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
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
      if (!this.items.length || !this.triggers.length) return;

      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.triggers.forEach((trigger) => trigger.addEventListener('click', () => this.activate(trigger), options));
      document.addEventListener('shopify:block:select', (event) => this.onBlockSelect(event), options);
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.controller = null;
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
      document.addEventListener('visibilitychange', () => this.syncAutoplay(), options);
      document.addEventListener('shopify:block:select', (event) => this.onBlockSelect(event), options);
      this.reduced.addEventListener('change', () => this.syncAutoplay(), options);
      this.observer = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        this.syncAutoplay();
      }, { threshold: 0.2 });
      this.observer.observe(this);
      this.updateProgress(false);
      this.syncAutoplay();
    }

    disconnectedCallback() {
      this.stopAutoplay();
      this.layerTimers?.forEach((timer) => clearTimeout(timer));
      this.layerTimers?.clear();
      this.observer?.disconnect();
      this.controller?.abort();
      this.controller = null;
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
      this.syncAutoplay();
    }

    toggleLayer(layer, active, animate) {
      const existingTimer = this.layerTimers.get(layer);
      if (existingTimer) clearTimeout(existingTimer);
      this.layerTimers.delete(layer);
      if (active) {
        layer.hidden = false;
        layer.classList.remove('is-leaving');
        if (animate && !this.reduced.matches) requestAnimationFrame(() => layer.classList.add('is-active'));
        else layer.classList.add('is-active');
        return;
      }
      if (!layer.classList.contains('is-active')) return;
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
      }, 650);
      this.layerTimers.set(layer, timer);
    }

    updateProgress(skipTransition) {
      const fraction = (this.currentIndex + 0.5) / this.triggers.length;
      this.progress.classList.toggle('is-resetting', skipTransition);
      this.progress.style.setProperty('--bnon-process-progress', String(fraction));
      if (skipTransition) requestAnimationFrame(() => this.progress.classList.remove('is-resetting'));
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
    }

    disconnectedCallback() {
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
