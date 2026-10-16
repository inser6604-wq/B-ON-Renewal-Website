(() => {
  const pdfUrl = 'https://cdn.shopify.com/s/files/1/0971/6249/4133/files/B_ON-Company-profile01_7c22c177-e87f-471a-a817-45ee1fc1453e.pdf?v=1791854658';
  const filename = 'B&ON-Company-Profile.pdf';
  let downloadPromise = null;
  let feedback;
  let hideTimer;
  let lastTrigger;

  function hideFeedback() {
    clearTimeout(hideTimer);
    if (feedback.element.contains(document.activeElement)) lastTrigger?.focus({ preventScroll: true });
    feedback.element.hidden = true;
  }

  function showFeedback(state) {
    if (!feedback) {
      const element = document.createElement('div');
      element.className = 'company-deck-feedback';
      element.setAttribute('role', 'region');
      element.setAttribute('aria-label', '회사소개서 다운로드 안내');

      const icon = document.createElement('span');
      icon.className = 'company-deck-feedback__icon';
      icon.setAttribute('aria-hidden', 'true');

      const message = document.createElement('p');
      message.className = 'company-deck-feedback__message';
      message.setAttribute('role', 'status');
      message.setAttribute('aria-live', 'polite');
      message.setAttribute('aria-atomic', 'true');

      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'company-deck-feedback__close';
      close.setAttribute('aria-label', '다운로드 안내 닫기');
      close.textContent = '×';
      close.addEventListener('click', hideFeedback);

      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'company-deck-feedback__retry';
      retry.textContent = '다시 시도';
      retry.hidden = true;
      retry.addEventListener('click', () => downloadCompanyDeck(lastTrigger));

      element.append(icon, message, close, retry);
      document.body.append(element);
      feedback = { element, message, retry, close };
    }

    clearTimeout(hideTimer);
    feedback.element.hidden = false;
    feedback.element.dataset.state = state;
    if (document.activeElement === feedback.retry && state !== 'error') {
      feedback.close.focus({ preventScroll: true });
    }
    feedback.retry.hidden = state !== 'error';
    feedback.message.textContent = {
      loading: '회사소개서를 다운로드하는 중입니다.',
      success: '회사소개서 다운로드를 시작했습니다.',
      error: '다운로드하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    }[state];
    if (state === 'success') hideTimer = window.setTimeout(hideFeedback, 5000);
  }

  async function getPdfBlob(signal) {
    const response = await fetch(pdfUrl, { credentials: 'omit', signal });
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok || !contentType.toLowerCase().includes('application/pdf')) {
      throw new Error('The company deck response is not a PDF.');
    }

    const blob = await response.blob();
    const signature = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
    const isPdf = signature.length === 5
      && signature[0] === 0x25
      && signature[1] === 0x50
      && signature[2] === 0x44
      && signature[3] === 0x46
      && signature[4] === 0x2d;

    if (!isPdf) throw new Error('The company deck payload is not a PDF.');

    return blob;
  }

  function savePdf(blob) {
    const objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  async function downloadCompanyDeck(trigger) {
    if (downloadPromise) {
      showFeedback('loading');
      return;
    }

    lastTrigger = trigger;
    const previousBusy = trigger.getAttribute('aria-busy');
    const previousDisabled = trigger.getAttribute('aria-disabled');
    trigger.setAttribute('aria-busy', 'true');
    trigger.setAttribute('aria-disabled', 'true');
    trigger.removeAttribute('data-company-deck-download-error');
    showFeedback('loading');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    downloadPromise = getPdfBlob(controller.signal);

    try {
      savePdf(await downloadPromise);
      showFeedback('success');
    } catch (_error) {
      trigger.setAttribute('data-company-deck-download-error', 'true');
      showFeedback('error');
    } finally {
      clearTimeout(timeout);
      if (previousBusy === null) trigger.removeAttribute('aria-busy');
      else trigger.setAttribute('aria-busy', previousBusy);
      if (previousDisabled === null) trigger.removeAttribute('aria-disabled');
      else trigger.setAttribute('aria-disabled', previousDisabled);
      downloadPromise = null;
    }
  }

  document.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const trigger = event.target.closest('[data-company-deck-download]');
    if (!trigger) return;

    event.preventDefault();
    downloadCompanyDeck(trigger);
  });
})();
