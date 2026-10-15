(() => {
  if (window.bnonInstrumentAmpersandLoaded) return;
  window.bnonInstrumentAmpersandLoaded = true;

  const root = document.querySelector('#MainContent');
  if (!root) return;

  const ensureFont = () => {
    if (document.getElementById('bnon-instrument-ampersand-font')) return;
    const font = document.createElement('link');
    font.id = 'bnon-instrument-ampersand-font';
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:opsz,wght@14..32,400..700&text=%26&display=swap';
    document.head.append(font);
  };

  const excluded = 'script, style, svg, code, pre, textarea, .bnon-instrument-ampersand, [data-bnon-ampersand-exclude]';
  const decorate = (node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      const text = walker.currentNode;
      if (text.nodeValue.includes('&') && !text.parentElement.closest(excluded)) textNodes.push(text);
    }
    if (textNodes.length) ensureFont();
    textNodes.forEach(text => {
      const fragment = document.createDocumentFragment();
      text.nodeValue.split('&').forEach((part, index) => {
        if (index) {
          const ampersand = document.createElement('span');
          ampersand.className = 'bnon-instrument-ampersand';
          ampersand.textContent = '&';
          fragment.append(ampersand);
        }
        if (part) fragment.append(document.createTextNode(part));
      });
      text.replaceWith(fragment);
    });
  };

  decorate(root);
  new MutationObserver(records => {
    records.forEach(record => {
      if (record.type === 'characterData') decorate(record.target.parentElement);
      record.addedNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) decorate(node.parentElement);
        else if (node.nodeType === Node.ELEMENT_NODE) decorate(node);
      });
    });
  }).observe(root, { childList: true, characterData: true, subtree: true });
})();
