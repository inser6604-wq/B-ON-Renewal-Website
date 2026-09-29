/**
 * Blocks the browser's native image drag preview while preserving normal image
 * clicks and linked-image navigation.
 */
document.addEventListener('dragstart', (event) => {
  if (event.target instanceof HTMLImageElement || event.target.closest?.('.bnon-review__link')) event.preventDefault();
}, { capture: true });
