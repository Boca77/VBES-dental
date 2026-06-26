/* ============================================================
   DentalVBES - Admin dashboard logic (jQuery)
   Shares the Firestore "appointments" store via window.DVBES_DB
   Reuses window.SERVICES, window.I18N and window.bookingHelpers
   ============================================================ */

(function () {
  const H = window.bookingHelpers;           // loadAppts, saveAppts, parseYmd, fmtLongDate, slotsForDate
  const SERVICES = window.SERVICES;

  /* ---- language (shared with public site) ---- */
  window.LANG = localStorage.getItem("dvbes_lang") || "mk";
  window.t = function (key) {
    const d = window.I18N[window.LANG] || window.I18N.mk;
    return key in d ? d[key] : (window.I18N.mk[key] || key);
  };
  const adminT = window.t;   // clobber-proof reference (window.t can be shadowed by DOM/edit tooling)

  /* Persist a change and surface any failure. The data layer updates its cache
     optimistically and returns a Promise; if the write is rejected the live
     listener rolls the UI back, so here we just need to tell the admin. */
  function persist(list) {
    return Promise.resolve(H.saveAppts(list)).catch(function (e) {
      console.error("save failed:", e);
      alert(adminT("ad.save_error"));
    });
  }

  /* ---- admin-only strings, merged into the shared dictionary ---- */
  const ADMIN = {
    mk: {
      "ad.tag": "Админ панел",
      "ad.title": "Преглед на термини",
      "ad.lead": "Кликнете на ден за да ги видите закажаните термини. Со копчето „Нов термин“ можете рачно да додадете закажување.",
      "ad.add": "Нов термин",
      "ad.s_today": "Денес",
      "ad.s_week": "Оваа недела",
      "ad.s_upcoming": "Претстојни",
      "ad.s_total": "Вкупно термини",
      "ad.calendar": "Календар",
      "ad.cal_sub": "Деновите со точка имаат закажани термини",
      "ad.schedule": "Распоред",
      "ad.today_btn": "Денес",
      "ad.appts_n": "термини",
      "ad.appt_1": "термин",
      "ad.none_day": "Нема закажани термини за овој ден.",
      "ad.add_for_day": "Додај термин за овој ден",
      "ad.lg_today": "Денес",
      "ad.lg_has": "Има термини",
      "ad.lg_off": "Затворено / минато",
      "ad.del_confirm": "Да го откажете овој термин?",
      "ad.new_title": "Нов термин",
      "ad.new_sub": "Внесете ги деталите за пациентот и изберете слободен термин.",
      "ad.edit": "Измени",
      "ad.edit_title": "Измени термин",
      "ad.f_service": "Услуга",
      "ad.f_date": "Датум",
      "ad.f_time": "Време",
      "ad.f_name": "Име и презиме на пациент",
      "ad.f_phone": "Телефон",
      "ad.f_email": "Е-пошта",
      "ad.f_notes": "Забелешка",
      "ad.pick_date_first": "Прво изберете датум",
      "ad.closed_day": "Затворено овој ден - изберете друг датум",
      "ad.no_free": "Нема слободни термини за овој ден",
      "ad.save": "Зачувај термин",
      "ad.cancel": "Откажи",
      "ad.required": "Пополнете ги задолжителните полиња и изберете време.",
      "ad.phone_invalid": "Внесете валиден мобилен број (пр. 070123456 или +38970123456).",
      "ad.saved": "Терминот е зачуван.",
      "ad.save_error": "Зачувувањето не успеа. Проверете ја врската и обидете се повторно.",
      "ad.opt": "опционално",
      "ad.free": "Слободно",
      "ad.past": "Изминато",
      "ad.closed_full": "Затворено - ординацијата не работи овој ден.",
      "ad.lg_booked": "Зафатено",
      "ad.click_hint": "Кликнете на слободен термин за да закажете · поминете со глувчето над зафатен за детали",
      "ad.generic": "Термин",
      "ad.step_day": "Изберете ден",
      "ad.step_time": "Изберете време",
      "ad.back_cal": "Назад кон календар",
      "ad.tab_dashboard": "Контролна табла",
      "ad.all_appts": "Сите термини",
      "ap.tag": "Сите термини",
      "ap.title": "Сите закажани термини",
      "ap.lead": "Сите термини во системот, подредени по датум.",
      "ap.total": "вкупно",
      "ap.empty": "Сè уште нема закажани термини.",
      "ap.clear": "Прикажи ги сите",
      "ap.pick_date": "Филтрирај по датум",
      "ap.empty_filter": "Нема термини за избраниот датум.",
      "ad.tab_pending": "Барања",
      "pa.title": "Барања за термини",
      "pa.lead": "Барања испратени преку сајтот. Одобрете или одбијте.",
      "pa.total": "на чекање",
      "pa.empty": "Нема барања на чекање.",
      "pa.approve": "Одобри",
      "pa.reject": "Одбиј",
      "pa.is_pending": "На чекање",
      "pa.reject_confirm": "Да го одбиете ова барање?",
      "pa.clash": "Овој термин е веќе зафатен со потврден термин. Да продолжите?"
    },
    en: {
      "ad.tag": "Admin panel",
      "ad.title": "Appointments overview",
      "ad.lead": "Click a day to see the appointments booked for it. Use “New appointment” to add a booking manually.",
      "ad.add": "New appointment",
      "ad.s_today": "Today",
      "ad.s_week": "This week",
      "ad.s_upcoming": "Upcoming",
      "ad.s_total": "Total booked",
      "ad.calendar": "Calendar",
      "ad.cal_sub": "Days with a badge have appointments",
      "ad.schedule": "Schedule",
      "ad.today_btn": "Today",
      "ad.appts_n": "appointments",
      "ad.appt_1": "appointment",
      "ad.none_day": "No appointments booked for this day.",
      "ad.add_for_day": "Add an appointment for this day",
      "ad.lg_today": "Today",
      "ad.lg_has": "Has appointments",
      "ad.lg_off": "Closed / past",
      "ad.del_confirm": "Cancel this appointment?",
      "ad.new_title": "New appointment",
      "ad.new_sub": "Enter the patient details and pick a free time slot.",
      "ad.edit": "Edit",
      "ad.edit_title": "Edit appointment",
      "ad.f_service": "Service",
      "ad.f_date": "Date",
      "ad.f_time": "Time",
      "ad.f_name": "Patient full name",
      "ad.f_phone": "Phone",
      "ad.f_email": "Email",
      "ad.f_notes": "Note",
      "ad.pick_date_first": "Choose a date first",
      "ad.closed_day": "Closed this day - pick another date",
      "ad.no_free": "No free time slots for this day",
      "ad.save": "Save appointment",
      "ad.cancel": "Cancel",
      "ad.required": "Fill the required fields and pick a time.",
      "ad.phone_invalid": "Enter a valid mobile number (e.g. 070123456 or +38970123456).",
      "ad.saved": "Appointment saved.",
      "ad.save_error": "Saving failed. Check your connection and try again.",
      "ad.opt": "optional",
      "ad.free": "Free",
      "ad.past": "Past",
      "ad.closed_full": "Closed - the practice is not open on this day.",
      "ad.lg_booked": "Booked",
      "ad.click_hint": "Click a free slot to book · hover a booked one for details",
      "ad.generic": "Appointment",
      "ad.step_day": "Choose day",
      "ad.step_time": "Choose time",
      "ad.back_cal": "Back to calendar",
      "ad.tab_dashboard": "Dashboard",
      "ad.all_appts": "All appointments",
      "ap.tag": "All appointments",
      "ap.title": "All booked appointments",
      "ap.lead": "Every appointment in the system, sorted by date.",
      "ap.total": "total",
      "ap.empty": "No appointments booked yet.",
      "ap.clear": "Show all",
      "ap.pick_date": "Filter by date",
      "ap.empty_filter": "No appointments on the selected date.",
      "ad.tab_pending": "Pending",
      "pa.title": "Appointment requests",
      "pa.lead": "Requests submitted through the website. Approve or reject them.",
      "pa.total": "pending",
      "pa.empty": "No pending requests.",
      "pa.approve": "Approve",
      "pa.reject": "Reject",
      "pa.is_pending": "Pending",
      "pa.reject_confirm": "Reject this request?",
      "pa.clash": "This slot already has a confirmed appointment. Approve anyway?"
    }
  };
  Object.assign(window.I18N.mk, ADMIN.mk);
  Object.assign(window.I18N.en, ADMIN.en);

  /* ---- date helpers ---- */
  function ymd(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function startOfWeek(d) { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - dow); return x; }
  function svcIconHtml(key) {
    const s = SERVICES.find(x => x.key === key);
    if (!s) return '<i class="bi bi-clipboard2-pulse"></i>';
    if (s.svg) return s.svg;
    if (s.icon) return `<i class="${s.icon}"></i>`;
    return '<i class="bi bi-clipboard2-pulse"></i>';
  }
  function makeRef() {
    return "VB-" + (Date.now().toString(36) + Math.random().toString(36).slice(2, 5)).toUpperCase().slice(-6);
  }

  /* ---- state ---- */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const state = { view: new Date(today.getFullYear(), today.getMonth(), 1), sel: ymd(today), formDate: null, formTime: null, formSvc: SERVICES[0].key, editRef: null, editAppt: null, tab: "dashboard", apFilter: "" };

  /* legacy/seed/admin-created appts have no status -> treated as confirmed.
     Only public requests carry status === "pending". */
  const isPending = a => a.status === "pending";

  function apptsByDay() {
    const map = {};
    H.loadAppts().forEach(a => { (map[a.date] = map[a.date] || []).push(a); });
    Object.values(map).forEach(arr => arr.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }

  /* ====================== RENDER: stats ====================== */
  function renderStats() {
    const all = H.loadAppts().filter(a => !isPending(a));
    const wkStart = startOfWeek(today); const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate() + 7);
    const tkey = ymd(today);
    let nToday = 0, nWeek = 0, nUpcoming = 0;
    all.forEach(a => {
      const d = H.parseYmd(a.date);
      if (a.date === tkey) nToday++;
      if (d >= wkStart && d < wkEnd) nWeek++;
      if (d >= today) nUpcoming++;
    });
    $("#statToday").text(nToday);
    $("#statWeek").text(nWeek);
    $("#statUpcoming").text(nUpcoming);
    $("#statTotal").text(all.length);
  }

  /* ====================== RENDER: calendar ====================== */
  function renderCalendar() {
    const L = window.I18N[window.LANG];
    const v = state.view;
    $("#acalTitle").text(L.months[v.getMonth()] + " " + v.getFullYear());
    const first = new Date(v.getFullYear(), v.getMonth(), 1);
    const startDow = first.getDay();
    const daysIn = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();
    const byDay = apptsByDay();

    const $g = $("#acalGrid").empty();
    L.days.forEach(dn => $g.append(`<div class="acal-dow">${dn.slice(0, 2)}</div>`));
    for (let i = 0; i < startDow; i++) $g.append('<div class="acal-cell empty"></div>');

    for (let day = 1; day <= daysIn; day++) {
      const d = new Date(v.getFullYear(), v.getMonth(), day);
      const key = ymd(d);
      const isSun = d.getDay() === 0;
      const past = d < today;
      const list = byDay[key] || [];
      const $c = $(`<button class="acal-cell"><span class="dnum">${day}</span></button>`);
      if (key === ymd(today)) $c.addClass("today");
      if (key === state.sel) $c.addClass("sel");
      if (isSun || (past && !list.length)) $c.addClass("off");
      if (list.length) $c.append(`<span class="cnt"><i class="bi bi-calendar-check"></i>${list.length}</span>`);
      $c.on("click", () => { state.sel = key; renderCalendar(); renderAgenda(); setMStep("time"); });
      $g.append($c);
    }
  }

  /* ====================== RENDER: schedule (time-slot board) ====================== */
  function buildPopover(a) {
    const mail = a.email ? `<div class="sp-row"><i class="bi bi-envelope"></i><a href="mailto:${a.email}">${a.email}</a></div>` : "";
    const note = a.notes ? `<div class="sp-note"><i class="bi bi-chat-left-text"></i> ${a.notes}</div>` : "";
    const pending = isPending(a);
    const flag = pending ? `<div class="sp-flag"><i class="bi bi-hourglass-split"></i>${adminT("pa.is_pending")}</div>` : "";
    const foot = pending
      ? `<div class="sp-foot">
          <button class="sp-reject"><i class="bi bi-x-lg"></i>${adminT("pa.reject")}</button>
          <button class="sp-approve"><i class="bi bi-check-lg"></i>${adminT("pa.approve")}</button>
        </div>`
      : `<div class="sp-foot">
          <button class="sp-edit"><i class="bi bi-pencil"></i>${adminT("ad.edit")}</button>
          <button class="sp-del"><i class="bi bi-trash3"></i>${adminT("ad.cancel")}</button>
        </div>`;
    const $p = $(`
      <div class="slotpop${pending ? " pending" : ""}">
        ${flag}
        <div class="sp-svc"><span class="dot"></span>${a.service ? adminT("svc." + a.service) : adminT("ad.generic")}</div>
        <div class="sp-name">${a.name || "-"}</div>
        <div class="sp-row"><i class="bi bi-telephone"></i><a href="tel:${(a.phone || "").replace(/\s+/g, "")}">${a.phone || "-"}</a></div>
        ${mail}${note}
        ${foot}
      </div>`);
    $p.find(".sp-edit").on("click", (e) => { e.stopPropagation(); openEditModal(a); });
    $p.find(".sp-del").on("click", (e) => {
      e.stopPropagation();
      if (!confirm(adminT("ad.del_confirm"))) return;
      persist(H.loadAppts().filter(x => x.ref !== a.ref));
      refreshAll();
    });
    $p.find(".sp-approve").on("click", (e) => { e.stopPropagation(); approveRequest(a.ref); });
    $p.find(".sp-reject").on("click", (e) => { e.stopPropagation(); rejectRequest(a.ref); });
    return $p;
  }

  function renderAgenda() {
    const d = H.parseYmd(state.sel);
    const dayAppts = apptsByDay()[state.sel] || [];
    const byTime = {}; dayAppts.forEach(a => { byTime[a.time] = a; });
    $("#agDay").text(H.fmtLongDate(d));
    const n = dayAppts.length;
    $("#agCount").text(n + " " + (n === 1 ? adminT("ad.appt_1") : adminT("ad.appts_n")));

    const $board = $("#agList").empty();
    const slots = H.slotsForDate(d);
    if (!slots.length) {
      $board.append(`<div class="ag-empty"><i class="bi bi-calendar-x"></i><div>${adminT("ad.closed_full")}</div></div>`);
      return;
    }
    const now = new Date(); const isToday = state.sel === ymd(today);
    const isPastDay = d < today;
    const $grid = $('<div class="slot-board"></div>');
    slots.forEach(tm => {
      const [hh, mm] = tm.split(":").map(Number);
      const passed = isPastDay || (isToday && (hh * 60 + mm) <= (now.getHours() * 60 + now.getMinutes()));
      const a = byTime[tm];
      if (a) {
        const pending = isPending(a);
        const label = a.name || (a.service ? adminT("svc." + a.service) : adminT("ad.generic"));
        const $w = $('<div class="slotwrap"></div>');
        const $tile = $(`<button class="tslot ${pending ? "pending" : "taken"}" type="button"><span class="tt">${tm}</span><span class="tn"><span class="dot"></span>${label}</span></button>`);
        $tile.on("click", (e) => { e.stopPropagation(); $(".slotwrap.open").not($w).removeClass("open"); $w.toggleClass("open"); });
        $w.append($tile, buildPopover(a));
        $grid.append($w);
      } else {
        const $tile = $(`<button class="tslot free${passed ? " past" : ""}" type="button"><span class="tt">${tm}</span><span class="tn free-label">${passed ? adminT("ad.past") : adminT("ad.free")}</span></button>`);
        if (passed) $tile.prop("disabled", true);
        else $tile.on("click", () => openSlotModal(state.sel, tm));
        $grid.append($tile);
      }
    });
    $board.append($grid);
  }

  /* ====================== ADD-APPOINTMENT modal ====================== */
  function buildForm() {
    const d = H.parseYmd(state.formDate);
    $("#addBody").html(`
      <button class="modal-close" aria-label="close" style="background:rgba(0,0,0,.10);color:var(--ink)"><i class="bi bi-x-lg"></i></button>
      <div class="af-wrap">
        <div class="af-head">
          <div>
            <h2>${adminT(state.editRef ? "ad.edit_title" : "ad.new_title")}</h2>
            <p class="af-sub">${H.fmtLongDate(d)}</p>
          </div>
          <div class="af-time-badge"><i class="bi bi-clock"></i><span>${state.formTime || ""}</span></div>
        </div>
        <div class="af-grid">
          <div class="af-field full" data-f="name">
            <label>${adminT("ad.f_name")} <span class="req">*</span></label>
            <input type="text" id="afName" autocomplete="off">
          </div>
          <div class="af-field full" data-f="phone">
            <label>${adminT("ad.f_phone")} <span style="color:var(--muted);font-weight:600">· ${adminT("ad.opt")}</span></label>
            <input type="tel" id="afPhone" autocomplete="off">
          </div>
          <div class="af-field full" data-f="email">
            <label>${adminT("ad.f_email")} <span style="color:var(--muted);font-weight:600">· ${adminT("ad.opt")}</span></label>
            <input type="email" id="afEmail" autocomplete="off">
          </div>
          <div class="af-field full" data-f="notes">
            <label>${adminT("ad.f_notes")} <span style="color:var(--muted);font-weight:600">· ${adminT("ad.opt")}</span></label>
            <textarea id="afNotes"></textarea>
          </div>
        </div>
        <div class="af-foot">
          <button class="btn btn-ghost btn-sm" id="afCancel">${adminT("ad.cancel")}</button>
          <span class="af-hint" id="afHint"></span>
          <span class="spacer"></span>
          <button class="btn" id="afSave"><i class="bi bi-check-lg"></i>${adminT("ad.save")}</button>
        </div>
      </div>
    `);

    if (state.editRef && state.editAppt) {
      $("#afName").val(state.editAppt.name || "");
      $("#afPhone").val(state.editAppt.phone || "");
      $("#afEmail").val(state.editAppt.email || "");
      $("#afNotes").val(state.editAppt.notes || "");
    }

    $("#addBody .modal-close, #afCancel").on("click", () => closeModal("#addModal"));
    $("#afSave").on("click", saveForm);
    $("#addBody input").on("input", function () { $(this).closest(".af-field").removeClass("invalid"); $("#afHint").text(""); });
  }

  function saveForm() {
    let ok = true;
    let hint = "ad.required";
    const name = $("#afName").val().trim();
    const phone = $("#afPhone").val().trim();
    [["name", name]].forEach(([f, v]) => {
      const $f = $(`#addBody .af-field[data-f="${f}"]`);
      if (!v) { $f.addClass("invalid"); ok = false; } else $f.removeClass("invalid");
    });
    // Phone is optional here, but if provided it must be a valid MK mobile.
    const $phone = $("#addBody .af-field[data-f='phone']");
    if (phone && !window.isValidMkMobile(phone)) { $phone.addClass("invalid"); ok = false; hint = "ad.phone_invalid"; }
    else $phone.removeClass("invalid");
    if (!state.formDate || !state.formTime) ok = false;
    if (!ok) { $("#afHint").text(adminT(hint)); return; }
    const email = $("#afEmail").val().trim();
    const notes = $("#afNotes").val().trim();
    let appt;
    if (state.editRef) {
      const all = H.loadAppts();
      const i = all.findIndex(x => x.ref === state.editRef);
      if (i !== -1) {
        all[i] = Object.assign({}, all[i], { name, phone, email, notes });
        appt = all[i];
        persist(all);
      }
    }
    if (!appt) {
      appt = {
        ref: makeRef(), service: null, date: state.formDate, time: state.formTime,
        name, phone, email, notes,
        created: Date.now(), source: "admin"
      };
      persist(H.loadAppts().concat([appt]));
    }
    state.editRef = null;
    state.editAppt = null;
    state.sel = appt.date;
    state.view = new Date(H.parseYmd(appt.date).getFullYear(), H.parseYmd(appt.date).getMonth(), 1);
    closeModal("#addModal");
    refreshAll();
  }

  function firstFreeSlot(date) {
    const d = H.parseYmd(date);
    if (d < today) return null;           // no booking in the past
    const slots = H.slotsForDate(d);
    const booked = {}; H.loadAppts().forEach(a => { if (a.date === date) booked[a.time] = true; });
    const now = new Date(); const isToday = date === ymd(today);
    return slots.find(tm => {
      const [hh, mm] = tm.split(":").map(Number);
      const passed = isToday && (hh * 60 + mm) <= (now.getHours() * 60 + now.getMinutes());
      return !booked[tm] && !passed;
    }) || null;
  }

  function openAdd(presetDate) {
    const date = presetDate || state.sel || ymd(today);
    const free = firstFreeSlot(date);
    if (!free) { alert(adminT("ad.no_free")); return; }
    openSlotModal(date, free);
  }

  function openSlotModal(date, time) {
    state.editRef = null;
    state.editAppt = null;
    state.formDate = date;
    state.formTime = time;
    buildForm();
    openModal("#addModal");
    setTimeout(() => $("#afName").trigger("focus"), 60);
  }

  function openEditModal(a) {
    state.editRef = a.ref;
    state.editAppt = a;
    state.formDate = a.date;
    state.formTime = a.time;
    buildForm();
    openModal("#addModal");
    setTimeout(() => $("#afName").trigger("focus"), 60);
  }

  /* ---- modal plumbing ---- */
  function openModal(sel) { $(sel).addClass("open"); $("body").css("overflow", "hidden"); }
  function closeModal(sel) { $(sel).removeClass("open"); $("body").css("overflow", ""); }

  /* ====================== theme + language ====================== */
  function applyTheme(name) {
    document.documentElement.setAttribute("data-theme", name);
    localStorage.setItem("dvbes_theme", name);
  }
  function applyLang(lang) {
    window.LANG = lang;
    localStorage.setItem("dvbes_lang", lang);
    document.documentElement.setAttribute("lang", lang);
    $("[data-i18n]").each(function () { this.innerHTML = adminT($(this).attr("data-i18n")); });
    $(".lang-toggle span").removeClass("active").filter(`[data-lang="${lang}"]`).addClass("active");
    $("#nowDate").text(fmtNow());
    refreshAll();
    syncFilterUI();
    if (!$("#apDatePop").prop("hidden")) renderDatePicker();
    if ($("#addModal").hasClass("open")) buildForm();
  }
  function fmtNow() {
    const L = window.I18N[window.LANG];
    return L.days[today.getDay()] + ", " + today.getDate() + " " + L.months[today.getMonth()] + " " + today.getFullYear();
  }

  /* ====================== refresh ====================== */
  function refreshAll() {
    renderStats(); renderCalendar(); renderAgenda();
    updatePendingBadge();
    if (state.tab === "appointments") renderAppointments();
    if (state.tab === "pending") renderPending();
  }

  /* ====================== RENDER: all-appointments tab ====================== */
  function esc(s) { return $("<div>").text(s == null ? "" : s).html(); }

  function renderAppointments() {
    const $list = $("#apList");
    if (!$list.length) return;
    let all = H.loadAppts().filter(a => !isPending(a)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const filter = state.apFilter;
    $("#apClear").prop("hidden", !filter);
    if (filter) all = all.filter(a => a.date === filter);
    $("#apTotal").text(all.length);
    $list.empty();

    if (!all.length) {
      $list.append(`<div class="ap-empty"><i class="bi bi-calendar-x"></i><div>${adminT(filter ? "ap.empty_filter" : "ap.empty")}</div></div>`);
      return;
    }

    const tk = ymd(today);
    let curDate = null, $group = null;
    all.forEach(a => {
      if (a.date !== curDate) {
        curDate = a.date;
        const past = a.date < tk;
        $group = $(`<div class="ap-group${past ? " past" : ""}"><div class="ap-date"><i class="bi bi-calendar3"></i>${esc(H.fmtLongDate(H.parseYmd(a.date)))}</div></div>`);
        $list.append($group);
      }
      const svc = a.service ? adminT("svc." + a.service) : adminT("ad.generic");
      const phone = a.phone
        ? `<a class="ap-contact" href="tel:${esc(a.phone.replace(/\s+/g, ""))}"><i class="bi bi-telephone"></i>${esc(a.phone)}</a>` : "";
      const note = a.notes ? `<div class="ap-note"><i class="bi bi-chat-left-text"></i>${esc(a.notes)}</div>` : "";
      $group.append(`
        <div class="ap-row">
          <div class="ap-time">${esc(a.time)}</div>
          <div class="ap-main">
            <div class="ap-svc"><span class="dot"></span>${esc(svc)}</div>
            <div class="ap-name">${esc(a.name || "-")}</div>
            ${phone}${note}
          </div>
        </div>`);
    });
  }

  /* ====================== RENDER: pending-requests tab ====================== */
  function pendingList() {
    return H.loadAppts().filter(isPending).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }

  const BASE_TITLE = document.title;
  function updatePendingBadge() {
    const n = pendingList().length;
    $("#pendingBadge").text(n).prop("hidden", n === 0);
    // surface the count in the tab title so it's visible when backgrounded
    document.title = n ? `(${n}) ${BASE_TITLE}` : BASE_TITLE;
  }

  function renderPending() {
    const $list = $("#paList");
    if (!$list.length) return;
    const all = pendingList();
    $("#paTotal").text(all.length);
    $list.empty();

    if (!all.length) {
      $list.append(`<div class="ap-empty"><i class="bi bi-check2-circle"></i><div>${adminT("pa.empty")}</div></div>`);
      return;
    }

    all.forEach(a => {
      const svc = a.service ? adminT("svc." + a.service) : adminT("ad.generic");
      const phone = a.phone
        ? `<a class="ap-contact" href="tel:${esc(a.phone.replace(/\s+/g, ""))}"><i class="bi bi-telephone"></i>${esc(a.phone)}</a>` : "";
      const note = a.notes ? `<div class="ap-note"><i class="bi bi-chat-left-text"></i>${esc(a.notes)}</div>` : "";
      const $row = $(`
        <div class="pa-card">
          <div class="pa-when">
            <span class="pa-date">${esc(H.fmtLongDate(H.parseYmd(a.date)))}</span>
            <span class="pa-time"><i class="bi bi-clock"></i>${esc(a.time)}</span>
          </div>
          <div class="pa-body">
            <div class="ap-svc"><span class="dot"></span>${esc(svc)}</div>
            <div class="ap-name">${esc(a.name || "-")}</div>
            ${phone}${note}
          </div>
          <div class="pa-actions">
            <button class="btn btn-ghost btn-sm pa-reject"><i class="bi bi-x-lg"></i>${adminT("pa.reject")}</button>
            <button class="btn btn-sm pa-approve"><i class="bi bi-check-lg"></i>${adminT("pa.approve")}</button>
          </div>
        </div>`);
      $row.find(".pa-approve").on("click", () => approveRequest(a.ref));
      $row.find(".pa-reject").on("click", () => rejectRequest(a.ref));
      $list.append($row);
    });
  }

  function approveRequest(ref) {
    const all = H.loadAppts();
    const i = all.findIndex(x => x.ref === ref);
    if (i === -1) return;
    const a = all[i];
    const clash = all.some(x => x.ref !== ref && !isPending(x) && x.date === a.date && x.time === a.time);
    if (clash && !confirm(adminT("pa.clash"))) return;
    all[i] = Object.assign({}, a, { status: "confirmed" });
    persist(all);
    refreshAll();
  }

  function rejectRequest(ref) {
    if (!confirm(adminT("pa.reject_confirm"))) return;
    persist(H.loadAppts().filter(x => x.ref !== ref));
    refreshAll();
  }

  /* ---- tab switching (dashboard | appointments | pending) ---- */
  function switchTab(name) {
    state.tab = name;
    $("#adminTabs .admin-tab").removeClass("active").filter(`[data-tab="${name}"]`).addClass("active");
    $("#viewDashboard").prop("hidden", name !== "dashboard");
    $("#viewAppointments").prop("hidden", name !== "appointments");
    $("#viewPending").prop("hidden", name !== "pending");
    if (name === "appointments") renderAppointments();
    if (name === "pending") renderPending();
  }

  /* ====================== custom date picker (appointments filter) ====================== */
  const dpState = { view: new Date(today.getFullYear(), today.getMonth(), 1) };

  function dpLabel(dateStr) {
    const L = window.I18N[window.LANG];
    const d = H.parseYmd(dateStr);
    return d.getDate() + " " + L.months[d.getMonth()] + " " + d.getFullYear();
  }

  function syncFilterUI() {
    const f = state.apFilter;
    $("#apDateLabel").text(f ? dpLabel(f) : adminT("ap.pick_date"));
    $("#apFilterWrap").toggleClass("active", !!f);
    $("#apClear").prop("hidden", !f);
  }

  function renderDatePicker() {
    const L = window.I18N[window.LANG];
    const v = dpState.view;
    const startDow = new Date(v.getFullYear(), v.getMonth(), 1).getDay();
    const daysIn = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();
    let h = `<div class="dp-head">
        <button type="button" class="dp-nav" data-dp="prev" aria-label="previous month"><i class="bi bi-chevron-left"></i></button>
        <b>${L.months[v.getMonth()]} ${v.getFullYear()}</b>
        <button type="button" class="dp-nav" data-dp="next" aria-label="next month"><i class="bi bi-chevron-right"></i></button>
      </div><div class="dp-grid">`;
    L.days.forEach(dn => h += `<span class="dp-dow">${dn.slice(0, 2)}</span>`);
    for (let i = 0; i < startDow; i++) h += `<span class="dp-cell empty"></span>`;
    for (let day = 1; day <= daysIn; day++) {
      const key = ymd(new Date(v.getFullYear(), v.getMonth(), day));
      const cls = ["dp-cell"];
      if (key === ymd(today)) cls.push("today");
      if (key === state.apFilter) cls.push("sel");
      h += `<button type="button" class="${cls.join(" ")}" data-day="${key}">${day}</button>`;
    }
    $("#apDatePop").html(h + "</div>");
  }

  function openDatePicker() {
    const base = state.apFilter ? H.parseYmd(state.apFilter) : today;
    dpState.view = new Date(base.getFullYear(), base.getMonth(), 1);
    renderDatePicker();
    $("#apDatePop").prop("hidden", false);
    $("#apDateTrigger").attr("aria-expanded", "true");
  }
  function closeDatePicker() {
    $("#apDatePop").prop("hidden", true);
    $("#apDateTrigger").attr("aria-expanded", "false");
  }

  /* ---- mobile step flow: step 1 = pick day, step 2 = pick time ---- */
  function setMStep(step) {
    const $g = $("#adminGrid");
    if (!$g.length) return;
    $g.removeClass("mstep-cal mstep-time").addClass("mstep-" + step);
    $("#mStepper .m-step").removeClass("active").filter(`[data-step="${step}"]`).addClass("active");
    if (window.matchMedia("(max-width: 760px)").matches) {
      $("html, body").stop().animate({ scrollTop: Math.max(0, $g.offset().top - 70) }, 250);
    }
  }

  /* ====================== init ====================== */
  $(function () {
    // Re-render whenever the Firestore data layer reports a change
    // (initial load after sign-in, live updates, new pending requests).
    document.addEventListener("dvbes:data", refreshAll);
    applyTheme(localStorage.getItem("dvbes_theme") || "clinical");
    document.documentElement.setAttribute("lang", window.LANG);

    // header controls
    $(document).on("click", () => { $(".slotwrap.open").removeClass("open"); closeDatePicker(); });
    $(".lang-toggle").on("click", () => applyLang(window.LANG === "mk" ? "en" : "mk"));

    // tabs
    $("#adminTabs").on("click", ".admin-tab", function () { switchTab($(this).data("tab")); });

    // appointments date filter (custom date picker)
    $("#apDateTrigger").on("click", function (e) {
      e.stopPropagation();
      if ($("#apDatePop").prop("hidden")) openDatePicker(); else closeDatePicker();
    });
    $("#apDatePop").on("click", e => e.stopPropagation());
    $("#apDatePop").on("click", ".dp-nav", function () {
      const dir = $(this).data("dp") === "prev" ? -1 : 1;
      dpState.view = new Date(dpState.view.getFullYear(), dpState.view.getMonth() + dir, 1);
      renderDatePicker();
    });
    $("#apDatePop").on("click", ".dp-cell[data-day]", function () {
      state.apFilter = String($(this).data("day"));
      closeDatePicker();
      syncFilterUI();
      renderAppointments();
    });
    $("#apClear").on("click", function (e) {
      e.stopPropagation();
      state.apFilter = "";
      closeDatePicker();
      syncFilterUI();
      renderAppointments();
    });
    syncFilterUI();

    // calendar nav
    $("#acalPrev").on("click", () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1); renderCalendar(); });
    $("#acalNext").on("click", () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1); renderCalendar(); });

    // add buttons
    $(".js-add").on("click", () => openAdd(state.sel));
    $("#agToday").on("click", () => { state.sel = ymd(today); state.view = new Date(today.getFullYear(), today.getMonth(), 1); renderCalendar(); renderAgenda(); });

    // mobile step controls
    $("#mStepper").on("click", ".m-step", function () { setMStep($(this).data("step")); });
    $("#mBack").on("click", () => setMStep("cal"));
    setMStep("cal");

    // close modal on backdrop / esc
    $("#addModal .modal-backdrop").on("click", () => closeModal("#addModal"));
    $(document).on("keydown", e => { if (e.key === "Escape") { closeModal("#addModal"); closeDatePicker(); } });

    // initial i18n + render
    $("[data-i18n]").each(function () { this.innerHTML = adminT($(this).attr("data-i18n")); });
    $(".lang-toggle span").removeClass("active").filter(`[data-lang="${window.LANG}"]`).addClass("active");
    $("#nowDate").text(fmtNow());
    refreshAll();
  });
})();
