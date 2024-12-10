import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let camera, scene, renderer, reticle, controller;
let model, hitTestSource, hitTestSourceInitialized = false;

// Initialize Scene
function initScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // Reticle for Surface Detection
  const geometry = new THREE.RingGeometry(0.05, 0.06, 32).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  reticle = new THREE.Mesh(geometry, material);
  reticle.visible = false;
  scene.add(reticle);

  // Load 3D Model
  const loader = new GLTFLoader();
  loader.load('model.glb', (gltf) => {
    model = gltf.scene;
    model.visible = false;
    scene.add(model);
  });

  // Handle Window Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Start AR Session
async function startARSession() {
  try {
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test']
    });

    renderer.xr.setSession(session);

    session.addEventListener('end', () => {
      hitTestSource = null;
      hitTestSourceInitialized = false;
    });

    initializeHitTestSource(session);
    renderer.setAnimationLoop(render);
  } catch (error) {
    console.error('Failed to start AR session:', error);
    alert('Failed to start AR session. Ensure your device and browser support WebXR.');
  }
}

// Initialize Hit Test Source
async function initializeHitTestSource(session) {
  const viewerSpace = await session.requestReferenceSpace('viewer');
  hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  hitTestSourceInitialized = true;
}

// Placement on Surface
function onSelect() {
  if (reticle.visible && model) {
    model.position.setFromMatrixPosition(reticle.matrix);
    model.visible = true;
  }
}

// Render Loop
function render(_, frame) {
  if (!hitTestSourceInitialized || !frame) return;

  const session = renderer.xr.getSession();
  const referenceSpace = renderer.xr.getReferenceSpace();
  const hitTestResults = frame.getHitTestResults(hitTestSource);

  if (hitTestResults.length > 0) {
    const hit = hitTestResults[0];
    const pose = hit.getPose(referenceSpace);
    reticle.matrix.fromArray(pose.transform.matrix);
    reticle.visible = true;
  } else {
    reticle.visible = false;
  }

  renderer.render(scene, camera);
}

// Start AR with Button (for User Activation)
function setupStartARButton() {
  const button = document.createElement('button');
  button.textContent = 'Start AR';
  button.style.position = 'absolute';
  button.style.top = '50%';
  button.style.left = '50%';
  button.style.transform = 'translate(-50%, -50%)';
  button.style.padding = '1em';
  button.style.fontSize = '1.2em';
  button.style.backgroundColor = '#007BFF';
  button.style.color = '#FFF';
  button.style.border = 'none';
  button.style.borderRadius = '5px';
  button.style.cursor = 'pointer';

  button.addEventListener('click', () => {
    startARSession();
    button.remove();
  });

  document.body.appendChild(button);
}

// Initialize
if (navigator.xr) {
  initScene();
  setupStartARButton();
} else {
  console.error('WebXR not supported on this device/browser.');
}
