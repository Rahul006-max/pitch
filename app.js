/**
 * Application Orchestrator for Hackalance
 * Coordinates 3D canvas, horizontal snap navigation, Web Audio,
 * door controls, perspective views, and the field guide dialog.
 */

document.addEventListener("DOMContentLoaded", () => {
  const voyage = document.getElementById("voyage");
  const fieldGuide = document.getElementById("field-guide");
  const routeProgress = document.getElementById("route-progress");
  const routeLine = document.querySelector(".route-line");
  const chapterNumber = document.getElementById("chapter-number");
  const sceneLabel = document.getElementById("scene-label");
  const prevBtn = document.getElementById("previous-stop");
  const nextBtn = document.getElementById("next-stop");
  const soundToggle = document.getElementById("sound-toggle");
  const soundText = document.getElementById("sound-text");
  const roofBtn = document.getElementById("roof-button");
  const roofLabel = document.getElementById("roof-label");
  const stops = document.querySelectorAll(".stop");
  const waypoints = document.querySelectorAll(".route [data-go]");

  const slideNumHud = document.getElementById("slide-num-hud");

  const sceneTitles = [
    "SLIDE 01 / TITLE & CORE MISSION",
    "SLIDE 02 / PROBLEM STATEMENT · THE FATAL FIRST MINUTE",
    "SLIDE 03 / PROPOSED SOLUTION · RAPID MULTILINGUAL INTAKE",
    "SLIDE 04 / GOOGLE AI ARCHITECTURE · GEMINI & VERTEX",
    "SLIDE 05 / BUSINESS MODEL, ROADMAP & THE ASK"
  ];

  let currentStop = 0;
  let doorsOpen = false;
  let isPointerDown = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  // Initialize 3D World
  let world = null;
  if (typeof window.createAmbulanceWorld === "function") {
    try {
      world = window.createAmbulanceWorld();
    } catch (e) {
      console.warn("Could not start WebGL canvas:", e);
    }
  }

  function getScrollFraction() {
    if (!voyage) return 0;
    const isMobile = window.innerWidth <= 768;
    return isMobile
      ? voyage.scrollTop / (voyage.clientHeight || 1)
      : voyage.scrollLeft / (voyage.clientWidth || 1);
  }

  function scrollToStop(index, smooth = true) {
    const idx = Math.max(0, Math.min(4, index));
    if (window.audioEngine) {
      window.audioEngine.playNavigate();
    }

    if (voyage) {
      const isMobile = window.innerWidth <= 768;
      voyage.scrollTo({
        left: isMobile ? 0 : idx * voyage.clientWidth,
        top: isMobile ? idx * voyage.clientHeight : 0,
        behavior: smooth ? "smooth" : "instant"
      });
    }
    updateHUD(idx);
  }

  function updateHUD(exactIndex) {
    const frac = getScrollFraction();
    const idx = exactIndex !== undefined ? exactIndex : Math.round(frac);
    currentStop = Math.max(0, Math.min(4, idx));

    document.body.dataset.stop = String(currentStop);

    if (chapterNumber) {
      chapterNumber.textContent = String(currentStop + 1).padStart(2, "0");
    }
    if (slideNumHud) {
      slideNumHud.textContent = String(currentStop + 1).padStart(2, "0");
    }
    if (sceneLabel) {
      sceneLabel.textContent = sceneTitles[currentStop] || sceneTitles[0];
    }
    if (routeProgress) {
      routeProgress.style.transform = `scaleX(${Math.max(0, Math.min(1, frac / 4))})`;
    }
    if (routeLine) {
      routeLine.setAttribute("aria-valuenow", String(Math.round((frac / 4) * 100)));
    }

    if (prevBtn) prevBtn.disabled = currentStop === 0;
    if (nextBtn) nextBtn.disabled = currentStop === 4;

    waypoints.forEach((btn) => {
      if (+btn.dataset.go === currentStop) {
        btn.setAttribute("aria-current", "step");
      } else {
        btn.removeAttribute("aria-current");
      }
    });

    if (world) {
      world.setProgress(frac, currentStop === 1 ? doorsOpen : null);
    }
  }

  // Scroll listener for horizontal voyage
  let scrollTicking = false;
  if (voyage) {
    voyage.addEventListener("scroll", () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          scrollTicking = false;
          updateHUD();
        });
        scrollTicking = true;
      }
    }, { passive: true });
  }

  // Waypoints & Buttons navigation
  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToStop(+btn.dataset.go);
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener("click", () => scrollToStop(currentStop - 1));
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => scrollToStop(currentStop + 1));
  }

  // Mousewheel step navigation
  let wheelAccumulator = 0;
  let lastWheelTime = 0;
  window.addEventListener("wheel", (e) => {
    if (fieldGuide && fieldGuide.open) return;
    if (e.target.closest(".ticket") || e.target.closest(".field-guide")) return;

    const now = performance.now();
    if (now - lastWheelTime < 650) return;

    wheelAccumulator += e.deltaY;
    if (Math.abs(wheelAccumulator) > 40) {
      if (wheelAccumulator > 0 && currentStop < 4) {
        scrollToStop(currentStop + 1);
        wheelAccumulator = 0;
        lastWheelTime = now;
      } else if (wheelAccumulator < 0 && currentStop > 0) {
        scrollToStop(currentStop - 1);
        wheelAccumulator = 0;
        lastWheelTime = now;
      }
    }
  }, { passive: true });

  // Keyboard Navigation
  window.addEventListener("keydown", (e) => {
    if (fieldGuide && fieldGuide.open) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      scrollToStop(currentStop + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      scrollToStop(currentStop - 1);
    } else if (e.key === "Home") {
      scrollToStop(0);
    } else if (e.key === "End") {
      scrollToStop(4);
    }
  });

  // Roof / Door Controls
  if (roofBtn) {
    roofBtn.addEventListener("click", () => {
      doorsOpen = !doorsOpen;
      roofBtn.setAttribute("aria-pressed", String(doorsOpen));
      roofBtn.setAttribute("aria-label", doorsOpen ? "Close the rear doors" : "Open the rear doors");
      if (roofLabel) roofLabel.textContent = doorsOpen ? "Close doors" : "Open doors";
      if (world) world.setDoors(doorsOpen);
      if (window.audioEngine) window.audioEngine.playTap();
    });
  }

  // Perspective Views (Whole rig / Tech bay / Driver HUD)
  document.querySelectorAll("[data-inspect]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = +btn.dataset.inspect;
      document.body.dataset.inspection = String(mode);

      document.querySelectorAll("[data-inspect]").forEach((b) => {
        b.setAttribute("aria-pressed", String(+b.dataset.inspect === mode));
      });

      const titles = [
        "Critical company.",
        "Trauma Bay Telemetry.",
        "Frontline Cockpit."
      ];
      const descs = [
        "A blank terminal, live diagnostic monitors, and twelve hours to build something that changes everything.",
        "High-density server racks, dual vital monitors, and direct telemetry feed to cloud clusters.",
        "Heading down the midnight arterial road at 120 km/h with siren strobe lighting."
      ];

      const inspTitle = document.getElementById("inspection-title");
      const inspDesc = document.getElementById("inspection-description");
      if (inspTitle) inspTitle.textContent = titles[mode] || titles[0];
      if (inspDesc) inspDesc.textContent = descs[mode] || descs[0];

      if (world) world.setInspection(mode);
      if (window.audioEngine) window.audioEngine.playTap();
    });
  });

  // 3D Ambulance Turntable Dragging
  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, a, .ticket, dialog")) return;
    isPointerDown = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    document.body.classList.add("ambulance-dragging");
    if (world) world.beginAmbulanceDrag(e.clientX, e.clientY);
  });

  window.addEventListener("pointermove", (e) => {
    if (!isPointerDown) return;
    const deltaX = e.clientX - lastPointerX;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    if (world) {
      world.dragAmbulance(deltaX);
    }
    if (Math.abs(deltaX) > 2 && window.audioEngine) {
      window.audioEngine.playTurn(Math.abs(deltaX));
    }
  });

  const endDrag = () => {
    if (!isPointerDown) return;
    isPointerDown = false;
    document.body.classList.remove("ambulance-dragging");
    if (world) world.endAmbulanceDrag();
  };

  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  // Sound Engine Toggle
  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      if (window.audioEngine) {
        const active = window.audioEngine.toggleMute();
        soundToggle.setAttribute("aria-pressed", String(active));
        soundToggle.dataset.sound = active ? "on" : "off";
        if (soundText) soundText.textContent = active ? "SOUND ON" : "SOUND OFF";

        // Double trigger siren wail
        window.audioEngine.toggleSiren(active && currentStop === 2);
      }
    });
  }

  // Field Guide Modal
  document.querySelectorAll(".guide-open, [data-guide-target]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      if (window.audioEngine) window.audioEngine.playTap();
      if (fieldGuide) {
        fieldGuide.showModal();
        if (world) world.setPaused(true);

        const targetId = trigger.dataset.guideTarget;
        if (targetId) {
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            setTimeout(() => {
              targetEl.scrollIntoView({ behavior: "smooth" });
            }, 80);
          }
        }
      }
    });
  });

  const closeGuide = () => {
    if (fieldGuide && fieldGuide.open) {
      fieldGuide.close();
      if (world) world.setPaused(false);
      if (window.audioEngine) window.audioEngine.playTap();
    }
  };

  const guideCloseBtn = document.getElementById("guide-close");
  const guideReturnBtn = document.getElementById("guide-return");
  if (guideCloseBtn) guideCloseBtn.addEventListener("click", closeGuide);
  if (guideReturnBtn) guideReturnBtn.addEventListener("click", closeGuide);

  if (fieldGuide) {
    fieldGuide.addEventListener("click", (e) => {
      const rect = fieldGuide.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        closeGuide();
      }
    });
  }

  // Initial HUD sync
  updateHUD(0);
});
