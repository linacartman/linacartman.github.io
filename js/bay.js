/* lee-na color bay. Source for js/bay.min.js.
   Set MAIL_TO to an inbox you control and the slate will offer
   "Open in your mail app". Leave it empty and the message stays
   on this page for the visitor to copy. Nothing is posted to a server. */
(function () {
  "use strict";

  var MAIL_TO = "";

  var root = document.documentElement;
  root.classList.add("js");

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = motionQuery.matches;

  initTimecode();
  initNav();
  initSmoothScroll();
  initSectionCurrent();
  initLightbox();
  initPrinter();
  initLeader();
  initForm();

  function focusHeading(target) {
    var heading = target.matches("h1, h2") ? target : target.querySelector("h1, h2");
    var focusTarget = heading || target;
    if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
    focusTarget.focus({ preventScroll: true });
  }

  function pad(value) {
    return (value < 10 ? "0" : "") + value;
  }

  function initTimecode() {
    var el = document.querySelector("[data-timecode]");
    if (!el || reduced) return;
    var start = performance.now();
    function loop(now) {
      var frames = Math.floor((now - start) * 24 / 1000);
      var text = "01:" + pad(Math.floor(frames / 24 / 60) % 60) + ":" + pad(Math.floor(frames / 24) % 60) + ":" + pad(frames % 24);
      if (el.textContent !== text) el.textContent = text;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;
    var desktop = window.matchMedia("(min-width: 980px)");

    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Close" : "Menu";
    }

    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) setOpen(false);
    });

    desktop.addEventListener("change", function () {
      setOpen(false);
    });
  }

  function initSmoothScroll() {
    document.addEventListener("click", function (event) {
      var link = event.target.closest("a[href]");
      if (!link) return;
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) !== "#" || href.length < 2) return;
      var target = document.getElementById(decodeURIComponent(href.slice(1)));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      focusHeading(target);
      history.pushState(null, "", href);
    });
  }

  function initSectionCurrent() {
    var links = document.querySelectorAll(".site-nav a[href^='#']");
    if (!links.length || !("IntersectionObserver" in window)) return;
    var byId = {};
    Array.prototype.forEach.call(links, function (link) {
      byId[link.getAttribute("href").slice(1)] = link;
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        Array.prototype.forEach.call(links, function (link) {
          if (link.getAttribute("aria-current") !== "page") link.removeAttribute("aria-current");
        });
        var current = byId[entry.target.id];
        if (current) current.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });

    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  function safeAsset(value) {
    if (!value || value.indexOf("/assets/") !== 0) return "";
    if (value.indexOf("..") !== -1 || value.indexOf("\\") !== -1) return "";
    if (!/^\/assets\/[a-z0-9-]+\.(webp|jpg|png)$/.test(value)) return "";
    return value;
  }

  function initLightbox() {
    var dialog = document.getElementById("lightbox");
    if (!dialog) return;
    if (typeof dialog.showModal !== "function") {
      Array.prototype.forEach.call(document.querySelectorAll(".study__frames"), function (node) {
        node.hidden = false;
      });
      return;
    }

    var title = document.getElementById("lb-title");
    var image = document.getElementById("lb-img");
    var caption = document.getElementById("lb-cap");
    var count = document.getElementById("lb-count");
    var live = document.getElementById("lb-live");
    var more = document.getElementById("lb-more");
    var prev = dialog.querySelector("[data-prev]");
    var next = dialog.querySelector("[data-next]");
    var closeButton = dialog.querySelector("[data-close]");
    var frames = [];
    var index = 0;
    var opener = null;

    function render() {
      var frame = frames[index];
      image.src = frame.src;
      image.width = frame.w;
      image.height = frame.h;
      image.alt = frame.alt;
      caption.textContent = frame.caption;
      count.textContent = (index + 1) + " of " + frames.length;
      var spoken = "Frame " + (index + 1) + " of " + frames.length + ". " + frame.caption;
      if (live.textContent !== spoken) live.textContent = spoken;
      var single = frames.length < 2;
      prev.disabled = single;
      next.disabled = single;
    }

    function openStudy(id, source) {
      var study = document.getElementById(id);
      if (!study) return;
      var nextFrames = [];
      Array.prototype.forEach.call(study.querySelectorAll("[data-frame]"), function (node) {
        var src = safeAsset(node.getAttribute("data-src"));
        if (!src) return;
        var figcaption = node.querySelector("figcaption");
        nextFrames.push({
          src: src,
          alt: node.getAttribute("data-alt") || "",
          w: parseInt(node.getAttribute("data-w"), 10) || 1200,
          h: parseInt(node.getAttribute("data-h"), 10) || 800,
          caption: figcaption ? figcaption.textContent.trim() : ""
        });
      });
      if (!nextFrames.length) return;
      frames = nextFrames;
      index = 0;
      opener = source || document.activeElement;
      title.textContent = study.getAttribute("data-title") || "Study";
      more.replaceChildren();
      var detail = study.querySelector(".study__more");
      if (detail) more.appendChild(detail.cloneNode(true));
      render();
      if (!dialog.open) dialog.showModal();
    }

    document.addEventListener("click", function (event) {
      var button = event.target.closest("[data-open]");
      if (!button) return;
      event.preventDefault();
      openStudy(button.getAttribute("data-open"), button);
    });

    closeButton.addEventListener("click", function () {
      dialog.close();
    });

    prev.addEventListener("click", function () {
      if (frames.length < 2) return;
      index = (index - 1 + frames.length) % frames.length;
      render();
    });

    next.addEventListener("click", function () {
      if (frames.length < 2) return;
      index = (index + 1) % frames.length;
      render();
    });

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", function () {
      live.textContent = "";
      if (opener && typeof opener.focus === "function") opener.focus();
    });

    dialog.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next.click();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev.click();
      }
    });

    var startX = null;
    dialog.addEventListener("touchstart", function (event) {
      startX = event.changedTouches[0].clientX;
    }, { passive: true });
    dialog.addEventListener("touchend", function (event) {
      if (startX === null) return;
      var delta = event.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(delta) < 48) return;
      if (delta < 0) next.click();
      else prev.click();
    }, { passive: true });
  }

  function initPrinter() {
    var form = document.getElementById("lights");
    var grade = document.getElementById("gate-grade");
    var photo = document.getElementById("gate-image");
    var edge = document.getElementById("edge-code");
    var status = document.getElementById("lights-status");
    if (!form || !grade || !photo || !edge) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
    });

    var inputs = {
      r: form.querySelector('[data-channel="r"]'),
      g: form.querySelector('[data-channel="g"]'),
      b: form.querySelector('[data-channel="b"]')
    };

    function valueOf(input) {
      var number = parseInt(input.value, 10);
      if (isNaN(number)) return 25;
      return Math.max(1, Math.min(50, number));
    }

    function paint(announce) {
      var r = valueOf(inputs.r);
      var g = valueOf(inputs.g);
      var b = valueOf(inputs.b);
      inputs.r.nextElementSibling.value = String(r);
      inputs.g.nextElementSibling.value = String(g);
      inputs.b.nextElementSibling.value = String(b);
      var maxDelta = Math.max(Math.abs(r - 25), Math.abs(g - 25), Math.abs(b - 25));
      function channel(value) {
        return Math.max(0, Math.min(255, Math.round(128 + (value - 25) * 8)));
      }
      grade.style.backgroundColor = "rgb(" + channel(r) + "," + channel(g) + "," + channel(b) + ")";
      grade.style.opacity = String(Math.min(1, maxDelta / 16));
      var lift = ((r + g + b) / 3 - 25) / 50;
      photo.style.filter = maxDelta === 0 ? "none" : "brightness(" + (1 + lift * 0.35).toFixed(3) + ")";
      edge.textContent = "R" + r + " G" + g + " B" + b;
      if (announce && status) {
        status.textContent = "Red " + r + ", green " + g + ", blue " + b + ".";
      }
    }

    ["r", "g", "b"].forEach(function (channel) {
      inputs[channel].addEventListener("input", function () {
        paint(false);
      });
      inputs[channel].addEventListener("change", function () {
        paint(true);
      });
    });

    form.addEventListener("reset", function () {
      window.setTimeout(function () {
        paint(true);
      }, 0);
    });

    paint(false);
  }

  function initLeader() {
    var button = document.getElementById("leader-roll");
    var leader = document.getElementById("leader");
    var number = document.getElementById("leader-num");
    var hand = document.getElementById("leader-hand");
    var status = document.getElementById("leader-status");
    if (!button || !leader || !number || !hand) return;

    var frames = [8, 7, 6, 5, 4, 3, 2];
    var timer = null;

    function show(step) {
      number.textContent = String(frames[step]);
      hand.style.setProperty("--angle", (step * 45) + "deg");
    }

    function idleLabel() {
      return reduced ? "Show leader 2" : "Roll leader";
    }

    function stop(hide) {
      if (timer) window.clearInterval(timer);
      timer = null;
      button.setAttribute("aria-pressed", "false");
      button.textContent = hide ? idleLabel() : "Hide leader";
      if (hide) leader.hidden = true;
    }

    button.textContent = idleLabel();

    button.addEventListener("click", function () {
      if (timer || !leader.hidden) {
        stop(true);
        if (status) status.textContent = "Leader hidden.";
        return;
      }
      leader.hidden = false;
      button.setAttribute("aria-pressed", "true");
      if (reduced) {
        show(frames.length - 1);
        button.textContent = "Hide leader";
        if (status) status.textContent = "Reduced motion is on. Leader held at 2.";
        return;
      }
      var step = 0;
      show(step);
      button.textContent = "Stop leader";
      if (status) status.textContent = "Leader " + frames[step] + ".";
      timer = window.setInterval(function () {
        step += 1;
        if (step >= frames.length) {
          if (status) status.textContent = "Leader finished.";
          stop(false);
          window.setTimeout(function () {
            if (!timer) leader.hidden = true;
            button.textContent = idleLabel();
          }, 700);
          return;
        }
        show(step);
        if (status) status.textContent = "Leader " + frames[step] + ".";
      }, 1000);
    });
  }

  function cleanLine(value) {
    return value.replace(/[\r\n\t]+/g, " ").trim();
  }

  function setError(input, message) {
    var slot = document.getElementById(input.id + "-error");
    if (slot) slot.textContent = message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
    return !message;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      try {
        var ok = document.execCommand("copy");
        document.body.removeChild(area);
        if (ok) resolve();
        else reject(new Error("copy"));
      } catch (error) {
        document.body.removeChild(area);
        reject(error);
      }
    });
  }

  function initForm() {
    var form = document.getElementById("slate-form");
    if (!form) return;
    var note = document.getElementById("mail-note");
    var panel = document.getElementById("slate-result");
    var preview = document.getElementById("slate-preview");
    var copyButton = document.getElementById("slate-copy");
    var blurb = document.getElementById("slate-blurb");
    var mail = document.getElementById("slate-mail");
    var status = document.getElementById("slate-status");
    var mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(MAIL_TO) && MAIL_TO.indexOf("\n") === -1 && MAIL_TO.indexOf("\r") === -1;

    if (mailOk && note) {
      note.textContent = "Cutting the slate opens your mail app with the message. Nothing is stored on a server.";
    }

    function showPanel(text, href) {
      form.hidden = true;
      panel.hidden = false;
      preview.hidden = !text;
      copyButton.hidden = !text;
      if (text) preview.textContent = text;
      if (href) {
        mail.hidden = false;
        mail.setAttribute("href", href);
        blurb.textContent = "Your mail app can take it from here. A copy is also on this page.";
      } else if (text) {
        mail.hidden = true;
        blurb.textContent = "Mail is not connected on this site yet. The message is only on this page. Copy it and send it from your own inbox.";
      } else {
        mail.hidden = true;
        blurb.textContent = "Thanks. The slate is cut.";
      }
      panel.focus();
    }

    function submitSlate() {
      var nameOk = setError(form.name, cleanLine(form.name.value).length >= 2 ? "" : "Enter your name, at least 2 characters.");
      var emailValue = cleanLine(form.email.value);
      var emailOk = setError(form.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue) ? "" : "Enter an email address with a name, an @ sign, and a domain.");
      var roleOk = setError(form.role, form.role.value ? "" : "Choose the hat you are wearing.");
      var messageValue = form.message.value.trim();
      var messageOk = setError(form.message, messageValue.length >= 10 ? "" : "Write a message of at least 10 characters.");
      if (!(nameOk && emailOk && roleOk && messageOk)) {
        var first = form.querySelector("[aria-invalid='true']");
        if (first) first.focus();
        return;
      }
      if (form.company && form.company.value.trim()) {
        showPanel("", "");
        return;
      }
      var text = [
        "Name: " + cleanLine(form.name.value),
        "Email: " + emailValue,
        "I am: " + cleanLine(form.role.value),
        "",
        messageValue.slice(0, 2000)
      ].join("\n");
      var href = "";
      if (mailOk) {
        href = "mailto:" + MAIL_TO + "?subject=" + encodeURIComponent("Slate from " + cleanLine(form.name.value)) + "&body=" + encodeURIComponent(text);
      }
      showPanel(text, href);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      submitSlate();
    });

    document.getElementById("slate-copy").addEventListener("click", function () {
      copyText(preview.textContent).then(function () {
        status.textContent = "Message copied.";
      }, function () {
        status.textContent = "Copy did not succeed. Select the message and copy it manually.";
      });
    });

    document.getElementById("slate-again").addEventListener("click", function () {
      form.hidden = false;
      panel.hidden = true;
      form.reset();
      Array.prototype.forEach.call(form.querySelectorAll("[aria-invalid]"), function (input) {
        input.setAttribute("aria-invalid", "false");
      });
      Array.prototype.forEach.call(form.querySelectorAll(".field-error"), function (slot) {
        slot.textContent = "";
      });
      status.textContent = "";
      form.name.focus();
    });
  }
})();
