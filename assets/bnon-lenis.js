/* Desktop-only Lenis lifecycle. A single RAF loop is active while smoothing is enabled. */
(() => {
  const desktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lenis;
  let frame;

  const canUseLenis = () => desktop.matches && !reduced.matches && typeof window.Lenis === 'function';

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = undefined;
    lenis?.destroy();
    lenis = undefined;
    delete window.bnonLenis;
  };

  const start = () => {
    if (!canUseLenis() || lenis) return;
    lenis = new window.Lenis({
      duration: 1,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 1,
      anchors: true,
      stopInertiaOnNavigate: true,
      autoRaf: false,
    });
    window.bnonLenis = lenis;

    const raf = time => {
      lenis?.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
  };

  const sync = () => {
    if (canUseLenis()) start();
    else stop();
  };

  desktop.addEventListener('change', sync);
  reduced.addEventListener('change', sync);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', sync);
  sync();
})();
