/* Geometry adapted from the preserved bnon-universe-3d-planets-bigger.html.
 * Each custom element owns its frame, observer and listeners. Shopify section
 * replacement triggers disconnect/connect, so editor reloads cannot leak loops.
 */
if (!customElements.get('bnon-hero-universe')) {
  class BnonHeroUniverse extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.ringA = this.querySelector('[data-bnon-ring-a]');
      this.ringB = this.querySelector('[data-bnon-ring-b]');
      this.planetA = this.querySelector('[data-bnon-planet-a]');
      this.planetB = this.querySelector('[data-bnon-planet-b]');
      this.toggle = this.querySelector('[data-bnon-motion-toggle]');
      this.label = this.querySelector('[data-bnon-motion-label]');
      if (![this.ringA, this.ringB, this.planetA, this.planetB, this.toggle, this.label].every(Boolean)) return;

      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.small = window.matchMedia('(max-width: 480px)');
      this.frame = null;
      this.time = 0;
      this.lastTime = null;
      this.paused = false;
      this.visible = false;
      this.failed = false;
      this.removeAttribute('data-bnon-motion-failed');
      this.tick = (now) => {
        this.frame = null;
        if (!this.canAnimate()) return;
        if (this.lastTime !== null) this.time += Math.min(now - this.lastTime, 100) / 1000;
        this.lastTime = now;
        if (this.draw(this.time)) this.frame = requestAnimationFrame(this.tick);
      };
      this.toggle.addEventListener('click', () => {
        this.paused = !this.paused;
        this.sync();
      }, options);
      this.reduced.addEventListener('change', () => this.sync(), options);
      this.small.addEventListener('change', () => this.sync(), options);
      document.addEventListener('visibilitychange', () => this.sync(), options);
      this.draw(0);
      this.observer = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        this.sync();
      });
      this.observer.observe(this);
      this.sync();
    }

    disconnectedCallback() {
      this.stop();
      this.observer?.disconnect();
      this.controller?.abort();
      this.controller = null;
    }

    canAnimate() {
      return this.isConnected && this.visible && !document.hidden && !this.paused &&
        !this.reduced.matches && !this.small.matches && !this.failed;
    }

    stop() {
      if (this.frame !== null && this.frame !== undefined) cancelAnimationFrame(this.frame);
      this.frame = null;
      this.lastTime = null;
    }

    sync() {
      const staticMode = this.reduced.matches || this.small.matches;
      this.toggle.hidden = staticMode || this.failed;
      this.label.textContent = this.paused ? '애니메이션 재생' : '애니메이션 일시정지';
      if (staticMode) {
        this.time = 0;
        this.draw(0);
      }
      if (this.canAnimate()) {
        if (this.frame === null) this.frame = requestAnimationFrame(this.tick);
      } else {
        this.stop();
      }
    }

    point(theta, rx, ry, rz) {
      const x = 180 * Math.cos(theta);
      const y = 180 * Math.sin(theta);
      const y1 = y * Math.cos(rx);
      const z1 = y * Math.sin(rx);
      const x2 = x * Math.cos(ry) + z1 * Math.sin(ry);
      const z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
      const scale = 760 / (760 - z2);
      return {
        x: (x2 * Math.cos(rz) - y1 * Math.sin(rz)) * scale,
        y: (x2 * Math.sin(rz) + y1 * Math.cos(rz)) * scale,
        z: z2,
      };
    }

    ring(rx, ry, rz) {
      let path = '';
      for (let i = 0; i <= 180; i++) {
        const point = this.point(i / 180 * Math.PI * 2, rx, ry, rz);
        path += `${i === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)} `;
      }
      return `${path}Z`;
    }

    draw(time) {
      if (this.failed) return false;
      try {
        const deg = Math.PI / 180;
        const a = time * Math.PI * 2 / 2.55;
        const b = -time * Math.PI * 2 / 3.15;
        const arx = (67 + Math.sin(a * 0.52) * 11) * deg;
        const arz = 24 * deg;
        const bry = (61 + Math.sin(b * 0.47) * 9) * deg;
        const brz = -28 * deg;
        this.ringA.setAttribute('d', this.ring(arx, a, arz));
        this.ringB.setAttribute('d', this.ring(b, bry, brz));
        const pa = this.point(a * 1.18 + 0.35, arx, a, arz);
        const pb = this.point(-b * 1.07 + 3.4, b, bry, brz);
        [[this.planetA, pa], [this.planetB, pb]].forEach(([planet, point]) => {
          planet.setAttribute('cx', point.x);
          planet.setAttribute('cy', point.y);
          planet.style.opacity = String(0.48 + (point.z / 180 + 1) * 0.26);
        });
        return true;
      } catch {
        this.failed = true;
        this.stop();
        this.toggle.hidden = true;
        this.setAttribute('data-bnon-motion-failed', '');
        return false;
      }
    }
  }

  customElements.define('bnon-hero-universe', BnonHeroUniverse);
}
