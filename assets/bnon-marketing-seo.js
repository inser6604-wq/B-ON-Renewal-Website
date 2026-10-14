(() => {
  if (customElements.get('bnon-marketing-seo-search')) return;

  // The real, complete phrase remains in the DOM for layout and assistive technology.
  // Only its aria-hidden overlay is typed; this is not a functional search input.
  class MarketingSeoSearch extends HTMLElement {
    connectedCallback() {
      if (this.completed) return;
      this.source = this.querySelector('[data-seo-source]');
      this.output = this.querySelector('[data-seo-typed]');
      if (!this.source || !this.output) return;
      this.text = this.source.textContent;
      this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (this.dataset.typingEnabled !== 'true' || !this.text.trim() || this.motion.matches || !window.IntersectionObserver || !this.animate) {
        this.finish();
        return;
      }

      this.duration = Math.min(4000, Math.max(1000, Number(this.dataset.typingDuration) || 1800));
      this.characters = typeof Intl.Segmenter === 'function'
        ? Array.from(new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(this.text), part => part.segment)
        : Array.from(this.text);
      this.dataset.typingState = 'waiting';
      this.output.textContent = '';
      this.fade = this.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 550, easing: 'ease-out', fill: 'both' });
      this.fade.pause();
      this.fade.currentTime = 0;
      this.onMotionChange = event => { if (event.matches) this.finish(); };
      this.motion.addEventListener('change', this.onMotionChange);
      this.observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting) && !this.started) this.start();
      }, { threshold: 0.25 });
      this.observer.observe(this);
    }

    start() {
      this.started = true;
      this.observer.disconnect();
      this.fade.play();
      this.fade.finished.then(() => {
        if (this.completed || !this.isConnected) return;
        this.fade.cancel();
        this.fade = null;
        this.dataset.typingState = 'typing';
        let startedAt;
        const tick = now => {
          if (startedAt === undefined) startedAt = now;
          const count = Math.min(this.characters.length, Math.floor((now - startedAt) / this.duration * this.characters.length));
          this.output.textContent = this.characters.slice(0, count).join('');
          if (count === this.characters.length) this.finish();
          else this.frame = requestAnimationFrame(tick);
        };
        this.frame = requestAnimationFrame(tick);
      }).catch(() => { /* Disconnection/reduced motion cancels the pending fade. */ });
    }

    finish() {
      this.completed = true;
      this.dataset.typingState = 'complete';
      if (this.output) this.output.textContent = this.text;
      this.cleanup();
    }

    cleanup() {
      this.observer?.disconnect();
      if (this.frame) cancelAnimationFrame(this.frame);
      this.fade?.cancel();
      this.fade = null;
      if (this.onMotionChange) this.motion.removeEventListener('change', this.onMotionChange);
    }

    disconnectedCallback() {
      // Editor reordering must not restart a sequence or leave an invisible field.
      if (this.completed) return;
      if (this.started) this.finish();
      else this.cleanup();
    }
  }

  customElements.define('bnon-marketing-seo-search', MarketingSeoSearch);
})();
