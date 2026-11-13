/**
 * Premium 3D Emergency Rig Engine using Three.js
 * High-tech cinematic emergency response vehicle with aerodynamic body styling,
 * glowing cyber-LED lightbars, headlight beams, asphalt reflection, and interior lab.
 */

(function () {
  const THREE = window.THREE;
  if (!THREE) {
    console.error("Three.js not loaded");
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
      this.inspectionMode = 0;
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

      this.inspectionStops = [
        { pos: new THREE.Vector3(4.8, 2.6, 7.8), target: new THREE.Vector3(1.2, 0.9, 0.0) },      // 0: Whole
        { pos: new THREE.Vector3(1.2, 1.6, -3.8), target: new THREE.Vector3(1.2, 1.2, 0.6) },     // 1: Inside Tech Bay
        { pos: new THREE.Vector3(1.2, 1.45, 1.2), target: new THREE.Vector3(1.2, 1.4, 5.0) }      // 2: Driver HUD
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
      // On desktop, keep rig on the right (+1.5m to +2.0m) to give room for slides on left
      const isMobile = window.innerWidth <= 860;
      this.rigOffset.position.x = isMobile ? 0.0 : 1.7;
    }

    initScene() {
      this.scene.fog = new THREE.FogExp2(0x071520, 0.026);

      this.ambientLight = new THREE.AmbientLight(0x7eb5d6, 0.8);
      this.scene.add(this.ambientLight);

      this.sunLight = new THREE.DirectionalLight(0xfff1db, 1.6);
      this.sunLight.position.set(10, 16, 12);
      this.scene.add(this.sunLight);

      // Cyan fill light from ground/sky
      const cyanFill = new THREE.DirectionalLight(0x00d2ff, 0.45);
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

    buildAmbulance() {
      // High-grade materials
      const bodyWhite = new THREE.MeshStandardMaterial({
        color: 0xecf0f5,
        roughness: 0.2,
        metalness: 0.2
      });
      const carbonDark = new THREE.MeshStandardMaterial({
        color: 0x161d26,
        roughness: 0.45,
        metalness: 0.65
      });
      const emergencyRed = new THREE.MeshStandardMaterial({
        color: 0xff2a44,
        roughness: 0.25,
        metalness: 0.1,
        emissive: 0x440810
      });
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x0a1622,
        roughness: 0.05,
        metalness: 0.95,
        transparent: true,
        opacity: 0.85
      });
      const neonCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

      // 1. Sleek Aerodynamic Cab
      const cabGroup = new THREE.Group();
      cabGroup.position.set(0, 0, 0);

      // Main Cab Body
      const cabGeo = new THREE.BoxGeometry(2.05, 1.4, 1.8);
      const cab = new THREE.Mesh(cabGeo, bodyWhite);
      cab.position.set(0, 1.25, 1.6);
      cabGroup.add(cab);

      // Slanted Aerodynamic Hood
      const hoodGeo = new THREE.BoxGeometry(1.98, 0.62, 1.25);
      const hood = new THREE.Mesh(hoodGeo, bodyWhite);
      hood.position.set(0, 0.86, 2.95);
      cabGroup.add(hood);

      // Curved Dark Windshield
      const windshieldGeo = new THREE.PlaneGeometry(1.82, 0.92);
      const windshield = new THREE.Mesh(windshieldGeo, glassMat);
      windshield.position.set(0, 1.5, 2.51);
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
      const grilleGeo = new THREE.BoxGeometry(1.65, 0.42, 0.12);
      const grille = new THREE.Mesh(grilleGeo, carbonDark);
      grille.position.set(0, 0.72, 3.58);
      cabGroup.add(grille);

      // Cyber Matrix Headlights
      const headLGeo = new THREE.BoxGeometry(0.35, 0.16, 0.08);
      const leftHead = new THREE.Mesh(headLGeo, neonCyan);
      leftHead.position.set(-0.7, 0.85, 3.57);
      cabGroup.add(leftHead);

      const rightHead = new THREE.Mesh(headLGeo, neonCyan);
      rightHead.position.set(0.7, 0.85, 3.57);
      cabGroup.add(rightHead);

      // Headlight Spotlights on Road
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

      this.ambulance.add(cabGroup);

      // 2. Rear Modular Trauma Box (Tech Rig)
      const boxGroup = new THREE.Group();
      boxGroup.position.set(0, 0, 0);

      const boxGeo = new THREE.BoxGeometry(2.2, 1.8, 3.5);
      const box = new THREE.Mesh(boxGeo, bodyWhite);
      box.position.set(0, 1.52, -0.9);
      boxGroup.add(box);

      // Modern Cyber Emergency Chevron Stripe along body sides
      const stripeGeo = new THREE.PlaneGeometry(3.48, 0.28);
      const leftStripe = new THREE.Mesh(stripeGeo, emergencyRed);
      leftStripe.position.set(-1.11, 1.4, -0.9);
      leftStripe.rotation.y = -Math.PI / 2;
      boxGroup.add(leftStripe);

      const rightStripe = new THREE.Mesh(stripeGeo, emergencyRed);
      rightStripe.position.set(1.11, 1.4, -0.9);
      rightStripe.rotation.y = Math.PI / 2;
      boxGroup.add(rightStripe);

      // Glowing Neon Accent Stripe (Google Blue)
      const neonStripeMat = new THREE.MeshBasicMaterial({ color: 0x4285f4 });
      const neonStripeGeo = new THREE.PlaneGeometry(3.48, 0.05);

      const leftNeon = new THREE.Mesh(neonStripeGeo, neonStripeMat);
      leftNeon.position.set(-1.115, 1.22, -0.9);
      leftNeon.rotation.y = -Math.PI / 2;
      boxGroup.add(leftNeon);

      const rightNeon = new THREE.Mesh(neonStripeGeo, neonStripeMat);
      rightNeon.position.set(1.115, 1.22, -0.9);
      rightNeon.rotation.y = Math.PI / 2;
      boxGroup.add(rightNeon);

      // High-tech Red Cross on Sides
      const crossMat = new THREE.MeshBasicMaterial({ color: 0xff334b });
      const cH = new THREE.BoxGeometry(0.12, 0.48, 0.02);
      const cV = new THREE.BoxGeometry(0.48, 0.12, 0.02);

      const crossL = new THREE.Group();
      crossL.add(new THREE.Mesh(cH, crossMat));
      crossL.add(new THREE.Mesh(cV, crossMat));
      crossL.position.set(-1.12, 1.85, -0.9);
      crossL.rotation.y = -Math.PI / 2;
      boxGroup.add(crossL);

      const crossR = crossL.clone();
      crossR.position.set(1.12, 1.85, -0.9);
      crossR.rotation.y = Math.PI / 2;
      boxGroup.add(crossR);

      this.ambulance.add(boxGroup);

      // 3. Wheels & High-Tech Rims
      this.buildWheels();

      // 4. Ultra-Bright Emergency Strobe Lightbar
      this.buildCyberLightbar();

      // 5. Interior Workstation (Dual Coding Screens & Gurney)
      this.buildInteriorTechBay();

      // 6. Interactive Rear Doors
      this.buildRearDoors();

      this.ambulance.position.y = 0.45;
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

    buildInteriorTechBay() {
      const interior = new THREE.Group();
      interior.position.set(0, 0.72, -1.0);

      // Workstation desk / Gurney
      const deskMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.7, roughness: 0.3 });
      const desk = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 1.9), deskMat);
      desk.position.set(0.42, 0.4, 0);
      interior.add(desk);

      // Glowing Code Monitor (Gemini Live API Intake)
      const codeMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
      const codeScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.44), codeMat);
      codeScreen.position.set(0.42, 0.98, -0.3);
      codeScreen.rotation.y = Math.PI;
      interior.add(codeScreen);

      // Vitals Oscilloscope Screen
      const vitalsMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      const vitalsScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.44), vitalsMat);
      vitalsScreen.position.set(0.42, 0.98, 0.45);
      vitalsScreen.rotation.y = Math.PI;
      interior.add(vitalsScreen);

      // Server rack
      const rackMat = new THREE.MeshStandardMaterial({ color: 0x0d131a, metalness: 0.9 });
      const rack = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.45, 0.75), rackMat);
      rack.position.set(-0.62, 0.75, 0.2);
      interior.add(rack);

      const intLight = new THREE.PointLight(0x38bdf8, 1.6, 7);
      intLight.position.set(0, 1.65, 0);
      interior.add(intLight);

      this.ambulance.add(interior);
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
      if (mode === 1) this.setDoors(true);
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

      // 5. Door animation
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
        const scaledProgress = this.chapterProgress * (maxIdx / Math.max(1, (document.querySelectorAll ? (document.querySelectorAll('.stop').length - 1) : maxIdx)));
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
