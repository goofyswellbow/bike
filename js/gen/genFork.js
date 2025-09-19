console.log('Loading genFork.js...');
import * as THREE from 'three';
import * as Constants from '../constants.js';
import { addLine, createBeveledPoint, createTaperedTube, mirrorGeometryX, mirrorGeometryZ } from './genUtil.js';
import { componentRegistry } from '../registry.js';
import { createComponentMaterial } from '../materials.js';






// --- Fork Assembly (Revised for Local Geometry - Corrected Position) ---

function createForkLeftGeometry(geometry) {
    const { points, rotations } = geometry;
    const { moveD_end, forkElbow, F_end_fork, forkBase, F_end } = points;
    const forkMember = Constants.FORK_MEMBERS.leftFork;
    if (!forkMember || !forkMember.params) { 
        console.error("Fork parameters missing."); 
        return null; 
    }
    const { params } = forkMember;
    
    if (!moveD_end || !forkElbow || !F_end_fork || !forkBase || !F_end) { 
        console.error("Required points missing."); 
        return null; 
    }

    // Store the bike's total rotation at creation time
    const bikeRotation = rotations?.total || 0;

    // 1. Create a rotation matrix to undo the bike's rotation
    // This gets our points into "standard orientation"
    const inverseRotation = new THREE.Matrix4().makeRotationZ(-bikeRotation);
    
    // 2. Create temporary points that have the bike rotation removed
    // First make them relative to F_end, then remove rotation
    const standard_F_end = new THREE.Vector3(0, 0, 0); // Origin in standard orientation
    const standard_moveD_end = moveD_end.clone().sub(F_end).applyMatrix4(inverseRotation);
    const standard_forkElbow = forkElbow.clone().sub(F_end).applyMatrix4(inverseRotation);
    const standard_F_end_fork = F_end_fork.clone().sub(F_end).applyMatrix4(inverseRotation);
    const standard_forkBase = forkBase.clone().sub(F_end).applyMatrix4(inverseRotation);

    // 3. Create geometry using these standard orientation points
    const beveledPoints = createBeveledPoint(
        standard_moveD_end, 
        standard_forkElbow, 
        standard_F_end_fork, 
        { 
            bevelDistance: params.bevelDistance, 
            bevelDivisions: params.bevelDivisions 
        }
    );
    
    const curvePoints = [
        standard_moveD_end, 
        ...beveledPoints, 
        standard_F_end_fork, 
        standard_forkBase
    ];
    
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'centripetal');
    const tubeGeometry = createTaperedTube(curve, { 
        baseRadius: params.baseRadius, 
        endRadius: params.endRadius, 
        startTaper: params.startTaper, 
        endTaper: params.endTaper, 
        segments: params.segments || 64, 
        radialSegments: params.radialSegments || 8 
    });
    
    // 4. Store rotation information with the geometry
    tubeGeometry.userData = {
        standardOrientation: true,
        creationRotation: bikeRotation
    };
    
    return tubeGeometry;
}

function createForkMeshes(leftForkGeometry, forkColor = 0x800080) {
    if (!leftForkGeometry) return { leftForkMesh: null, rightForkMesh: null };
    
    const material = createComponentMaterial('forkAssembly', { color: forkColor });
    
    // Create left fork mesh
    const leftForkMesh = new THREE.Mesh(leftForkGeometry, material.clone());
    leftForkMesh.userData.componentType = 'forkLeft';
    
    // Create mirrored geometry for right fork
    const mirroredGeometry = leftForkGeometry.clone();
    
    // Mirror Z coordinates
    const positions = mirroredGeometry.attributes.position.array; 
    for (let i = 0; i < positions.length; i += 3) { 
        positions[i + 2] = -positions[i + 2]; 
    }
    
    // Fix normals
    if (mirroredGeometry.attributes.normal) { 
        const normals = mirroredGeometry.attributes.normal.array; 
        for (let i = 0; i < normals.length; i += 3) { 
            normals[i + 2] = -normals[i + 2]; 
        } 
    }
    
    // Fix face winding order
    if (mirroredGeometry.index) { 
        const indices = mirroredGeometry.index.array; 
        const newIndices = new Uint32Array(indices.length); 
        for (let i = 0; i < indices.length; i += 3) { 
            newIndices[i] = indices[i];
            newIndices[i + 1] = indices[i + 2]; 
            newIndices[i + 2] = indices[i + 1]; 
        } 
        mirroredGeometry.setIndex(new THREE.BufferAttribute(newIndices, 1)); 
    }
    
    // Update geometry
    mirroredGeometry.attributes.position.needsUpdate = true; 
    if (mirroredGeometry.attributes.normal) { 
        mirroredGeometry.attributes.normal.needsUpdate = true; 
    } 
    mirroredGeometry.computeVertexNormals();
    
    // Copy userData (including standard orientation info)
    mirroredGeometry.userData = JSON.parse(JSON.stringify(leftForkGeometry.userData));
    
    // Create right fork mesh
    const rightForkMesh = new THREE.Mesh(mirroredGeometry, material.clone());
    rightForkMesh.userData.componentType = 'forkRight';
    
    return { leftForkMesh, rightForkMesh };
}

export function positionForkAssembly(forkGroup, geometry) {
    const { points, rotations } = geometry;
    
    if (!forkGroup) return false;

    // Reset group transformations
    forkGroup.position.set(0, 0, 0);
    forkGroup.rotation.set(0, 0, 0);
    forkGroup.scale.set(1, 1, 1);

    // Position the group at F_end
    forkGroup.position.copy(points.F_end);
    
    // Apply the bike's total rotation
    if (rotations && typeof rotations.total === 'number') {
        forkGroup.rotation.z = rotations.total;
    }
    
    // Create new fork geometry based on updated points
    const leftForkGeometry = createForkLeftGeometry(geometry);
    if (!leftForkGeometry) return false;
    
    // Update the mesh geometries in the group
    const leftForkMesh = forkGroup.children.find(child => 
        child.userData.componentType === 'forkLeft');
    const rightForkMesh = forkGroup.children.find(child => 
        child.userData.componentType === 'forkRight');
    
    if (leftForkMesh && rightForkMesh) {
        // Dispose old geometries
        if (leftForkMesh.geometry) leftForkMesh.geometry.dispose();
        if (rightForkMesh.geometry) rightForkMesh.geometry.dispose();
        
        // Update left fork geometry
        leftForkMesh.geometry = leftForkGeometry;
        
        // Create mirrored geometry for right fork
        const mirroredGeometry = leftForkGeometry.clone();
        const positions = mirroredGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] = -positions[i + 2]; // Mirror Z
        }
        
        // Fix normals
        if (mirroredGeometry.attributes.normal) {
            const normals = mirroredGeometry.attributes.normal.array;
            for (let i = 0; i < normals.length; i += 3) {
                normals[i + 2] = -normals[i + 2];
            }
        }
        
        // Fix face winding order
        if (mirroredGeometry.index) {
            const indices = mirroredGeometry.index.array;
            const newIndices = new Uint32Array(indices.length);
            for (let i = 0; i < indices.length; i += 3) {
                newIndices[i] = indices[i];
                newIndices[i + 1] = indices[i + 2];
                newIndices[i + 2] = indices[i + 1];
            }
            mirroredGeometry.setIndex(new THREE.BufferAttribute(newIndices, 1));
        }
        
        mirroredGeometry.attributes.position.needsUpdate = true;
        if (mirroredGeometry.attributes.normal) {
            mirroredGeometry.attributes.normal.needsUpdate = true;
        }
        mirroredGeometry.computeVertexNormals();
        
        // Update right fork geometry
        rightForkMesh.geometry = mirroredGeometry;
    }
    
    return true;
}

export function genForkGeo(geometry, scene) {
    // 1. Create geometry data (now in standard orientation)
    const leftForkGeometry = createForkLeftGeometry(geometry);
    if (!leftForkGeometry) { 
        if(componentRegistry.forkAssembly) delete componentRegistry.forkAssembly; 
        return null; 
    }
    
    // 2. Create meshes (with standard orientation info preserved)
    const meshes = createForkMeshes(leftForkGeometry, geometry.params.forkColor);
    if (!meshes.leftForkMesh || !meshes.rightForkMesh) { 
        if(componentRegistry.forkAssembly) delete componentRegistry.forkAssembly; 
        return null; 
    }

    // 3. Create and setup the fork group
    const forkGroup = new THREE.Group();
    forkGroup.userData.componentType = 'forkAssembly';
    
    // Store standard orientation info in the group
    if (leftForkGeometry.userData && leftForkGeometry.userData.standardOrientation) {
        forkGroup.userData.standardOrientation = true;
        forkGroup.userData.creationRotation = leftForkGeometry.userData.creationRotation;
    }
    
    // Add meshes to the group
    forkGroup.add(meshes.leftForkMesh);
    forkGroup.add(meshes.rightForkMesh);

    // 4. Position the fork assembly (now applying rotation)
    positionForkAssembly(forkGroup, geometry);

    // 5. Register and add to scene
    componentRegistry.forkAssembly = forkGroup;
    scene.add(forkGroup);
    
    return forkGroup;
}




// --- Fork Steer Tube ---

function createSteerTubeGeometry(geometry) {
    const { points } = geometry;
    // Get steer tube parameters from Constants
    const steerTubeMember = Constants.FORK_MEMBERS.steerTube; // Assuming constants are loaded
    if (!steerTubeMember || !steerTubeMember.params) {
        console.error("Steer tube parameters not found in Constants.");
        return null;
    }
    const { params } = steerTubeMember;

    // Check if points exist
     if (!points.F_end || !points.moveD_end) { // Points needed to calculate length
        console.error("Required points F_end or moveD_end missing for steer tube geometry.");
        return null;
    }

    // Calculate total length including extension
    // This depends on the distance between F_end and moveD_end
    const baseLength = points.F_end.distanceTo(points.moveD_end);
    const length = baseLength + params.extension;

     // Validate calculated length
     if (length <= 0) {
         console.error(`Invalid steer tube length calculated: ${length}`);
         return null;
     }

    // Create cylinder geometry (default Y-axis alignment)
    const cylinderGeometry = new THREE.CylinderGeometry(
        params.radius,      // radiusTop
        params.radius,      // radiusBottom
        length,             // height (calculated)
        params.segments || 32 // radialSegments (provide default)
    );

    return cylinderGeometry;
}

function createSteerTubeMesh(steerTubeGeometry, forkColor = 0x800080) {
     if (!steerTubeGeometry) return null;

     const material = createComponentMaterial('steerTube', { color: forkColor });

    const steerTubeMesh = new THREE.Mesh(steerTubeGeometry, material);
    steerTubeMesh.userData.componentType = 'steerTube'; // Tag

    return steerTubeMesh;
}

export function positionSteerTube(steerTubeMesh, geometry) {
     const { points } = geometry;
     // Get params again for extension value needed for midpoint calculation
     const steerTubeMember = Constants.FORK_MEMBERS.steerTube;
     if (!steerTubeMember || !steerTubeMember.params || !steerTubeMesh) {
         return; // Cannot position if params or mesh missing
     }
      const { params } = steerTubeMember;

      if (!points.F_end || !points.moveD_end || !points.A_end) { // Points needed for positioning/orientation
          console.error("Required points missing for steer tube positioning.");
          return;
      }

    // Reset transformations
    steerTubeMesh.position.set(0, 0, 0);
    steerTubeMesh.rotation.set(0, 0, 0);
    steerTubeMesh.scale.set(1, 1, 1);

    // Calculate the direction vector of the head tube (F_end to A_end)
    const direction = new THREE.Vector3().subVectors(points.F_end, points.A_end).normalize();

    // Calculate the extended top point for midpoint calculation
     const extendedTopPoint = points.moveD_end.clone().add(direction.clone().multiplyScalar(params.extension));

    // Calculate the midpoint between F_end and the extended top point
    const midpoint = new THREE.Vector3().addVectors(points.F_end, extendedTopPoint).multiplyScalar(0.5);

    // Position the cylinder at the midpoint
    steerTubeMesh.position.copy(midpoint);

    // Calculate the rotation needed to align the cylinder's Y-axis with the head tube direction
    const yAxis = new THREE.Vector3(0, 1, 0); // Cylinder default axis
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(yAxis, direction);
    steerTubeMesh.setRotationFromQuaternion(quaternion);
}

export function genForkSteerTubeGeo(geometry, scene) {
    // 1. Create Geometry (depends on length)
    const steerTubeGeometry = createSteerTubeGeometry(geometry);
    if (!steerTubeGeometry) {
         if(componentRegistry.steerTube) delete componentRegistry.steerTube;
        return null;
    }

    // 1b. Create Mesh
    const steerTubeMesh = createSteerTubeMesh(steerTubeGeometry, geometry.params.forkColor);
     if (!steerTubeMesh) {
          if(componentRegistry.steerTube) delete componentRegistry.steerTube;
         return null;
     }

    // 2. Position Mesh (depends on world points and direction)
    positionSteerTube(steerTubeMesh, geometry);

    // Register and add to scene
    componentRegistry.steerTube = steerTubeMesh; // Register
    scene.add(steerTubeMesh);

    return steerTubeMesh;
}

// Create Fork Dropout Meshes function
function createForkDropoutMeshes(dropoutForkA, dropoutForkB, geometry, forkColor = 0x800080) {
    if (!dropoutForkA || !dropoutForkB) {
        console.error("Missing dropout geometries for fork dropout creation.");
        return { leftDropoutMesh: null, rightDropoutMesh: null };
    }
    
    const { points } = geometry;
    if (!points.F_end || !points.D_end) {
        console.error("Missing required points (F_end, D_end) for fork dropout creation.");
        return { leftDropoutMesh: null, rightDropoutMesh: null };
    }

    // --- Clipping Plane Setup ---
    // Calculate direction along the fork (from F_end to D_end)
    const planeDirection = new THREE.Vector3().subVectors(points.F_end, points.D_end).normalize();
    
    // Calculate center point along the fork for plane position
    const planeCenter = new THREE.Vector3().addVectors(points.D_end, points.F_end).multiplyScalar(0.5);
    
    // Create the plane object
    const clipPlane = new THREE.Plane();
    
    // Create quaternion to rotate the normal vector
    const planeQuaternion = new THREE.Quaternion();
    planeQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), planeDirection);
    
    // Create a normal vector and rotate it by our plane's quaternion
    const normal = new THREE.Vector3(-1, 0, 0);
    normal.applyQuaternion(planeQuaternion);
    
    // Set the plane with the normal and position
    clipPlane.setFromNormalAndCoplanarPoint(normal, planeCenter);
    // --- End Clipping Plane Setup ---

    // Create material with clipping plane
    const material = createComponentMaterial('forkDropoutAssembly', {
        color: forkColor,
        clippingPlanes: [clipPlane], // Apply clipping plane
        clipIntersection: false // Only clip parts outside the plane
    });

    // Create left dropout mesh
    const leftDropoutMesh = new THREE.Mesh(dropoutForkA.clone(), material.clone());
    leftDropoutMesh.userData.componentType = 'forkDropoutLeft';
    
    // Create right dropout mesh with same geometry
    const rightDropoutMesh = new THREE.Mesh(dropoutForkA.clone(), material.clone());
    rightDropoutMesh.userData.componentType = 'forkDropoutRight';

    return { leftDropoutMesh, rightDropoutMesh };
}

// Position Fork Dropout Assembly function
export function positionForkDropoutAssembly(meshes, geometry) {
    const { leftDropoutMesh, rightDropoutMesh } = meshes;
    const { points } = geometry;
    
    const DROPOUT = {
        SCALE: 1.6,
        Z_OFFSET: 0.3 // We'll apply sign in the positioning
    };

    // Safety check for required points
    if (!points.frontAxel || !points.F_end_fork || !points.F_end || !points.D_end) {
        console.error("Missing required points for fork dropout positioning and clipping.");
        return;
    }

    // --- Re-create the clipping plane ---
    // This is crucial when repositioning, as the geometry has changed
    const planeDirection = new THREE.Vector3().subVectors(points.F_end, points.D_end).normalize();
    const planeCenter = new THREE.Vector3().addVectors(points.D_end, points.F_end).multiplyScalar(0.5);
    const clipPlane = new THREE.Plane();
    
    const planeQuaternion = new THREE.Quaternion();
    planeQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), planeDirection);
    
    const normal = new THREE.Vector3(-1, 0, 0);
    normal.applyQuaternion(planeQuaternion);
    clipPlane.setFromNormalAndCoplanarPoint(normal, planeCenter);
    
    // Update the clipping planes in both materials
    if (leftDropoutMesh && leftDropoutMesh.material) {
        leftDropoutMesh.material.clippingPlanes = [clipPlane];
        leftDropoutMesh.material.needsUpdate = true;
    }
    if (rightDropoutMesh && rightDropoutMesh.material) {
        rightDropoutMesh.material.clippingPlanes = [clipPlane];
        rightDropoutMesh.material.needsUpdate = true;
    }
    // --- End clipping plane recreation ---

    // Calculate orientation direction for positioning
    // Use the fork direction (D_end to F_end) rotated 90 degrees for dropout alignment
    // This prevents zero-vector issues when T_length = 0
    const forkDirection = new THREE.Vector3().subVectors(points.F_end, points.D_end).normalize();
    const direction = new THREE.Vector3(forkDirection.y, forkDirection.x, 0).normalize();
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(defaultUp, direction);

    // Position Left Dropout
    if (leftDropoutMesh) {
        // Reset transformations
        leftDropoutMesh.position.set(0, 0, 0);
        leftDropoutMesh.rotation.set(0, 0, 0);
        leftDropoutMesh.scale.set(1, 1, 1);

        // Apply scale
        leftDropoutMesh.scale.set(DROPOUT.SCALE, DROPOUT.SCALE, DROPOUT.SCALE);
        
        // Position at frontAxel with Z offset
        leftDropoutMesh.position.copy(points.frontAxel);
        leftDropoutMesh.position.z += -DROPOUT.Z_OFFSET;
        
        // Apply orientation
        leftDropoutMesh.setRotationFromQuaternion(quaternion);
        leftDropoutMesh.rotateZ(Math.PI / 2); // Additional rotation for model alignment
    }

    // Position Right Dropout (Mirrored)
    if (rightDropoutMesh) {
        // Reset transformations
        rightDropoutMesh.position.set(0, 0, 0);
        rightDropoutMesh.rotation.set(0, 0, 0);
        rightDropoutMesh.scale.set(1, 1, 1);

        // Apply scale
        rightDropoutMesh.scale.set(DROPOUT.SCALE, DROPOUT.SCALE, DROPOUT.SCALE);
        
        // Position at frontAxel with opposite Z offset
        rightDropoutMesh.position.copy(points.frontAxel);
        rightDropoutMesh.position.z = -points.frontAxel.z + DROPOUT.Z_OFFSET; // Mirrored Z with opposite offset
        
        // Apply orientation
        rightDropoutMesh.setRotationFromQuaternion(quaternion);
        rightDropoutMesh.rotateZ(Math.PI / 2); 

    }
}

// Generate Fork Dropout function
export function genForkDropout(geometry, scene, dropoutForkA, dropoutForkB) {
    // Create the meshes with clipping planes
    const meshes = createForkDropoutMeshes(dropoutForkA, dropoutForkB, geometry, geometry.params.forkColor);
    
    // Check if mesh creation failed
    if (!meshes.leftDropoutMesh || !meshes.rightDropoutMesh) {
        // Clean up existing component if present
        if (componentRegistry.forkDropoutAssembly) {
            delete componentRegistry.forkDropoutAssembly;
        }
        return null;
    }

    // Create a group for the assembly
    const dropoutGroup = new THREE.Group();
    dropoutGroup.userData.componentType = 'forkDropoutAssembly';

    // Add meshes to the group
    dropoutGroup.add(meshes.leftDropoutMesh);
    dropoutGroup.add(meshes.rightDropoutMesh);

    // Position the meshes within the group
    positionForkDropoutAssembly(meshes, geometry);

    // The group itself stays at origin since the meshes have world positions
    dropoutGroup.position.set(0, 0, 0);
    dropoutGroup.rotation.set(0, 0, 0);
    dropoutGroup.scale.set(1, 1, 1);

    // Register the component and add to scene
    componentRegistry.forkDropoutAssembly = dropoutGroup;
    scene.add(dropoutGroup);

    return dropoutGroup;
}

