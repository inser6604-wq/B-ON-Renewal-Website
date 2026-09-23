(() => {
  const selector = '[data-bnon-service-stack]';
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  class BnonServiceStack {
    constructor(section) {
      this.section = section;
      this.cards = Array.from(section.querySelectorAll('.bnon-service-card'));
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.current = this.cards.map(() => 0);
      this.target = this.cards.map(() => 0);
      this.frame = null;
      this.destroyed = false;

      this.requestUpdate = this.requestUpdate.bind(this);
      this.animate = this.animate.bind(this);
      this.handleMotionChange = this.handleMotionChange.bind(this);

      window.addEventListener('scroll', this.requestUpdate, { passive: true });
      window.addEventListener('resize', this.requestUpdate, { passive: true });
      this.reducedMotion.addEventListener('change', this.handleMotionChange);
      this.requestUpdate();
    }

    calculateTargets() {
      this.cards.forEach((card, index) => {
        const nextCard = this.cards[index + 1];

        if (!nextCard) {
          this.target[index] = 0;
          return;
        }

        const nextTop = nextCard.getBoundingClientRect().top;
        const nextStickyTop = parseFloat(window.getComputedStyle(nextCard).top) || 0;
        const transitionStart = Math.min(
          window.innerHeight * 0.82,
          nextStickyTop + card.offsetHeight * 0.75
        );
        const transitionDistance = Math.max(transitionStart - nextStickyTop, 1);

        this.target[index] = clamp((transitionStart - nextTop) / transitionDistance, 0, 1);
      });
    }

    renderCard(card, progress) {
      const dim = progress * 0.36;
      const scale = 1 - progress * 0.025;
      const lift = progress * -6;

      card.style.setProperty('--bnon-service-dim', dim.toFixed(4));
      card.style.setProperty('--bnon-service-scale', scale.toFixed(4));
      card.style.setProperty('--bnon-service-lift', `${lift.toFixed(2)}px`);
    }

    animate() {
      this.frame = null;
      if (this.destroyed) return;

      this.calculateTargets();
      let needsAnotherFrame = false;

      this.cards.forEach((card, index) => {
        if (this.reducedMotion.matches) {
          this.current[index] = this.target[index];
        } else {
          this.current[index] += (this.target[index] - this.current[index]) * 0.16;
        }

        if (Math.abs(this.target[index] - this.current[index]) > 0.001) {
          needsAnotherFrame = true;
        } else {
          this.current[index] = this.target[index];
        }

        this.renderCard(card, this.current[index]);
      });

      if (needsAnotherFrame) this.frame = window.requestAnimationFrame(this.animate);
    }

    requestUpdate() {
      if (this.frame === null) this.frame = window.requestAnimationFrame(this.animate);
    }

    handleMotionChange() {
      this.requestUpdate();
    }

    destroy() {
      this.destroyed = true;
      window.removeEventListener('scroll', this.requestUpdate);
      window.removeEventListener('resize', this.requestUpdate);
      this.reducedMotion.removeEventListener('change', this.handleMotionChange);
      if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    }
  }

  const instances = new WeakMap();

  const init = (scope = document) => {
    scope.querySelectorAll(selector).forEach((section) => {
      if (!instances.has(section)) instances.set(section, new BnonServiceStack(section));
    });
  };

  const unload = (event) => {
    const section = event.target.querySelector(selector);
    const instance = section && instances.get(section);
    if (!instance) return;
    instance.destroy();
    instances.delete(section);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', (event) => init(event.target));
  document.addEventListener('shopify:section:unload', unload);
})();
