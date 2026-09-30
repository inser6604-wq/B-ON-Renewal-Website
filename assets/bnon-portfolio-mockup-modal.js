(() => {
  if (customElements.get('bnon-mockup-modal')) return;
  customElements.define('bnon-mockup-modal', class extends HTMLElement {
    connectedCallback() {
      this.dialog = this.querySelector('dialog');
      if (!this.dialog) return;
      this.viewports = [...this.querySelectorAll('.bnon-mockup-modal__viewport')];
      this.images = [...this.querySelectorAll('.bnon-mockup-modal__image')];
      this.closeButton = this.querySelector('button');
      this.liveSite = this.querySelector('.bnon-mockup-modal__live-site');
      this.preloads = new Map();
      this.desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
      this.events = new AbortController();
      const options = { signal: this.events.signal };
      const activate = (event) => {
        const trigger = event.target.closest('[data-mockup-trigger]');
        if (!trigger || trigger.getAttribute('aria-controls') !== this.dialog.id) return;
        if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        this.open(trigger);
      };
      document.addEventListener('click', activate, options);
      document.addEventListener('keydown', activate, options);
      document.addEventListener('pointerover', (event) => {
        if (!this.desktopPointer.matches) return;
        this.preloadTrigger(event.target.closest('[data-mockup-trigger]'));
      }, options);
      document.addEventListener('focusin', (event) => this.preloadTrigger(event.target.closest('[data-mockup-trigger]')), options);
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
      this.stopAutoScroll();
      this.trigger = trigger;
      for (const image of this.images) {
        const device = image.dataset.mockupDevice;
        const prefix = device === 'phone' ? 'mockupPhone' : 'mockupDesktop';
        const src = trigger.dataset[`${prefix}Src`];
        image.hidden = !src;
        image.width = Number(trigger.dataset[`${prefix}Width`]) || 1;
        image.height = Number(trigger.dataset[`${prefix}Height`]) || 1;
        image.alt = `${trigger.dataset.mockupTitle || '프로젝트'} 목업`;
        image.classList.remove('is-loaded');
        image.parentElement.classList.toggle('is-loading', Boolean(src));
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

    preloadTrigger(trigger) {
      if (!trigger || trigger.getAttribute('aria-controls') !== this.dialog.id) return;
      this.preloadImage(trigger.dataset.mockupDesktopSrc);
    }

    preloadImage(src) {
      if (!src || this.preloads.has(src)) return this.preloads.get(src);
      const image = new Image();
      const ready = new Promise((resolve) => {
        const finish = async () => {
          try { await image.decode?.(); } catch { /* Browser cache/load still makes the image usable. */ }
          resolve();
        };
        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
      image.src = src;
      if (image.complete) image.dispatchEvent(new Event('load'));
      this.preloads.set(src, ready);
      return ready;
    }

    prepareAutoScroll() {
      this.stopAutoScroll();
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motion.matches) return;
      const run = {
        events: new AbortController(),
        states: [],
        started: false,
        frame: null,
        resumeTimer: null,
        paused: false,
        progress: 0,
      };
      this.autoScrollRun = run;
      const active = () => this.autoScrollRun === run && this.dialog.open && !motion.matches;
      const options = { signal: run.events.signal };
      motion.addEventListener('change', () => {
        if (motion.matches) this.stopAutoScroll();
      }, options);

      this.viewports.forEach((viewport, index) => {
        const image = this.images[index];
        const state = { viewport, loaded: image.hidden, autoWriteUntil: 0, maxScroll: 0 };
        run.states.push(state);
        const pauseForManualInput = () => {
          if (!active()) return;
          this.pauseAutoScroll(run);
          window.clearTimeout(run.resumeTimer);
          run.resumeTimer = window.setTimeout(() => this.resumeAutoScroll(run), 1250);
        };
        viewport.addEventListener('wheel', pauseForManualInput, { passive: true, ...options });
        viewport.addEventListener('pointerdown', pauseForManualInput, options);
        viewport.addEventListener('touchstart', pauseForManualInput, { passive: true, ...options });
        viewport.addEventListener('pointerenter', () => {
          if (!this.desktopPointer.matches || !active()) return;
          window.clearTimeout(run.resumeTimer);
          this.pauseAutoScroll(run);
        }, options);
        viewport.addEventListener('pointerleave', () => {
          if (!this.desktopPointer.matches || !active()) return;
          this.resumeAutoScroll(run);
        }, options);
        viewport.addEventListener('scroll', () => {
          if (performance.now() < state.autoWriteUntil) return;
          this.updateProgressFromViewport(run, state);
          pauseForManualInput();
        }, options);
        const loaded = async () => {
          if (image.hidden || !image.naturalWidth) return;
          try { await image.decode(); } catch { /* The loaded image can still be displayed. */ }
          if (!active()) return;
          state.loaded = true;
          requestAnimationFrame(() => {
            if (!active()) return;
            image.classList.add('is-loaded');
            viewport.classList.remove('is-loading');
          });
          this.startAutoScrollRun(run);
        };
        image.addEventListener('load', loaded, options);
        if (image.complete) loaded();
      });
      window.addEventListener('resize', () => this.recalculateAutoScroll(run), options);
      this.startAutoScrollRun(run);
    }

    startAutoScrollRun(run) {
      if (this.autoScrollRun !== run || run.started || run.states.some((state) => !state.loaded)) return;
      this.recalculateAutoScroll(run);
      run.progress = this.progressForState(run.states[0]);
      this.applyProgress(run, run.progress);
      run.started = true;
      this.resumeAutoScroll(run);
    }

    progressForState(state) {
      return state.maxScroll > 0 ? Math.max(0, Math.min(1, state.viewport.scrollTop / state.maxScroll)) : 0;
    }

    recalculateAutoScroll(run) {
      if (this.autoScrollRun !== run) return;
      run.states.forEach((state) => {
        state.maxScroll = Math.max(0, state.viewport.scrollHeight - state.viewport.clientHeight);
      });
      this.applyProgress(run, run.progress);
    }

    applyProgress(run, progress, sourceState) {
      const clampedProgress = Math.max(0, Math.min(1, progress));
      run.progress = clampedProgress;
      run.states.forEach((state) => {
        if (state === sourceState) return;
        state.autoWriteUntil = performance.now() + 100;
        state.viewport.scrollTop = state.maxScroll * clampedProgress;
      });
    }

    updateProgressFromViewport(run, state) {
      this.applyProgress(run, this.progressForState(state), state);
    }

    pauseAutoScroll(run) {
      if (this.autoScrollRun !== run) return;
      run.paused = true;
      cancelAnimationFrame(run.frame);
      run.frame = null;
    }

    resumeAutoScroll(run) {
      if (this.autoScrollRun !== run || !this.dialog.open || !run.started) return;
      run.paused = false;
      cancelAnimationFrame(run.frame);
      const longestRemainingDistance = Math.max(0, ...run.states.map((state) => state.maxScroll * (1 - run.progress)));
      if (longestRemainingDistance <= 0) return;
      const currentTime = performance.now();
      const startProgress = run.progress;
      const duration = longestRemainingDistance / 240 * 1000;
      const tick = (time) => {
        run.frame = null;
        if (this.autoScrollRun !== run || !this.dialog.open || run.paused) return;
        const progress = Math.min(1, Math.max(0, (time - currentTime) / duration));
        this.applyProgress(run, startProgress + (1 - startProgress) * progress);
        if (progress < 1) {
          run.frame = requestAnimationFrame(tick);
        } else {
          this.applyProgress(run, 1);
        }
      };
      run.frame = requestAnimationFrame(tick);
    }

    stopAutoScroll() {
      const run = this.autoScrollRun;
      if (!run) return;
      this.autoScrollRun = null;
      cancelAnimationFrame(run.frame);
      window.clearTimeout(run.resumeTimer);
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
