if (!customElements.get('bnon-contact-page')) {
  customElements.define('bnon-contact-page', class extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      if (!this.form || this.dataset.ready === 'true') return;
      this.dataset.ready = 'true';

      this.nameField = this.form.querySelector('[data-required-field][autocomplete="name"]');
      this.emailField = this.form.querySelector('[data-required-field][type="email"]');
      this.messageField = this.form.querySelector('textarea[data-required-field]');
      this.privacyField = this.form.querySelector('[data-privacy]');
      this.submitButton = this.form.querySelector('[data-contact-submit]');
      this.serviceFields = [...this.form.querySelectorAll('[data-service-option]')];
      this.servicesValue = this.form.querySelector('[data-services-value]');

      this.validate = this.validate.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.syncServices = this.syncServices.bind(this);

      [this.nameField, this.emailField, this.messageField, this.privacyField].forEach((field) => {
        field?.addEventListener('input', this.validate);
        field?.addEventListener('change', this.validate);
        field?.addEventListener('blur', () => this.showFieldError(field));
      });
      this.serviceFields.forEach((field) => field.addEventListener('change', this.syncServices));
      this.form.addEventListener('submit', this.handleSubmit);
      this.syncServices();
      this.validate();
      this.setupDurationPicker();
      this.setupEntrance();
    }

    setupDurationPicker() {
      const nativeSelect = this.form.querySelector('[data-duration-native]');
      const picker = this.form.querySelector('[data-duration-picker]');
      const trigger = picker?.querySelector('.bnon-contact-duration-picker__trigger');
      const menu = picker?.querySelector('.bnon-contact-duration-picker__menu');
      const label = picker?.querySelector('[data-duration-label]');
      if (!nativeSelect || !picker || !trigger || !menu || !label) return;

      const close = () => {
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      };
      trigger.addEventListener('click', () => {
        const opening = menu.hidden;
        menu.hidden = !opening;
        trigger.setAttribute('aria-expanded', String(opening));
      });
      picker.querySelectorAll('[data-duration-option]').forEach((option) => option.addEventListener('click', () => {
        nativeSelect.value = option.dataset.value;
        label.textContent = option.textContent;
        nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        close();
        trigger.focus();
      }));
      document.addEventListener('pointerdown', (event) => {
        if (!picker.contains(event.target)) close();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
      });
    }

    setupEntrance() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
      this.classList.add('is-entrance-ready');
      this.entranceObserver = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.classList.add('is-entered');
        this.entranceObserver.disconnect();
      }, { threshold: 0.2 });
      this.entranceObserver.observe(this);
    }

    isValid() {
      return Boolean(
        this.nameField?.value.trim() &&
        this.emailField?.value.trim() &&
        this.emailField.checkValidity() &&
        this.messageField?.value.trim() &&
        this.privacyField?.checked
      );
    }

    validate() {
      if (this.submitButton) this.submitButton.disabled = !this.isValid();
    }

    showFieldError(field) {
      const error = this.form.querySelector(`[data-error-for="${CSS.escape(field.id)}"]`);
      if (!error) return;
      let message = '';
      if (field.type === 'checkbox' && !field.checked) message = '문의 접수를 위해 동의가 필요합니다.';
      else if (!field.value.trim()) message = '필수 입력 항목입니다.';
      else if (field.type === 'email' && !field.validity.valid) message = '올바른 이메일 주소를 입력해 주세요.';
      error.textContent = message;
      field.setAttribute('aria-invalid', String(Boolean(message)));
      if (message) field.setAttribute('aria-describedby', error.dataset.errorFor + '-error');
      else field.removeAttribute('aria-describedby');
      error.id = error.dataset.errorFor + '-error';
    }

    syncServices() {
      if (!this.servicesValue) return;
      this.servicesValue.value = this.serviceFields.filter((field) => field.checked).map((field) => field.value).join(', ');
    }

    handleSubmit(event) {
      this.syncServices();
      [this.nameField, this.emailField, this.messageField, this.privacyField].forEach((field) => this.showFieldError(field));
      if (!this.isValid()) {
        event.preventDefault();
        this.form.querySelector('[aria-invalid="true"]')?.focus();
        this.validate();
      }
    }

    disconnectedCallback() {
      this.entranceObserver?.disconnect();
    }
  });
}
