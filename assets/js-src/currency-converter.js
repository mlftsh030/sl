/**
 * SL Tours — currency converter
 * Displays tour prices in ZAR (source of truth) with an approximate live
 * conversion to USD, EUR, or GBP. Rates are fetched from the Frankfurter
 * API (European Central Bank reference rates), cached for one hour, and
 * the visitor's chosen display currency persists across pages.
 */
(function () {
    "use strict";

    var RATES_ENDPOINT = "https://api.frankfurter.dev/v1/latest?from=ZAR";
    var RATES_CACHE_KEY = "slToursRatesZAR";
    var RATES_TTL_MS = 60 * 60 * 1000;
    var CURRENCY_STORAGE_KEY = "slToursSelectedCurrency";
    var SUPPORTED_CURRENCIES = ["ZAR", "USD", "EUR", "GBP"];
    var CURRENCY_LABELS = { ZAR: "ZAR (R)", USD: "USD ($)", EUR: "EUR (€)", GBP: "GBP (£)" };
    var CURRENCY_SYMBOLS = { ZAR: "R", USD: "$", EUR: "€", GBP: "£" };
    var PRICE_SELECTOR = ".sl-price, .sl-price-badge";

    function readCachedRates() {
        var raw;
        var parsed;

        try {
            raw = sessionStorage.getItem(RATES_CACHE_KEY);
        } catch (e) {
            return null;
        }

        if (!raw) {
            return null;
        }

        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            return null;
        }

        if (!parsed || !parsed.rates || !parsed.fetchedAt) {
            return null;
        }

        if (Date.now() - parsed.fetchedAt > RATES_TTL_MS) {
            return null;
        }

        return parsed.rates;
    }

    function writeCachedRates(rates) {
        try {
            sessionStorage.setItem(
                RATES_CACHE_KEY,
                JSON.stringify({ rates: rates, fetchedAt: Date.now() })
            );
        } catch (e) {
            // Ignore storage failures (private browsing, quota, etc.)
        }
    }

    function getSelectedCurrency() {
        var stored;

        try {
            stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
        } catch (e) {
            stored = null;
        }

        return SUPPORTED_CURRENCIES.indexOf(stored) !== -1 ? stored : "ZAR";
    }

    function setSelectedCurrency(currency) {
        try {
            localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
        } catch (e) {
            // Ignore storage failures.
        }
    }

    function parseZarValue(text) {
        var cleaned = (text || "").replace(/[^0-9.]/g, "");
        var value = parseFloat(cleaned);
        return isNaN(value) ? null : value;
    }

    // Captures a trailing unit label such as " pp", "/trip", " per person" so it
    // can be re-attached after the numeric amount is converted to another currency.
    function parseSuffix(text) {
        var match = (text || "").match(/R[\d,.]+\s*(.*)$/);
        return match ? match[1] : "";
    }

    function formatAmount(amount) {
        return amount.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    function getPriceElements() {
        return Array.prototype.slice.call(document.querySelectorAll(PRICE_SELECTOR));
    }

    function primePriceElements(elements) {
        elements.forEach(function (el) {
            if (el.getAttribute("data-zar-price")) {
                return;
            }
            var zarValue = parseZarValue(el.textContent);
            if (zarValue !== null) {
                el.setAttribute("data-zar-price", String(zarValue));
                el.setAttribute("data-zar-text", el.textContent);
                el.setAttribute("data-zar-suffix", parseSuffix(el.textContent));
            }
        });
    }

    function renderPrices(currency, rates) {
        var elements = getPriceElements();

        primePriceElements(elements);

        elements.forEach(function (el) {
            var zarAttr = el.getAttribute("data-zar-price");
            var zarText = el.getAttribute("data-zar-text");

            if (!zarAttr) {
                // Non-numeric prices ("Rate on Request") are left untouched.
                return;
            }

            if (currency === "ZAR" || !rates) {
                el.textContent = zarText;
                el.removeAttribute("title");
                return;
            }

            var rate = rates[currency];
            if (!rate) {
                el.textContent = zarText;
                el.removeAttribute("title");
                return;
            }

            var zarValue = parseFloat(zarAttr);
            var converted = zarValue * rate;
            var suffix = el.getAttribute("data-zar-suffix") || "";
            var suffixText = suffix ? (suffix.charAt(0) === "/" ? suffix : " " + suffix) : "";

            el.textContent = CURRENCY_SYMBOLS[currency] + formatAmount(converted) + suffixText;
            el.setAttribute(
                "title",
                zarText + " — approximate, based on the current exchange rate. " +
                "All bookings are charged in South African Rand (ZAR)."
            );
        });
    }

    function fetchRates(callback) {
        var cached = readCachedRates();

        if (cached) {
            callback(cached);
            return;
        }

        fetch(RATES_ENDPOINT)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Rate request failed");
                }
                return response.json();
            })
            .then(function (data) {
                if (!data || !data.rates) {
                    throw new Error("Malformed rate response");
                }
                var rates = data.rates;
                rates.ZAR = 1;
                writeCachedRates(rates);
                callback(rates);
            })
            .catch(function () {
                callback(null);
            });
    }

    function buildSelector() {
        var wrap = document.createElement("div");
        var label = document.createElement("i");
        var select = document.createElement("select");
        var i;
        var option;

        wrap.className = "sl-currency-selector";
        label.className = "fa-solid fa-money-bill-transfer";
        label.setAttribute("aria-hidden", "true");

        for (i = 0; i < SUPPORTED_CURRENCIES.length; i += 1) {
            option = document.createElement("option");
            option.value = SUPPORTED_CURRENCIES[i];
            option.textContent = CURRENCY_LABELS[SUPPORTED_CURRENCIES[i]];
            select.appendChild(option);
        }

        select.setAttribute("aria-label", "Display prices in");
        wrap.appendChild(label);
        wrap.appendChild(select);

        return { wrap: wrap, select: select };
    }

    // Floating mobile toggle — a compact button above the WhatsApp button that
    // reveals the currency selector on tap, so it's reachable without opening
    // the main nav menu.
    function injectFloatingToggle() {
        if (document.querySelector(".sl-currency-float")) {
            return null;
        }

        var wrap = document.createElement("div");
        var btn = document.createElement("button");
        var panel = document.createElement("div");
        var mount = document.createElement("div");

        wrap.className = "sl-currency-float";
        btn.type = "button";
        btn.className = "sl-currency-float-btn";
        btn.setAttribute("aria-label", "Change displayed currency");
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "$";

        panel.className = "sl-currency-float-panel";
        mount.className = "sl-currency-mount";
        panel.appendChild(mount);

        btn.addEventListener("click", function () {
            var isOpen = wrap.classList.toggle("open");
            btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });

        document.addEventListener("click", function (e) {
            if (!wrap.contains(e.target)) {
                wrap.classList.remove("open");
                btn.setAttribute("aria-expanded", "false");
            }
        });

        wrap.appendChild(panel);
        wrap.appendChild(btn);
        document.body.appendChild(wrap);

        return mount;
    }

    function injectMounts() {
        // Injects the floating mobile toggle's mount point into the DOM first,
        // so it's included in the query below alongside the navbar mount(s).
        injectFloatingToggle();

        var targets = document.querySelectorAll(".sl-currency-mount");
        var mounts = [];
        var i;

        for (i = 0; i < targets.length; i += 1) {
            mounts.push(targets[i]);
        }

        return mounts;
    }

    function init() {
        var priceElements = getPriceElements();
        var mounts = injectMounts();

        if (!mounts.length && !priceElements.length) {
            return;
        }

        primePriceElements(priceElements);

        var selectedCurrency = getSelectedCurrency();
        var currentRates = null;

        var selectors = mounts.map(function (mount) {
            var built = buildSelector();
            built.select.value = selectedCurrency;
            mount.appendChild(built.wrap);
            return built.select;
        });

        function applyCurrency(currency) {
            selectedCurrency = currency;
            setSelectedCurrency(currency);
            selectors.forEach(function (select) {
                select.value = currency;
            });
            renderPrices(currency, currentRates);
        }

        selectors.forEach(function (select) {
            select.addEventListener("change", function () {
                applyCurrency(select.value);
                var floatWrap = select.closest(".sl-currency-float");
                if (floatWrap) {
                    floatWrap.classList.remove("open");
                    var floatBtn = floatWrap.querySelector(".sl-currency-float-btn");
                    if (floatBtn) {
                        floatBtn.setAttribute("aria-expanded", "false");
                    }
                }
            });
        });

        renderPrices(selectedCurrency, null);

        fetchRates(function (rates) {
            currentRates = rates;
            renderPrices(selectedCurrency, currentRates);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
