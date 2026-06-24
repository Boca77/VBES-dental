

/* ============================================================
   DentalVBES - app orchestration (jQuery)
   Language (MK/EN) · theme switcher · nav · services · modals
   ============================================================ */

window.LANG = localStorage.getItem("dvbes_lang") || "mk";
let THEME = localStorage.getItem("dvbes_theme") || "clinical";

window.t = function (key) {
  const dict = window.I18N[window.LANG] || window.I18N.mk;
  return (key in dict) ? dict[key] : (window.I18N.mk[key] || key);
};

/* translate a scope (defaults to whole document) */
window.applyI18n = function ($scope) {
  $scope = $scope || $(document);
  $scope.find("[data-i18n]").addBack("[data-i18n]").each(function () {
    const v = window.t($(this).attr("data-i18n"));
    if (typeof v === "string") this.innerHTML = v;
  });
  $scope.find("[data-i18n-ph]").addBack("[data-i18n-ph]").each(function () {
    this.setAttribute("placeholder", window.t($(this).attr("data-i18n-ph")));
  });
};

$(function () {
  /* ---------- THEME ---------- */
  function applyTheme(name) {
    THEME = name;
    document.documentElement.setAttribute("data-theme", name);
    localStorage.setItem("dvbes_theme", name);
  }
  applyTheme(THEME);

  /* ---------- LANGUAGE ---------- */
  function applyLang(lang) {
    window.LANG = lang;
    localStorage.setItem("dvbes_lang", lang);
    document.documentElement.setAttribute("lang", lang);
    document.title = window.t("meta.title");
    window.applyI18n($(document));
    $(".lang-toggle span").removeClass("active").filter(`[data-lang="${lang}"]`).addClass("active");
    renderServices();
    setHeroHours();
    if (sectionBooking) sectionBooking.relabel();
    if (modalBooking) modalBooking.relabel();
    if ($("#apptModal").hasClass("open")) renderAppts();
  }

  /* hero badge reflects whether the practice is actually open today
     (closed on Sunday) instead of always claiming "Open today" */
  function setHeroHours() {
    const closed = new Date().getDay() === 0;   // 0 = Sunday
    $(".hero-badge").toggleClass("is-closed", closed);
    $(".hero-hours").text(window.t(closed ? "hero.closed" : "hero.hours"));
  }

  $(".lang-toggle").on("click", function () {
    applyLang(window.LANG === "mk" ? "en" : "mk");
  });

  /* ---------- HEADER + scroll FX ---------- */
  const $header = $(".site-header");
  const $fab = $(".fab");
  function onScroll() {
    const y = window.scrollY;
    $header.toggleClass("scrolled", y > 24);
    $fab.toggleClass("show", y > 560);
  }
  $(window).on("scroll", onScroll); onScroll();

  /* ---------- MOBILE MENU ---------- */
  $(".nav-toggle").on("click", () => $(".mobile-menu").addClass("open"));
  $(".mm-close, .mobile-menu .nav-link").on("click", () => $(".mobile-menu").removeClass("open"));

  /* ---------- SERVICES GRID ---------- */
  window.renderServices = function () {
    const $grid = $("#servicesGrid").empty();
    window.SERVICES.forEach(s => {
      const thumb = s.svg
        ? `<div class="svc-thumb" style="background:linear-gradient(135deg,var(--accent),var(--primary));color:#fff;font-size:34px;">${s.svg}</div>`
        : s.icon
        ? `<div class="svc-thumb" style="background:linear-gradient(135deg,var(--accent),var(--primary));color:#fff;font-size:34px;"><i class="${s.icon}"></i></div>`
        : `<div class="svc-thumb"><img src="${s.img}" alt=""${s.pad ? ' class="icon-pad"' : ''}></div>`;
      const $card = $(`
        <article class="svc-card reveal">
          ${thumb}
          <h3>${window.t("svc." + s.key)}</h3>
          <p>${window.t("svc." + s.key + ".d")}</p>
          <a href="#" class="svc-link" data-svc="${s.key}">${window.t("services.book")} <i class="bi bi-arrow-right"></i></a>
        </article>`);
      $card.find(".svc-link").on("click", function (e) {
        e.preventDefault();
        openBookingModal(s.key);
      });
      $grid.append($card);
    });
    observeReveals();
  };

  /* ---------- BOOKING (section + modal) ---------- */
  const sectionBooking = window.createBooking($("#bookingSection"));
  let modalBooking = null;

  function ensureModalBooking() {
    if (!modalBooking) modalBooking = window.createBooking($("#bookingModalBody"));
    return modalBooking;
  }

  window.openBookingModal = function (serviceKey) {
    ensureModalBooking();
    if (serviceKey) modalBooking.selectService(serviceKey);
    else modalBooking.reset();
    openModal("#bookModal");
  };

  /* ---------- MODAL plumbing ---------- */
  function openModal(sel) { $(sel).addClass("open"); $("body").css("overflow", "hidden"); }
  function closeModal(sel) { $(sel).removeClass("open"); $("body").css("overflow", ""); }
  $(".modal-close, .modal-backdrop").on("click", function () { closeModal("#" + $(this).closest(".modal").attr("id")); });
  $(document).on("keydown", e => { if (e.key === "Escape") $(".modal.open").each(function () { closeModal("#" + this.id); }); });

  /* triggers that open the booking modal */
  $(".js-book-modal").on("click", function (e) { e.preventDefault(); openBookingModal($(this).data("svc") || null); });
  /* triggers that scroll to the section */
  $(".js-book-scroll").on("click", function (e) {
    e.preventDefault();
    const top = $("#booking").offset().top - 70;
    $("html,body").animate({ scrollTop: top }, 520);
  });

  /* ---------- MY APPOINTMENTS ---------- */
  function renderAppts() {
    const list = loadMine().slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const $body = $("#apptList").empty();
    if (!list.length) {
      $body.append(`<div class="empty-state"><i class="bi bi-calendar-x"></i>${window.t("book.none_yet")}</div>`);
      return;
    }
    const L = window.I18N[window.LANG];
    list.forEach(a => {
      const d = window.bookingHelpers.parseYmd(a.date);
      const $row = $(`
        <div class="appt">
          <div class="ad"><b>${d.getDate()}</b><span>${L.months[d.getMonth()].slice(0, 3)}</span></div>
          <div class="ai">
            <b>${window.t("svc." + a.service)}</b>
            <span>${L.days[d.getDay()]} · ${a.time} · ${window.t("book.ref")} ${a.ref}</span>
          </div>
          <button class="appt-cancel">${window.t("book.cancel")}</button>
        </div>`);
      $row.find(".appt-cancel").on("click", () => {
        const all = loadMine().filter(x => x.ref !== a.ref);
        saveMine(all);
        renderAppts();
      });
      $body.append($row);
    });
  }
  $(".js-my-appts").on("click", function (e) { e.preventDefault(); renderAppts(); openModal("#apptModal"); });
  document.addEventListener("dvbes:booked", () => { /* keep appt pips fresh */ });

  /* ---------- REVEAL ON SCROLL ---------- */
  let io;
  function observeReveals() {
    if (!("IntersectionObserver" in window)) { $(".reveal").addClass("in"); return; }
    if (!io) io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    $(".reveal:not(.in)").each(function () { io.observe(this); });
  }

  /* ---------- INIT ---------- */
  renderServices();
  applyLang(window.LANG);
  observeReveals();
});
