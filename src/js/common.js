(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)");
  var navToggle = document.querySelector(".js-nav-toggle");
  var navMenu = document.querySelector(".js-nav-menu");

  document.documentElement.classList.add("js-enabled");

  function closeNavigation() {
    if (!navToggle || !navMenu) return;
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation menu");
    navMenu.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      navToggle.setAttribute("aria-label", open ? "Open navigation menu" : "Close navigation menu");
      navMenu.classList.toggle("is-open", !open);
      document.body.classList.toggle("no-scroll", !open);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
        closeNavigation();
        navToggle.focus();
      }
    });
  }

  document.querySelectorAll(".js-scroll").forEach(function (link) {
    link.addEventListener("click", function (event) {
      var target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      closeNavigation();
      target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
      window.setTimeout(function () {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }, reduceMotion.matches ? 0 : 500);
    });
  });

  if (typeof AOS !== "undefined") {
    document.documentElement.classList.add("aos-ready");
    AOS.init({ duration: 700, once: true, disable: reduceMotion.matches });
  }

  if (!reduceMotion.matches && !coarsePointer.matches && typeof simpleParallax !== "undefined") {
    document.querySelectorAll(".js-parallax").forEach(function (element) {
      new simpleParallax(element, {
        scale: parseFloat(element.dataset.scale || "1.2"),
        orientation: element.dataset.orientation || "up",
        delay: 0.5,
        overflow: true,
        transition: "cubic-bezier(0,0,0,1)"
      });
    });
  }

  var cursor = document.querySelector(".cursor");
  if (cursor && !reduceMotion.matches && !coarsePointer.matches) {
    var cursorX = -20;
    var cursorY = -20;
    document.addEventListener("mousemove", function (event) {
      cursorX = event.clientX;
      cursorY = event.clientY;
    }, { passive: true });
    (function renderCursor() {
      cursor.style.transform = "translate3d(" + cursorX + "px," + cursorY + "px,0)";
      window.requestAnimationFrame(renderCursor);
    }());
  } else if (cursor) {
    cursor.hidden = true;
  }

  var year = document.querySelector(".js-year");
  if (year) year.textContent = new Date().getFullYear();

  var form = document.querySelector(".js-contact-form");
  if (!form) return;

  var submitButton = form.querySelector("button[type='submit']");
  var status = form.querySelector(".js-form-status");
  var messages = {
    name: "Enter your name (2–80 characters).",
    email: "Enter a valid email address.",
    subject: "Enter a subject (3–120 characters).",
    message: "Enter a message (10–3000 characters)."
  };

  function validateField(field) {
    if (field.name === "companyWebsite") return true;
    var error = document.getElementById(field.name + "-error");
    var valid = field.checkValidity();
    field.setAttribute("aria-invalid", String(!valid));
    if (error) error.textContent = valid ? "" : messages[field.name];
    return valid;
  }

  form.querySelectorAll("input:not([name='companyWebsite']), textarea").forEach(function (field) {
    field.addEventListener("blur", function () { validateField(field); });
    field.addEventListener("input", function () {
      if (field.getAttribute("aria-invalid") === "true") validateField(field);
    });
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var fields = Array.from(form.querySelectorAll("input, textarea"));
    var valid = fields.every(validateField);
    if (!valid) {
      status.textContent = "Please correct the highlighted fields.";
      var firstInvalid = form.querySelector("[aria-invalid='true']");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    status.className = "form-status js-form-status is-loading";
    status.textContent = "Sending your message…";

    try {
      var response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
      });
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(result.error || "Message delivery failed.");
      form.reset();
      fields.forEach(function (field) { field.removeAttribute("aria-invalid"); });
      status.className = "form-status js-form-status is-success";
      status.textContent = "Thanks — your message has been sent.";
    } catch (error) {
      status.className = "form-status js-form-status is-error";
      status.textContent = "I couldn’t send that message. Please try again or use the email link.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send Message";
    }
  });
}());
