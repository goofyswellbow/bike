console.log('Loading genHubFront.js...');
import * as THREE from 'three';
import { componentRegistry } from '../registry.js';
import {stretchHubMeshZ } from './genUtil.js';
import { createComponentMaterial } from '../materials.js';


//----------------------------------------------------------------
// FRONT HUB -----------------------------------------------------
//----------------------------------------------------------------


// --- Front Hub Flange Assembly ---

function createHubFlangeGeometry(params) {
    // Flange parameters (used for geometry generation)
    const flangeThickness = 0.22;
    const holeRadius = 0.12;
    const numHoles = 18;
    const flangeExtension = 0.25;
    const hubRadius = params.hub_radius_F; // Use front hub radius for geometry

    // Create main shape (outer circle)
    const mainShape = new THREE.Shape();
    mainShape.absarc(0, 0, hubRadius + flangeExtension, 0, Math.PI * 2, false);

    // Create holes
    const holes = [];
    for (let i = 0; i < numHoles; i++) {
        // Note: Rotation offset for holes is handled during positioning if needed,
        // but the hole pattern geometry itself is symmetrical.
        const angle = ((i / numHoles) * Math.PI * 2) + (Math.PI / 2); // Base angle
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
    return flangeGeometry; // Return the single geometry definition
}

function createHubFlangeMeshes(flangeGeometry, frontHubColor = 0xffffff) {
    if (!flangeGeometry) return { leftFlangeMesh: null, rightFlangeMesh: null };

    const material = createComponentMaterial('hubFlangeFront', { color: frontHubColor });

    // Create left flange mesh
    const leftFlangeMesh = new THREE.Mesh(flangeGeometry.clone(), material.clone());
    leftFlangeMesh.userData.componentType = 'hubFlangeLeft'; // Tag

    // Create right flange mesh
    const rightFlangeMesh = new THREE.Mesh(flangeGeometry.clone(), material.clone());
    rightFlangeMesh.userData.componentType = 'hubFlangeRight'; // Tag

    return { leftFlangeMesh, rightFlangeMesh };
}

// Updated positionHubFlanges function in genHubFront.js
export function positionHubFlanges(meshes, geometry) {
    const { leftFlangeMesh, rightFlangeMesh } = meshes;
    const { points, params, rotations } = geometry; // Add rotations to extraction

    // Use the same thickness as defined in createHubFlangeGeometry
    const flangeThickness = 0.22;
    const numHoles = 18; // Needed for rotation offset calculation

    if (!leftFlangeMesh || !rightFlangeMesh) return;

    // --- Position Left Flange ---
    // Reset transformations relative to the parent group
    leftFlangeMesh.position.set(0, 0, 0);
    leftFlangeMesh.rotation.set(0, 0, 0);
    leftFlangeMesh.scale.set(1, 1, 1);
    // Set position relative to group origin (T_end)
    leftFlangeMesh.position.z = params.hub_offset_F / 2; // Positive offset for left
    // Apply rotation offset for left side holes
    const holeRotationOffset = (Math.PI * 2) / (numHoles * 2);
    leftFlangeMesh.rotation.z = holeRotationOffset; // Rotate the mesh itself

    // --- Position Right Flange ---
    // Reset transformations relative to the parent group
    rightFlangeMesh.position.set(0, 0, 0);
    rightFlangeMesh.rotation.set(0, 0, 0);
    rightFlangeMesh.scale.set(1, 1, 1);
    // Set position relative to group origin (T_end)
    // Offset needs to account for the flange thickness since extrusion depth goes in +Z
    rightFlangeMesh.position.z = -params.hub_offset_F / 2 - flangeThickness; // Negative offset for right
    // No rotation offset needed for the right side
}

// Updated genHubFlangeGeo function in genHubFront.js
export function genHubFlangeGeo(geometry, scene) {
    // Create the base geometry
    const flangeGeometry = createHubFlangeGeometry(geometry.params);
    if (!flangeGeometry) return null;

    // Create the left and right meshes with front hub color
    const frontHubColor = geometry.params.frontHubColor !== undefined ? geometry.params.frontHubColor : 0xffffff;
    const meshes = createHubFlangeMeshes(flangeGeometry, frontHubColor);
    if (!meshes.leftFlangeMesh || !meshes.rightFlangeMesh) return null;

    // Create the group for the assembly
    const hubFlangeGroup = new THREE.Group();
    hubFlangeGroup.userData.componentType = 'hubFlangeAssembly'; // Tag the group

    // Add meshes to the group *before* positioning them relative to the group
    hubFlangeGroup.add(meshes.leftFlangeMesh);
    hubFlangeGroup.add(meshes.rightFlangeMesh);

    // Position the meshes *within* the group
    positionHubFlanges(meshes, geometry);

    // Position the entire group at the attachment point (T_end)
    hubFlangeGroup.position.copy(geometry.points.T_end);
    
    // Apply the bike's overall rotation to the hub flange group
    hubFlangeGroup.rotation.z = geometry.rotations.total;

    // Register and add group to scene
    componentRegistry.hubFlangeAssembly = hubFlangeGroup; // Register the group
    scene.add(hubFlangeGroup);

    return hubFlangeGroup;
}

// --- Front Hub Core  ---

function createHubCoreFrontGeometry(hubCoreBaseGeometry, geometry) {
    const { params } = geometry;
    const HUB = {
        SCALE: 1.0,           // Base scale factor
        PRESERVE_ENDS: 0.0    // Percentage of ends to preserve (was 0.0 in original)
    };

    if (!hubCoreBaseGeometry) return null;

    // Calculate the target length based on the hub_offset_F parameter
    // Original used hub_offset_F * 2, ensure this matches desired length
    const targetLength = params.hub_offset_F * 2;

    // Stretch the geometry to the target length
    const stretchedGeometry = stretchHubMeshZ(
        hubCoreBaseGeometry,
        targetLength,
        HUB.PRESERVE_ENDS,
        HUB.SCALE
    );

    return stretchedGeometry;
}

function createHubCoreFrontMesh(stretchedGeometry, frontHubColor = 0xffffff) {
    if (!stretchedGeometry) return null;

     // Create material
    const material = createComponentMaterial('hubCoreFront', { color: frontHubColor });

    // Create mesh
    const hubMesh = new THREE.Mesh(stretchedGeometry, material);
    // Add identification tag
    hubMesh.userData.componentType = 'hubCoreFront';

    return hubMesh;
}

export function positionHubCoreFront(hubMesh, geometry) {
    const { points } = geometry;
    if (!hubMesh) return;

    // Reset transformations
    hubMesh.position.set(0, 0, 0);
    hubMesh.rotation.set(0, 0, 0);
    hubMesh.scale.set(1, 1, 1); // Base scale is handled in stretch function

    // Position at T_end (front wheel center)
    hubMesh.position.copy(points.T_end);

    // Apply rotation to align model (Z-axis rotation for horizontal alignment)
    hubMesh.rotation.z = Math.PI / 2;
    // Apply additional rotations if the base model requires it (e.g., hubMesh.rotation.x = Math.PI / 2;)
}

export function genHubCoreGeo(geometry, scene, hubCoreBaseGeometry) {
    // Create the stretched geometry
    const stretchedGeometry = createHubCoreFrontGeometry(hubCoreBaseGeometry, geometry);
    if (!stretchedGeometry) return null;

    // Create the mesh with tag and front hub color
    const frontHubColor = geometry.params.frontHubColor !== undefined ? geometry.params.frontHubColor : 0xffffff;
    const hubMesh = createHubCoreFrontMesh(stretchedGeometry, frontHubColor);
    if (!hubMesh) return null;

    // Position the mesh
    positionHubCoreFront(hubMesh, geometry);

    // Register and add to scene
    componentRegistry.hubCoreFront = hubMesh; // Register component
    scene.add(hubMesh);

    return hubMesh;
}

// --- Hub End Assembly (Front) ---

function createHubEndMeshes(hubEndBaseGeometry, hubGuardBaseGeometry, params) {
    let leftHubEndMesh = null;
    let rightHubEndMesh = null;
    let leftGuardMesh = null;
    let rightGuardMesh = null;

    const hubEndMaterial = createComponentMaterial('hubEndFront');

    const guardMaterial = createComponentMaterial('hubGuardFront');

    // Create Hub End Meshes
    if (hubEndBaseGeometry) {
        leftHubEndMesh = new THREE.Mesh(hubEndBaseGeometry.clone(), hubEndMaterial.clone());
        leftHubEndMesh.userData.componentType = 'hubEndLeft'; // Tag

        rightHubEndMesh = new THREE.Mesh(hubEndBaseGeometry.clone(), hubEndMaterial.clone());
        rightHubEndMesh.userData.componentType = 'hubEndRight'; // Tag
    }

    // Create Guard Meshes (conditional)
    if (hubGuardBaseGeometry) {
        if (params.hubGuardEnabled_L) { // Check left guard enable flag
            leftGuardMesh = new THREE.Mesh(hubGuardBaseGeometry.clone(), guardMaterial.clone());
            leftGuardMesh.userData.componentType = 'hubGuardLeft'; // Tag
        }
        if (params.hubGuardEnabled_R) { // Check right guard enable flag
            rightGuardMesh = new THREE.Mesh(hubGuardBaseGeometry.clone(), guardMaterial.clone());
            rightGuardMesh.userData.componentType = 'hubGuardRight'; // Tag
        }
    }

    return { leftHubEndMesh, rightHubEndMesh, leftGuardMesh, rightGuardMesh };
}

export function positionHubEndAssembly(meshes, geometry) {
    const { leftHubEndMesh, rightHubEndMesh, leftGuardMesh, rightGuardMesh } = meshes;
    const { points } = geometry; // No params needed here directly

    const HUB_END = {
        SCALE: 1.0,
        Z_OFFSET: -0.6 // Z-offset relative to frontAxel.z
    };
    const GUARD = {
        SCALE: 1.0,
        Z_OFFSET: -0.6 // Same Z-offset as hub ends
    };

    // Position Left Side
    if (leftHubEndMesh) {
        leftHubEndMesh.position.set(0,0,0); // Reset relative position
        leftHubEndMesh.rotation.set(0,0,0);
        leftHubEndMesh.scale.set(HUB_END.SCALE, HUB_END.SCALE, HUB_END.SCALE);
        // Position relative to group origin (frontAxel)
        leftHubEndMesh.position.z = points.frontAxel.z + HUB_END.Z_OFFSET;
    }
    if (leftGuardMesh) {
        leftGuardMesh.position.set(0,0,0); // Reset relative position
        leftGuardMesh.rotation.set(0,0,0);
        leftGuardMesh.scale.set(GUARD.SCALE, GUARD.SCALE, GUARD.SCALE);
        // Position relative to group origin (frontAxel)
        leftGuardMesh.position.z = points.frontAxel.z + GUARD.Z_OFFSET;
    }

    // Position Right Side (Mirrored)
    if (rightHubEndMesh) {
        rightHubEndMesh.position.set(0,0,0); // Reset relative position
        rightHubEndMesh.rotation.set(0,0,0);
        rightHubEndMesh.scale.set(HUB_END.SCALE, HUB_END.SCALE, HUB_END.SCALE); // Use positive scale
        // Position relative to group origin (frontAxel) - applying mirroring logic
        rightHubEndMesh.position.z = -(points.frontAxel.z + HUB_END.Z_OFFSET);
        rightHubEndMesh.rotation.y = Math.PI; // Apply Y rotation for mirroring
    }
    if (rightGuardMesh) {
        rightGuardMesh.position.set(0,0,0); // Reset relative position
        rightGuardMesh.rotation.set(0,0,0);
        rightGuardMesh.scale.set(GUARD.SCALE, GUARD.SCALE, GUARD.SCALE); // Use positive scale
         // Position relative to group origin (frontAxel) - applying mirroring logic
        rightGuardMesh.position.z = -(points.frontAxel.z + GUARD.Z_OFFSET);
        rightGuardMesh.rotation.y = Math.PI; // Apply Y rotation for mirroring
    }
}

export function genHubEndGeo(geometry, scene, hubEndBaseGeometry, hubGuardBaseGeometry) {
    // Create the individual meshes (ends and conditional guards)
    const meshes = createHubEndMeshes(hubEndBaseGeometry, hubGuardBaseGeometry, geometry.params);
    // Check if at least one mesh was created
    if (!meshes.leftHubEndMesh && !meshes.rightHubEndMesh && !meshes.leftGuardMesh && !meshes.rightGuardMesh) {
        return null;
    }

    // Create the group for the assembly
    const hubEndGroup = new THREE.Group();
    hubEndGroup.userData.componentType = 'hubEndAssemblyFront'; // Tag the group

    // Add existing meshes to the group
    if (meshes.leftHubEndMesh) hubEndGroup.add(meshes.leftHubEndMesh);
    if (meshes.rightHubEndMesh) hubEndGroup.add(meshes.rightHubEndMesh);
    if (meshes.leftGuardMesh) hubEndGroup.add(meshes.leftGuardMesh);
    if (meshes.rightGuardMesh) hubEndGroup.add(meshes.rightGuardMesh);

    // Position the meshes *within* the group
    positionHubEndAssembly(meshes, geometry);

    // Position the entire group at the attachment point (frontAxel)
    // Note: The positioning function now handles offsets relative to the group's origin,
    // so the group itself sits exactly at frontAxel.
    hubEndGroup.position.copy(geometry.points.frontAxel);
    hubEndGroup.position.z = 0; // Z is handled internally by positionHubEndAssembly

    // Register and add group to scene
    componentRegistry.hubEndAssemblyFront = hubEndGroup; // Register the group
    scene.add(hubEndGroup);

    return hubEndGroup;
}

// --- Hub Bolt Assembly (Front) ---

function createHubBoltFrontMeshes(boltBaseGeometry) {
    if (!boltBaseGeometry) return { leftBoltMesh: null, rightBoltMesh: null };

    const material = createComponentMaterial('hubBoltFront');

    // Create left bolt mesh
    const leftBoltMesh = new THREE.Mesh(boltBaseGeometry.clone(), material.clone());
    leftBoltMesh.userData.componentType = 'hubBoltFrontLeft'; // Tag

    // Create right bolt mesh
    const rightBoltMesh = new THREE.Mesh(boltBaseGeometry.clone(), material.clone());
    rightBoltMesh.userData.componentType = 'hubBoltFrontRight'; // Tag

    return { leftBoltMesh, rightBoltMesh };
}

export function positionHubBoltFrontAssembly(meshes, geometry) {
    const { leftBoltMesh, rightBoltMesh } = meshes;
    const { points } = geometry;
    const scale = 1.0; // Scale factor

    // Position Left Bolt
    if (leftBoltMesh) {
        // Reset transformations relative to group
        leftBoltMesh.position.set(0, 0, 0);
        leftBoltMesh.rotation.set(0, 0, 0);
        leftBoltMesh.scale.set(1, 1, 1);

        // Apply scale
        leftBoltMesh.scale.set(scale, scale, scale);
        // Position relative to group origin (frontAxel), using its Z
        leftBoltMesh.position.z = points.frontAxel.z;
        // No extra rotation needed for left side
    }

    // Position Right Bolt (Mirrored)
    if (rightBoltMesh) {
         // Reset transformations relative to group
        rightBoltMesh.position.set(0, 0, 0);
        rightBoltMesh.rotation.set(0, 0, 0);
        rightBoltMesh.scale.set(1, 1, 1);

        // Apply scale
        rightBoltMesh.scale.set(scale, scale, scale);
        // Position relative to group origin (frontAxel), mirroring Z
        rightBoltMesh.position.z = -points.frontAxel.z;
        // Apply Y rotation for mirroring
        rightBoltMesh.rotation.y = Math.PI;
    }
}

export function genHubBolt(geometry, scene, boltBaseGeometry) {
    // Create the meshes
    const meshes = createHubBoltFrontMeshes(boltBaseGeometry);
    if (!meshes.leftBoltMesh || !meshes.rightBoltMesh) return null;

    // Create the group for the assembly
    const hubBoltGroupFront = new THREE.Group();
    hubBoltGroupFront.userData.componentType = 'hubBoltAssemblyFront'; // Tag the group

    // Add meshes to the group
    hubBoltGroupFront.add(meshes.leftBoltMesh);
    hubBoltGroupFront.add(meshes.rightBoltMesh);

    // Position the meshes *within* the group
    positionHubBoltFrontAssembly(meshes, geometry);

    // Position the entire group at the attachment point (frontAxel X and Y, Z=0)
    hubBoltGroupFront.position.copy(geometry.points.frontAxel);
    hubBoltGroupFront.position.z = 0; // Z positioning is handled internally

    // Register and add group to scene
    componentRegistry.hubBoltAssemblyFront = hubBoltGroupFront; // Register the group
    scene.add(hubBoltGroupFront);

    return hubBoltGroupFront;
}

// --- Peg Assembly (Front) ---

function createFrontPegMeshes(pegBaseGeometry, params) {
    let leftPegMesh = null;
    let rightPegMesh = null;

    if (!pegBaseGeometry) return { leftPegMesh, rightPegMesh }; // Return nulls if no base geometry

    const material = createComponentMaterial('pegFront');

    // Create Left Peg Mesh (if enabled)
    if (params.frontPegEnabled_L) {
        leftPegMesh = new THREE.Mesh(pegBaseGeometry.clone(), material.clone());
        leftPegMesh.userData.componentType = 'pegFrontLeft'; // Tag
    }

    // Create Right Peg Mesh (if enabled)
    if (params.frontPegEnabled_R) {
        rightPegMesh = new THREE.Mesh(pegBaseGeometry.clone(), material.clone());
        rightPegMesh.userData.componentType = 'pegFrontRight'; // Tag
    }

    return { leftPegMesh, rightPegMesh };
}

export function positionFrontPegAssembly(meshes, geometry) {
    const { leftPegMesh, rightPegMesh } = meshes;
    const { points } = geometry;
    const scale = 1.0; // Scale factor

    // Position Left Peg
    if (leftPegMesh) {
        // Reset transformations relative to group
        leftPegMesh.position.set(0, 0, 0);
        leftPegMesh.rotation.set(0, 0, 0);
        leftPegMesh.scale.set(1, 1, 1);

        // Apply scale
        leftPegMesh.scale.set(scale, scale, scale);
        // Position relative to group origin (frontAxel), using its Z
        leftPegMesh.position.z = points.frontAxel.z;
        // No extra rotation needed for left side
    }

    // Position Right Peg (Mirrored)
    if (rightPegMesh) {
         // Reset transformations relative to group
        rightPegMesh.position.set(0, 0, 0);
        rightPegMesh.rotation.set(0, 0, 0);
        rightPegMesh.scale.set(1, 1, 1);

        // Apply scale
        rightPegMesh.scale.set(scale, scale, scale);
        // Position relative to group origin (frontAxel), mirroring Z
        rightPegMesh.position.z = -points.frontAxel.z;
        // Apply Y rotation for mirroring
        rightPegMesh.rotation.y = Math.PI;
    }
}

export function genPegFront(geometry, scene, pegBaseGeometry) {
    // Create the potential meshes based on params
    const meshes = createFrontPegMeshes(pegBaseGeometry, geometry.params);

    // If neither peg mesh was created, return null
    if (!meshes.leftPegMesh && !meshes.rightPegMesh) {
        // Ensure registry is cleared if pegs were previously present but now disabled
        if (componentRegistry.pegAssemblyFront) {
            // Optionally remove the old group from the scene here if needed
            // scene.remove(componentRegistry.pegAssemblyFront);
            delete componentRegistry.pegAssemblyFront;
        }
        return null;
    }

    // Create the group for the assembly
    const pegGroupFront = new THREE.Group();
    pegGroupFront.userData.componentType = 'pegAssemblyFront'; // Tag the group

    // Add existing meshes to the group
    if (meshes.leftPegMesh) pegGroupFront.add(meshes.leftPegMesh);
    if (meshes.rightPegMesh) pegGroupFront.add(meshes.rightPegMesh);

    // Position the meshes *within* the group
    positionFrontPegAssembly(meshes, geometry);

    // Position the entire group at the attachment point (frontAxel X and Y, Z=0)
    pegGroupFront.position.copy(geometry.points.frontAxel);
    pegGroupFront.position.z = 0; // Z positioning is handled internally

    // Register and add group to scene
    componentRegistry.pegAssemblyFront = pegGroupFront; // Register the group
    scene.add(pegGroupFront);

    return pegGroupFront;
}


