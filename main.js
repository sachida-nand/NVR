import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let camera, scene, renderer, reticle, model, hitTestSource, localSpace;

function init() {
  logMessage('Initializing AR...');

  // Set up the scene
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  // WebGL Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Add Light
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // Add Reticle (for surface detection)
  const reticleGeometry = new THREE.RingGeometry(0.05, 0.06, 32).rotateX(-Math.PI / 2);
  const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
  reticle.visible = false;
  scene.add(reticle);

  // Load 3D Model
  const loader = new GLTFLoader();
  loader.load('model.glb', (gltf) => {
    model = gltf.scene;
    model.visible = false;
    scene.add(model);
    logMessage('Model loaded successfully');
  });

  // AR Button
  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test'],
  });
  document.body.appendChild(arButton);

  // Add Resize Listener
  window.addEventListener('resize', onWindowResize);

  // AR Events
  renderer.xr.addEventListener('sessionstart', onSessionStart);
  renderer.xr.addEventListener('sessionend', onSessionEnd);
}

function onSessionStart() {
  logMessage('AR session started.');

  const session = renderer.xr.getSession();
  session.requestReferenceSpace('viewer').then((referenceSpace) => {
    session.requestHitTestSource({ space: referenceSpace }).then((source) => {
      hitTestSource = source;
      logMessage('Hit test source initialized.');
    });
  });

  session.requestReferenceSpace('local').then((space) => {
    localSpace = space;
  });

  renderer.setAnimationLoop(render);
}

function onSessionEnd() {
  logMessage('AR session ended.');
  hitTestSource = null;
  renderer.setAnimationLoop(null);
}

function onWindowResize() {
  logMessage('Window resized.');
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render(_, frame) {
  if (hitTestSource && frame) {
    const hitTestResults = frame.getHitTestResults(hitTestSource);

    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(localSpace);

      reticle.matrix.fromArray(pose.transform.matrix);
      reticle.visible = true;
      logMessage('Surface detected.');
    } else {
      reticle.visible = false;
      logMessage('No surface detected.');
    }
  }

  renderer.render(scene, camera);
}

// Add Model on Reticle
function onSelect() {
  if (reticle.visible && model) {
    model.position.setFromMatrixPosition(reticle.matrix);
    model.visible = true;
    logMessage(`Model placed at position: ${model.position.toArray()}`);
  }
}

// Logging Function
function logMessage(message) {
  const logContainer = document.getElementById('log-container');
  if (logContainer) {
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.appendChild(logEntry);

    // Automatically scroll to the bottom
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}

// Initialize AR
init();

// Add event listener for touch interaction
renderer.xr.getSession()?.addEventListener('select', onSelect);