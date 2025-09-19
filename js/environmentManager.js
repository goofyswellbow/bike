import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// =============================================================================
// ENVIRONMENT MANAGER - Centralized environment and rendering management
// =============================================================================

export class EnvironmentManager {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.loader = new RGBELoader();
        this.gridHelper = null;
        this.axesHelper = null;
    }

    // Initialize renderer with current default settings
    initializeRenderer() {
        // Current renderer settings from sceneManager
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0xffffff);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.localClippingEnabled = true;
    }

    // Load HDR environment with current implementation
    loadEnvironment(hdrTextureURL) {
        this.loader.load(hdrTextureURL, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            // Current behavior - only set environment, not background
            this.scene.environment = texture;
        });
    }

    // Handle window resize for renderer
    handleResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Create and initialize helpers
    createHelpers() {
        this.gridHelper = new THREE.GridHelper(220, 24);
        this.axesHelper = new THREE.AxesHelper(4);
    }

    // Setup environment elements (grid, axes, ground, lighting)
    setupEnvironmentElements() {
        // Create helpers if they don't exist
        if (!this.gridHelper || !this.axesHelper) {
            this.createHelpers();
        }
        // Ground plane (currently disabled)
        const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(planeGeometry, planeMaterial);
        ground.rotation.x = Math.PI / 2;
        //this.scene.add(ground);

        // Lighting (currently disabled)
        //const light = new THREE.DirectionalLight(0xffffff, 1);
        //light.position.set(1, 2, 4);
        //this.scene.add(light);

        // Add helpers
        if (this.gridHelper) this.scene.add(this.gridHelper);
        if (this.axesHelper) this.scene.add(this.axesHelper);
    }

    // Getters for external access
    getRenderer() {
        return this.renderer;
    }

    getScene() {
        return this.scene;
    }
}

