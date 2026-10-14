(() => {
  if (customElements.get('bnon-marketing-meta')) return;

  // One animation per complete row keeps the funnel and its explanation in sync.
  class MarketingMeta extends HTMLElement {
    connectedCallback() {
      if (this.completed || this.observer) return;
      this.rows = Array.from(this.querySelectorAll('.bnon-marketing-meta__step'));
      this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (!this.rows.length || this.motion.matches || !window.IntersectionObserver || !this.animate) {
        this.finish();
        return;
      }
      this.revealed = new Set();
      this.remaining = new Set(this.rows);
      this.animations = this.rows.map(row => {
        const animation = row.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 550, easing: 'ease-out', fill: 'both'
        });
        animation.pause();
        animation.currentTime = 0;
        animation.onfinish = () => {
          animation.onfinish = null;
          animation.cancel();
          this.remaining.delete(row);
          if (!this.remaining.size) this.finish();
        };
        return animation;
      });
      this.onMotionChange = event => { if (event.matches) this.finish(); };
      this.motion.addEventListener('change', this.onMotionChange);
      this.observer = new IntersectionObserver(entries => {
        const origin = document.timeline.currentTime;
        entries.sort((a, b) => this.rows.indexOf(a.target) - this.rows.indexOf(b.target)).forEach(entry => {
          if (!entry.isIntersecting || this.revealed.has(entry.target)) return;
          if (entry.intersectionRatio < 0.25 && entry.boundingClientRect.height <= window.innerHeight - 24) return;
          this.started = true;
          this.revealed.add(entry.target);
          this.observer.unobserve(entry.target);
          // Rows entering together stagger in DOM order; offscreen rows stay paused.
          // A later mobile row begins only when its triangle AND copy can be seen.
          this.lastStart = Math.max(origin, (this.lastStart ?? origin - 180) + 180);
          const animation = this.animations[this.rows.indexOf(entry.target)];
          animation.play();
          animation.startTime = this.lastStart;
        });
      }, { threshold: [0, 0.25], rootMargin: '0px 0px -24px 0px' });
      this.rows.forEach(row => this.observer.observe(row));
    }

    finish() {
      this.completed = true;
      this.cleanup();
    }

    cleanup() {
      this.observer?.disconnect();
      this.observer = null;
      this.animations?.forEach(animation => {
        animation.onfinish = null;
        animation.cancel();
      });
      this.animations = [];
      if (this.onMotionChange) this.motion.removeEventListener('change', this.onMotionChange);
    }

    disconnectedCallback() {
      if (this.completed) return;
      if (this.started) this.finish();
      else this.cleanup();
    }
  }

  customElements.define('bnon-marketing-meta', MarketingMeta);
})();
