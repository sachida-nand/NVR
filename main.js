import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let camera, scene, renderer, reticle, model, hitTestSource, localSpace;

function init() {
  console.log('Initializing AR...');

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

  // Add Reticle
  const reticleGeometry = new THREE.RingGeometry(0.1, 0.12, 32).rotateX(-Math.PI / 2);
  const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
  reticle.visible = false;
  scene.add(reticle);

  // Load 3D Model
  const loader = new GLTFLoader();
  loader.load('model.glb', (gltf) => {
    model = gltf.scene;
    model.visible = false;
    model.scale.set(0.1, 0.1, 0.1); // Adjust scale as needed
    scene.add(model);
    console.log('Model loaded successfully');
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
  console.log('AR session started.');

  const session = renderer.xr.getSession();
  session.requestReferenceSpace('viewer').then((referenceSpace) => {
    session.requestHitTestSource({ space: referenceSpace }).then((source) => {
      hitTestSource = source;
      console.log('Hit test source initialized.');
    });
  });

  session.requestReferenceSpace('local').then((space) => {
    localSpace = space;
  });

  renderer.setAnimationLoop(render);
}

function onSessionEnd() {
  console.log('AR session ended.');
  hitTestSource = null;
  renderer.setAnimationLoop(null);
}

function onWindowResize() {
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

      // Update reticle position and orientation
      reticle.matrix.fromArray(pose.transform.matrix);
      reticle.visible = true;

      // If the reticle is visible, attempt to place the model
      if (model) {
        model.position.setFromMatrixPosition(reticle.matrix);
        model.quaternion.setFromRotationMatrix(reticle.matrix);
        model.visible = true;
      }
    } else {
      reticle.visible = false;
    }
  }

  // Render the scene
  renderer.render(scene, camera);
}

// Initialize AR
init();
