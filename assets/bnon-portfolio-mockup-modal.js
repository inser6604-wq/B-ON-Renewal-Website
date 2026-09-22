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
        states: [],
        started: false,
        targetEndTime: null
      };
      this.autoScrollRun = run;
      const active = () => this.autoScrollRun === run && this.dialog.open && !motion.matches;
      const options = { signal: run.events.signal };
      motion.addEventListener('change', () => {
        if (motion.matches) this.stopAutoScroll();
      }, options);

      this.viewports.forEach((viewport, index) => {
        const image = this.images[index];
        const state = { viewport, frame: null, paused: false, loaded: image.hidden };
        run.states.push(state);
        const pause = () => {
          state.paused = true;
          cancelAnimationFrame(state.frame);
          state.frame = null;
        };
        const resume = () => {
          if (!state.paused || !active()) return;
          state.paused = false;
          this.startDeviceScroll(run, state, performance.now());
        };
        viewport.addEventListener('mouseenter', pause, options);
        viewport.addEventListener('mouseleave', resume, options);
        const loaded = async () => {
          if (image.hidden || !image.naturalWidth) return;
          try { await image.decode(); } catch { return; }
          if (!active()) return;
          state.loaded = true;
          this.startAutoScrollRun(run);
        };
        image.addEventListener('load', loaded, options);
        if (image.complete) loaded();
      });
      this.startAutoScrollRun(run);
    }

    startAutoScrollRun(run) {
      if (this.autoScrollRun !== run || run.started || run.states.some((state) => !state.loaded)) return;
      run.states.forEach((state) => {
        state.maxScroll = Math.max(0, state.viewport.scrollHeight - state.viewport.clientHeight);
      });
      const longestDistance = Math.max(0, ...run.states.map((state) => state.maxScroll));
      const startTime = performance.now();
      // The longest screenshot moves at the established natural baseline;
      // every device shares its resulting duration and target end time.
      const totalDuration = longestDistance > 0 ? longestDistance / 240 * 1000 : 0;
      run.started = true;
      run.targetEndTime = startTime + totalDuration;
      run.states.forEach((state) => this.startDeviceScroll(run, state, startTime));
    }

    startDeviceScroll(run, state, currentTime) {
      if (this.autoScrollRun !== run || state.paused || !state.loaded || state.frame !== null) return;
      const viewport = state.viewport;
      state.maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      const startTop = Math.min(viewport.scrollTop, state.maxScroll);
      const remainingDistance = state.maxScroll - startTop;
      if (remainingDistance <= 0) return;
      const originalRemainingTime = run.targetEndTime - currentTime;
      // If the shared deadline passed while paused, continue smoothly at the
      // baseline speed instead of jumping to the end.
      const duration = originalRemainingTime > 0
        ? originalRemainingTime
        : remainingDistance / 120 * 1000;
      const segmentEndTime = currentTime + duration;
      const tick = (time) => {
        state.frame = null;
        if (this.autoScrollRun !== run || !this.dialog.open || state.paused) return;
        const progress = Math.min(1, Math.max(0, (time - currentTime) / duration));
        viewport.scrollTop = startTop + remainingDistance * progress;
        if (time < segmentEndTime && viewport.scrollTop < state.maxScroll) {
          state.frame = requestAnimationFrame(tick);
        } else {
          viewport.scrollTop = state.maxScroll;
        }
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
