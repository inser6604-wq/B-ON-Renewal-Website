/* Native details handle pointer/keyboard input, including when JS is unavailable. */
if (!customElements.get('bnon-shopify-faq')) {
  class BnonShopifyFaq extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.items = Array.from(this.querySelectorAll('details[data-faq-group]'));
      if (!this.items.length) return;
      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.states = new Map();

      this.items.forEach(item => {
        const summary = item.querySelector('summary');
        const answer = item.querySelector('.bnon-shopify-faq__answer');
        this.states.set(item, { summary, answer, expanded: item.open, name: item.getAttribute('name') });
        // Preserve native/no-JS markup, but manage exclusivity here so the previous
        // answer can finish sliding closed instead of being instantly hidden by name.
        item.removeAttribute('name');
        summary.addEventListener('click', event => {
          event.preventDefault();
          this.setOpen(item, !this.states.get(item).expanded);
        }, options);
        item.addEventListener('toggle', () => {
          const state = this.states.get(item);
          if (state.animation || item.open === state.expanded) return;
          state.expanded = item.open;
          if (item.open) this.closeOthers(item);
        }, options);
      });
      this.reduced.addEventListener('change', () => {
        if (this.reduced.matches) this.items.forEach(item => this.settle(item));
      }, options);
      window.addEventListener('resize', () => {
        this.items.forEach(item => { if (this.states.get(item).animation) this.settle(item); });
      }, options);

      document.addEventListener('shopify:block:select', (event) => {
        if (event.detail?.sectionId !== this.dataset.sectionId) return;
        const selected = this.items.find((item) => item.dataset.faqBlockId === event.detail.blockId);
        if (selected) this.setOpen(selected, true, false);
      }, options);
    }

    closeOthers(item) {
      this.items.forEach(other => {
        if (other !== item && other.dataset.faqGroup === item.dataset.faqGroup && this.states.get(other).expanded) this.setOpen(other, false);
      });
    }

    setOpen(item, expanded, animate = true) {
      const state = this.states.get(item);
      if (state.expanded === expanded && !state.animation) return;
      const startHeight = item.getBoundingClientRect().height;
      const startOpacity = item.open && state.answer ? getComputedStyle(state.answer).opacity : 0;
      state.animation?.cancel();
      state.fade?.cancel();
      state.animation = null;
      state.expanded = expanded;
      if (expanded) this.closeOthers(item);
      if (!animate || this.reduced.matches || !state.answer || !item.animate) {
        this.settle(item);
        return;
      }

      item.open = true;
      state.summary.setAttribute('aria-expanded', String(expanded));
      state.answer.inert = !expanded;
      if (!expanded) state.answer.setAttribute('aria-hidden', 'true');
      else state.answer.removeAttribute('aria-hidden');
      const style = getComputedStyle(item);
      const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const inset = style.boxSizing === 'border-box' ? 0 : borders + padding;
      const endHeight = expanded ? item.getBoundingClientRect().height : state.summary.getBoundingClientRect().height + borders + padding;
      const timing = { duration: 420, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' };
      const animation = item.animate([
        { height: `${startHeight - inset}px` },
        { height: `${endHeight - inset}px` },
      ], timing);
      state.animation = animation;
      state.fade = state.answer.animate([{ opacity: startOpacity }, { opacity: expanded ? 1 : 0 }], timing);
      animation.onfinish = () => { if (state.animation === animation) this.settle(item); };
    }

    settle(item) {
      const state = this.states.get(item);
      item.open = state.expanded;
      state.animation?.cancel();
      state.fade?.cancel();
      state.animation = null;
      state.fade = null;
      state.summary.removeAttribute('aria-expanded');
      if (state.answer) {
        state.answer.inert = false;
        state.answer.removeAttribute('aria-hidden');
      }
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.controller = null;
      this.items?.forEach(item => {
        this.settle(item);
        const { name } = this.states.get(item);
        if (name !== null) item.setAttribute('name', name);
      });
    }
  }
  customElements.define('bnon-shopify-faq', BnonShopifyFaq);
}
