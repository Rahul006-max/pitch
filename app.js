/**
 * Application Orchestrator for Wildcat Devs Pitch Deck
 * Startup Buildathon India 2026 (Google DeepMind | Google Cloud)
 * 
 * Coordinates:
 * - Dynamic 6-slide voyage navigation (Horizontal snap + Mobile stack)
 * - Conditional lazy-loading of Three.js with 2.5s fallback to Simple View
 * - Simple 2D / 3D Mode toggle
 * - 15-Second Animated Micro-Demo (Kannada Voice -> Triage -> Dispatch)
 * - Interactive Product Suite Mockup Switcher
 * - Live Intake Simulator Dialog
 * - One-click PDF Deck Export (window.print with @media print)
 * - Strictly opt-in Web Audio Procedural Engine
 * - Rig door controls & 3D turntable dragging
 */

document.addEventListener("DOMContentLoaded", () => {
  const voyage = document.getElementById("voyage");
  const fieldGuide = document.getElementById("field-guide");
  const liveIntakeDialog = document.getElementById("live-intake-dialog");
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
  const modeToggle = document.getElementById("mode-toggle");
  const modeLabel = document.getElementById("mode-label");
  const loadingNote = document.getElementById("loading-note");

  const totalStops = stops.length || 6;
  const maxStopIndex = totalStops - 1;

  const sceneTitles = [
    "SLIDE 01 / TITLE & CORE MISSION",
    "SLIDE 02 / PROBLEM STATEMENT · 3 HERO STATS",
    "SLIDE 03 / HOW IT WORKS · 15-SEC MICRO-DEMO",
    "SLIDE 04 / PRODUCT SUITE · FIELD EXPERIENCE",
    "SLIDE 05 / GOOGLE AI TOOLS & ARCHITECTURE",
    "SLIDE 06 / TRACTION, MARKET & THE ASK"
  ];

  let currentStop = 0;
  let doorsOpen = false;
  let isPointerDown = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let world = null;
  let isSimpleView = false;

  // ---------------------------------------------------------------------------
  // 1. SIMPLE VIEW / 3D MODE DETECTION & LAZY LOADING
  // ---------------------------------------------------------------------------
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const storedSimplePref = localStorage.getItem("wildcat_simple_view");
  
  if (storedSimplePref === "true" || (storedSimplePref === null && prefersReducedMotion)) {
    isSimpleView = true;
    document.body.classList.add("simple-view");
    if (modeLabel) modeLabel.textContent = "3D Experience";
    if (loadingNote) loadingNote.textContent = "SIMPLE 2D VIEW ACTIVE";
  } else {
    isSimpleView = false;
    document.body.classList.remove("simple-view");
    if (modeLabel) modeLabel.textContent = "Simple View";
  }

  function init3DWorld() {
    if (isSimpleView) return;
    if (world) return;

    if (typeof window.createAmbulanceWorld === "function") {
      try {
        world = window.createAmbulanceWorld();
        if (loadingNote) {
          loadingNote.textContent = "3D RIG READY";
          loadingNote.classList.add("loaded");
        }
      } catch (err) {
        console.warn("Could not start WebGL engine, falling back to Simple View:", err);
        fallbackToSimpleView("3D ACCELERATION UNAVAILABLE · 2D VIEW");
      }
    } else {
      // Lazy load Three.js if needed
      lazyLoadScript("three.min.js", () => {
        lazyLoadScript("ambulance-3d.js", () => {
          if (typeof window.createAmbulanceWorld === "function") {
            try {
              world = window.createAmbulanceWorld();
              if (loadingNote) {
                loadingNote.textContent = "3D RIG READY";
                loadingNote.classList.add("loaded");
              }
            } catch (e) {
              fallbackToSimpleView("3D ENGINE FAILED · 2D VIEW");
            }
          }
        });
      });
    }
  }

  function lazyLoadScript(src, callback) {
    if (document.querySelector(`script[src="${src}"]`)) {
      if (callback) callback();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => { if (callback) callback(); };
    script.onerror = () => { fallbackToSimpleView("FAILED TO LOAD 3D · 2D VIEW"); };
    document.body.appendChild(script);
  }

  function fallbackToSimpleView(reason) {
    isSimpleView = true;
    document.body.classList.add("simple-view");
    if (modeLabel) modeLabel.textContent = "3D Experience";
    if (loadingNote) {
      loadingNote.textContent = reason || "SIMPLE 2D VIEW ACTIVE";
      loadingNote.classList.remove("loaded");
    }
  }

  // 2.5s Timeout Fallback for 3D Engine
  const timeoutId = setTimeout(() => {
    if (!world && !isSimpleView) {
      console.info("3D Engine initialization exceeded 2.5s threshold; activating Simple View for instant performance.");
      fallbackToSimpleView("FAST 2D VIEW (LIGHTWEIGHT)");
    }
  }, 2500);

  if (!isSimpleView) {
    init3DWorld();
  }

  // Simple / 3D View Toggle Button
  if (modeToggle) {
    modeToggle.addEventListener("click", () => {
      isSimpleView = !isSimpleView;
      document.body.classList.toggle("simple-view", isSimpleView);
      localStorage.setItem("wildcat_simple_view", String(isSimpleView));

      if (isSimpleView) {
        if (modeLabel) modeLabel.textContent = "3D Experience";
        if (world) world.setPaused(true);
        if (loadingNote) loadingNote.textContent = "SIMPLE 2D VIEW";
      } else {
        if (modeLabel) modeLabel.textContent = "Simple View";
        if (loadingNote) loadingNote.textContent = "INITIALIZING 3D...";
        if (!world) {
          init3DWorld();
        } else {
          world.setPaused(false);
          if (loadingNote) loadingNote.classList.add("loaded");
        }
      }
      if (window.audioEngine) window.audioEngine.playTap();
    });
  }

  // ---------------------------------------------------------------------------
  // 2. SLIDE NAVIGATION & HUD
  // ---------------------------------------------------------------------------
  function getScrollFraction() {
    if (!voyage) return 0;
    const isMobile = window.innerWidth <= 768;
    return isMobile
      ? voyage.scrollTop / (voyage.clientHeight || 1)
      : voyage.scrollLeft / (voyage.clientWidth || 1);
  }

  function scrollToStop(index, smooth = true) {
    const idx = Math.max(0, Math.min(maxStopIndex, index));
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
    currentStop = Math.max(0, Math.min(maxStopIndex, idx));

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
      routeProgress.style.transform = `scaleX(${Math.max(0, Math.min(1, frac / maxStopIndex))})`;
    }
    if (routeLine) {
      routeLine.setAttribute("aria-valuenow", String(Math.round((frac / maxStopIndex) * 100)));
    }

    if (prevBtn) prevBtn.disabled = currentStop === 0;
    if (nextBtn) nextBtn.disabled = currentStop === maxStopIndex;

    waypoints.forEach((btn) => {
      if (+btn.dataset.go === currentStop) {
        btn.setAttribute("aria-current", "step");
      } else {
        btn.removeAttribute("aria-current");
      }
    });

    if (world && !isSimpleView) {
      world.setProgress(frac, currentStop === 3 ? doorsOpen : null);
    }
  }

  // Scroll listener
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

  // Navigation Links
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

  // Wheel step navigation
  let wheelAccumulator = 0;
  let lastWheelTime = 0;
  window.addEventListener("wheel", (e) => {
    if (fieldGuide && fieldGuide.open) return;
    if (liveIntakeDialog && liveIntakeDialog.open) return;
    if (e.target.closest(".ticket, .field-guide, .intake-sim-dialog, .micro-demo-box, .product-mockup-frame")) return;

    const now = performance.now();
    if (now - lastWheelTime < 650) return;

    wheelAccumulator += e.deltaY;
    if (Math.abs(wheelAccumulator) > 40) {
      if (wheelAccumulator > 0 && currentStop < maxStopIndex) {
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
    if (fieldGuide && fieldGuide.open) {
      if (e.key === "Escape") closeGuide();
      return;
    }
    if (liveIntakeDialog && liveIntakeDialog.open) {
      if (e.key === "Escape") closeLiveIntake();
      return;
    }

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      scrollToStop(currentStop + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      scrollToStop(currentStop - 1);
    } else if (e.key === "Home") {
      scrollToStop(0);
    } else if (e.key === "End") {
      scrollToStop(maxStopIndex);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. 15-SECOND ANIMATED MICRO-DEMO (SLIDE 3)
  // ---------------------------------------------------------------------------
  const demoStepCards = document.querySelectorAll(".demo-step-pane .step-card");
  const demoProgressFill = document.getElementById("demo-progress-fill");
  const demoStepDots = document.querySelectorAll(".demo-step-dot");
  const replayBtn = document.getElementById("demo-replay-btn");
  const waveBars = document.querySelectorAll(".audio-waveform-visual .wave-bar");

  let demoStep = 0;
  let demoInterval = null;
  let demoStartTime = Date.now();
  const stepDurations = [4000, 4000, 4000, 4500]; // Total ~16.5s
  const totalDemoTime = stepDurations.reduce((a, b) => a + b, 0);

  function setMicroDemoStep(stepIndex) {
    demoStep = Math.max(0, Math.min(3, stepIndex));

    demoStepCards.forEach((card, idx) => {
      card.classList.toggle("active-step", idx <= demoStep);
    });

    demoStepDots.forEach((dot, idx) => {
      dot.classList.toggle("active", idx === demoStep);
    });

    // Wave animation active on step 0
    waveBars.forEach((bar) => {
      bar.classList.toggle("active", demoStep === 0);
    });
  }

  function startMicroDemoLoop() {
    if (demoInterval) clearInterval(demoInterval);
    demoStartTime = Date.now();
    setMicroDemoStep(0);

    demoInterval = setInterval(() => {
      const elapsed = (Date.now() - demoStartTime) % totalDemoTime;
      const progressPercent = (elapsed / totalDemoTime) * 100;
      if (demoProgressFill) {
        demoProgressFill.style.width = `${progressPercent}%`;
      }

      let accumulated = 0;
      let targetStep = 0;
      for (let i = 0; i < stepDurations.length; i++) {
        accumulated += stepDurations[i];
        if (elapsed < accumulated) {
          targetStep = i;
          break;
        }
      }

      if (targetStep !== demoStep) {
        setMicroDemoStep(targetStep);
      }
    }, 150);
  }

  // Start micro-demo loop
  startMicroDemoLoop();

  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      startMicroDemoLoop();
      if (window.audioEngine) window.audioEngine.playTap();
    });
  }

  demoStepDots.forEach((dot, idx) => {
    dot.addEventListener("click", () => {
      if (demoInterval) clearInterval(demoInterval);
      setMicroDemoStep(idx);
      if (demoProgressFill) {
        demoProgressFill.style.width = `${((idx + 1) / 4) * 100}%`;
      }
      if (window.audioEngine) window.audioEngine.playTap();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. INTERACTIVE PRODUCT SUITE SWITCHER (SLIDE 4)
  // ---------------------------------------------------------------------------
  const productTabButtons = document.querySelectorAll(".product-tab-btn");
  const productMockupPanels = document.querySelectorAll(".mockup-screen-panel");

  productTabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetScreen = btn.dataset.productScreen;

      productTabButtons.forEach((b) => {
        b.setAttribute("aria-selected", String(b === btn));
      });

      productMockupPanels.forEach((panel) => {
        const matches = panel.dataset.screenId === targetScreen;
        panel.style.display = matches ? "block" : "none";
      });

      if (window.audioEngine) window.audioEngine.playTap();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. LIVE INTAKE SIMULATOR MODAL
  // ---------------------------------------------------------------------------
  const tryIntakeTriggers = document.querySelectorAll(".try-intake-btn, #hero-try-intake-btn");
  const intakeCloseBtn = document.getElementById("sim-dialog-close");
  const simPromptButtons = document.querySelectorAll(".sim-prompt-btn");
  const simTranscriptText = document.getElementById("sim-transcript-text");
  const simTranslationText = document.getElementById("sim-translation-text");
  const simLandmarkPin = document.getElementById("sim-landmark-pin");
  const simTriageBadge = document.getElementById("sim-triage-badge");
  const simDispatchEta = document.getElementById("sim-dispatch-eta");
  const simRigAssigned = document.getElementById("sim-rig-assigned");

  const sampleCalls = {
    kannada: {
      transcript: "ನನ್ನ ಅಪ್ಪನಿಗೆ ಎದೆ ನೋವು ಬರ್ತಿದೆ, ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಫ್ಲೈಓವರ್ ಕೆಳಗೆ SBI ಹತ್ತಿರ ಇದ್ದೇವೆ... ಉಸಿರಾಡಲು ಕಷ್ಟ ಆಗ್ತಿದೆ!",
      translation: "My father is experiencing severe chest pain. We are under the Silk Board flyover near SBI... he is struggling to breathe!",
      landmark: "Under Silk Board Flyover, adjacent to SBI ATM, Hosur Road, Bengaluru (Confidence 98.6%)",
      triage: "CODE RED (P1 Cardiac / Golden Hour)",
      rig: "Manipal Hospital ALS Unit #14 (Defibrillator & Telemetry)",
      eta: "3 mins 48 secs via Elevated Corridor"
    },
    hindi: {
      transcript: "यहाँ आउटर रिंग रोड मराठहल्ली ब्रिज के पास बाइक का एक्सीडेंट हुआ है, बहुत खून बह रहा है जल्दी एम्बुलेंस भेजो!",
      translation: "A bike accident occurred near Marathahalli Bridge on Outer Ring Road, severe bleeding, send an ambulance immediately!",
      landmark: "Outer Ring Road, Service Lane 100m before Marathahalli Bridge, Bengaluru (Confidence 97.4%)",
      triage: "CODE RED (P1 Trauma / Hemorrhage)",
      rig: "Aster CMI Trauma Rig #08 (Spinal Board & Blood Clotting Kit)",
      eta: "4 mins 15 secs via Bus Lane Preemption"
    },
    english: {
      transcript: "Elderly patient collapsed at home inside Prestige Falcon City Apartment Tower 4, unresponsive and pulse is weak.",
      translation: "Direct English input · Verified caller coordinates and building tower directory match.",
      landmark: "Tower 4, Prestige Falcon City, Kanakapura Road, Bengaluru (Confidence 99.2%)",
      triage: "CODE RED (P1 Unresponsive / Syncope)",
      rig: "Apollo Quick-Response Rig #22 (ALS)",
      eta: "5 mins 02 secs"
    }
  };

  function runSimulatedIntake(langKey) {
    const data = sampleCalls[langKey] || sampleCalls.kannada;
    if (simTranscriptText) simTranscriptText.textContent = data.transcript;
    if (simTranslationText) simTranslationText.textContent = data.translation;
    if (simLandmarkPin) simLandmarkPin.textContent = data.landmark;
    if (simTriageBadge) simTriageBadge.textContent = data.triage;
    if (simDispatchEta) simDispatchEta.textContent = data.eta;
    if (simRigAssigned) simRigAssigned.textContent = data.rig;
  }

  tryIntakeTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      if (liveIntakeDialog) {
        liveIntakeDialog.showModal();
        runSimulatedIntake("kannada");
        if (world) world.setPaused(true);
        if (window.audioEngine) window.audioEngine.playTap();
      }
    });
  });

  const closeLiveIntake = () => {
    if (liveIntakeDialog && liveIntakeDialog.open) {
      liveIntakeDialog.close();
      if (world && !isSimpleView) world.setPaused(false);
      if (window.audioEngine) window.audioEngine.playTap();
    }
  };

  if (intakeCloseBtn) intakeCloseBtn.addEventListener("click", closeLiveIntake);

  if (liveIntakeDialog) {
    liveIntakeDialog.addEventListener("click", (e) => {
      const rect = liveIntakeDialog.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        closeLiveIntake();
      }
    });
  }

  simPromptButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      simPromptButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      runSimulatedIntake(btn.dataset.simLang);
      if (window.audioEngine) window.audioEngine.playTap();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. PDF DECK DOWNLOAD (ONE-CLICK PRINT)
  // ---------------------------------------------------------------------------
  document.querySelectorAll(".pdf-export-btn, #boarding-pdf-export").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.audioEngine) window.audioEngine.playTap();
      window.print();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. ROOF & PERSPECTIVE RIG CONTROLS
  // ---------------------------------------------------------------------------
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

  document.querySelectorAll("[data-inspect]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = +btn.dataset.inspect;
      document.body.dataset.inspection = String(mode);

      document.querySelectorAll("[data-inspect]").forEach((b) => {
        b.setAttribute("aria-pressed", String(+b.dataset.inspect === mode));
      });

      if (world) world.setInspection(mode);
      if (window.audioEngine) window.audioEngine.playTap();
    });
  });

  // 3D Turntable Dragging
  window.addEventListener("pointerdown", (e) => {
    if (isSimpleView) return;
    if (e.target.closest("button, a, .ticket, dialog, .micro-demo-box, .product-mockup-frame")) return;
    isPointerDown = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    document.body.classList.add("ambulance-dragging");
    if (world) world.beginAmbulanceDrag(e.clientX, e.clientY);
  });

  window.addEventListener("pointermove", (e) => {
    if (!isPointerDown || isSimpleView) return;
    const deltaX = e.clientX - lastPointerX;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    if (world) world.dragAmbulance(deltaX);
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

  // ---------------------------------------------------------------------------
  // 8. SOUND ENGINE TOGGLE (STRICTLY OPT-IN)
  // ---------------------------------------------------------------------------
  if (soundToggle) {
    // Initial UI state reflects audio engine muted status
    const isInitiallyActive = window.audioEngine && !window.audioEngine.isMuted;
    soundToggle.setAttribute("aria-pressed", String(isInitiallyActive));
    if (soundText) soundText.textContent = isInitiallyActive ? "SOUND: ON" : "SOUND: OFF";

    soundToggle.addEventListener("click", () => {
      if (window.audioEngine) {
        const active = window.audioEngine.toggleMute();
        soundToggle.setAttribute("aria-pressed", String(active));
        soundToggle.dataset.sound = active ? "on" : "off";
        if (soundText) soundText.textContent = active ? "SOUND: ON" : "SOUND: OFF";
        window.audioEngine.toggleSiren(active && currentStop === 1);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 9. FIELD GUIDE DOSSIER MODAL
  // ---------------------------------------------------------------------------
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
      if (world && !isSimpleView) world.setPaused(false);
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
