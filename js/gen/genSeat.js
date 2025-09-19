// genSeat.js
import * as THREE from 'three';
import { componentRegistry } from '../registry.js';
import { createComponentMaterial } from '../materials.js';



// --- Seat  ---

export function createSeatGeometry(seat, seatUnder, seatColor = 0x0f2b87) {
    const seatGroup = new THREE.Group();
    seatGroup.userData.componentType = 'seat';
    
    const seatMaterial = createComponentMaterial('seat', { color: seatColor });
    const seatUnderMaterial = createComponentMaterial('seatUnder');
    
    // Create main seat and add to group
    if (seat) {
        const seatMesh = new THREE.Mesh(seat, seatMaterial);
        seatMesh.userData.componentType = 'seatMain'; // Tag for identification
        seatGroup.add(seatMesh);
    }
    
    // Create under seat and add to group
    if (seatUnder) {
        const seatUnderMesh = new THREE.Mesh(seatUnder, seatUnderMaterial);
        seatUnderMesh.userData.componentType = 'seatUnder'; // Tag for identification
        seatGroup.add(seatUnderMesh);
    }
    
    return seatGroup;
}

export function positionSeat(seatGroup, geometry, params) {
    const { points } = geometry;
    
    // Position at Z_end
    seatGroup.position.copy(points.Z_end);
    
    // Calculate direction vector from Z_end to B_start for tangent alignment
    const direction = new THREE.Vector3().subVectors(points.B_start, points.Z_end).normalize();
    
    // Instead of lookAt, use quaternion rotation to avoid flips
    // Create rotation from up vector to seat tube direction
    const upVector = new THREE.Vector3(-1, 0, 0);
    const rotationQuaternion = new THREE.Quaternion();
    
    rotationQuaternion.setFromUnitVectors(upVector, direction);
    // Apply the rotation
    seatGroup.quaternion.copy(rotationQuaternion);
    
    // Correct the rotation
    const zRotation = new THREE.Quaternion();
    zRotation.setFromEuler(new THREE.Euler( 0, 0, -Math.PI/2, 'XYZ'));

    // Create seat rotation quaternion based on params.Z_angle
    const seatAngleRad = params.Z_angle * (Math.PI / 180); // Convert to radians
    const seatRotation = new THREE.Quaternion();
    seatRotation.setFromEuler(new THREE.Euler(0, 0, seatAngleRad, 'XYZ'));
    
    // Apply base orientation first, then Z angle rotation
    seatGroup.quaternion.multiply(seatRotation);
    seatGroup.quaternion.multiply(zRotation);
    
    return seatGroup;
}

export function genSeat(geometry, scene, seat, seatUnder) {
    // First create the geometry
    const seatGroup = createSeatGeometry(seat, seatUnder, geometry.params.seatColor);
    
    // Then position it
    positionSeat(seatGroup, geometry, geometry.params);
    
    // Register in registry
    componentRegistry.seat = seatGroup;
    
    // Add to scene directly for now - we'll use groups later
    scene.add(seatGroup);
    
    return seatGroup;
}



// --- Seat Post ---

export function createSeatPostGeometry(seatPost, seatPostColor) {
    if (!seatPost) return null;
    
    const seatPostMaterial = createComponentMaterial('seatPost', { color: seatPostColor });
    
    // Create the seat post mesh with material
    const mesh = new THREE.Mesh(seatPost, seatPostMaterial);
    
    // Tag for identification
    mesh.userData.componentType = 'seatPost';
    
    return mesh;
}

export function positionSeatPost(seatPostMesh, geometry, params) {
    if (!seatPostMesh) return null;
    
    const { points } = geometry;
    
    // Calculate direction vector from B_end to Z_end (seat post direction)
    const direction = new THREE.Vector3()
        .subVectors(points.B_end, points.Z_end)
        .normalize();
    
    // Position at Z_end (where seat is attached)
    seatPostMesh.position.copy(points.Z_end);
    
    // Create a target point for lookAt
    const targetPoint = new THREE.Vector3().subVectors(points.Z_end, direction);
    
    // Store current position before lookAt
    const currentPosition = seatPostMesh.position.clone();
    
    // Orient using lookAt
    seatPostMesh.lookAt(targetPoint);
    
    // Apply additional rotation to align with model's base orientation
    // Create quaternion for Y and Z rotations
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(0, Math.PI/2, Math.PI/2, 'XYZ'));
    seatPostMesh.quaternion.multiply(quaternion);
    
    // Restore position (lookAt might have changed it)
    seatPostMesh.position.copy(currentPosition);
    
    // Scale
    const SEAT_POST_SCALE = 1.0;
    seatPostMesh.scale.set(SEAT_POST_SCALE, SEAT_POST_SCALE, SEAT_POST_SCALE);
    
    return seatPostMesh;
}

export function genSeatPost(geometry, scene, seatPost) {
    // First create the geometry
    const seatPostMesh = createSeatPostGeometry(seatPost, geometry.params.seatPostColor);
    
    if (!seatPostMesh) return null;
    
    // Then position it
    positionSeatPost(seatPostMesh, geometry, geometry.params);
    
    // Register in registry
    componentRegistry.seatPost = seatPostMesh;
    
    // Add to scene directly for now
    scene.add(seatPostMesh);
    
    return seatPostMesh;
}




// --- Seat Clamp ---

function createSeatClampMesh(seatClampBaseGeometry, seatClampColor) {
    if (!seatClampBaseGeometry) return null;

    const seatClampMaterial = createComponentMaterial('seatClamp', { color: seatClampColor });

    // Create seat clamp mesh
    const mesh = new THREE.Mesh(seatClampBaseGeometry, seatClampMaterial);
    // Add identification tag
    mesh.userData.componentType = 'seatClamp';

    return mesh;
}

export function positionSeatClamp(seatClampMesh, geometry) {
    const { points } = geometry;
    const SEAT_CLAMP = {
        SCALE: 1.0,     // Adjust this to change seat clamp size
        TANGENT_OFFSET: -2.0     // Offset along the tangent
    };

    if (!seatClampMesh) return null;

    // Reset transformations
    seatClampMesh.position.set(0, 0, 0);
    seatClampMesh.rotation.set(0, 0, 0);
    seatClampMesh.scale.set(1, 1, 1);

    // Calculate direction vector from B_start to B_end (used for offset and orientation)
    const direction = new THREE.Vector3()
        .subVectors(points.B_start, points.B_end) // Direction points from B_end towards B_start
        .normalize();

    // Position at B_end first
    seatClampMesh.position.copy(points.B_end);

    // Apply offset along the calculated direction
    const offsetVector = direction.clone().multiplyScalar(SEAT_CLAMP.TANGENT_OFFSET);
    seatClampMesh.position.add(offsetVector);

    // Orient using quaternion to align with the B_start to B_end tangent
    const orientationDirection = direction; // Use the same direction calculated above
    const upVector = new THREE.Vector3(0, 1, 0); // Standard up vector
    const quaternion = new THREE.Quaternion();

    quaternion.setFromUnitVectors(upVector, orientationDirection);
    seatClampMesh.setRotationFromQuaternion(quaternion);

    // Apply scale
    seatClampMesh.scale.set(SEAT_CLAMP.SCALE, SEAT_CLAMP.SCALE, SEAT_CLAMP.SCALE);
}

export function genSeatClamp(geometry, scene, seatClampBaseGeometry) {
    // Create the mesh
    const mesh = createSeatClampMesh(seatClampBaseGeometry, geometry.params.seatClampColor);
    if (!mesh) return null;

    // Position the mesh
    positionSeatClamp(mesh, geometry);

    // Register and add to scene
    componentRegistry.seatClamp = mesh; // Register component
    scene.add(mesh); // Add directly to scene for now

    return mesh;
}


