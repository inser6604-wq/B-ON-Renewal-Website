(() => {
  if (customElements.get('bnon-marketing-pixel')) return;

  class MarketingPixel extends HTMLElement {
    connectedCallback() {
      if (this.completed || this.observer) return;
      this.fills = Array.from(this.querySelectorAll('[data-pixel-fill]'));
      this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (!this.fills.length || this.dataset.animate !== 'true' || this.motion.matches || !window.IntersectionObserver || !this.animate) {
        this.finish();
        return;
      }
      // Slow the existing configured timing without changing editor settings.
      const duration = Math.min(2000, Math.max(600, Number(this.dataset.duration) || 1000)) * 2;
      const delay = Math.min(400, Math.max(0, Number(this.dataset.onDelay) || 0));
      // Width is rendered by Liquid from the visual ratio, never from the label's value.
      // Only transform changes: tracks, labels and metric layout remain stationary.
      this.animations = this.fills.map(fill => {
        const animation = fill.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
          duration, delay: fill.dataset.pixelFill === 'on' ? delay : 0,
          easing: 'ease-out', fill: 'both'
        });
        animation.pause();
        animation.currentTime = 0;
        return animation;
      });
      this.onMotionChange = event => { if (event.matches) this.finish(); };
      this.motion.addEventListener('change', this.onMotionChange);
      this.observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting) || this.started) return;
        this.started = true;
        this.observer.disconnect();
        const origin = document.timeline.currentTime;
        this.animations.forEach(animation => { animation.play(); animation.startTime = origin; });
        Promise.all(this.animations.map(animation => animation.finished))
          .then(() => this.finish())
          .catch(() => { /* Section replacement/reduced motion cancels pending bars. */ });
      }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
      this.observer.observe(this);
    }

    finish() {
      this.completed = true;
      this.cleanup();
    }

    cleanup() {
      this.observer?.disconnect();
      this.observer = null;
      this.animations?.forEach(animation => animation.cancel());
      this.animations = [];
      if (this.onMotionChange) this.motion.removeEventListener('change', this.onMotionChange);
    }

    disconnectedCallback() {
      if (this.completed) return;
      if (this.started) this.finish();
      else this.cleanup();
    }
  }

  customElements.define('bnon-marketing-pixel', MarketingPixel);
})();
