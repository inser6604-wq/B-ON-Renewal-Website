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
      this.toggle = this.querySelector('[data-process-toggle]');
      this.status = this.querySelector('[data-process-status]');
      if (!this.panels.length || !this.stage || !this.navigation) return;

      this.events = new AbortController();
      const options = { signal: this.events.signal };
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.mobile = window.matchMedia('(max-width: 767px)');
      this.index = Math.max(0, this.panels.findIndex(panel => !panel.hidden));
      this.visible = false;
      this.hovered = window.matchMedia('(hover: hover)').matches && this.matches(':hover');
      this.focusPaused = this.contains(document.activeElement);
      this.userPaused = false;
      this.editorSelected = false;
      this.pointer = null;
      this.sectionId = this.closest('.shopify-section')?.id.replace('shopify-section-', '');
      this.interval = Math.max(5000, Math.min(6000, Number(this.dataset.autoplayInterval) || 5500));

      this.triggers.forEach((trigger, index) => {
        trigger.disabled = false;
        trigger.addEventListener('click', () => this.activate(index, true), options);
      });
      this.previous.disabled = this.next.disabled = this.panels.length < 2;
      this.previous.addEventListener('click', () => this.activate(this.index - 1, true), options);
      this.next.addEventListener('click', () => this.activate(this.index + 1, true), options);
      this.toggle.addEventListener('click', () => {
        this.userPaused = !this.userPaused;
        if (!this.userPaused) this.focusPaused = false;
        this.syncAutoplay();
      }, options);
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
      this.reduced.addEventListener('change', () => this.syncAutoplay(), options);
      this.mobile.addEventListener('change', () => this.updateCursor(), options);
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
        this.visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .01);
        this.syncAutoplay();
      }, { threshold: [0, .01] });
      this.observer.observe(this);
      this.resizeObserver = new ResizeObserver(() => this.updateCursor());
      this.resizeObserver.observe(this.navigation);
      this.triggers.forEach(trigger => this.resizeObserver.observe(trigger));
      this.activate(this.index);
    }

    canAutoplay() {
      return this.isConnected && !!this.events && this.dataset.enableAutoplay === 'true' && this.panels.length > 1
        && this.visible && !document.hidden && !this.reduced.matches
        && !this.hovered && !this.focusPaused && !this.userPaused
        && !this.editorSelected && !this.pointer;
    }

    stopAutoplay() {
      clearTimeout(this.timer);
      this.timer = null;
    }

    syncAutoplay() {
      this.stopAutoplay();
      const disabled = this.dataset.enableAutoplay !== 'true' || this.reduced.matches || this.panels.length < 2;
      this.toggle.disabled = disabled;
      this.toggle.textContent = disabled ? '자동재생 꺼짐' : this.userPaused ? '재생' : '일시정지';
      this.toggle.setAttribute('aria-label', disabled ? '자동재생 비활성화' : this.userPaused ? '단계 자동재생 재생' : '단계 자동재생 일시정지');
      this.toggle.title = this.reduced.matches ? '움직임 줄이기 설정으로 자동재생이 비활성화되어 있습니다.' : '';
      if (!this.canAutoplay()) return;
      this.timer = setTimeout(() => {
        this.timer = null;
        if (this.canAutoplay()) this.activate(this.index + 1);
      }, this.interval);
    }

    activate(index, manual = false) {
      const count = this.panels.length;
      this.index = ((index % count) + count) % count;
      // No overlapping exit layer: only one step is visible/accessible at a time.
      this.panels.forEach((panel, i) => { panel.hidden = i !== this.index; });
      this.triggers.forEach((trigger, i) => trigger.setAttribute('aria-current', i === this.index ? 'step' : 'false'));
      this.updateCursor();
      if (manual) this.status.textContent = this.panels[this.index].getAttribute('aria-label');
      else this.status.textContent = '';
      this.syncAutoplay();
    }

    updateCursor() {
      if (!this.navigation || !this.triggers[this.index]) return;
      const rect = this.navigation.getBoundingClientRect();
      const trigger = this.triggers[this.index].getBoundingClientRect();
      const center = this.mobile.matches
        ? rect.width * (this.index + .5) / this.panels.length
        : trigger.left - rect.left + trigger.width / 2;
      this.navigation.style.setProperty('--process-cursor-left', `${Math.max(2.5, Math.min(rect.width - 43.5, center - 35.5))}px`);
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
      this.events?.abort();
      this.events = null;
      this.observer?.disconnect();
      this.resizeObserver?.disconnect();
      this.pointer = null;
    }
  });
})();
