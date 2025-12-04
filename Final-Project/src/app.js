/**
 * app.js
 *
 * This is the first file loaded. It sets up the Renderer,
 * Scene and Camera. It also starts the render loop and
 * handles window resizes.
 *
 */
import 'regenerator-runtime/runtime';
import { WebGLRenderer, PerspectiveCamera, Vector3, Vector2, ACESFilmicToneMapping, sRGBEncoding, PCFSoftShadowMap } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { DrivingScene } from 'scenes';

// Initialize core ThreeJS components
const scene = new DrivingScene();
const camera = new PerspectiveCamera();
const renderer = new WebGLRenderer({ antialias: true });
const usePost = false; // set true to enable bloom/SMAA

// Set up camera
camera.position.set(0, 3, 8);
camera.lookAt(new Vector3(0, 0.5, 0));

// Set up renderer, canvas, and minor CSS adjustments
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
// Shadows off for performance
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputEncoding = sRGBEncoding;
const canvas = renderer.domElement;
canvas.style.display = 'block'; // Removes padding below canvas
document.body.style.margin = 0; // Removes margin around page
document.body.style.overflow = 'hidden'; // Fix scrolling
document.body.appendChild(canvas);

let composer = null;
if (usePost) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 0.25, 0.2, 0.9);
    composer.addPass(bloomPass);
}

// Render loop
const onAnimationFrameHandler = (timeStamp) => {
    scene.update && scene.update(timeStamp, camera);
    if (usePost && composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
    window.requestAnimationFrame(onAnimationFrameHandler);
};
window.requestAnimationFrame(onAnimationFrameHandler);

// Resize Handler
const windowResizeHandler = () => {
    const { innerHeight, innerWidth } = window;
    renderer.setSize(innerWidth, innerHeight);
    if (usePost && composer) composer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
};
windowResizeHandler();
window.addEventListener('resize', windowResizeHandler, false);
