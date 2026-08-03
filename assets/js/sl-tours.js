// SL Tours — shared behaviour: FAQ accordion, contact form validation + WhatsApp routing, stat counters

document.addEventListener('DOMContentLoaded', function () {

    // FAQ accordion
    document.querySelectorAll('.sl-faq-question').forEach(function (question) {
        question.addEventListener('click', function () {
            var item = question.closest('.sl-faq-item');
            var wasActive = item.classList.contains('active');
            document.querySelectorAll('.sl-faq-item.active').forEach(function (open) {
                open.classList.remove('active');
            });
            if (!wasActive) {
                item.classList.add('active');
            }
        });
    });

    // Stat counters (simple increment animation for elements with data-count)
    var counters = document.querySelectorAll('.sl-stats .numb[data-count]');
    if (counters.length) {
        var animateCounter = function (el) {
            var target = parseInt(el.getAttribute('data-count'), 10);
            var duration = 1500;
            var start = null;
            var step = function (timestamp) {
                if (!start) start = timestamp;
                var progress = Math.min((timestamp - start) / duration, 1);
                el.textContent = Math.floor(progress * target);
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    el.textContent = target;
                }
            };
            window.requestAnimationFrame(step);
        };
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        counters.forEach(function (el) { observer.observe(el); });
    }

    // Contact / inquiry form validation -> WhatsApp deep link
    document.querySelectorAll('form.sl-form').forEach(function (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var valid = true;
            var name = form.querySelector('[name="name"]');
            var email = form.querySelector('[name="email"]');
            var phone = form.querySelector('[name="phone"]');
            var message = form.querySelector('[name="message"]');

            [name, email, phone].forEach(function (field) {
                if (field) {
                    var group = field.closest('.form-group');
                    if (!field.value.trim()) {
                        group && group.classList.add('has-error');
                        field.classList.add('is-invalid');
                        valid = false;
                    } else {
                        group && group.classList.remove('has-error');
                        field.classList.remove('is-invalid');
                    }
                }
            });

            if (email && email.value.trim()) {
                var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(email.value.trim())) {
                    var group = email.closest('.form-group');
                    group && group.classList.add('has-error');
                    email.classList.add('is-invalid');
                    valid = false;
                }
            }

            if (!valid) return;

            var tourName = form.getAttribute('data-tour-name') || '';
            var lines = [
                'Hello SL Tours, I would like to make an enquiry.',
                tourName ? ('Tour: ' + tourName) : null,
                'Name: ' + name.value.trim(),
                'Email: ' + email.value.trim(),
                'Phone: ' + phone.value.trim(),
                message && message.value.trim() ? ('Message: ' + message.value.trim()) : null
            ].filter(Boolean);

            var text = encodeURIComponent(lines.join('\n'));
            var successBox = form.parentElement.querySelector('.sl-form-success');
            if (successBox) {
                successBox.style.display = 'block';
            }
            window.open('https://wa.me/27670127776?text=' + text, '_blank');
            form.reset();
        });
    });

    // Gallery filters
    var galleryGrid = document.querySelector('.sl-gallery-grid');
    if (galleryGrid) {
        var filterButtons = document.querySelectorAll('.sl-gallery-filters button');
        var galleryItems = galleryGrid.querySelectorAll('.sl-gallery-item');

        filterButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                filterButtons.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var filter = btn.getAttribute('data-filter');
                galleryItems.forEach(function (item) {
                    var matches = filter === 'all' || item.getAttribute('data-category') === filter;
                    item.classList.toggle('hidden', !matches);
                });
            });
        });

        // Lightbox
        var lightbox = document.querySelector('.sl-lightbox');
        if (lightbox) {
            var lightboxImg = lightbox.querySelector('img');
            var lightboxCaption = lightbox.querySelector('figcaption');
            var visibleItems = function () {
                return Array.prototype.filter.call(galleryItems, function (item) {
                    return !item.classList.contains('hidden');
                });
            };
            var currentIndex = 0;

            var openLightbox = function (item) {
                var items = visibleItems();
                currentIndex = items.indexOf(item);
                showCurrent(items);
                lightbox.classList.add('open');
                document.body.style.overflow = 'hidden';
            };

            var showCurrent = function (items) {
                var item = items[currentIndex];
                var img = item.querySelector('img');
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt;
                lightboxCaption.textContent = img.alt;
            };

            var closeLightbox = function () {
                lightbox.classList.remove('open');
                document.body.style.overflow = '';
            };

            galleryItems.forEach(function (item) {
                item.addEventListener('click', function () {
                    openLightbox(item);
                });
            });

            lightbox.querySelector('.sl-lightbox-close').addEventListener('click', closeLightbox);
            lightbox.addEventListener('click', function (e) {
                if (e.target === lightbox) closeLightbox();
            });
            lightbox.querySelector('.sl-lightbox-prev').addEventListener('click', function () {
                var items = visibleItems();
                currentIndex = (currentIndex - 1 + items.length) % items.length;
                showCurrent(items);
            });
            lightbox.querySelector('.sl-lightbox-next').addEventListener('click', function () {
                var items = visibleItems();
                currentIndex = (currentIndex + 1) % items.length;
                showCurrent(items);
            });
            document.addEventListener('keydown', function (e) {
                if (!lightbox.classList.contains('open')) return;
                if (e.key === 'Escape') closeLightbox();
                if (e.key === 'ArrowLeft') lightbox.querySelector('.sl-lightbox-prev').click();
                if (e.key === 'ArrowRight') lightbox.querySelector('.sl-lightbox-next').click();
            });
        }
    }

    // Mobile nav: dismiss on outside tap, and when a link is chosen
    var navCollapse = document.getElementById('navbarSupportedContent');
    var navToggler = document.querySelector('.navbar-toggler');
    if (navCollapse && navToggler && window.jQuery) {
        var closeNav = function () {
            if (navCollapse.classList.contains('show')) {
                window.jQuery(navCollapse).collapse('hide');
            }
        };

        // Close after tapping a plain nav link (not the Tours dropdown toggle itself)
        navCollapse.querySelectorAll('a.nav-link:not(.dropdown-toggle), a.dropdown-item').forEach(function (link) {
            link.addEventListener('click', closeNav);
        });

        // Close on any tap/click outside the open menu and its toggler
        document.addEventListener('click', function (e) {
            if (!navCollapse.classList.contains('show')) return;
            if (navCollapse.contains(e.target) || navToggler.contains(e.target)) return;
            closeNav();
        });
    }

    // Reveal the floating WhatsApp/currency buttons only after scrolling past
    // the hero, so they don't sit on top of the hero's own CTA buttons on load.
    // Queried lazily on scroll (rather than cached at setup) since the currency
    // button is injected dynamically by currency-converter.js.
    var REVEAL_THRESHOLD = 320;
    var updateFloatVisibility = function () {
        var show = window.scrollY > REVEAL_THRESHOLD;
        var whatsapp = document.querySelector('.sl-whatsapp-float');
        var currencyFloat = document.querySelector('.sl-currency-float');
        if (whatsapp) {
            whatsapp.classList.toggle('sl-visible', show);
        }
        if (currencyFloat) {
            currencyFloat.classList.toggle('sl-visible', show);
        }
    };
    window.addEventListener('scroll', updateFloatVisibility, { passive: true });
    updateFloatVisibility();

});
