import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// =============================================================================
// CAMERA MANAGER - Centralized camera and controls management
// =============================================================================

export class CameraManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.camera = null;
        this.controls = null;
    }

    // Initialize camera with current default settings
    initializeCamera() {
        this.camera = new THREE.PerspectiveCamera(
            45,                                    // fov
            window.innerWidth / window.innerHeight, // aspect
            0.1,                                   // near
            1000                                   // far
        );
        return this.camera;
    }

    // Initialize orbit controls with current default settings
    initializeControls() {
        if (!this.camera) {
            throw new Error('Camera must be initialized before controls');
        }
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        
        // Set current default position and target
        console.log('BEFORE setting camera:', this.camera.position, this.controls.target);
        
        // Set target first, then position, then update
        this.controls.target.set(4.5, 37, -31);  // Set what camera looks at
        this.camera.position.set(-152.44, 173.48, 108.35);
        this.controls.update();
        
        console.log('AFTER setting camera:', this.camera.position, this.controls.target);
        
        return this.controls;
    }

    // Handle window resize (extract from current implementation)
    handleResize() {
        if (!this.camera) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    // Getters for external access
    getCamera() {
        return this.camera;
    }

    getControls() {
        return this.controls;
    }

    // Get camera position for performance display
    getCameraPosition() {
        if (!this.camera) return { x: 0, y: 0, z: 0 };
        return {
            x: Math.round(this.camera.position.x * 100) / 100,
            y: Math.round(this.camera.position.y * 100) / 100,
            z: Math.round(this.camera.position.z * 100) / 100
        };
    }

    // Get controls target (what camera is looking at)
    getControlsTarget() {
        if (!this.controls) return { x: 0, y: 0, z: 0 };
        return {
            x: Math.round(this.controls.target.x * 100) / 100,
            y: Math.round(this.controls.target.y * 100) / 100,
            z: Math.round(this.controls.target.z * 100) / 100
        };
    }

    // Get complete camera state (position + target + orbit state)
    getCameraState() {
        const state = {
            position: this.getCameraPosition(),
            target: this.getControlsTarget()
        };
        
        // Add OrbitControls internal state for debugging
        if (this.controls) {
            state.azimuthalAngle = Math.round(this.controls.getAzimuthalAngle() * 100) / 100;
            state.polarAngle = Math.round(this.controls.getPolarAngle() * 100) / 100;
            state.distance = Math.round(this.controls.getDistance() * 100) / 100;
        }
        
        return state;
    }

    // Set camera position and target
    setCameraState(position, target) {
        if (!this.camera || !this.controls) return;
        
        this.camera.position.set(position.x, position.y, position.z);
        this.controls.target.set(target.x, target.y, target.z);
        this.controls.update();
    }

    // Create camera position display element
    createPositionDisplay() {
        // Remove existing display if it exists
        const existing = document.getElementById('camera-position-display');
        if (existing) existing.remove();

        // Create new display element
        const displayElement = document.createElement('div');
        displayElement.id = 'camera-position-display';
        displayElement.style.position = 'absolute';
        displayElement.style.bottom = '60px';  // Below FPS display
        displayElement.style.right = '0px';
        displayElement.style.background = 'rgba(0, 0, 0, 0.7)';
        displayElement.style.color = 'white';
        displayElement.style.padding = '8px 12px';
        displayElement.style.fontFamily = 'Courier New, monospace';
        displayElement.style.fontSize = '12px';
        displayElement.style.borderRadius = '4px';
        displayElement.style.zIndex = '1000';
        displayElement.style.pointerEvents = 'none';
        
        document.body.appendChild(displayElement);
        return displayElement;
    }

    // Update camera position display
    updatePositionDisplay() {
        const state = this.getCameraState();
        let displayElement = document.getElementById('camera-position-display');
        
        // Create display if it doesn't exist
        if (!displayElement) {
            displayElement = this.createPositionDisplay();
        }
        
        displayElement.innerHTML = `
            <div>Pos: X: ${state.position.x}, Y: ${state.position.y}, Z: ${state.position.z}</div>
            <div>Target: X: ${state.target.x}, Y: ${state.target.y}, Z: ${state.target.z}</div>
            <div>Angles: Az: ${state.azimuthalAngle || 'N/A'}, Polar: ${state.polarAngle || 'N/A'}</div>
            <div>Distance: ${state.distance || 'N/A'}</div>
        `;
    }
}
