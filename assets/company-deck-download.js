(() => {
  const pdfUrl = 'https://cdn.shopify.com/s/files/1/0971/6249/4133/files/B_ON-Company-profile01.pdf?v=1791800710';
  const filename = 'B&ON-Company-Profile.pdf';
  let downloadPromise = null;

  async function getPdfBlob() {
    const response = await fetch(pdfUrl, { credentials: 'omit' });
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
    if (downloadPromise) return;

    trigger.setAttribute('aria-busy', 'true');
    trigger.removeAttribute('data-company-deck-download-error');
    downloadPromise = getPdfBlob();

    try {
      savePdf(await downloadPromise);
    } catch (_error) {
      trigger.setAttribute('data-company-deck-download-error', 'true');
    } finally {
      trigger.removeAttribute('aria-busy');
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
