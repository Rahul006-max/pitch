/**
 * Premium 3D Emergency Rig Engine using Three.js
 * High-tech cinematic emergency response vehicle with aerodynamic body styling,
 * glowing cyber-LED lightbars, headlight beams, asphalt reflection,
 * complete 3D Trauma Intake Bay (AI Workstation) & Frontline Driver HUD Cockpit.
 */

(function () {
  const THREE = window.THREE;
  if (!THREE) {
    console.warn("Three.js not loaded yet, engine will start upon script load.");
    return;
  }

  class AmbulanceWorld {
    constructor() {
      this.canvas = document.getElementById("lake");
      this.container = document.getElementById("world");
      if (!this.canvas) return;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });

      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.35;

      // Group hierarchies
      this.worldGroup = new THREE.Group();
      this.scene.add(this.worldGroup);

      // Offset ambulance to the right side of the screen on desktop
      this.rigOffset = new THREE.Group();
      this.updateRigPlacement();
      this.worldGroup.add(this.rigOffset);

      this.ambulance = new THREE.Group();
      this.rigOffset.add(this.ambulance);

      this.doorsOpen = false;
      this.doorLeft = null;
      this.doorRight = null;
      this.wheels = [];
      this.roadDashes = [];
      this.streetPoles = [];

      // Lighting references
      this.sirenRed = null;
      this.sirenBlue = null;
      this.strobeMeshes = [];
      this.ambientLight = null;
      this.sunLight = null;

      // State variables
      this.chapterProgress = 0;
      this.inspectionMode = 0; // 0: Fleet Rig, 1: Intake Bay, 2: Driver HUD
      this.isDragging = false;
      this.dragRotation = 0;
      this.targetDragRotation = 0;
      this.isPaused = false;
      this.clock = new THREE.Clock();

      // Camera positions for 6 slides (angled so rig is visible on the right half)
      this.cameraStops = [
        // Slide 01: Hero Angle
        { pos: new THREE.Vector3(4.8, 2.6, 7.8), target: new THREE.Vector3(1.2, 0.9, 0.0) },
        // Slide 02: Code Red Highway (Lower dramatic perspective)
        { pos: new THREE.Vector3(4.2, 1.9, 7.0), target: new THREE.Vector3(1.0, 0.85, 0.2) },
        // Slide 03: How It Works / Micro-Demo (Elevated 3/4 view)
        { pos: new THREE.Vector3(4.5, 2.8, 6.8), target: new THREE.Vector3(1.1, 1.0, -0.2) },
        // Slide 04: Product Suite / Rig Tech Bay Angle
        { pos: new THREE.Vector3(3.6, 1.7, 5.2), target: new THREE.Vector3(0.9, 0.9, 0.1) },
        // Slide 05: Google Cloud Architecture (Speed run tracking)
        { pos: new THREE.Vector3(4.9, 2.4, -6.5), target: new THREE.Vector3(1.0, 0.9, 0.0) },
        // Slide 06: Dawn Arrival / The Ask (Golden Hour quarter shot)
        { pos: new THREE.Vector3(4.6, 2.2, 7.2), target: new THREE.Vector3(1.1, 0.85, 0.0) }
      ];

      // Perspective Inspection Camera Stops (Mode 0, 1, 2)
      this.inspectionStops = [
        // 0: Whole Rig Orbit View
        { pos: new THREE.Vector3(4.8, 2.6, 7.8), target: new THREE.Vector3(1.2, 0.9, 0.0) },
        // 1: Inside Trauma Intake Bay (Looking straight into medical lab through open rear doors)
        { pos: new THREE.Vector3(0.0, 1.54, -3.45), target: new THREE.Vector3(0.0, 1.40, -0.6) },
        // 2: Driver HUD (First-person Cockpit view through windshield at the night highway)
        { pos: new THREE.Vector3(0.46, 1.39, 1.35), target: new THREE.Vector3(0.46, 1.34, 12.0) }
      ];

      this.currentCamPos = new THREE.Vector3().copy(this.cameraStops[0].pos);
      this.currentCamTarget = new THREE.Vector3().copy(this.cameraStops[0].target);

      this.initScene();
      this.buildHighway();
      this.buildAmbulance();
      this.bindEvents();
      this.animate();

      if (this.container) this.container.classList.add("ready");
      const loading = document.getElementById("loading-note");
      if (loading) loading.classList.add("loaded");
    }

    updateRigPlacement() {
      const isMobile = window.innerWidth <= 860;
      this.rigOffset.position.x = (this.inspectionMode !== 0) ? 0.0 : (isMobile ? 0.0 : 1.7);
    }

    initScene() {
      this.scene.fog = new THREE.FogExp2(0x071520, 0.024);

      this.ambientLight = new THREE.AmbientLight(0x7eb5d6, 0.85);
      this.scene.add(this.ambientLight);

      this.sunLight = new THREE.DirectionalLight(0xfff1db, 1.6);
      this.sunLight.position.set(10, 16, 12);
      this.scene.add(this.sunLight);

      const cyanFill = new THREE.DirectionalLight(0x00d2ff, 0.5);
      cyanFill.position.set(-10, 6, -8);
      this.scene.add(cyanFill);
    }

    buildHighway() {
      // 1. Wet Asphalt Road
      const roadGeo = new THREE.PlaneGeometry(18, 240, 16, 16);
      const roadMat = new THREE.MeshStandardMaterial({
        color: 0x0a1118,
        roughness: 0.25,
        metalness: 0.35
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      this.worldGroup.add(road);

      // 2. Glowing Road Markings
      const dashGeo = new THREE.PlaneGeometry(0.24, 3.2);
      const dashMat = new THREE.MeshBasicMaterial({
        color: 0x00d2ff,
        transparent: true,
        opacity: 0.8
      });

      for (let z = -100; z <= 100; z += 7) {
        const dash = new THREE.Mesh(dashGeo, dashMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(0, 0.015, z);
        this.worldGroup.add(dash);
        this.roadDashes.push(dash);
      }

      // Edge glow rails
      const edgeMat = new THREE.MeshBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.6 });
      const edgeGeo = new THREE.BoxGeometry(0.12, 0.1, 240);
      const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
      leftEdge.position.set(-8.2, 0.05, 0);
      this.worldGroup.add(leftEdge);

      const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
      rightEdge.position.set(8.2, 0.05, 0);
      this.worldGroup.add(rightEdge);

      // Street light nodes
      for (let z = -90; z <= 90; z += 35) {
        this.addLightPole(8.5, z);
        this.addLightPole(-8.5, z + 17.5);
      }
    }

    addLightPole(x, z) {
      const poleGroup = new THREE.Group();
      poleGroup.position.set(x, 0, z);

      const poleMat = new THREE.MeshStandardMaterial({ color: 0x1b2836, metalness: 0.8, roughness: 0.3 });
      const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 5.5, 8);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 2.75;
      poleGroup.add(pole);

      const headMat = new THREE.MeshBasicMaterial({ color: 0x64b5f6 });
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.25), headMat);
      head.position.set(x > 0 ? -0.5 : 0.5, 5.4, 0);
      poleGroup.add(head);

      const pLight = new THREE.PointLight(0x64b5f6, 0.9, 14);
      pLight.position.set(x > 0 ? -0.5 : 0.5, 5.2, 0);
      poleGroup.add(pLight);

      this.worldGroup.add(poleGroup);
      this.streetPoles.push(poleGroup);
    }

    // -------------------------------------------------------------------------
    // PROCEDURAL TEXTURE GENERATORS (HIGH RESOLUTION RETINA SCREENS)
    // -------------------------------------------------------------------------
    createGeminiIntakeTexture() {
      const cv = document.createElement("canvas");
      cv.width = 512;
      cv.height = 320;
      const ctx = cv.getContext("2d");

      // Deep cyan-slate terminal background
      ctx.fillStyle = "#041520";
      ctx.fillRect(0, 0, 512, 320);

      // Glowing border
      ctx.strokeStyle = "#00d2ff";
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, 504, 312);

      // Header Bar
      ctx.fillStyle = "#082638";
      ctx.fillRect(4, 4, 504, 52);

      ctx.font = "bold 20px monospace";
      ctx.fillStyle = "#00d2ff";
      ctx.fillText("● GEMINI LIVE API · VERTEX AI", 20, 36);

      ctx.font = "14px monospace";
      ctx.fillStyle = "#34a853";
      ctx.fillText("LIVE VOICE STREAM [KANNADA]", 300, 36);

      // Waveform Audio Bars
      ctx.fillStyle = "#00ff88";
      const barHeights = [28, 45, 62, 35, 78, 50, 68, 85, 42, 60, 38, 55, 72, 40, 64, 48];
      for (let i = 0; i < barHeights.length; i++) {
        ctx.fillRect(30 + i * 28, 140 - barHeights[i], 16, barHeights[i]);
      }

      // Live transcript line
      ctx.font = "italic 16px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText('"ನನ್ನ ಅಪ್ಪನಿಗೆ ಎದೆ ನೋವು ಬರ್ತಿದೆ, ಸಿಲ್ಕ್ ಬೋರ್ಡ್..."', 24, 180);

      // Parsed Landmark Card
      ctx.fillStyle = "#0b2c40";
      ctx.fillRect(20, 205, 472, 48);
      ctx.strokeStyle = "#4285f4";
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 205, 472, 48);

      ctx.font = "bold 15px monospace";
      ctx.fillStyle = "#4285f4";
      ctx.fillText("📍 LANDMARK: SILK BOARD FLYOVER · 98.6% CONF", 32, 235);

      // Triage status
      ctx.fillStyle = "#ff334b";
      ctx.font = "bold 16px monospace";
      ctx.fillText("🚨 TRIAGE: CODE RED · CARDIAC P1 (ALS REQUIRED)", 24, 290);

      const texture = new THREE.CanvasTexture(cv);
      texture.anisotropy = 4;
      return texture;
    }

    createVitalsTexture() {
      const cv = document.createElement("canvas");
      cv.width = 512;
      cv.height = 320;
      const ctx = cv.getContext("2d");

      ctx.fillStyle = "#031118";
      ctx.fillRect(0, 0, 512, 320);

      // Medical grid lines
      ctx.strokeStyle = "rgba(0, 210, 255, 0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= 512; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 320);
        ctx.stroke();
      }
      for (let y = 0; y <= 320; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      // Header
      ctx.fillStyle = "#e8bf7d";
      ctx.font = "bold 18px monospace";
      ctx.fillText("❤️ PATIENT TELEMETRY · ALS RIG #14", 20, 36);

      // Pulsing ECG Wave
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, 110);
      ctx.lineTo(80, 110);
      ctx.lineTo(95, 80);
      ctx.lineTo(110, 150);
      ctx.lineTo(130, 40);
      ctx.lineTo(150, 125);
      ctx.lineTo(170, 110);
      ctx.lineTo(240, 110);
      ctx.lineTo(255, 80);
      ctx.lineTo(270, 150);
      ctx.lineTo(290, 40);
      ctx.lineTo(310, 125);
      ctx.lineTo(330, 110);
      ctx.lineTo(490, 110);
      ctx.stroke();

      // Readouts
      ctx.font = "bold 32px monospace";
      ctx.fillStyle = "#34a853";
      ctx.fillText("HR: 78 BPM", 30, 200);

      ctx.fillStyle = "#00d2ff";
      ctx.fillText("SPO2: 98%", 280, 200);

      ctx.font = "bold 24px monospace";
      ctx.fillStyle = "#fbbc05";
      ctx.fillText("NIBP: 120/80", 30, 260);

      ctx.fillStyle = "#ffffff";
      ctx.font = "16px monospace";
      ctx.fillText("DEFIB: ARMED · O2: 15L FLOW", 30, 295);

      const texture = new THREE.CanvasTexture(cv);
      texture.anisotropy = 4;
      return texture;
    }

    createDriverHudTexture() {
      const cv = document.createElement("canvas");
      cv.width = 512;
      cv.height = 360;
      const ctx = cv.getContext("2d");

      ctx.fillStyle = "#051622";
      ctx.fillRect(0, 0, 512, 360);

      // Glowing Neon border
      ctx.strokeStyle = "#00d2ff";
      ctx.lineWidth = 5;
      ctx.strokeRect(4, 4, 504, 352);

      // Navigation Preemption Header
      ctx.fillStyle = "#092536";
      ctx.fillRect(4, 4, 504, 50);

      ctx.font = "bold 18px monospace";
      ctx.fillStyle = "#34a853";
      ctx.fillText("🗺️ GOOGLE MAPS ROUTES API · PREEMPTION", 18, 34);

      // Giant Turn Arrow
      ctx.fillStyle = "#00ffcc";
      ctx.font = "bold 64px sans-serif";
      ctx.fillText("⮦", 35, 140);

      // Turn instructions
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("TURN LEFT IN 150M", 120, 105);

      ctx.fillStyle = "#00d2ff";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("Onto Hosur Rd Elevated Slip", 120, 138);

      // Target Card
      ctx.fillStyle = "#081e2b";
      ctx.fillRect(20, 175, 472, 65);
      ctx.strokeStyle = "#e8bf7d";
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 175, 472, 65);

      ctx.font = "bold 15px monospace";
      ctx.fillStyle = "#e8bf7d";
      ctx.fillText("DESTINATION: SILK BOARD FLYOVER (SBI ATM)", 30, 202);

      ctx.font = "14px monospace";
      ctx.fillStyle = "#cfdce6";
      ctx.fillText("Distance: 1.1 km · Traffic Corridor: CLEAR", 30, 226);

      // Bottom Telemetry Bar
      ctx.fillStyle = "#ff334b";
      ctx.font = "bold 28px monospace";
      ctx.fillText("ETA 3m 48s", 30, 295);

      ctx.fillStyle = "#00d2ff";
      ctx.font = "bold 28px monospace";
      ctx.fillText("88 KM/H", 320, 295);

      ctx.font = "13px monospace";
      ctx.fillStyle = "#34a853";
      ctx.fillText("SIREN PREEMPTION: ACTIVE", 30, 332);

      const texture = new THREE.CanvasTexture(cv);
      texture.anisotropy = 4;
      return texture;
    }

    createInstrumentClusterTexture() {
      const cv = document.createElement("canvas");
      cv.width = 256;
      cv.height = 140;
      const ctx = cv.getContext("2d");

      ctx.fillStyle = "#020b10";
      ctx.fillRect(0, 0, 256, 140);

      ctx.fillStyle = "#00d2ff";
      ctx.font = "bold 42px monospace";
      ctx.fillText("88", 20, 60);

      ctx.font = "14px monospace";
      ctx.fillStyle = "#cfdce6";
      ctx.fillText("KM/H", 95, 45);

      ctx.fillStyle = "#ff334b";
      ctx.font = "bold 16px monospace";
      ctx.fillText("● CODE RED", 20, 95);

      ctx.fillStyle = "#34a853";
      ctx.font = "12px monospace";
      ctx.fillText("GPS: 12.9172° N, 77.6228° E", 20, 122);

      const texture = new THREE.CanvasTexture(cv);
      return texture;
    }

    // -------------------------------------------------------------------------
    // BUILD AMBULANCE RIG: CAB, HOLLOW TRAUMA LAB & COCKPIT
    // -------------------------------------------------------------------------
    buildAmbulance() {
      const bodyWhite = new THREE.MeshStandardMaterial({ color: 0xecf0f5, roughness: 0.2, metalness: 0.2 });
      const carbonDark = new THREE.MeshStandardMaterial({ color: 0x161d26, roughness: 0.45, metalness: 0.65 });
      const emergencyRed = new THREE.MeshStandardMaterial({ color: 0xff2a44, roughness: 0.25, metalness: 0.1, emissive: 0x440810 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a1622, roughness: 0.05, metalness: 0.95, transparent: true, opacity: 0.5 });
      const neonCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

      // =======================================================================
      // 1. FRONT CAB & COCKPIT (HOLLOW WITH INTERIOR SEATS & DASHBOARD)
      // =======================================================================
      const cabGroup = new THREE.Group();
      cabGroup.position.set(0, 0, 0);

      // Cab Floor
      const cabFloor = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.8), carbonDark);
      cabFloor.rotation.x = -Math.PI / 2;
      cabFloor.position.set(0, 0.55, 1.6);
      cabGroup.add(cabFloor);

      // Slanted Aerodynamic Hood
      const hoodGeo = new THREE.BoxGeometry(1.98, 0.62, 1.25);
      const hood = new THREE.Mesh(hoodGeo, bodyWhite);
      hood.position.set(0, 0.86, 2.95);
      cabGroup.add(hood);

      // Windshield (Transparent Glass Looking at Highway Ahead)
      const windshieldGeo = new THREE.PlaneGeometry(1.82, 0.95);
      const windshield = new THREE.Mesh(windshieldGeo, glassMat);
      windshield.position.set(0, 1.5, 2.48);
      windshield.rotation.x = -0.36;
      cabGroup.add(windshield);

      // Side Windows
      const winGeo = new THREE.PlaneGeometry(0.85, 0.52);
      const leftWin = new THREE.Mesh(winGeo, glassMat);
      leftWin.position.set(-1.035, 1.4, 1.6);
      leftWin.rotation.y = -Math.PI / 2;
      cabGroup.add(leftWin);

      const rightWin = new THREE.Mesh(winGeo, glassMat);
      rightWin.position.set(1.035, 1.4, 1.6);
      rightWin.rotation.y = Math.PI / 2;
      cabGroup.add(rightWin);

      // Front Carbon Grille
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.42, 0.12), carbonDark);
      grille.position.set(0, 0.72, 3.58);
      cabGroup.add(grille);

      // Cyber Matrix Headlights
      const leftHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.08), neonCyan);
      leftHead.position.set(-0.7, 0.85, 3.57);
      cabGroup.add(leftHead);

      const rightHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.08), neonCyan);
      rightHead.position.set(0.7, 0.85, 3.57);
      cabGroup.add(rightHead);

      // Spotlights onto road
      const spotL = new THREE.SpotLight(0xa5f3fc, 3.2, 28, Math.PI / 7, 0.35);
      spotL.position.set(-0.7, 0.85, 3.6);
      spotL.target.position.set(-0.7, 0, 16);
      cabGroup.add(spotL);
      cabGroup.add(spotL.target);

      const spotR = new THREE.SpotLight(0xa5f3fc, 3.2, 28, Math.PI / 7, 0.35);
      spotR.position.set(0.7, 0.85, 3.6);
      spotR.target.position.set(0.7, 0, 16);
      cabGroup.add(spotR);
      cabGroup.add(spotR.target);

      // Build Frontline Driver Cockpit
      this.buildDriverCockpit(cabGroup);
      this.ambulance.add(cabGroup);

      // =======================================================================
      // 2. REAR HOLLOW TRAUMA BOX & INTAKE BAY
      // =======================================================================
      const boxGroup = new THREE.Group();
      boxGroup.position.set(0, 0, 0);

      // Outer side walls
      const wallMat = bodyWhite;
      const leftOuterWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 3.5), wallMat);
      leftOuterWall.position.set(-1.08, 1.52, -0.9);
      boxGroup.add(leftOuterWall);

      const rightOuterWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 3.5), wallMat);
      rightOuterWall.position.set(1.08, 1.52, -0.9);
      boxGroup.add(rightOuterWall);

      // Outer Roof
      const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.08, 3.5), wallMat);
      roofMesh.position.set(0, 2.42, -0.9);
      boxGroup.add(roofMesh);

      // Front Partition Wall between Cab and Trauma Box
      const partition = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.76, 0.08), carbonDark);
      partition.position.set(0, 1.52, 0.85);
      boxGroup.add(partition);

      // Sliding Pass-Through Acrylic Window on Partition
      const passWin = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.4), glassMat);
      passWin.position.set(0, 1.58, 0.8);
      boxGroup.add(passWin);

      // Cyber Emergency Chevron Stripes along exterior sides
      const stripeGeo = new THREE.PlaneGeometry(3.48, 0.28);
      const leftStripe = new THREE.Mesh(stripeGeo, emergencyRed);
      leftStripe.position.set(-1.13, 1.4, -0.9);
      leftStripe.rotation.y = -Math.PI / 2;
      boxGroup.add(leftStripe);

      const rightStripe = new THREE.Mesh(stripeGeo, emergencyRed);
      rightStripe.position.set(1.13, 1.4, -0.9);
      rightStripe.rotation.y = Math.PI / 2;
      boxGroup.add(rightStripe);

      // Glowing Neon Accent Stripe
      const neonStripeMat = new THREE.MeshBasicMaterial({ color: 0x4285f4 });
      const neonStripeGeo = new THREE.PlaneGeometry(3.48, 0.05);

      const leftNeon = new THREE.Mesh(neonStripeGeo, neonStripeMat);
      leftNeon.position.set(-1.135, 1.22, -0.9);
      leftNeon.rotation.y = -Math.PI / 2;
      boxGroup.add(leftNeon);

      const rightNeon = new THREE.Mesh(neonStripeGeo, neonStripeMat);
      rightNeon.position.set(1.135, 1.22, -0.9);
      rightNeon.rotation.y = Math.PI / 2;
      boxGroup.add(rightNeon);

      // Medical Red Cross Emblem
      const crossMat = new THREE.MeshBasicMaterial({ color: 0xff334b });
      const cH = new THREE.BoxGeometry(0.12, 0.48, 0.02);
      const cV = new THREE.BoxGeometry(0.48, 0.12, 0.02);

      const crossL = new THREE.Group();
      crossL.add(new THREE.Mesh(cH, crossMat));
      crossL.add(new THREE.Mesh(cV, crossMat));
      crossL.position.set(-1.14, 1.85, -0.9);
      crossL.rotation.y = -Math.PI / 2;
      boxGroup.add(crossL);

      const crossR = crossL.clone();
      crossR.position.set(1.14, 1.85, -0.9);
      crossR.rotation.y = Math.PI / 2;
      boxGroup.add(crossR);

      this.ambulance.add(boxGroup);

      // 3. Wheels & Rims
      this.buildWheels();

      // 4. Strobe Lightbars
      this.buildCyberLightbar();

      // 5. Complete Trauma Intake Bay (AI Workstation)
      this.buildIntakeBay();

      // 6. Interactive Rear Doors
      this.buildRearDoors();

      this.ambulance.position.y = 0.45;
    }

    // -------------------------------------------------------------------------
    // DRIVER COCKPIT & HEADS-UP DISPLAY (HUD)
    // -------------------------------------------------------------------------
    buildDriverCockpit(cabGroup) {
      const cockpit = new THREE.Group();
      cockpit.position.set(0, 0, 0);

      const dashMat = new THREE.MeshStandardMaterial({ color: 0x141a22, metalness: 0.6, roughness: 0.4 });
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x18202a, roughness: 0.7 });

      // 1. Dashboard Console
      const dash = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.45, 0.85), dashMat);
      dash.position.set(0, 1.15, 2.05);
      cockpit.add(dash);

      // 2. Dual Bucket Seats
      // Right Seat (Driver position for India - RHD)
      const seatRight = new THREE.Group();
      seatRight.position.set(0.48, 0.75, 1.35);
      const cushionR = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.55), seatMat);
      const backrestR = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.65, 0.14), seatMat);
      backrestR.position.set(0, 0.38, -0.22);
      backrestR.rotation.x = -0.15;
      const headrestR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.1), seatMat);
      headrestR.position.set(0, 0.78, -0.28);
      seatRight.add(cushionR);
      seatRight.add(backrestR);
      seatRight.add(headrestR);
      cockpit.add(seatRight);

      // Left Seat (Paramedic / Co-driver)
      const seatLeft = seatRight.clone();
      seatLeft.position.set(-0.48, 0.75, 1.35);
      cockpit.add(seatLeft);

      // 3. Steering Wheel (Positioned right in front of Driver at x = 0.48)
      const steeringGroup = new THREE.Group();
      steeringGroup.position.set(0.48, 1.28, 1.8);
      steeringGroup.rotation.x = -0.38;

      const steerMat = new THREE.MeshStandardMaterial({ color: 0x0b1016, metalness: 0.8, roughness: 0.3 });
      const steerRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 24), steerMat);
      steeringGroup.add(steerRing);

      const steerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16), steerMat);
      steerHub.rotation.x = Math.PI / 2;
      steeringGroup.add(steerHub);

      // Emergency emblem on steering center
      const steerEmblem = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), new THREE.MeshBasicMaterial({ color: 0xff334b }));
      steerEmblem.position.set(0, 0, 0.022);
      steeringGroup.add(steerEmblem);

      cockpit.add(steeringGroup);

      // 4. Center Console Driver HUD Screen (Google Maps Turn-by-Turn Preemption)
      const hudTexture = this.createDriverHudTexture();
      const hudMat = new THREE.MeshBasicMaterial({ map: hudTexture });
      const hudScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.36), hudMat);
      hudScreen.position.set(0.02, 1.34, 1.88);
      hudScreen.rotation.y = 0.22; // Angled slightly towards the driver
      hudScreen.rotation.x = -0.15;
      cockpit.add(hudScreen);

      // Screen housing frame
      const hudFrame = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.40, 0.04), dashMat);
      hudFrame.position.copy(hudScreen.position);
      hudFrame.rotation.copy(hudScreen.rotation);
      hudFrame.position.z -= 0.022;
      cockpit.add(hudFrame);

      // 5. Digital Instrument Cluster HUD (Behind Steering Wheel)
      const clusterTexture = this.createInstrumentClusterTexture();
      const clusterMat = new THREE.MeshBasicMaterial({ map: clusterTexture });
      const clusterScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.20), clusterMat);
      clusterScreen.position.set(0.48, 1.35, 1.98);
      clusterScreen.rotation.x = -0.32;
      cockpit.add(clusterScreen);

      // 6. Holographic Windshield HUD Projection (Semi-Transparent Line of Sight)
      const holoMat = new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending
      });
      const holoRoute = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.35), holoMat);
      holoRoute.position.set(0.48, 1.48, 2.45);
      holoRoute.rotation.x = -0.36;
      cockpit.add(holoRoute);

      // 7. Ambient Cockpit Glow Light
      const cockpitGlow = new THREE.PointLight(0x00d2ff, 1.8, 4.5);
      cockpitGlow.position.set(0.2, 1.45, 1.7);
      cockpit.add(cockpitGlow);

      cabGroup.add(cockpit);
    }

    // -------------------------------------------------------------------------
    // COMPLETE TRAUMA INTAKE BAY (AI WORKSTATION LAB)
    // -------------------------------------------------------------------------
    buildIntakeBay() {
      const bay = new THREE.Group();
      bay.position.set(0, 0, 0);

      // 1. Polished Diamond-Plate Medical Floor
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x0e1722, metalness: 0.85, roughness: 0.25 });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 3.4), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, 0.65, -0.9);
      bay.add(floor);

      // 2. Ceiling with Dual LED Surgical Light Strips
      const ceilMat = new THREE.MeshStandardMaterial({ color: 0x16202c, roughness: 0.4 });
      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 3.4), ceilMat);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.set(0, 2.38, -0.9);
      bay.add(ceiling);

      const ledMat = new THREE.MeshBasicMaterial({ color: 0xe0f7fa });
      const ledLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 2.8), ledMat);
      ledLeft.position.set(-0.55, 2.36, -0.9);
      bay.add(ledLeft);

      const ledRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 2.8), ledMat);
      ledRight.position.set(0.55, 2.36, -0.9);
      bay.add(ledRight);

      // 3. Trauma Stretcher / Gurney (Right Side: x = 0.42)
      const gurneyGroup = new THREE.Group();
      gurneyGroup.position.set(0.42, 0.65, -0.9);

      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xc8d6e5, metalness: 0.95, roughness: 0.15 });
      const mattressMat = new THREE.MeshStandardMaterial({ color: 0x1a2634, roughness: 0.6 });

      // Mattress & Raised Headrest
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.18, 1.8), mattressMat);
      mattress.position.set(0, 0.45, 0);
      gurneyGroup.add(mattress);

      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.16, 0.5), mattressMat);
      headrest.position.set(0, 0.52, 0.72);
      headrest.rotation.x = 0.28;
      gurneyGroup.add(headrest);

      // Stretcher Legs & Frame
      const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 1.7), chromeMat);
      frameL.position.set(-0.32, 0.2, 0);
      gurneyGroup.add(frameL);

      const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 1.7), chromeMat);
      frameR.position.set(0.32, 0.2, 0);
      gurneyGroup.add(frameR);

      // IV Drip Pole with Saline Bag
      const ivPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8), chromeMat);
      ivPole.position.set(0.32, 0.95, 0.8);
      gurneyGroup.add(ivPole);

      const salineBag = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.22, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.7 })
      );
      salineBag.position.set(0.32, 1.45, 0.8);
      gurneyGroup.add(salineBag);

      bay.add(gurneyGroup);

      // 4. Emergency AI Workstation Console (Left Side: x = -0.68)
      const workstationGroup = new THREE.Group();
      workstationGroup.position.set(-0.68, 0.65, -0.9);

      const counterMat = new THREE.MeshStandardMaterial({ color: 0x121c26, metalness: 0.7, roughness: 0.3 });
      const counter = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 2.6), counterMat);
      counter.position.set(0, 0.42, 0);
      workstationGroup.add(counter);

      // Dual Curved Cyber Displays on Counter
      // Screen 1: Gemini Live AI Intake Terminal
      const geminiTex = this.createGeminiIntakeTexture();
      const geminiScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.82, 0.52),
        new THREE.MeshBasicMaterial({ map: geminiTex })
      );
      geminiScreen.position.set(0.24, 1.15, 0.45);
      geminiScreen.rotation.y = -Math.PI / 2 + 0.18; // Angled facing the stretcher
      workstationGroup.add(geminiScreen);

      // Screen 2: Patient Multiparameter Vitals Monitor
      const vitalsTex = this.createVitalsTexture();
      const vitalsScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.82, 0.52),
        new THREE.MeshBasicMaterial({ map: vitalsTex })
      );
      vitalsScreen.position.set(0.24, 1.15, -0.52);
      vitalsScreen.rotation.y = -Math.PI / 2 - 0.18;
      workstationGroup.add(vitalsScreen);

      // 5. Cloud Run / Edge Server Rack Tower
      const serverRack = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 1.45, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x080e14, metalness: 0.95, roughness: 0.2 })
      );
      serverRack.position.set(0, 0.72, 1.05);
      workstationGroup.add(serverRack);

      // Server activity LEDs
      const ledDotMatG = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
      const ledDotMatB = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
      for (let y = 0.4; y < 1.3; y += 0.15) {
        const dot1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), ledDotMatG);
        dot1.position.set(0.25, y, 0.95);
        workstationGroup.add(dot1);

        const dot2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), ledDotMatB);
        dot2.position.set(0.25, y, 1.15);
        workstationGroup.add(dot2);
      }

      // 6. Dual Oxygen Cylinders
      const o2Mat = new THREE.MeshStandardMaterial({ color: 0x00a86b, roughness: 0.3, metalness: 0.4 });
      const o2Cylinder1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), o2Mat);
      o2Cylinder1.position.set(0.05, 0.65, -1.05);
      workstationGroup.add(o2Cylinder1);

      const o2Cylinder2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16), o2Mat);
      o2Cylinder2.position.set(0.05, 0.65, -0.78);
      workstationGroup.add(o2Cylinder2);

      // Chrome Valve Heads
      const valve1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), chromeMat);
      valve1.position.set(0.05, 1.15, -1.05);
      workstationGroup.add(valve1);

      const valve2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), chromeMat);
      valve2.position.set(0.05, 1.15, -0.78);
      workstationGroup.add(valve2);

      bay.add(workstationGroup);

      // 7. Surgical Interior Cyan Light (Illuminates Bay & Spills through Open Rear Doors)
      const surgicalLight = new THREE.PointLight(0x67e8f9, 2.4, 7.5);
      surgicalLight.position.set(0, 1.95, -0.9);
      bay.add(surgicalLight);

      this.ambulance.add(bay);
    }

    buildWheels() {
      const tireGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.34, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.9 });

      const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.36, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, metalness: 0.9, roughness: 0.2 });

      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
      const ringGeo = new THREE.TorusGeometry(0.24, 0.015, 8, 20);
      ringGeo.rotateY(Math.PI / 2);

      const wheelPositions = [
        [-1.02, 0.4, 2.15],
        [1.02, 0.4, 2.15],
        [-1.08, 0.4, -1.55],
        [1.08, 0.4, -1.55]
      ];

      wheelPositions.forEach((pos) => {
        const wheelGroup = new THREE.Group();
        wheelGroup.position.set(pos[0], pos[1], pos[2]);

        const tire = new THREE.Mesh(tireGeo, tireMat);
        const rim = new THREE.Mesh(rimGeo, rimMat);
        const ring = new THREE.Mesh(ringGeo, ringMat);

        wheelGroup.add(tire);
        wheelGroup.add(rim);
        wheelGroup.add(ring);

        this.ambulance.add(wheelGroup);
        this.wheels.push(wheelGroup);
      });
    }

    buildCyberLightbar() {
      const barGroup = new THREE.Group();
      barGroup.position.set(0, 2.5, 0.8);

      const baseGeo = new THREE.BoxGeometry(1.65, 0.12, 0.38);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x11161f, metalness: 0.8 });
      barGroup.add(new THREE.Mesh(baseGeo, baseMat));

      // Red Strobe Dome
      const redMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
      const redDome = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.34), redMat);
      redDome.position.set(-0.46, 0.1, 0);
      barGroup.add(redDome);
      this.strobeMeshes.push({ mesh: redDome, onColor: 0xff1744, offColor: 0x4a0a14 });

      // Blue Strobe Dome
      const blueMat = new THREE.MeshBasicMaterial({ color: 0x0070f3 });
      const blueDome = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.34), blueMat);
      blueDome.position.set(0.46, 0.1, 0);
      barGroup.add(blueDome);
      this.strobeMeshes.push({ mesh: blueDome, onColor: 0x0070f3, offColor: 0x061c38 });

      // Dynamic Strobe PointLights
      this.sirenRed = new THREE.PointLight(0xff2244, 4.5, 20);
      this.sirenRed.position.set(-0.9, 2.7, 0.8);
      this.ambulance.add(this.sirenRed);

      this.sirenBlue = new THREE.PointLight(0x0088ff, 4.5, 20);
      this.sirenBlue.position.set(0.9, 2.7, 0.8);
      this.ambulance.add(this.sirenBlue);

      this.ambulance.add(barGroup);
    }

    buildRearDoors() {
      const doorMat = new THREE.MeshStandardMaterial({ color: 0xecf0f5, roughness: 0.2, metalness: 0.2 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a1622, roughness: 0.05, metalness: 0.95, transparent: true, opacity: 0.85 });

      this.doorLeft = new THREE.Group();
      this.doorLeft.position.set(-1.08, 1.52, -2.65);
      const dlMesh = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.74, 0.08), doorMat);
      dlMesh.position.set(0.52, 0, 0);
      this.doorLeft.add(dlMesh);

      const dlWin = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), glassMat);
      dlWin.position.set(0.52, 0.26, -0.045);
      dlWin.rotation.y = Math.PI;
      this.doorLeft.add(dlWin);
      this.ambulance.add(this.doorLeft);

      this.doorRight = new THREE.Group();
      this.doorRight.position.set(1.08, 1.52, -2.65);
      const drMesh = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.74, 0.08), doorMat);
      drMesh.position.set(-0.52, 0, 0);
      this.doorRight.add(drMesh);

      const drWin = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), glassMat);
      drWin.position.set(-0.52, 0.26, -0.045);
      drWin.rotation.y = Math.PI;
      this.doorRight.add(drWin);
      this.ambulance.add(this.doorRight);
    }

    setDoors(open) {
      this.doorsOpen = open;
    }

    setInspection(mode) {
      this.inspectionMode = mode;
      // When user clicks Intake Bay (Mode 1), automatically open rear doors!
      if (mode === 1) {
        this.setDoors(true);
      }
    }

    setProgress(progress, doorOverride) {
      this.chapterProgress = progress;
      if (doorOverride !== undefined && doorOverride !== null) {
        this.doorsOpen = doorOverride;
      }
    }

    setPaused(paused) {
      this.isPaused = paused;
    }

    beginAmbulanceDrag(x, y) {
      this.isDragging = true;
      return true;
    }

    dragAmbulance(deltaX) {
      if (!this.isDragging) return;
      this.targetDragRotation += deltaX * 0.007;
    }

    endAmbulanceDrag() {
      this.isDragging = false;
    }

    bindEvents() {
      window.addEventListener("resize", () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.updateRigPlacement();
      });
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      if (this.isPaused || document.body.classList.contains("simple-view")) return;

      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // Dynamic Rig Centering: Center vehicle during inspection mode (1 or 2); offset to right during mode 0
      const isMobile = window.innerWidth <= 860;
      const targetRigX = (this.inspectionMode !== 0) ? 0.0 : (isMobile ? 0.0 : 1.7);
      this.rigOffset.position.x += (targetRigX - this.rigOffset.position.x) * 0.08;

      // 1. Move road dashes
      const roadSpeed = 26.0;
      this.roadDashes.forEach((d) => {
        d.position.z -= roadSpeed * delta;
        if (d.position.z < -100) d.position.z += 200;
      });

      this.streetPoles.forEach((p) => {
        p.position.z -= roadSpeed * delta;
        if (p.position.z < -90) p.position.z += 180;
      });

      // 2. Rotate wheels
      const wheelRotSpeed = roadSpeed * 2.5;
      this.wheels.forEach((w) => {
        w.rotation.x -= wheelRotSpeed * delta;
      });

      // 3. Strobe lighting
      const strobeTime = (elapsed * 6.5) % 2;
      let redOn = false;
      let blueOn = false;

      if (strobeTime < 0.22 || (strobeTime > 0.38 && strobeTime < 0.6)) {
        redOn = true;
      } else if (strobeTime > 1.0 && (strobeTime < 1.22 || (strobeTime > 1.38 && strobeTime < 1.6))) {
        blueOn = true;
      }

      if (this.sirenRed && this.sirenBlue) {
        this.sirenRed.intensity = redOn ? 5.0 : 0.05;
        this.sirenBlue.intensity = blueOn ? 5.0 : 0.05;

        if (this.strobeMeshes.length === 2) {
          this.strobeMeshes[0].mesh.material.color.setHex(redOn ? this.strobeMeshes[0].onColor : this.strobeMeshes[0].offColor);
          this.strobeMeshes[1].mesh.material.color.setHex(blueOn ? this.strobeMeshes[1].onColor : this.strobeMeshes[1].offColor);
        }
      }

      // 4. Subtle suspension bounce & drag yaw
      this.ambulance.position.y = 0.45 + Math.sin(elapsed * 12) * 0.012;
      this.ambulance.rotation.z = Math.sin(elapsed * 4) * 0.007;

      this.dragRotation += (this.targetDragRotation - this.dragRotation) * 0.1;
      this.ambulance.rotation.y = this.dragRotation;

      // 5. Door animation (Doors swing wide open in Mode 1 or when toggled)
      const targetAngle = this.doorsOpen ? 1.95 : 0.0;
      if (this.doorLeft && this.doorRight) {
        this.doorLeft.rotation.y += (targetAngle - this.doorLeft.rotation.y) * 0.12;
        this.doorRight.rotation.y += (-targetAngle - this.doorRight.rotation.y) * 0.12;
      }

      // 6. Camera smooth tracking
      let targetPos, targetLook;
      if (this.inspectionMode !== 0) {
        targetPos = this.inspectionStops[this.inspectionMode].pos;
        targetLook = this.inspectionStops[this.inspectionMode].target;
      } else {
        const maxIdx = this.cameraStops.length - 1;
        const totalSlides = document.querySelectorAll ? (document.querySelectorAll('.stop').length - 1) : maxIdx;
        const scaledProgress = this.chapterProgress * (maxIdx / Math.max(1, totalSlides));
        const stopIdx = Math.max(0, Math.min(maxIdx - 1, Math.floor(scaledProgress)));
        const nextIdx = Math.min(maxIdx, stopIdx + 1);
        const frac = Math.max(0, Math.min(1, scaledProgress - stopIdx));

        const p1 = this.cameraStops[stopIdx];
        const p2 = this.cameraStops[nextIdx];

        targetPos = new THREE.Vector3().lerpVectors(p1.pos, p2.pos, frac);
        targetLook = new THREE.Vector3().lerpVectors(p1.target, p2.target, frac);
      }

      this.currentCamPos.lerp(targetPos, 0.08);
      this.currentCamTarget.lerp(targetLook, 0.08);

      this.camera.position.copy(this.currentCamPos);
      this.camera.lookAt(this.currentCamTarget);

      this.renderer.render(this.scene, this.camera);
    }
  }

  window.createAmbulanceWorld = () => new AmbulanceWorld();
})();
