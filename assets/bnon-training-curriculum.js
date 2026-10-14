(() => {
  if (customElements.get('bnon-training-curriculum')) return;
  customElements.define('bnon-training-curriculum', class extends HTMLElement {
    connectedCallback() {
      if (this.events) return;
      this.tabs = [...this.querySelectorAll('[data-training-tab]')];
      this.panels = [...this.querySelectorAll('[data-training-panel]')];
      this.tablist = this.querySelector('[data-training-tabs]');
      if (!this.tabs.length || !this.panels.length || !this.tablist) return;
      this.events = new AbortController();
      const options = { signal: this.events.signal };
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.tablist.setAttribute('role', 'tablist');
      this.tabs.forEach(tab => {
        tab.disabled = false;
        tab.setAttribute('role', 'tab');
        tab.addEventListener('click', () => this.activate(tab.dataset.trainingTab), options);
        tab.addEventListener('keydown', event => {
          const index = this.tabs.indexOf(tab);
          const keys = { ArrowLeft: (index - 1 + this.tabs.length) % this.tabs.length, ArrowRight: (index + 1) % this.tabs.length, Home: 0, End: this.tabs.length - 1 };
          if (!(event.key in keys)) return;
          event.preventDefault();
          const target = this.tabs[keys[event.key]];
          this.activate(target.dataset.trainingTab);
          target.focus();
        }, options);
      });
      this.panels.forEach(panel => { panel.setAttribute('role', 'tabpanel'); panel.tabIndex = 0; });
      this.reduced.addEventListener('change', () => this.fade?.cancel(), options);
      document.addEventListener('shopify:block:select', event => {
        const lesson = [...this.querySelectorAll('[data-training-lesson]')].find(item => item.dataset.trainingLesson === event.detail?.blockId);
        if (lesson) this.activate(lesson.closest('[data-training-panel]').dataset.trainingPanel);
      }, options);
      this.activate(this.tabs.find(tab => tab.dataset.trainingTab === 'learn')?.dataset.trainingTab || this.tabs[0].dataset.trainingTab, false);
    }
    activate(key, animate = true) {
      const panel = this.panels.find(item => item.dataset.trainingPanel === key);
      if (!panel || this.current === key) return;
      this.fade?.cancel();
      this.current = key;
      this.tabs.forEach(tab => {
        const selected = tab.dataset.trainingTab === key;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      this.panels.forEach(item => { item.hidden = item !== panel; });
      if (animate && !this.reduced.matches && panel.animate) {
        this.fade = panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: 'ease-out' });
      }
    }
    disconnectedCallback() {
      this.fade?.cancel();
      this.events?.abort();
      this.events = null;
      this.current = null;
    }
  });
})();
