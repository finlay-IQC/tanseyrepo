/* Tansey funnel — lightweight vanilla JS (no libraries).
   Handles: UTM capture/persistence, image fallbacks, sticky CTA, FAQ accordion,
   the qualification + booking flow, and the thank-you booking details. */
(function () {
  "use strict";

  /* =========================================================
     CONFIG — fill these in when the embed details arrive.
     ========================================================= */
  var CONFIG = {
    // Typeform form ID (e.g. "abc123XY"). When set, the Typeform embed replaces
    // the native placeholder form. Build the Typeform with:
    //   - the 5 qualifier questions + contact fields (see landing.html comments)
    //   - Logic: budget "Under £5,000" -> "Not a fit" ending (no Calendly)
    //   - Calendly block as the final question for everyone else
    //   - Hidden fields: utm_source, utm_medium, utm_campaign, utm_content,
    //     utm_term, fbclid, gclid, ttclid, msclkid
    //   - Ending redirect (qualified ending only): https://YOURDOMAIN/thank-you.html
    typeformId: "",

    // Calendly event URL used by the native placeholder form's final step,
    // e.g. "https://calendly.com/tansey/design-consultation".
    // In Calendly > Event type > Booking page options, set
    //   "Redirect to an external site" = https://YOURDOMAIN/thank-you.html
    //   and tick "Pass event details to your redirected page".
    // That redirect is what fires the conversion. It only happens after a real booking.
    calendlyUrl: "",

    thankYouUrl: "thank-you.html",
    minBudgetValue: "under-5k" // answer value that routes to "not a fit"
  };

  var TRACK_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "fbclid", "gclid", "ttclid", "msclkid"];
  var STORE_KEY = "tansey_attribution";

  /* ---------- Safe storage ---------- */
  function readStore() {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeStore(obj) {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (e) { /* private mode */ }
  }

  /* ---------- 1. UTM capture ---------- */
  var params = new URLSearchParams(window.location.search);
  var attribution = readStore();
  var fresh = false;
  TRACK_KEYS.forEach(function (k) {
    var v = params.get(k);
    if (v) { attribution[k] = v; fresh = true; }
  });
  if (fresh) writeStore(attribution);

  function attributionQuery(extra) {
    var q = new URLSearchParams();
    TRACK_KEYS.forEach(function (k) { if (attribution[k]) q.set(k, attribution[k]); });
    if (extra) Object.keys(extra).forEach(function (k) { if (extra[k]) q.set(k, extra[k]); });
    var s = q.toString();
    return s ? "?" + s : "";
  }
  window.tanseyAttributionQuery = attributionQuery;

  // Hidden inputs in the native form: <input type="hidden" data-utm="utm_source">
  document.querySelectorAll("input[data-utm]").forEach(function (input) {
    input.value = attribution[input.getAttribute("data-utm")] || "";
  });

  // Internal funnel links keep attribution: <a href="thank-you.html" data-keep-utm>
  document.querySelectorAll("a[data-keep-utm]").forEach(function (a) {
    var href = a.getAttribute("href");
    if (!href || href.indexOf("?") !== -1) return;
    a.setAttribute("href", href + attributionQuery());
  });

  /* ---------- 2. Image fallback (local /images first, then original URL) ---------- */
  function handleImgError(img) {
    var fb = img.getAttribute("data-fallback");
    if (fb && img.src !== fb) { img.src = fb; return; }
    var frame = img.closest(".img-frame");
    if (frame) frame.classList.add("is-missing");
    img.style.visibility = "hidden";
  }
  window.addEventListener("error", function (e) {
    if (e.target && e.target.tagName === "IMG") handleImgError(e.target);
  }, true);
  document.querySelectorAll("img").forEach(function (img) {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) handleImgError(img);
  });

  /* ---------- 3. CTA scroll + focus ---------- */
  document.querySelectorAll('a[href="#book"]').forEach(function (a) {
    a.addEventListener("click", function () {
      var target = document.getElementById("book-heading");
      if (target) setTimeout(function () { target.focus({ preventScroll: true }); }, 400);
    });
  });

  /* ---------- 4. Sticky bottom CTA (after the form section) ---------- */
  var sticky = document.querySelector(".sticky-cta");
  var formSection = document.getElementById("book");
  if (sticky && formSection && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      var pastForm = !e.isIntersecting && e.boundingClientRect.top < 0;
      sticky.classList.toggle("is-visible", pastForm);
      sticky.setAttribute("aria-hidden", pastForm ? "false" : "true");
      sticky.querySelector("a").tabIndex = pastForm ? 0 : -1;
    }).observe(formSection);
  }

  /* ---------- 5. FAQ accordion ---------- */
  document.querySelectorAll(".faq__q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      document.getElementById(btn.getAttribute("aria-controls")).hidden = open;
    });
  });

  /* ---------- 6a. Typeform embed (when CONFIG.typeformId is set) ---------- */
  var embedTarget = document.getElementById("embed-target");
  if (embedTarget && CONFIG.typeformId) {
    var hidden = TRACK_KEYS.map(function (k) { return k + "=" + (attribution[k] || ""); }).join(",");
    embedTarget.innerHTML = "";
    var tf = document.createElement("div");
    tf.setAttribute("data-tf-live", CONFIG.typeformId);
    // HIDDEN UTM FIELDS: passed here. Field names must match the Typeform hidden fields exactly.
    tf.setAttribute("data-tf-hidden", hidden);
    tf.setAttribute("data-tf-transitive-search-params", TRACK_KEYS.join(","));
    tf.setAttribute("data-tf-on-ending-button-click", "tanseyTypeformEnding");
    embedTarget.appendChild(tf);
    var s = document.createElement("script");
    s.src = "https://embed.typeform.com/next/embed.js";
    s.async = true;
    document.body.appendChild(s);
    var label = document.querySelector(".embed-label");
    if (label) label.remove();
  }
  // Fallback if the Typeform ending redirect is not configured. The Typeform ending
  // that follows the Calendly block shows a "Continue" button that leads to the thank-you page.
  window.tanseyTypeformEnding = function () {
    window.location.href = CONFIG.thankYouUrl + attributionQuery();
  };

  /* ---------- 6b. Native placeholder qualification flow ---------- */
  var form = document.getElementById("qform");
  if (form && !CONFIG.typeformId) initQForm(form);

  function initQForm(form) {
    var steps = Array.prototype.slice.call(form.querySelectorAll(".qstep"));
    var questionSteps = steps.filter(function (s) { return s.hasAttribute("data-question"); });
    var bar = form.querySelector(".qform__bar");
    var count = form.querySelector(".qform__count");
    var current = 0;

    function show(step) {
      steps.forEach(function (s) { s.classList.toggle("is-active", s === step); });
      var qi = questionSteps.indexOf(step);
      if (qi > -1) {
        count.textContent = "Question " + (qi + 1) + " of " + questionSteps.length;
        bar.style.width = ((qi) / questionSteps.length * 100) + "%";
      } else {
        count.textContent = step.id === "step-calendar" ? "Last step: pick your time" : "";
        bar.style.width = "100%";
      }
      var focusEl = step.querySelector("legend, .qtitle");
      if (focusEl) { focusEl.setAttribute("tabindex", "-1"); focusEl.focus({ preventScroll: true }); }
      var top = form.getBoundingClientRect().top + window.pageYOffset - 16;
      if (form.getBoundingClientRect().top < 0) window.scrollTo(0, top);
    }

    function validate(step) {
      var err = step.querySelector(".qerror");
      var radios = step.querySelectorAll('input[type="radio"]');
      if (radios.length && !step.querySelector('input[type="radio"]:checked')) {
        err.textContent = "Please choose an option.";
        return false;
      }
      var bad = Array.prototype.find.call(step.querySelectorAll("input[required]:not([type=radio])"),
        function (i) { return !i.checkValidity(); });
      if (bad) {
        err.textContent = bad.type === "email" ? "Please enter a valid email address."
          : bad.type === "tel" ? "Please enter a valid phone number." : "Please complete this field.";
        bad.focus();
        return false;
      }
      if (err) err.textContent = "";
      return true;
    }

    form.addEventListener("click", function (e) {
      var next = e.target.closest("[data-next]");
      var back = e.target.closest("[data-back]");
      var step = steps[current];
      if (back) {
        e.preventDefault();
        var prev = step.id === "step-notfit" ? document.getElementById("step-budget")
          : questionSteps[Math.max(0, questionSteps.indexOf(step) - 1)];
        current = steps.indexOf(prev);
        show(prev);
      }
      if (next) {
        e.preventDefault();
        if (!validate(step)) return;
        // Budget gate: under £5,000 never reaches the calendar
        if (step.id === "step-budget" && form.budget.value === CONFIG.minBudgetValue) {
          current = steps.indexOf(document.getElementById("step-notfit"));
          show(steps[current]);
          return;
        }
        current = steps.indexOf(step) + 1;
        show(steps[current]);
      }
    });

    // Radio choice auto-advances (one tap per question on mobile)
    form.addEventListener("change", function (e) {
      if (e.target.type !== "radio") return;
      var step = e.target.closest(".qstep");
      step.querySelector(".qerror").textContent = "";
      var btn = step.querySelector("[data-next]");
      setTimeout(function () { if (step.classList.contains("is-active")) btn.click(); }, 220);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var step = steps[current];
      if (!validate(step)) return;
      // ---------------------------------------------------------------
      // LEAD CAPTURE: send the qualified answers to your CRM / webhook
      // here (e.g. fetch(WEBHOOK_URL, {method:"POST", body:new FormData(form)})).
      // Hidden UTM inputs are already inside the form.
      // ---------------------------------------------------------------
      current = steps.indexOf(document.getElementById("step-calendar"));
      show(steps[current]);
      loadCalendly(form);
    });
  }

  function loadCalendly(form) {
    var slot = document.getElementById("calendly-slot");
    if (!slot || !CONFIG.calendlyUrl) return; // placeholder stays visible
    var q = new URLSearchParams();
    q.set("name", form.full_name.value);
    q.set("email", form.email.value);
    q.set("a1", form.phone.value); // map to a custom question in Calendly if needed
    q.set("hide_gdpr_banner", "1");
    // UTM DATA: Calendly captures utm_* natively when passed on the embed URL
    // (visible under the invitee's "UTM parameters" and in webhooks).
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
      if (attribution[k]) q.set(k, attribution[k]);
    });
    slot.innerHTML = "";
    var w = document.createElement("div");
    w.className = "calendly-inline-widget";
    w.setAttribute("data-url", CONFIG.calendlyUrl + "?" + q.toString());
    w.style.minWidth = "280px";
    w.style.height = "680px";
    slot.appendChild(w);
    var s = document.createElement("script");
    s.src = "https://assets.calendly.com/assets/external/widget.js";
    s.async = true;
    document.body.appendChild(s);
  }

  // Booking-completed callback. Prefer Calendly's own redirect (passes the booked time);
  // this is the backup if that redirect is not switched on.
  window.addEventListener("message", function (e) {
    if (!e.origin || e.origin.indexOf("calendly.com") === -1) return;
    if (e.data && e.data.event === "calendly.event_scheduled") {
      setTimeout(function () {
        if (window.location.pathname.indexOf("thank-you") === -1) {
          window.location.href = CONFIG.thankYouUrl + attributionQuery();
        }
      }, 1500);
    }
  });

  /* ---------- 7. Thank-you page: booking details + calendar links ---------- */
  var booking = document.getElementById("booking");
  if (booking) initBooking(booking);

  function initBooking(el) {
    // Calendly's "pass event details" redirect provides these parameters.
    var start = params.get("event_start_time");
    var end = params.get("event_end_time");
    var engineer = params.get("assigned_to");
    var whenEl = el.querySelector(".booking__when");
    var withEl = el.querySelector(".booking__with");
    var calButtons = el.querySelector(".cal-buttons");

    var title = "Tansey free design consultation";
    var details = "Your free design consultation with a Tansey engineer. " +
      "Have drawings, floor areas or a heat loss report to hand. " +
      "Need to change the time? Reply to your confirmation email.";

    var startDate = start ? new Date(start) : null;
    if (startDate && !isNaN(startDate)) {
      var endDate = end ? new Date(end) : new Date(startDate.getTime() + 30 * 60000);
      whenEl.textContent = startDate.toLocaleString("en-GB", {
        weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit",
        timeZone: "Europe/London", timeZoneName: "short"
      });
      if (engineer) withEl.textContent = "With " + engineer + ", Tansey";

      var fmt = function (d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); };
      var g = el.querySelector("[data-cal=google]");
      g.href = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
        "&text=" + encodeURIComponent(title) +
        "&dates=" + fmt(startDate) + "/" + fmt(endDate) +
        "&details=" + encodeURIComponent(details);
      g.target = "_blank";
      g.rel = "noopener";

      var ics = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tansey//Consultation//EN",
        "BEGIN:VEVENT",
        "UID:" + fmt(startDate) + "-consultation@tansey.co",
        "DTSTAMP:" + fmt(new Date()),
        "DTSTART:" + fmt(startDate), "DTEND:" + fmt(endDate),
        "SUMMARY:" + title,
        "DESCRIPTION:" + details.replace(/,/g, "\\,"),
        "END:VEVENT", "END:VCALENDAR"
      ].join("\r\n");
      var i = el.querySelector("[data-cal=ical]");
      i.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
      i.download = "tansey-consultation.ics";
    } else {
      // No booking details passed: keep the confirmation-email wording, hide calendar buttons.
      calButtons.hidden = true;
    }
  }
})();
