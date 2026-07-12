import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLANETS } from './planets.js';

export class SolarSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000510);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 300;
    this.controls.enablePan = false;

    this.camera.position.set(0, 60, 120);
    this.controls.target.set(0, 0, 0);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.planetMeshes = new Map();
    this.orbitGroups = new Map();
    this.focusedPlanet = null;
    this.paused = false;
    this.speedMultiplier = 1;
    this.clock = new THREE.Clock();
    this.animatingCamera = false;
    this.onPlanetClick = null;

    this._createLights();
    this._createStarfield();
    this._createPlanets();
    this._bindEvents();
    this._resize();
  }

  _createLights() {
    const ambient = new THREE.AmbientLight(0x333344, 0.4);
    this.scene.add(ambient);

    const sunLight = new THREE.PointLight(0xffffff, 3, 500);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);
    this.sunLight = sunLight;
  }

  _createStarfield() {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 400 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, sizeAttenuation: true });
    this.scene.add(new THREE.Points(geo, mat));
  }

  _createPlanets() {
    for (const data of PLANETS) {
      const group = new THREE.Group();
      group.userData.planetId = data.id;

      const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.emissive || 0x000000,
        emissiveIntensity: data.type === 'star' ? 1.5 : 0,
        roughness: data.type === 'star' ? 0.3 : 0.8,
        metalness: data.type === 'star' ? 0 : 0.1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.planetId = data.id;

      if (data.type === 'star') {
        const glowGeo = new THREE.SphereGeometry(data.radius * 1.4, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0xffaa44,
          transparent: true,
          opacity: 0.15,
        });
        group.add(new THREE.Mesh(glowGeo, glowMat));
      }

      if (data.hasRings) {
        const ringGeo = new THREE.RingGeometry(data.radius * 1.4, data.radius * 2.2, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xc9b896,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      }

      group.add(mesh);
      this.planetMeshes.set(data.id, mesh);

      if (data.orbitRadius > 0) {
        const orbitGeo = new THREE.RingGeometry(data.orbitRadius - 0.05, data.orbitRadius + 0.05, 128);
        const orbitMat = new THREE.MeshBasicMaterial({
          color: 0x334466,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.3,
        });
        const orbit = new THREE.Mesh(orbitGeo, orbitMat);
        orbit.rotation.x = Math.PI / 2;
        this.scene.add(orbit);

        const orbitGroup = new THREE.Group();
        orbitGroup.add(group);
        orbitGroup.userData = {
          planetId: data.id,
          orbitRadius: data.orbitRadius,
          orbitSpeed: data.orbitSpeed,
          angle: Math.random() * Math.PI * 2,
        };
        this.orbitGroups.set(data.id, orbitGroup);
        this.scene.add(orbitGroup);
      } else {
        this.scene.add(group);
        this.orbitGroups.set(data.id, group);
      }
    }
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._resize());
    this.canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
  }

  _resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _onPointerDown(event) {
    if (this.animatingCamera) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const meshes = [...this.planetMeshes.values()];
    const hits = this.raycaster.intersectObjects(meshes);
    if (hits.length > 0) {
      const id = hits[0].object.userData.planetId;
      this.focusPlanet(id);
      if (this.onPlanetClick) this.onPlanetClick(id);
    }
  }

  focusPlanet(id) {
    const data = PLANETS.find((p) => p.id === id);
    if (!data) return;

    this.focusedPlanet = id;
    const mesh = this.planetMeshes.get(id);
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);

    const offset = data.radius * 6 + 8;
    const targetCam = worldPos.clone().add(new THREE.Vector3(offset * 0.5, offset * 0.3, offset));
    this._animateCamera(targetCam, worldPos);
  }

  resetView() {
    this.focusedPlanet = null;
    this._animateCamera(new THREE.Vector3(0, 60, 120), new THREE.Vector3(0, 0, 0));
  }

  _animateCamera(targetPos, targetLook) {
    this.animatingCamera = true;
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const duration = 1.2;
    let elapsed = 0;

    const tick = () => {
      elapsed += this.clock.getDelta();
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerpVectors(startTarget, targetLook, ease);

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        this.animatingCamera = false;
      }
    };
    tick();
  }

  setPaused(v) {
    this.paused = v;
  }

  setSpeed(mult) {
    this.speedMultiplier = mult;
  }

  getFocusedPlanet() {
    return this.focusedPlanet;
  }

  update() {
    const dt = this.clock.getDelta();

    if (!this.paused) {
      for (const [, group] of this.orbitGroups) {
        const ud = group.userData;
        if (ud.orbitRadius) {
          ud.angle += ud.orbitSpeed * 0.01 * this.speedMultiplier * dt * 60;
          group.position.x = Math.cos(ud.angle) * ud.orbitRadius;
          group.position.z = Math.sin(ud.angle) * ud.orbitRadius;
        }
        const mesh = this.planetMeshes.get(ud.planetId);
        if (mesh) {
          const data = PLANETS.find((p) => p.id === ud.planetId);
          mesh.rotation.y += (data?.rotationSpeed || 0.01) * this.speedMultiplier * dt * 60;
        }
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
