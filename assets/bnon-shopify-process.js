/* Scoped carousel lifecycle; no changes to the homepage process or page scroll. */
(() => {
  if (customElements.get('bnon-shopify-process')) return;

  customElements.define('bnon-shopify-process', class extends HTMLElement {
    connectedCallback() {
      if (this.events) return;
      this.panels = [...this.querySelectorAll('[data-process-panel]')];
      this.triggers = [...this.querySelectorAll('[data-process-trigger]')];
      this.stage = this.querySelector('.bnon-shopify-process__stage');
      this.navigation = this.querySelector('.bnon-shopify-process__navigation');
      this.previous = this.querySelector('[data-process-previous]');
      this.next = this.querySelector('[data-process-next]');
      this.status = this.querySelector('[data-process-status]');
      if (!this.panels.length || !this.stage || !this.navigation) return;

      this.events = new AbortController();
      const options = { signal: this.events.signal };
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.mobile = window.matchMedia('(max-width: 767px)');
      this.compactMobile = window.matchMedia('(max-width: 480px)');
      this.index = Math.max(0, this.panels.findIndex(panel => !panel.hidden));
      this.visible = false;
      this.hovered = window.matchMedia('(hover: hover)').matches && this.matches(':hover');
      this.focusPaused = this.contains(document.activeElement);
      this.autoplayFinished = this.autoplayFinished === true || this.reduced.matches;
      this.editorSelected = false;
      this.pointer = null;
      this.sectionId = this.closest('.shopify-section')?.id.replace('shopify-section-', '');
      this.interval = Math.max(5000, Math.min(20000, Number(this.dataset.autoplayInterval) || 5500));
      this.remaining ??= this.intervalFor(this.index);

      this.triggers.forEach((trigger, index) => {
        trigger.disabled = false;
        trigger.addEventListener('click', () => this.activate(index, true), options);
      });
      this.previous.disabled = this.next.disabled = this.panels.length < 2;
      this.previous.addEventListener('click', () => this.activate(this.index - 1, true), options);
      this.next.addEventListener('click', () => this.activate(this.index + 1, true), options);
      this.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch') return;
        this.hovered = true;
        this.syncAutoplay();
      }, options);
      this.addEventListener('pointerleave', event => {
        if (event.pointerType === 'touch') return;
        this.hovered = false;
        this.syncAutoplay();
      }, options);
      this.addEventListener('focusin', () => {
        this.focusPaused = true;
        this.syncAutoplay();
      }, options);
      this.addEventListener('focusout', event => {
        if (event.relatedTarget && this.contains(event.relatedTarget)) return;
        this.focusPaused = false;
        this.syncAutoplay();
      }, options);
      this.addEventListener('keydown', event => this.onKeydown(event), options);
      this.stage.addEventListener('pointerdown', event => {
        if (!this.mobile.matches || event.pointerType !== 'touch' || !event.isPrimary) return;
        this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
        this.syncAutoplay();
      }, options);
      window.addEventListener('pointerup', event => this.finishSwipe(event), options);
      window.addEventListener('pointercancel', event => this.finishSwipe(event, true), options);
      document.addEventListener('visibilitychange', () => this.syncAutoplay(), options);
      this.reduced.addEventListener('change', () => {
        if (this.reduced.matches) {
          this.autoplayFinished = true;
          this.panelAnimation?.cancel();
        }
        this.syncAutoplay();
      }, options);
      this.mobile.addEventListener('change', () => this.updateCursor(), options);
      this.compactMobile.addEventListener('change', () => this.updateCursor(), options);
      document.addEventListener('shopify:block:select', event => {
        if (event.detail?.sectionId !== this.sectionId) return;
        const index = this.panels.findIndex(panel => panel.dataset.stepId === event.detail.blockId);
        if (index < 0) return;
        this.editorSelected = true;
        this.activate(index, true);
      }, options);
      document.addEventListener('shopify:block:deselect', event => {
        if (event.detail?.sectionId !== this.sectionId) return;
        this.editorSelected = false;
        this.syncAutoplay();
      }, options);
      this.observer = new IntersectionObserver(entries => {
        this.visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .15);
        if (this.visible && !this.entered) {
          this.entered = true;
          this.fadePanel();
        }
        this.syncAutoplay();
      }, { threshold: [0, .15] });
      this.observer.observe(this.stage);
      this.resizeObserver = new ResizeObserver(() => {
        this.updateCursor();
        this.scheduleMeasure();
      });
      this.resizeObserver.observe(this.navigation);
      this.triggers.forEach(trigger => this.resizeObserver.observe(trigger));
      document.fonts?.ready.then(() => { if (this.isConnected) this.scheduleMeasure(); });
      this.activate(this.index);
    }

    intervalFor(index) {
      const duration = Number(this.panels[index]?.dataset.displayDuration);
      return duration > 0 ? Math.max(5000, Math.min(20000, duration * 1000)) : this.interval;
    }

    canAutoplay() {
      return this.isConnected && !!this.events && this.dataset.enableAutoplay === 'true' && this.panels.length > 1
        && this.visible && !document.hidden && !this.reduced.matches
        && !this.hovered && !this.focusPaused && !this.autoplayFinished
        && !this.editorSelected && !this.pointer;
    }

    stopAutoplay() {
      if (this.timer != null) this.remaining = Math.max(0, this.remaining - (performance.now() - this.timerStarted));
      clearTimeout(this.timer);
      this.timer = null;
    }

    syncAutoplay() {
      this.stopAutoplay();
      if (!this.canAutoplay()) return;
      if (this.index === this.panels.length - 1) {
        this.autoplayFinished = true;
        return;
      }
      this.timerStarted = performance.now();
      this.timer = setTimeout(() => {
        this.timer = null;
        if (this.canAutoplay()) this.activate(this.index + 1);
      }, this.remaining);
    }

    activate(index, manual = false) {
      this.stopAutoplay();
      const count = this.panels.length;
      const previousIndex = this.index;
      if (manual) this.autoplayFinished = true;
      this.index = ((index % count) + count) % count;
      if (!manual && this.index === count - 1) this.autoplayFinished = true;
      this.remaining = this.intervalFor(this.index);
      this.panelAnimation?.cancel();
      // No overlapping exit layer: only one step is visible/accessible at a time.
      this.panels.forEach((panel, i) => { panel.hidden = i !== this.index; });
      this.triggers.forEach((trigger, i) => trigger.setAttribute('aria-current', i === this.index ? 'step' : 'false'));
      this.updateCursor();
      if (previousIndex !== this.index && this.visible) this.fadePanel();
      if (manual) this.status.textContent = this.panels[this.index].getAttribute('aria-label');
      else this.status.textContent = '';
      this.syncAutoplay();
    }

    fadePanel() {
      this.panelAnimation?.cancel();
      if (this.reduced.matches) return;
      this.panelAnimation = this.panels[this.index].animate([
        { opacity: 0 }, { opacity: 1 },
      ], { duration: 500, easing: 'ease-out' });
    }

    scheduleMeasure() {
      if (this.measureFrame) return;
      this.measureFrame = requestAnimationFrame(() => {
        this.measureFrame = null;
        if (!this.isConnected) return;
        // Measure an inert off-flow copy, never briefly expose inactive real slides.
        this.stage.style.removeProperty('min-height');
        const style = getComputedStyle(this.stage);
        const copy = this.stage.cloneNode(true);
        copy.removeAttribute('tabindex');
        copy.setAttribute('aria-hidden', 'true');
        copy.inert = true;
        copy.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:${this.stage.getBoundingClientRect().width}px;min-height:0;margin:0;`;
        copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
        copy.querySelectorAll('[data-process-panel]').forEach(panel => { panel.hidden = false; });
        this.stage.after(copy);
        const tallest = Math.max(...[...copy.querySelectorAll('[data-process-panel]')].map(panel => panel.getBoundingClientRect().height));
        copy.remove();
        this.stage.style.minHeight = `${Math.max(parseFloat(style.minHeight) || 0, tallest + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom))}px`;
      });
    }

    updateCursor() {
      if (!this.navigation || !this.triggers[this.index]) return;
      const rect = this.navigation.getBoundingClientRect();
      const trigger = this.triggers[this.index].getBoundingClientRect();
      const center = this.mobile.matches
        ? rect.width * (this.index + .5) / this.panels.length
        : trigger.left - rect.left + trigger.width / 2;
      const lastStep = this.index === this.panels.length - 1;
      const cursorLeft = Math.max(2.5, Math.min(rect.width - 43.5, lastStep ? rect.width - 43.5 : center - 35.5));
      // The compact mobile progress bar represents the currently visible step.
      const fillWidth = this.compactMobile.matches
        ? rect.width * (this.index + 1) / this.panels.length
        : Math.max(0, lastStep ? rect.width - 2.5 : cursorLeft - 2.5);
      this.navigation.style.setProperty('--process-cursor-left', `${cursorLeft}px`);
      this.navigation.style.setProperty('--process-fill-width', `${fillWidth}px`);
    }

    onKeydown(event) {
      if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const trigger = event.target.closest('[data-process-trigger]');
      if (!trigger && event.target !== this.stage) return;
      const destinations = { ArrowLeft: this.index - 1, ArrowRight: this.index + 1, Home: 0, End: this.panels.length - 1 };
      if (!Object.hasOwn(destinations, event.key)) return;
      event.preventDefault();
      this.activate(destinations[event.key], true);
      if (trigger) this.triggers[this.index].focus();
    }

    finishSwipe(event, cancelled = false) {
      if (!this.pointer || event.pointerId !== this.pointer.id) return;
      const dx = event.clientX - this.pointer.x;
      const dy = event.clientY - this.pointer.y;
      this.pointer = null;
      if (!cancelled && this.mobile.matches && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        this.activate(this.index + (dx < 0 ? 1 : -1), true);
      } else this.syncAutoplay();
    }

    disconnectedCallback() {
      this.stopAutoplay();
      this.panelAnimation?.cancel();
      cancelAnimationFrame(this.measureFrame);
      this.measureFrame = null;
      this.events?.abort();
      this.events = null;
      this.observer?.disconnect();
      this.resizeObserver?.disconnect();
      this.pointer = null;
    }
  });
})();
