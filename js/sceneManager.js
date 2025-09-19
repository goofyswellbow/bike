import * as THREE from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CameraManager } from './cameraManager.js';
import { EnvironmentManager } from './environmentManager.js';

// =============================================================================
// SCENE MANAGEMENT FUNCTIONS
// =============================================================================

// Scene Management
function clearScene(scene) {
    while(scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
}

// Helper function for thorough THREE.js object cleanup
function cleanupObject(object) {
    if (!object) return;
    
    console.log("Cleaning up object:", object);
    
    // Remove from parent/scene
    if (object.parent) {
        object.parent.remove(object);
    }
    
    // Handle children (make a copy of the array first to avoid modification issues)
    if (object.children && object.children.length > 0) {
        const childrenCopy = [...object.children];
        childrenCopy.forEach(child => {
            cleanupObject(child);
        });
    }
    
    // Dispose of geometries and materials
    if (object.geometry) {
        console.log("Disposing geometry");
        object.geometry.dispose();
    }
    
    if (object.material) {
        console.log("Disposing material(s)");
        if (Array.isArray(object.material)) {
            object.material.forEach(mat => {
                if (mat.map) mat.map.dispose();
                mat.dispose();
            });
        } else {
            if (object.material.map) object.material.map.dispose();
            object.material.dispose();
        }
    }
}

// Find and remove objects of a specific type from the scene
function removeObjectsByType(scene, componentType) {
    // Find all objects of the given type
    const objectsToRemove = [];
    scene.traverse(object => {
        if (object.userData && object.userData.componentType === componentType) {
            objectsToRemove.push(object);
        }
    });
    
    // Remove and clean up the found objects
    objectsToRemove.forEach(object => {
        console.log(`Removing ${componentType} from scene`);
        cleanupObject(object);
    });
    
    return objectsToRemove.length > 0;
}


// =============================================================================
// SCENE INITIALIZATION - Complete scene setup
// =============================================================================

// Initialize complete scene with all components
function initScene() {
    // Setup WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        stencil: true  // Explicitly enable stencil buffer
    });
    document.body.appendChild(renderer.domElement);

    // Create CSS2D renderer for labels
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(labelRenderer.domElement);

    // Create scene
    const scene = new THREE.Scene();
    
    // Initialize managers
    const cameraManager = new CameraManager(renderer);
    const environmentManager = new EnvironmentManager(scene, renderer);
    
    // Initialize camera and controls using manager
    cameraManager.initializeCamera();
    cameraManager.initializeControls();
    
    // Initialize renderer settings using manager
    environmentManager.initializeRenderer();

    return {
        renderer,
        labelRenderer,
        scene,
        cameraManager,
        environmentManager
    };
}

// Window resize handler - uses managers only
function handleResize(camera, renderer, labelRenderer, cameraManager = null, environmentManager = null) {
    // Use managers if provided, otherwise fall back to direct objects for backward compatibility
    if (cameraManager) {
        cameraManager.handleResize();
    } else if (camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
    
    if (environmentManager) {
        environmentManager.handleResize();
    } else if (renderer) {
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}


// =============================================================================
// GUIDE MANAGEMENT
// =============================================================================

// Update guides (skeleton and point names) in the scene
function updateGuides(geometry, scene, params, drawTotalBikeSkeleton, drawPointNames) {
    // Remove existing guides first to prevent accumulation
    const guidesToRemove = [];
    scene.traverse((child) => {
        // Remove guide objects based on userData flag
        if (child.userData && child.userData.isGuideObject) {
            guidesToRemove.push(child);
        }
    });
    guidesToRemove.forEach(guide => scene.remove(guide));

    // Redraw guides with fresh geometry if enabled
    if (params.showGuides) {
        drawTotalBikeSkeleton(geometry, scene, params.showGuides);
    }
    if (params.showPointNames) {
        drawPointNames(geometry, scene, params.showPointNames);
    }
}


// =============================================================================
// EXPORTS
// =============================================================================
export { 
    initScene,
    handleResize,
    clearScene,
    cleanupObject,
    removeObjectsByType,
    updateGuides
};