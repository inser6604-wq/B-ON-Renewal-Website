/* Isolated lifecycle: section replacement in the editor cleans up every listener. */
if (!customElements.get('bnon-header-controller')) {
  customElements.define('bnon-header-controller', class extends HTMLElement {
    connectedCallback() {
      this.header = this.querySelector('.bnon-header');
      if (!this.header || this.controller) return;
      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.schedule = () => {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => { this.frame = null; this.update(); });
      };
      this.resize = () => {
        // Measure normal typography so menu/grid positions match the original header.
        this.querySelectorAll('.bnon-header__menu a').forEach(link => {
          const probe = link.cloneNode(true);
          probe.removeAttribute('aria-current');
          probe.style.cssText = 'position:absolute;visibility:hidden;width:auto;font-weight:500;letter-spacing:-.04em;transition:none;pointer-events:none';
          link.parentElement.append(probe);
          link.style.width = `${probe.getBoundingClientRect().width}px`;
          probe.remove();
        });
        this.style.setProperty('--header-height', `${this.header.getBoundingClientRect().height}px`);
        this.setAttribute('data-fixed', '');
        this.collect();
      };
      this.collect = () => {
        this.regions = [...document.querySelectorAll('.bnon-section:not(.bnon-header), [data-header-theme]')].map(element => {
          const rgb = getComputedStyle(element).backgroundColor.match(/[\d.]+/g)?.map(Number);
          const dark = element.dataset.headerTheme === 'dark' || (element.dataset.headerTheme !== 'light' && rgb && (rgb[3] ?? 1) > .9 && (rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722) < 100);
          return { element, dark };
        });
        this.schedule();
      };
      window.addEventListener('scroll', this.schedule, { ...options, passive: true });
      window.addEventListener('resize', this.resize, options);
      document.addEventListener('shopify:section:load', this.collect, options);
      document.addEventListener('shopify:section:unload', this.collect, options);
      document.addEventListener('shopify:section:reorder', this.collect, options);
      this.observer = new ResizeObserver(this.schedule);
      this.observer.observe(document.body);
      this.resize();
      document.fonts.ready.then(() => { if (this.isConnected) this.resize(); });
    }
    update() {
      const header = this.header.getBoundingClientRect();
      this.style.setProperty('--header-height', `${header.height}px`);
      // Merge overlapping dark intervals; use actual viewport geometry, including transforms.
      const intervals = (this.regions || []).filter(region => region.dark && region.element.isConnected).map(({ element }) => element.getBoundingClientRect())
        .filter(rect => rect.right > header.left && rect.left < header.right && rect.bottom > header.top && rect.top < header.bottom)
        .map(rect => [Math.max(header.top, rect.top), Math.min(header.bottom, rect.bottom)]).sort((a, b) => a[0] - b[0]);
      let end = header.top;
      let covered = 0;
      intervals.forEach(([top, bottom]) => { covered += Math.max(0, bottom - Math.max(top, end)); end = Math.max(end, bottom); });
      const ratio = covered / (header.height || 1);
      // CTA-only state; fixed positioning is controlled independently by data-fixed.
      // 60% enter / 40% exit dead band prevents boundary oscillation in either direction.
      this.header.toggleAttribute('data-cta-active', ratio >= (this.header.hasAttribute('data-cta-active') ? .4 : .6));
    }
    disconnectedCallback() {
      this.controller?.abort();
      this.controller = null;
      this.observer?.disconnect();
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  });
}
