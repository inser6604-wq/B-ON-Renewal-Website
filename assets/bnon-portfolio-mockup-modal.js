(() => {
  if (customElements.get('bnon-mockup-modal')) return;
  customElements.define('bnon-mockup-modal', class extends HTMLElement {
    connectedCallback() {
      this.dialog = this.querySelector('dialog');
      this.scope = document.getElementById(this.dataset.scopeId);
      if (!this.dialog || !this.scope) return;
      this.viewports = [...this.querySelectorAll('.bnon-mockup-modal__viewport')];
      this.images = [...this.querySelectorAll('.bnon-mockup-modal__image')];
      this.closeButton = this.querySelector('button');
      this.liveSite = this.querySelector('.bnon-mockup-modal__live-site');
      this.events = new AbortController();
      const options = { signal: this.events.signal };
      const activate = (event) => {
        const trigger = event.target.closest('[data-mockup-trigger]');
        if (!trigger || !this.scope.contains(trigger)) return;
        if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        this.open(trigger);
      };
      this.scope.addEventListener('click', activate, options);
      this.scope.addEventListener('keydown', activate, options);
      this.closeButton.addEventListener('click', () => this.dialog.close(), options);
      this.dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        this.dialog.close();
      }, options);
      this.dialog.addEventListener('close', () => this.restore(), options);
      this.dialog.addEventListener('pointerdown', (event) => {
        this.backdropPressed = event.target === this.dialog;
      }, options);
      this.dialog.addEventListener('click', (event) => {
        if (this.backdropPressed && event.target === this.dialog) this.dialog.close();
        this.backdropPressed = false;
      }, options);
      this.dialog.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab') return;
        // Both screens remain keyboard accessible; the native modal makes
        // the rest of the document inert, including assistive navigation.
        event.preventDefault();
        const controls = [this.closeButton, ...this.viewports];
        if (!this.liveSite.hidden) controls.push(this.liveSite);
        const current = controls.indexOf(document.activeElement);
        const next = (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
        controls[next].focus();
      }, options);
    }

    open(trigger) {
      if (this.dialog.open || !(trigger.dataset.mockupDesktopSrc || trigger.dataset.mockupPhoneSrc)) return;
      this.trigger = trigger;
      for (const image of this.images) {
        const device = image.dataset.mockupDevice;
        const prefix = device === 'phone' ? 'mockupPhone' : 'mockupDesktop';
        const src = trigger.dataset[`${prefix}Src`];
        image.hidden = !src;
        image.width = Number(trigger.dataset[`${prefix}Width`]) || 1;
        image.height = Number(trigger.dataset[`${prefix}Height`]) || 1;
        image.alt = `${trigger.dataset.mockupTitle || '프로젝트'} 목업`;
        if (src) image.src = src;
        else image.removeAttribute('src');
      }
      // Resolve the URL from this opening's card every time, never the last project.
      const liveSiteUrl = (trigger.dataset.liveSiteUrl || '').trim();
      if (liveSiteUrl) this.liveSite.setAttribute('href', liveSiteUrl);
      else this.liveSite.removeAttribute('href');
      this.liveSite.hidden = !liveSiteUrl;
      this.dialog.setAttribute('aria-label', this.images[0].alt);
      this.scrollPosition = { x: window.scrollX, y: window.scrollY };
      const body = document.body;
      const properties = ['position', 'top', 'left', 'width', 'overflow', 'padding-right', 'box-sizing'];
      this.bodyStyles = properties.map((name) => [name, body.style.getPropertyValue(name), body.style.getPropertyPriority(name)]);
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.position = 'fixed';
      body.style.top = `${-this.scrollPosition.y}px`;
      body.style.left = `${-this.scrollPosition.x}px`;
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      body.style.boxSizing = 'border-box';
      body.style.paddingRight = `${padding + scrollbar}px`;
      this.dialog.showModal();
      this.viewports.forEach((viewport) => { viewport.scrollTop = 0; });
      this.closeButton.focus({ preventScroll: true });
      this.prepareAutoScroll();
    }

    prepareAutoScroll() {
      this.stopAutoScroll();
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motion.matches) return;
      const run = {
        events: new AbortController(),
        states: []
      };
      this.autoScrollRun = run;
      const active = () => this.autoScrollRun === run && this.dialog.open && !motion.matches;
      const options = { signal: run.events.signal };
      motion.addEventListener('change', () => {
        if (motion.matches) this.stopAutoScroll();
      }, options);

      this.viewports.forEach((viewport, index) => {
        const image = this.images[index];
        const state = { viewport, frame: null, stopped: false, loaded: false };
        run.states.push(state);
        const interrupt = () => {
          state.stopped = true;
          cancelAnimationFrame(state.frame);
          state.frame = null;
        };
        // Never cancel native input: manual control wins for this device until reopen.
        for (const type of ['wheel', 'touchstart', 'pointerdown']) {
          viewport.addEventListener(type, interrupt, { ...options, passive: true });
        }
        viewport.addEventListener('keydown', (event) => {
          if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) interrupt();
        }, options);
        const loaded = async () => {
          if (image.hidden || !image.naturalWidth) return;
          try { await image.decode(); } catch { return; }
          if (!active()) return;
          state.loaded = true;
          this.startDeviceScroll(run, state);
        };
        image.addEventListener('load', loaded, options);
        if (image.complete) loaded();
      });


    }

    startDeviceScroll(run, state) {
      if (this.autoScrollRun !== run || state.stopped || !state.loaded || state.frame !== null) return;
      const viewport = state.viewport;
      let position = viewport.scrollTop;
      let previousTime = null;
      const tick = (time) => {
        state.frame = null;
        if (this.autoScrollRun !== run || !this.dialog.open || state.stopped) return;
        // Recalculate the real endpoint as responsive sizes/content heights change.
        const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
        if (position >= maxScroll) {
          viewport.scrollTop = maxScroll;
          return;
        }
        const elapsed = previousTime === null ? 0 : Math.min(time - previousTime, 50);
        previousTime = time;
        // Fractional accumulator keeps the speed independent of refresh rate/rounding.
        position = Math.min(maxScroll, position + 120 * elapsed / 1000);
        viewport.scrollTop = position;
        if (position < maxScroll) state.frame = requestAnimationFrame(tick);
      };
      state.frame = requestAnimationFrame(tick);
    }

    stopAutoScroll() {
      const run = this.autoScrollRun;
      if (!run) return;
      this.autoScrollRun = null;
      run.states.forEach((state) => cancelAnimationFrame(state.frame));
      run.events.abort();
    }

    restore() {
      this.stopAutoScroll();
      if (!this.bodyStyles) return;
      for (const [name, value, priority] of this.bodyStyles) {
        if (value) document.body.style.setProperty(name, value, priority);
        else document.body.style.removeProperty(name);
      }
      this.bodyStyles = null;
      window.scrollTo({ ...this.scrollPosition, left: this.scrollPosition.x, top: this.scrollPosition.y, behavior: 'instant' });
      if (this.trigger?.isConnected) this.trigger.focus({ preventScroll: true });
      this.images.forEach((image) => image.removeAttribute('src'));
      this.liveSite.hidden = true;
      this.liveSite.removeAttribute('href');
    }

    disconnectedCallback() {
      if (this.dialog?.open) this.dialog.close();
      this.restore();
      this.events?.abort();
    }
  });
})();
