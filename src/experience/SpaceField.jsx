import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const SPACE_WEATHER = Object.freeze({ start: .70, end: .80, peak: .755 });

export default function SpaceField({ progressRef, pointerRef, reduced, orbitModeRef, timeDilationRef, onWebglError }) {
  const canvasRef = useRef(null);
  const webglErrorHandlerRef = useRef(onWebglError);
  webglErrorHandlerRef.current = onWebglError;

  useEffect(() => {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch {
      webglErrorHandlerRef.current?.();
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 1 : 1.2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .1, 120);
    camera.position.z = .1;
    const layers = [
      { count: innerWidth < 700 ? 260 : 900, min: 50, max: 100, size: .055, opacity: .32 },
      { count: innerWidth < 700 ? 180 : 560, min: 25, max: 50, size: .07, opacity: .22 },
      { count: innerWidth < 700 ? 70 : 220, min: 12, max: 25, size: .09, opacity: .15 },
      { count: innerWidth < 700 ? 45 : 145, min: 6, max: 12, size: .12, opacity: .10 },
    ].map((layer, index) => {
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const colors = [];
      for (let i = 0; i < layer.count; i++) {
        const radius = layer.min + Math.random() * (layer.max - layer.min);
        const angle = Math.random() * Math.PI * 2;
        const z = Math.random() * 2 - 1;
        const ring = Math.sqrt(1 - z * z);
        positions.push(radius * ring * Math.cos(angle), radius * z, radius * ring * Math.sin(angle));
        const brightness = .38 + Math.random() * .5;
        colors.push(brightness * .88, brightness * .96, brightness);
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const points = new THREE.Points(geometry, new THREE.PointsMaterial({
        size: layer.size,
        vertexColors: true,
        transparent: true,
        opacity: layer.opacity,
        sizeAttenuation: true,
        depthWrite: false,
      }));
      points.userData = { baseOpacity: layer.opacity, index };
      scene.add(points);
      return points;
    });

    const dustCount = innerWidth < 700 ? 520 : 1900;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const radius = 8 + Math.random() * 27;
      const angle = Math.random() * Math.PI * 2;
      const z = Math.random() * 2 - 1;
      const ring = Math.sqrt(1 - z * z);
      dustPositions[i * 3] = radius * ring * Math.cos(angle);
      dustPositions[i * 3 + 1] = radius * z;
      dustPositions[i * 3 + 2] = radius * ring * Math.sin(angle);
      const tint = .18 + Math.random() * .2;
      dustColors[i * 3] = tint * .82;
      dustColors[i * 3 + 1] = tint * .93;
      dustColors[i * 3 + 2] = tint;
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
      size: innerWidth < 700 ? .025 : .036, vertexColors: true, transparent: true,
      opacity: 0, sizeAttenuation: true, depthWrite: false,
    }));
    scene.add(dust);

    let disposed = false;
    let raf = 0;
    let last = performance.now();
    let smoothProgress = progressRef.current;
    let pointerX = 0, pointerY = 0;
    let velocity = 0;
    let previousProgress = smoothProgress;
    let slowFrameTime = 0;
    let qualityReduced = false;
    let resizeTimer;
    const resize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!renderer) return;
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 1 : 1.2));
        renderer.setSize(innerWidth, innerHeight);
      }, 80);
    };
    window.addEventListener('resize', resize);
    const render = now => {
      if (disposed) return;
      const dt = Math.min((now - last) / 1000, .05);
      last = now;
      if (!qualityReduced) {
        slowFrameTime = dt > .029 ? slowFrameTime + dt : Math.max(0, slowFrameTime - dt * .45);
        if (slowFrameTime > 1.4) {
          qualityReduced = true;
          renderer.setPixelRatio(1);
          renderer.setSize(innerWidth, innerHeight);
          dust.visible = false;
          layers.slice(-2).forEach(layer => { layer.visible = false; });
        }
      }
      smoothProgress += (progressRef.current - smoothProgress) * (1 - Math.exp(-dt * (reduced ? 2 : 2.7)));
      const progressVelocity = (smoothProgress - previousProgress) / dt;
      previousProgress = smoothProgress;
      velocity += ((reduced ? 0 : clamp(progressVelocity, -1.5, 1.5)) - velocity) * (1 - Math.exp(-dt * 3.6));
      const pointer = reduced ? { x: 0, y: 0 } : pointerRef.current;
      pointerX += (pointer.x - pointerX) * (1 - Math.exp(-dt * 2.4));
      pointerY += (pointer.y - pointerY) * (1 - Math.exp(-dt * 2.4));
      const cameraX = Math.sin(smoothProgress * Math.PI * 2) * .34 + pointerX * .34;
      camera.position.set(cameraX, Math.sin(smoothProgress * Math.PI) * .17 + pointerY * .24, .1);
      camera.lookAt(camera.position.x * .15, camera.position.y * .15, -1);
      camera.fov = 52 + Math.sin(smoothProgress * Math.PI) * 2.5;
      camera.updateProjectionMatrix();
      const night = .35 + smoothProgress * .65;
      const close = Math.exp(-Math.pow((smoothProgress - .49) / .19, 2));
      const departure = clamp((smoothProgress - .74) / .25, 0, 1);
      const spaceWeather = Math.exp(-Math.pow((smoothProgress - SPACE_WEATHER.peak) / .035, 2));
      const timeScale = timeDilationRef.current ? .48 : 1;
      layers.forEach((stars, i) => {
        if (!stars.visible) return;
        const depthDensity = i === 0 ? .72 + departure * .48 : i === 1 ? .82 + departure * .24 : i === 2 ? 1 - close * .48 : .84 + close * .14;
        stars.material.opacity = stars.userData.baseOpacity * night * depthDensity;
        stars.rotation.y = reduced ? 0 : now * (.000003 + i * .000001) * timeScale * (orbitModeRef.current ? .38 : 1) + smoothProgress * .025 + velocity * .004;
        stars.position.x = pointerX * (1.2 + i * 1.6) + velocity * (1 + i * .95) * (orbitModeRef.current ? .45 : 1);
        stars.position.y = pointerY * (1 + i * 1.2);
      });
      const speed = Math.min(1, Math.abs(velocity) / 1.2);
      if (dust.visible) {
        dust.material.opacity = reduced ? 0 : (.025 + speed * .12 + (smoothProgress > SPACE_WEATHER.start && smoothProgress < SPACE_WEATHER.end ? spaceWeather * .045 : 0)) * timeScale;
        dust.material.size = (innerWidth < 700 ? .025 : .036) * (1 + speed * .2);
        dust.position.set(-camera.position.x * .25, -camera.position.y * .25, -1.5);
        dust.rotation.y = reduced ? 0 : now * .000005 * timeScale * (orbitModeRef.current ? .38 : 1) + smoothProgress * .05;
        dust.rotation.x = reduced ? 0 : now * .000002 * timeScale;
        dust.scale.setScalar(1 + speed * .025);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', resize);
      scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
      renderer.dispose();
    };
  }, [pointerRef, progressRef, reduced]);

  return <canvas ref={canvasRef} className="earth-canvas" aria-hidden="true" />;
}
