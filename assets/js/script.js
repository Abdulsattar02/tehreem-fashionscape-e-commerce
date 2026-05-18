'use strict';

const onClickSafe = (el, handler) => {
  if (!el) return;
  el.addEventListener('click', handler);
};

const addListenerSafe = (el, eventName, handler) => {
  if (!el) return;
  el.addEventListener(eventName, handler);
};

// modal variables
const modal = document.querySelector('[data-modal]');
const modalCloseBtn = document.querySelector('[data-modal-close]');
const modalCloseOverlay = document.querySelector('[data-modal-overlay]');

// modal function
const modalCloseFunc = function () {
  if (!modal) return;
  modal.classList.add('closed');
};

// modal eventListener
addListenerSafe(modalCloseOverlay, 'click', modalCloseFunc);
onClickSafe(modalCloseBtn, modalCloseFunc);






// notification toast variables
const notificationToast = document.querySelector('[data-toast]');
const toastCloseBtn = document.querySelector('[data-toast-close]');

// notification toast eventListener
onClickSafe(toastCloseBtn, function () {
  if (!notificationToast) return;
  notificationToast.classList.add('closed');
});





// mobile menu variables
const mobileMenuOpenBtn = document.querySelectorAll('[data-mobile-menu-open-btn]');
const mobileMenu = document.querySelectorAll('[data-mobile-menu]');
const mobileMenuCloseBtn = document.querySelectorAll('[data-mobile-menu-close-btn]');
const overlay = document.querySelector('[data-overlay]');

const mobileMenuCloseFunc = function () {
  for (let j = 0; j < mobileMenu.length; j++) {
    mobileMenu[j].classList.remove('active');
  }
  if (overlay) overlay.classList.remove('active');
};

for (let i = 0; i < mobileMenuOpenBtn.length; i++) {

  // open handler
  mobileMenuOpenBtn[i].addEventListener('click', function () {
    const menu = mobileMenu[i] || mobileMenu[0];
    if (menu) menu.classList.add('active');
    if (overlay) overlay.classList.add('active');
  });

  // close buttons (optional per i)
  onClickSafe(mobileMenuCloseBtn[i], mobileMenuCloseFunc);

}

addListenerSafe(overlay, 'click', mobileMenuCloseFunc);





// accordion variables
const accordionBtn = document.querySelectorAll('[data-accordion-btn]');
const accordion = document.querySelectorAll('[data-accordion]');

for (let i = 0; i < accordionBtn.length; i++) {

  accordionBtn[i].addEventListener('click', function () {

    const panel = this.nextElementSibling;
    if (!panel) return;

    const clickedBtn = panel.classList.contains('active');

    for (let j = 0; j < accordion.length; j++) {

      if (clickedBtn) break;

      if (accordion[j].classList.contains('active')) {

        accordion[j].classList.remove('active');
        if (accordionBtn[j]) accordionBtn[j].classList.remove('active');

      }

    }

    panel.classList.toggle('active');
    this.classList.toggle('active');

  });

}


/* Sticky header shadow on scroll */
const headerMain = document.querySelector('.header-main');
if (headerMain) {
  const onScroll = () => {
    if (window.scrollY > 24) headerMain.classList.add('scrolled');
    else headerMain.classList.remove('scrolled');
  };

  // Throttle scroll handler for smoother mobile performance
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
  }, { passive: true });
}

/* Reveal on scroll using IntersectionObserver */
const revealElements = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealElements.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

  revealElements.forEach(el => io.observe(el));
} else {
  // fallback: reveal all
  revealElements.forEach(el => el.classList.add('in-view'));
}

