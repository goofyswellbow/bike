console.log('Loading genWHubRear.js...');
import * as THREE from 'three';
import { componentRegistry } from '../registry.js';
import {stretchHubMeshZ } from './genUtil.js';
import { createComponentMaterial } from '../materials.js';



//----------------------------------------------------------------
// REAR HUB ------------------------------------------------------
//----------------------------------------------------------------

// --- Hub Flange Assembly (Rear) ---

function createHubFlangeRearGeometry(params) {
    // Flange parameters
    const flangeThickness = 0.4; // Thicker for rear as per original code
    const holeRadius = 0.12;
    const numHoles = 18;
    const flangeExtension = 0.25;
    const hubRadius = params.hub_radius_R; // Use REAR hub radius

    // Create main shape
    const mainShape = new THREE.Shape();
    mainShape.absarc(0, 0, hubRadius + flangeExtension, 0, Math.PI * 2, false);

    // Create holes
    const holes = [];
    for (let i = 0; i < numHoles; i++) {
        const angle = ((i / numHoles) * Math.PI * 2) + (Math.PI / 2);
        const holeX = Math.cos(angle) * hubRadius;
        const holeY = Math.sin(angle) * hubRadius;
        const holePath = new THREE.Path();
        holePath.absarc(holeX, holeY, holeRadius, 0, Math.PI * 2, true);
        holes.push(holePath);
    }
    mainShape.holes = holes;

    const extrudeSettings = {
        depth: flangeThickness,
        bevelEnabled: false
    };

    const flangeGeometry = new THREE.ExtrudeGeometry(mainShape, extrudeSettings);
    return flangeGeometry;
}

function createHubFlangeRearMeshes(flangeGeometry, rearHubColor = 0xffffff) {
    if (!flangeGeometry) return { leftFlangeMesh: null, rightFlangeMesh: null };

    const material = createComponentMaterial('hubFlangeRear', { color: rearHubColor });

    // Create left flange mesh
    const leftFlangeMesh = new THREE.Mesh(flangeGeometry.clone(), material.clone());
    leftFlangeMesh.userData.componentType = 'hubFlangeRearLeft'; // Tag

    // Create right flange mesh
    const rightFlangeMesh = new THREE.Mesh(flangeGeometry.clone(), material.clone());
    rightFlangeMesh.userData.componentType = 'hubFlangeRearRight'; // Tag

    return { leftFlangeMesh, rightFlangeMesh };
}

// Updated positionHubFlangesRear function in genHubRear.js
export function positionHubFlangesRear(meshes, geometry) {
    const { leftFlangeMesh, rightFlangeMesh } = meshes;
    const { params } = geometry; // We don't need rotations here as it's applied to the group itself

    // Use the same thickness as defined in createHubFlangeRearGeometry
    const flangeThickness = 0.4;
    const numHoles = 18; // Needed for rotation offset calculation

    if (!leftFlangeMesh || !rightFlangeMesh) return;

    // --- Position Left Flange ---
    // Reset transformations relative to the parent group
    leftFlangeMesh.position.set(0, 0, 0);
    leftFlangeMesh.rotation.set(0, 0, 0);
    leftFlangeMesh.scale.set(1, 1, 1);
    // Set position relative to group origin (S_end) using REAR offset
    leftFlangeMesh.position.z = params.hub_offset_R / 2; // Positive offset for left
    // Apply rotation offset for left side holes
    const holeRotationOffset = (Math.PI * 2) / (numHoles * 2);
    leftFlangeMesh.rotation.z = holeRotationOffset; // Rotate the mesh itself

    // --- Position Right Flange ---
    // Reset transformations relative to the parent group
    rightFlangeMesh.position.set(0, 0, 0);
    rightFlangeMesh.rotation.set(0, 0, 0);
    rightFlangeMesh.scale.set(1, 1, 1);
    // Set position relative to group origin (S_end) using REAR offset
    rightFlangeMesh.position.z = -params.hub_offset_R / 2 - flangeThickness; // Negative offset for right
    // No rotation offset needed for the right side
}

// Updated genHubFlangeRearGeo function in genHubRear.js
export function genHubFlangeRearGeo(geometry, scene) {
    // Create the base geometry using rear params
    const flangeGeometry = createHubFlangeRearGeometry(geometry.params);
    if (!flangeGeometry) return null;

    // Create the left and right meshes with rear hub color
    const rearHubColor = geometry.params.rearHubColor !== undefined ? geometry.params.rearHubColor : 0xffffff;
    const meshes = createHubFlangeRearMeshes(flangeGeometry, rearHubColor);
    if (!meshes.leftFlangeMesh || !meshes.rightFlangeMesh) return null;

    // Create the group for the assembly
    const hubFlangeGroupRear = new THREE.Group();
    hubFlangeGroupRear.userData.componentType = 'hubFlangeAssemblyRear'; // Tag the group

    // Add meshes to the group *before* positioning them relative to the group
    hubFlangeGroupRear.add(meshes.leftFlangeMesh);
    hubFlangeGroupRear.add(meshes.rightFlangeMesh);

    // Position the meshes *within* the group using rear logic
    positionHubFlangesRear(meshes, geometry);

    // Position the entire group at the REAR attachment point (S_end)
    hubFlangeGroupRear.position.copy(geometry.points.S_end);
    
    // Apply the bike's overall rotation to the hub flange group
    hubFlangeGroupRear.rotation.z = geometry.rotations.total;

    // Register and add group to scene
    componentRegistry.hubFlangeAssemblyRear = hubFlangeGroupRear; // Register the group
    scene.add(hubFlangeGroupRear);

    return hubFlangeGroupRear;
}

// --- Hub Core (Rear) ---

function createHubCoreRearGeometry(hubCoreRearBaseGeometry, geometry) {
    const { params } = geometry;
    const HUB = {
        SCALE: 1.0,           // Base scale factor
        PRESERVE_ENDS: 0.0    // Percentage of ends to preserve
    };

    if (!hubCoreRearBaseGeometry) return null;

    // Calculate the target length based on the REAR hub_offset_R parameter
    // Note the multiplier * 1.5 from the original code
    const targetLength = params.hub_offset_R * 1.5;

    // Stretch the geometry to the target length
    const stretchedGeometry = stretchHubMeshZ(
        hubCoreRearBaseGeometry,
        targetLength,
        HUB.PRESERVE_ENDS,
        HUB.SCALE
    );

    return stretchedGeometry;
}

function createHubCoreRearMesh(stretchedGeometry, rearHubColor = 0xffffff) {
    if (!stretchedGeometry) return null;

     // Create material
    const material = createComponentMaterial('hubCoreRear', { color: rearHubColor });

    // Create mesh
    const hubMesh = new THREE.Mesh(stretchedGeometry, material);
    // Add identification tag
    hubMesh.userData.componentType = 'hubCoreRear';

    return hubMesh;
}

export function positionHubCoreRear(hubMesh, geometry) {
    const { points, params } = geometry;
    if (!hubMesh) return;

    // Reset transformations
    hubMesh.position.set(0, 0, 0);
    hubMesh.rotation.set(0, 0, 0);
    hubMesh.scale.set(1, 1, 1); // Base scale is handled in stretch function

    // Position at S_end (rear wheel center)
    hubMesh.position.copy(points.S_end);

    // Handle isRHD: add Y rotation when drive switches sides
    if (params.isRHD) {
        hubMesh.rotation.y = Math.PI;
    }

    // Apply rotation if needed to align model horizontally.
    // Original code had rotation commented out. Assuming similar alignment to front needed:
    hubMesh.rotation.z = Math.PI / 2;
    // If the base model 'hubCoreRear' is oriented differently than 'hubCoreFront',
    // this rotation might need adjustment (e.g., removed or changed axis).
}

export function genHubRearCore(geometry, scene, hubCoreRearBaseGeometry) {
    // Create the stretched geometry
    const stretchedGeometry = createHubCoreRearGeometry(hubCoreRearBaseGeometry, geometry);
    if (!stretchedGeometry) return null;

    // Create the mesh with tag and rear hub color
    const rearHubColor = geometry.params.rearHubColor !== undefined ? geometry.params.rearHubColor : 0xffffff;
    const hubMesh = createHubCoreRearMesh(stretchedGeometry, rearHubColor);
    if (!hubMesh) return null;

    // Position the mesh
    positionHubCoreRear(hubMesh, geometry);

    // Register and add to scene
    componentRegistry.hubCoreRear = hubMesh; // Register component
    scene.add(hubMesh);

    return hubMesh;
}

// --- Hub End Assembly (Rear, Non-Drive Side) ---

function createHubEndRearMeshes(rearHubEndBaseGeometry, rearHubGuardBaseGeometry, params) {
    let hubEndMesh = null;
    let hubGuardMesh = null;

    // Create Hub End Mesh
    if (rearHubEndBaseGeometry) {
        const material = createComponentMaterial('hubEndRear');
        hubEndMesh = new THREE.Mesh(rearHubEndBaseGeometry.clone(), material);
        hubEndMesh.userData.componentType = 'hubEndRear'; // Tag
    }

    // Create Hub Guard Mesh (conditional on Non-Drive/Right side flag)
    if (rearHubGuardBaseGeometry && params.rearHubGuardEnabled_R) {
        const material = createComponentMaterial('hubGuardRear');
        hubGuardMesh = new THREE.Mesh(rearHubGuardBaseGeometry.clone(), material);
        hubGuardMesh.userData.componentType = 'hubGuardRear'; // Tag
    }

    return { hubEndMesh, hubGuardMesh };
}

export function positionHubEndRearAssembly(meshes, geometry) {
    const { hubEndMesh, hubGuardMesh } = meshes;
    const { points, params } = geometry;
    const scale = 1.0; // Scale factor from original code

    // Position Hub End (Non-Drive/Right Side - Mirrored)
    if (hubEndMesh) {
        // Reset transformations relative to group
        hubEndMesh.position.set(0, 0, 0);
        hubEndMesh.rotation.set(0, 0, 0);
        hubEndMesh.scale.set(1, 1, 1);

        // Apply scale
        hubEndMesh.scale.set(scale, scale, scale);
        
        // Handle isRHD: invert Z position and Y rotation when drive switches sides
        if (params.isRHD) {
            // Position relative to group origin (rearAxel), positive Z
            hubEndMesh.position.z = points.rearAxel.z;
            // No Y rotation when isRHD
            hubEndMesh.rotation.y = 0;
        } else {
            // Position relative to group origin (rearAxel), mirroring Z
            hubEndMesh.position.z = -points.rearAxel.z;
            // Apply Y rotation for mirroring
            hubEndMesh.rotation.y = Math.PI;
        }
    }

    // Position Hub Guard (Non-Drive/Right Side - Mirrored)
    if (hubGuardMesh) {
        // Reset transformations relative to group
        hubGuardMesh.position.set(0, 0, 0);
        hubGuardMesh.rotation.set(0, 0, 0);
        hubGuardMesh.scale.set(1, 1, 1);

        // Apply scale
        hubGuardMesh.scale.set(scale, scale, scale);
        // Handle isRHD: invert Z position and Y rotation when drive switches sides
        if (params.isRHD) {
            // Position relative to group origin (rearAxel), positive Z
            hubGuardMesh.position.z = points.rearAxel.z;
            // No Y rotation when isRHD
            hubGuardMesh.rotation.y = 0;
        } else {
            // Position relative to group origin (rearAxel), mirroring Z
            hubGuardMesh.position.z = -points.rearAxel.z;
            // Apply Y rotation for mirroring
            hubGuardMesh.rotation.y = Math.PI;
        }
    }
}

export function genHubEndRearGeo(geometry, scene, rearHubEndBaseGeometry, rearHubGuardBaseGeometry) {
    // Create the potential meshes based on params
    const meshes = createHubEndRearMeshes(rearHubEndBaseGeometry, rearHubGuardBaseGeometry, geometry.params);

    // If neither mesh was created, return null
    if (!meshes.hubEndMesh && !meshes.hubGuardMesh) {
         // Ensure registry is cleared if previously present but now disabled
        if (componentRegistry.hubEndAssemblyRear) {
            delete componentRegistry.hubEndAssemblyRear;
        }
        return null;
    }

    // Create the group for the assembly
    const hubEndGroupRear = new THREE.Group();
    hubEndGroupRear.userData.componentType = 'hubEndAssemblyRear'; // Tag the group

    // Add existing meshes to the group
    if (meshes.hubEndMesh) hubEndGroupRear.add(meshes.hubEndMesh);
    if (meshes.hubGuardMesh) hubEndGroupRear.add(meshes.hubGuardMesh);

    // Position the meshes *within* the group
    positionHubEndRearAssembly(meshes, geometry);

    // Position the entire group at the attachment point (rearAxel X and Y, Z=0)
    hubEndGroupRear.position.copy(geometry.points.rearAxel);
    hubEndGroupRear.position.z = 0; // Z positioning is handled internally

    // Register and add group to scene
    componentRegistry.hubEndAssemblyRear = hubEndGroupRear; // Register the group
    scene.add(hubEndGroupRear);

    return hubEndGroupRear;
}

// --- Hub End Assembly (Rear, Drive Side) ---
// Driver Compression and Guard
function createHubDriveBoltMeshes(rearHubDriverBoltBaseGeometry, hubGuardDriverBaseGeometry, params) {
    let hubEndMesh = null;
    let hubGuardMesh = null;

    // Create Hub End (Drive Bolt) Mesh
    if (rearHubDriverBoltBaseGeometry) {
        const material = createComponentMaterial('hubEndRear');
        hubEndMesh = new THREE.Mesh(rearHubDriverBoltBaseGeometry.clone(), material);
        hubEndMesh.userData.componentType = 'hubEndDrive'; // Tag
    }

    // Create Hub Guard (Drive Side) Mesh (conditional)
    if (hubGuardDriverBaseGeometry && params.rearHubGuardEnabled_L) { // Check Drive/Left side flag
        const material = createComponentMaterial('hubGuardDrive');
        hubGuardMesh = new THREE.Mesh(hubGuardDriverBaseGeometry.clone(), material);
        hubGuardMesh.userData.componentType = 'hubGuardDrive'; // Tag
    }

    return { hubEndMesh, hubGuardMesh };
}

export function positionHubDriveBoltAssembly(meshes, geometry) {
    const { hubEndMesh, hubGuardMesh } = meshes;
    const { points, params } = geometry;
    const scale = 1.0; // Scale factor from original code
    const guardZRotate = 0.05
    // Position Hub End (Drive Side)
    if (hubEndMesh) {
        // Reset transformations relative to group
        hubEndMesh.position.set(0, 0, 0);
        hubEndMesh.rotation.set(0, 0, 0);
        hubEndMesh.scale.set(1, 1, 1);

        // Apply scale
        hubEndMesh.scale.set(scale, scale, scale);

        // Handle isRHD: invert Z position and Y rotation when drive switches sides
        if (params.isRHD) {
        hubEndMesh.position.z = -points.rearAxel.z;
        hubEndMesh.rotation.y = Math.PI;
        }else{
        // Position relative to group origin (rearAxel), using its Z directly (drive side)
        hubEndMesh.position.z = points.rearAxel.z;
        // No extra rotation needed for drive side hub end
        }
    }

    // Position Hub Guard (Drive Side)
    if (hubGuardMesh) {
        // Reset transformations relative to group
        hubGuardMesh.position.set(0, 0, 0);
        hubGuardMesh.rotation.set(0, 0, 0);
        hubGuardMesh.scale.set(1, 1, 1);

        // Apply scale
        hubGuardMesh.scale.set(scale, scale, scale);

         // Handle isRHD
        if (params.isRHD) {
        hubGuardMesh.position.z = -points.rearAxel.z;
        // Flip for other side
        hubGuardMesh.rotation.y = Math.PI;
        // Rotate to align
        hubGuardMesh.rotation.z = guardZRotate*8 + Math.PI; //the arbritary multiplier is because i didnt align the model when i modeled it
        }else{
        // Position relative to group origin (rearAxel), using its Z directly
        hubGuardMesh.position.z = points.rearAxel.z;
        // Apply the specific Z rotation offset
        hubGuardMesh.rotation.z = -guardZRotate;
        }
    }
}

export function genHubDriveBolt(geometry, scene, rearHubDriverBoltBaseGeometry, hubGuardDriverBaseGeometry) {
    // Create the potential meshes based on params
    const meshes = createHubDriveBoltMeshes(rearHubDriverBoltBaseGeometry, hubGuardDriverBaseGeometry, geometry.params);

    // If neither mesh was created, return null
    if (!meshes.hubEndMesh && !meshes.hubGuardMesh) {
        // Ensure registry is cleared if previously present but now disabled
        if (componentRegistry.hubEndAssemblyDrive) {
            delete componentRegistry.hubEndAssemblyDrive;
        }
        return null;
    }

    // Create the group for the assembly
    const hubDriveGroup = new THREE.Group();
    hubDriveGroup.userData.componentType = 'hubEndAssemblyDrive'; // Tag the group

    // Add existing meshes to the group
    if (meshes.hubEndMesh) hubDriveGroup.add(meshes.hubEndMesh);
    if (meshes.hubGuardMesh) hubDriveGroup.add(meshes.hubGuardMesh);

    // Position the meshes *within* the group
    positionHubDriveBoltAssembly(meshes, geometry);

    // Position the entire group at the attachment point (rearAxel X and Y, Z=0)
    hubDriveGroup.position.copy(geometry.points.rearAxel);
    hubDriveGroup.position.z = 0; // Z positioning is handled internally

    // Register and add group to scene
    componentRegistry.hubEndAssemblyDrive = hubDriveGroup; // Register the group
    scene.add(hubDriveGroup);

    return hubDriveGroup;
}

// --- Hub Bolt Assembly (Rear) ---

function createHubBoltRearMeshes(boltRearBaseGeometry) {
    if (!boltRearBaseGeometry) return { leftBoltMesh: null, rightBoltMesh: null };

    const material = createComponentMaterial('hubBoltRear');

    // Create left bolt mesh
    const leftBoltMesh = new THREE.Mesh(boltRearBaseGeometry.clone(), material.clone());
    leftBoltMesh.userData.componentType = 'hubBoltRearLeft'; // Tag

    // Create right bolt mesh
    const rightBoltMesh = new THREE.Mesh(boltRearBaseGeometry.clone(), material.clone());
    rightBoltMesh.userData.componentType = 'hubBoltRearRight'; // Tag

    return { leftBoltMesh, rightBoltMesh };
}

export function positionHubBoltRearAssembly(meshes, geometry) {
    const { leftBoltMesh, rightBoltMesh } = meshes;
    const { points } = geometry;
    const scale = 1.0;
    const zOffset = 0.6; // Z offset from original code

    // Position Left Bolt
    if (leftBoltMesh) {
        // Reset transformations relative to group
        leftBoltMesh.position.set(0, 0, 0);
        leftBoltMesh.rotation.set(0, 0, 0);
        leftBoltMesh.scale.set(1, 1, 1);

        // Apply scale
        leftBoltMesh.scale.set(scale, scale, scale);
        // Position relative to group origin (rearAxel), using positive offset
        leftBoltMesh.position.z = points.rearAxel.z + zOffset;
        // No extra rotation
    }

    // Position Right Bolt (Mirrored via Scale)
    if (rightBoltMesh) {
         // Reset transformations relative to group
        rightBoltMesh.position.set(0, 0, 0);
        rightBoltMesh.rotation.set(0, 0, 0);
        rightBoltMesh.scale.set(1, 1, 1);

        // Apply mirrored scale (negative Z scale)
        rightBoltMesh.scale.set(scale, scale, -scale);
        // Position relative to group origin (rearAxel), mirroring Z and applying offset
        rightBoltMesh.position.z = -(points.rearAxel.z + zOffset);
        // No extra rotation needed (mirroring handled by scale)
    }
}

export function genHubBoltRear(geometry, scene, boltRearBaseGeometry) {
    // Create the meshes
    const meshes = createHubBoltRearMeshes(boltRearBaseGeometry);
    if (!meshes.leftBoltMesh || !meshes.rightBoltMesh) return null;

    // Create the group for the assembly
    const hubBoltGroupRear = new THREE.Group();
    hubBoltGroupRear.userData.componentType = 'hubBoltAssemblyRear'; // Tag the group

    // Add meshes to the group
    hubBoltGroupRear.add(meshes.leftBoltMesh);
    hubBoltGroupRear.add(meshes.rightBoltMesh);

    // Position the meshes *within* the group
    positionHubBoltRearAssembly(meshes, geometry);

    // Position the entire group at the attachment point (rearAxel X and Y, Z=0)
    hubBoltGroupRear.position.copy(geometry.points.rearAxel);
    hubBoltGroupRear.position.z = 0; // Z positioning is handled internally

    // Register and add group to scene
    componentRegistry.hubBoltAssemblyRear = hubBoltGroupRear; // Register the group
    scene.add(hubBoltGroupRear);

    return hubBoltGroupRear;
}

// --- Peg Assembly (Rear) ---

function createRearPegMeshes(pegBaseGeometry, params) {
    let leftPegMesh = null;
    let rightPegMesh = null;

    if (!pegBaseGeometry) return { leftPegMesh, rightPegMesh }; // Return nulls if no base geometry

    const material = createComponentMaterial('pegRear');

    // Create Left Peg Mesh (if enabled)
    if (params.rearPegEnabled_L) { // Use rear enable flag
        leftPegMesh = new THREE.Mesh(pegBaseGeometry.clone(), material.clone());
        leftPegMesh.userData.componentType = 'pegRearLeft'; // Tag
    }

    // Create Right Peg Mesh (if enabled)
    if (params.rearPegEnabled_R) { // Use rear enable flag
        rightPegMesh = new THREE.Mesh(pegBaseGeometry.clone(), material.clone());
        rightPegMesh.userData.componentType = 'pegRearRight'; // Tag
    }

    return { leftPegMesh, rightPegMesh };
}

export function positionRearPegAssembly(meshes, geometry) {
    const { leftPegMesh, rightPegMesh } = meshes;
    const { points } = geometry;
    const scale = 1.0;
    const zOffset = 0.6; // Z offset from original code

    // Position Left Peg
    if (leftPegMesh) {
        // Reset transformations relative to group
        leftPegMesh.position.set(0, 0, 0);
        leftPegMesh.rotation.set(0, 0, 0);
        leftPegMesh.scale.set(1, 1, 1);

        // Apply scale
        leftPegMesh.scale.set(scale, scale, scale);
        // Position relative to group origin (rearAxel), using positive offset
        leftPegMesh.position.z = points.rearAxel.z + zOffset;
        // No extra rotation
    }

    // Position Right Peg (Mirrored via Scale)
    if (rightPegMesh) {
         // Reset transformations relative to group
        rightPegMesh.position.set(0, 0, 0);
        rightPegMesh.rotation.set(0, 0, 0);
        rightPegMesh.scale.set(1, 1, 1);

        // Apply mirrored scale (negative Z scale)
        rightPegMesh.scale.set(scale, scale, -scale);
        // Position relative to group origin (rearAxel), mirroring Z and applying offset
        rightPegMesh.position.z = -(points.rearAxel.z + zOffset);
        // No extra rotation needed (mirroring handled by scale)
    }
}

export function genPegRear(geometry, scene, pegBaseGeometry) {
    // Create the potential meshes based on params
    const meshes = createRearPegMeshes(pegBaseGeometry, geometry.params);

    // If neither peg mesh was created, return null
    if (!meshes.leftPegMesh && !meshes.rightPegMesh) {
        // Ensure registry is cleared if pegs were previously present but now disabled
        if (componentRegistry.pegAssemblyRear) {
            delete componentRegistry.pegAssemblyRear;
        }
        return null;
    }

    // Create the group for the assembly
    const pegGroupRear = new THREE.Group();
    pegGroupRear.userData.componentType = 'pegAssemblyRear'; // Tag the group

    // Add existing meshes to the group
    if (meshes.leftPegMesh) pegGroupRear.add(meshes.leftPegMesh);
    if (meshes.rightPegMesh) pegGroupRear.add(meshes.rightPegMesh);

    // Position the meshes *within* the group
    positionRearPegAssembly(meshes, geometry);

    // Position the entire group at the attachment point (rearAxel X and Y, Z=0)
    pegGroupRear.position.copy(geometry.points.rearAxel);
    pegGroupRear.position.z = 0; // Z positioning is handled internally

    // Register and add group to scene
    componentRegistry.pegAssemblyRear = pegGroupRear; // Register the group
    scene.add(pegGroupRear);

    return pegGroupRear;
}

