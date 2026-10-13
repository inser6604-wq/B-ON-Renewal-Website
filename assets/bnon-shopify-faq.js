/* Native details handle pointer/keyboard input, including when JS is unavailable. */
if (!customElements.get('bnon-shopify-faq')) {
  class BnonShopifyFaq extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.items = Array.from(this.querySelectorAll('details[data-faq-group]'));
      if (!this.items.length) return;
      this.controller = new AbortController();
      const options = { signal: this.controller.signal };

      // Also enforce group exclusivity on browsers without details[name] support.
      this.items.forEach((item) => item.addEventListener('toggle', () => {
        if (!item.open) return;
        this.items.forEach((other) => {
          if (other !== item && other.dataset.faqGroup === item.dataset.faqGroup) other.open = false;
        });
      }, options));

      document.addEventListener('shopify:block:select', (event) => {
        if (event.detail?.sectionId !== this.dataset.sectionId) return;
        const selected = this.items.find((item) => item.dataset.faqBlockId === event.detail.blockId);
        if (selected) selected.open = true;
      }, options);
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.controller = null;
    }
  }
  customElements.define('bnon-shopify-faq', BnonShopifyFaq);
}
