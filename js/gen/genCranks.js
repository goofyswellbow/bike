import * as THREE from 'three';
import { componentRegistry } from '../registry.js';
import { createComponentMaterial } from '../materials.js';



// Shared stretching function for both drive and non-drive sides
function stretchCrankMesh(geometry, targetLength, targetZ, preserveEnds, scale) {
    const stretchedGeo = geometry.clone();
    stretchedGeo.scale(scale, scale, scale);
    const positions = stretchedGeo.attributes.position;

    // Calculate current bounds along X axis
    const bbox = new THREE.Box3().setFromBufferAttribute(positions);
    const currentLength = Math.abs(bbox.min.x);

    // Calculate preserved portions
    const preservedLength = currentLength * (preserveEnds * 2);
    const currentMiddleLength = currentLength - preservedLength;
    const targetMiddleLength = targetLength - preservedLength;
    const stretchFactor = currentMiddleLength === 0 ? 1 : targetMiddleLength / currentMiddleLength; // Avoid division by zero

    // Calculate preserve ranges along X axis
    const preserveRight = 0 - (currentLength * preserveEnds);
    const preserveLeft = bbox.min.x + (currentLength * preserveEnds);

    // Update vertices - stretching in both X and Z
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        if (x < preserveRight && x > preserveLeft) {
            const distanceFromRight = preserveRight - x;
            const newX = preserveRight - (distanceFromRight * stretchFactor);
            positions.setX(i, newX);

            const xProgress = (preserveLeft - preserveRight) === 0 ? 0 : Math.abs((x - preserveRight) / (preserveLeft - preserveRight)); // Avoid division by zero
            const newZ = z + (targetZ * xProgress);
            positions.setZ(i, newZ);
        } else if (x <= preserveLeft) {
            const totalStretch = targetMiddleLength - currentMiddleLength;
            positions.setX(i, x - totalStretch);
            positions.setZ(i, z + targetZ);
        }
    }

    positions.needsUpdate = true;
    stretchedGeo.computeVertexNormals();

    return stretchedGeo;
}

// --- Drive Side Crank Arm ---

function createCrankArmDriverGeometry(crankBaseGeometry, geometry) {
    const CRANK_PARAMS = {
        SCALE: 1.0,
        HOLE_OFFSET: 1.1,
        PRESERVE_ENDS: 0.1
    };
    const { points } = geometry;

    if (!crankBaseGeometry) return null;

    const direction = new THREE.Vector3()
        .subVectors(points.Crnk_End, points.Crnk_Center)
        .normalize();

    const basePoint = points.Crnk_End.clone().add(
        direction.clone().multiplyScalar(CRANK_PARAMS.HOLE_OFFSET)
    );

    const targetLength = basePoint.distanceTo(points.Crnk_Center);
    const targetZ = basePoint.z - points.Crnk_Center.z;

    const stretchedGeometry = stretchCrankMesh(
        crankBaseGeometry,
        targetLength,
        targetZ,
        CRANK_PARAMS.PRESERVE_ENDS,
        CRANK_PARAMS.SCALE
    );

    return stretchedGeometry;
}

export function positionCrankArmDriver(crankMesh, geometry) {
    const { points, rotations } = geometry;
    if (!crankMesh) return;

    // Position at crank center
    crankMesh.position.copy(points.Crnk_Center);
    
    // Calculate direction from center to end
    const direction = new THREE.Vector3().subVectors(points.Crnk_End, points.Crnk_Center);
    const angle = Math.atan2(direction.y, direction.x);
    
    // Apply crank orientation + total leveling rotation + 180° flip
    crankMesh.rotation.z = angle + rotations.total + Math.PI;
}

export function genCrankArmDriverGeo(geometry, scene, crankBaseGeometry) {
    if (!crankBaseGeometry) return null;

    // Create geometry
    const crankGeometry = createCrankArmDriverGeometry(crankBaseGeometry, geometry);
    if (!crankGeometry) return null;

    // Create material
    const material = createComponentMaterial('crankArm', { color: geometry.params.crankColor });

    // Create mesh
    const crankMesh = new THREE.Mesh(crankGeometry, material);
    // Add identification tag
    crankMesh.userData.componentType = 'crankDrive';

    // Position mesh
    positionCrankArmDriver(crankMesh, geometry);

    // Register and add to scene
    componentRegistry.crankDrive = crankMesh; // Ensure registration
    scene.add(crankMesh);

    return crankMesh;
}


// --- Non-Drive Side Crank Arm ---

function createCrankArmNonDriveGeometry(crankBaseGeometry, geometry) {
    const CRANK_PARAMS = {
        SCALE: 1.0,
        HOLE_OFFSET: 1.1,
        PRESERVE_ENDS: 0.1
    };
    const { points } = geometry;

    if (!crankBaseGeometry) return null;

    const direction = new THREE.Vector3()
        .subVectors(points.Crnk_End_NonD, points.Crnk_Center_NonD)
        .normalize();

    const basePoint = points.Crnk_End_NonD.clone().add(
        direction.clone().multiplyScalar(CRANK_PARAMS.HOLE_OFFSET)
    );

    const targetLength = basePoint.distanceTo(points.Crnk_Center_NonD);
    const targetZ = basePoint.z - points.Crnk_Center_NonD.z;

    // Note: We use the same stretch function, the direction difference is handled by the points
    const stretchedGeometry = stretchCrankMesh(
        crankBaseGeometry,
        targetLength,
        targetZ,
        CRANK_PARAMS.PRESERVE_ENDS,
        CRANK_PARAMS.SCALE
    );

    return stretchedGeometry;
}

export function positionCrankArmNonDrive(crankMesh, geometry) {
    const { points, rotations } = geometry;
    if (!crankMesh) return;

    // Position at crank center
    crankMesh.position.copy(points.Crnk_Center_NonD);
    
    // Calculate direction from center to end
    const direction = new THREE.Vector3().subVectors(points.Crnk_End_NonD, points.Crnk_Center_NonD);
    const angle = Math.atan2(direction.y, direction.x);
    
    // Apply crank orientation + total leveling rotation + 180° flip
    crankMesh.rotation.z = angle + rotations.total + Math.PI;
}

export function genCrankArmNonDriveGeo(geometry, scene, crankBaseGeometry) {
    if (!crankBaseGeometry) return null;

    // Create geometry
    const crankGeometry = createCrankArmNonDriveGeometry(crankBaseGeometry, geometry);
    if (!crankGeometry) return null;

    // Create material
    const material = createComponentMaterial('crankArm', { color: geometry.params.crankColor });

    // Create mesh
    const crankMesh = new THREE.Mesh(crankGeometry, material);
    // Add identification tag
    crankMesh.userData.componentType = 'crankNonDrive';

    // Position mesh
    positionCrankArmNonDrive(crankMesh, geometry);

    // Register and add to scene
    componentRegistry.crankNonDrive = crankMesh; // Ensure registration
    scene.add(crankMesh);

    return crankMesh;
}





// --- Drive Side Pedal ---

function createPedalDriveGroup(pedalBaseGeometry, pedalAxleGeometry, pedalColor = 0x2f3588) {
    const pedalGroup = new THREE.Group();
    // Add identification tag
    pedalGroup.userData.componentType = 'pedalDrive';

    // Create pedal body mesh
    if (pedalBaseGeometry) {
        const pedalMaterial = createComponentMaterial('pedalBody', { color: pedalColor });
        const pedalMesh = new THREE.Mesh(pedalBaseGeometry, pedalMaterial);
        pedalMesh.userData.componentType = 'pedalMain'; // Tag for selective color updates
        pedalGroup.add(pedalMesh);
    }

    // Create axle mesh
    if (pedalAxleGeometry) {
        const axleMaterial = createComponentMaterial('pedalAxle'); // Fixed color
        const axleMesh = new THREE.Mesh(pedalAxleGeometry, axleMaterial);
        axleMesh.userData.componentType = 'pedalAxle'; // Tag for identification
        pedalGroup.add(axleMesh);
    }

    // Return the group containing the meshes, unscaled and unpositioned
    return pedalGroup;
}

export function positionPedalDrive(pedalGroup, geometry) {
    const { points, params } = geometry;
    const PEDAL = {
        SCALE: 1,    // Base scale
        Z_OFFSET: 1  // Base Z offset for drive side
    };

    if (!pedalGroup) return;

    // Calculate scale and Z offset based on isRHD - invert when drive switches sides
    const xScale = params.isRHD ? -PEDAL.SCALE : PEDAL.SCALE;
    const zOffset = params.isRHD ? -PEDAL.Z_OFFSET : PEDAL.Z_OFFSET;

    // Apply scale
    pedalGroup.scale.set(xScale, PEDAL.SCALE, PEDAL.SCALE);

    // Set position based on crank end and adjusted Z offset
    pedalGroup.position.copy(points.Crnk_End);
    pedalGroup.position.z += zOffset;

    // Handle isRHD: when drive switches to right side, flip pedal threading
    if (params.isRHD) {
        // Right side now needs left-threaded pedal orientation (180° Y rotation)
        pedalGroup.rotation.set(0, Math.PI, 0);
    } else {
        // Left side (default) uses right-threaded pedal orientation (no rotation)
        pedalGroup.rotation.set(0, 0, 0);
    }
}

export function genPedal(geometry, scene, pedalBaseGeometry, pedalAxleGeometry) {
    // Create the group with meshes
    const pedalGroup = createPedalDriveGroup(pedalBaseGeometry, pedalAxleGeometry, geometry.params.pedalColor);
    if (!pedalGroup || pedalGroup.children.length === 0) return null; // Handle case where geometries might be null

    // Position the group
    positionPedalDrive(pedalGroup, geometry);

    // Register and add to scene
    componentRegistry.pedalGroupDrive = pedalGroup; // Ensure registration
    scene.add(pedalGroup);

    return pedalGroup;
}


// --- Non-Drive Side Pedal ---

function createPedalNonDriveGroup(pedalBaseGeometry, pedalAxleGeometry, pedalColor = 0x2f3588) {
    const pedalGroup = new THREE.Group();
    // Add identification tag
    pedalGroup.userData.componentType = 'pedalNonDrive';

    // Create pedal body mesh
    if (pedalBaseGeometry) {
        const pedalMaterial = createComponentMaterial('pedalBody', { color: pedalColor });
        const pedalMesh = new THREE.Mesh(pedalBaseGeometry, pedalMaterial);
        pedalMesh.userData.componentType = 'pedalMain'; // Tag for selective color updates
        pedalGroup.add(pedalMesh);
    }

    // Create axle mesh
    if (pedalAxleGeometry) {
        const axleMaterial = createComponentMaterial('pedalAxle'); // Fixed color
        const axleMesh = new THREE.Mesh(pedalAxleGeometry, axleMaterial);
        axleMesh.userData.componentType = 'pedalAxle'; // Tag for identification
        pedalGroup.add(axleMesh);
    }

    return pedalGroup;
}

export function positionPedalNonDrive(pedalGroup, geometry) {
    const { points, params } = geometry;
    const PEDAL = {
        SCALE: 1,     // Base scale
        Z_OFFSET: -1  // Base negative Z offset for non-drive side
    };

    if (!pedalGroup) return;

    // Calculate scale and Z offset based on isRHD - invert when drive switches sides  
    const xScale = params.isRHD ? PEDAL.SCALE : -PEDAL.SCALE; // Non-drive was originally negative, so flip logic
    const zOffset = params.isRHD ? -PEDAL.Z_OFFSET : PEDAL.Z_OFFSET;

    // Apply scale
    pedalGroup.scale.set(xScale, PEDAL.SCALE, PEDAL.SCALE);

    // Set position based on non-drive crank end and adjusted Z offset
    pedalGroup.position.copy(points.Crnk_End_NonD);
    pedalGroup.position.z += zOffset;

    // Handle isRHD: when drive switches to right side, non-drive threading changes
    if (params.isRHD) {
        // Left side now needs right-threaded pedal orientation (no Y rotation)
        pedalGroup.rotation.set(0, 0, 0);
    } else {
        // Right side (default) uses left-threaded pedal orientation (180° Y rotation)
        pedalGroup.rotation.set(0, Math.PI, 0);
    }
}

export function genPedalNonDrive(geometry, scene, pedalBaseGeometry, pedalAxleGeometry) {
    // Create the group with meshes
    const pedalGroup = createPedalNonDriveGroup(pedalBaseGeometry, pedalAxleGeometry, geometry.params.pedalColor);
     if (!pedalGroup || pedalGroup.children.length === 0) return null;

    // Position the group
    positionPedalNonDrive(pedalGroup, geometry);

    // Register and add to scene
    componentRegistry.pedalGroupNonDrive = pedalGroup; // Ensure registration
    scene.add(pedalGroup);

    return pedalGroup;
}




// --- Sprocket Bolt ---

function createSprocketBoltMesh(sprocketBoltBaseGeometry) {
    if (!sprocketBoltBaseGeometry) return null;

    const material = createComponentMaterial('bolt');

    const mesh = new THREE.Mesh(sprocketBoltBaseGeometry, material);
    // Add identification tag
    mesh.userData.componentType = 'sprocketBolt';

    return mesh;
}

export function positionSprocketBolt(sprocketBoltMesh, geometry) {
    const { points, rotations, params } = geometry;
    const BOLT = {
        RADIUS: 3,     // Fixed radius for bolt placement
        SCALE: 1.0,      // Base scale of the bolt model
        ANGLE: Math.PI,  // Starting angle (180 degrees)
        Z_OFFSET: -0.3    // Base Z offset for fine positioning
    };

    if (!sprocketBoltMesh) return;

    // Reset transformations (especially important for repositioning)
    sprocketBoltMesh.position.set(0, 0, 0);
    sprocketBoltMesh.rotation.set(0, 0, 0);
    sprocketBoltMesh.scale.set(1, 1, 1);

    // Apply leftFootForward logic - same as cranks
    const effectiveStance = params.isRHD ? !params.leftFootForward : params.leftFootForward;
    const stanceRotation = effectiveStance ? 0 : Math.PI; // 180° when right foot forward

    // Handle isRHD: invert Z_OFFSET and Z scale when drive switches sides
    const zOffset = params.isRHD ? -BOLT.Z_OFFSET : BOLT.Z_OFFSET;
    const zScale = params.isRHD ? -BOLT.SCALE : BOLT.SCALE;

    // Calculate position on fixed radius, considering total rotation and stance
    const angle = BOLT.ANGLE + rotations.total + stanceRotation;
    const x = Math.cos(angle) * BOLT.RADIUS + points.Spkt_Center.x;
    const y = Math.sin(angle) * BOLT.RADIUS + points.Spkt_Center.y;
    const z = points.Spkt_Center.z + zOffset;

    // Set position
    sprocketBoltMesh.position.set(x, y, z);

    // Apply rotation
    sprocketBoltMesh.rotation.z = angle;

    // Apply scale with adjusted Z scale
    sprocketBoltMesh.scale.set(BOLT.SCALE, BOLT.SCALE, zScale);
}

export function genSprocketBolt(geometry, scene, sprocketBoltBaseGeometry) {
    // Create the mesh
    const mesh = createSprocketBoltMesh(sprocketBoltBaseGeometry);
    if (!mesh) return null;

    // Position the mesh
    positionSprocketBolt(mesh, geometry);

    // Register and add to scene
    componentRegistry.sprocketBolt = mesh; // Ensure registration
    scene.add(mesh);

    return mesh;
}





// --- Drive Side Crank Bolt ---

function createCrankBoltDriveMesh(crankBoltBaseGeometry) {
    if (!crankBoltBaseGeometry) return null;

    const material = createComponentMaterial('bolt');

    const mesh = new THREE.Mesh(crankBoltBaseGeometry, material);
    // Add identification tag
    mesh.userData.componentType = 'crankBoltDrive';

    return mesh;
}

export function positionCrankBoltDrive(crankBoltMesh, geometry) {
    const { points, params } = geometry;
    const BOLT = {
        SCALE: 1.0,     // Adjust this to change bolt size
        Z_OFFSET: 0.04     // Add Z offset if needed
    };

    if (!crankBoltMesh) return;

    // Reset transformations
    crankBoltMesh.position.set(0, 0, 0);
    crankBoltMesh.rotation.set(0, 0, 0);
    crankBoltMesh.scale.set(1, 1, 1);

    // Position at crank center with offset
    crankBoltMesh.position.copy(points.Crnk_Center);
    crankBoltMesh.position.z += BOLT.Z_OFFSET;

    // Handle isRHD: invert Z scale when drive switches sides
    const zScale = params.isRHD ? -BOLT.SCALE : BOLT.SCALE;
    crankBoltMesh.scale.set(BOLT.SCALE, BOLT.SCALE, zScale);

    // No specific rotation needed for drive side bolt based on original code
}

export function genCrankBolt(geometry, scene, crankBoltBaseGeometry) {
    // Create the mesh
    const mesh = createCrankBoltDriveMesh(crankBoltBaseGeometry);
    if (!mesh) return null;

    // Position the mesh
    positionCrankBoltDrive(mesh, geometry);

    // Register and add to scene
    componentRegistry.crankBoltDrive = mesh; // Register component
    scene.add(mesh);

    return mesh;
}


// --- Non-Drive Side Crank Bolt ---

function createCrankBoltNonDriveMesh(crankBoltBaseGeometry) {
    if (!crankBoltBaseGeometry) return null;

    const material = createComponentMaterial('bolt');

    const mesh = new THREE.Mesh(crankBoltBaseGeometry, material);
    // Add identification tag
    mesh.userData.componentType = 'crankBoltNonDrive';

    return mesh;
}

export function positionCrankBoltNonDrive(crankBoltMesh, geometry) {
    const { points, params } = geometry;
    const BOLT = {
        SCALE: 1.0,      // Same scale as drive side
        Z_OFFSET: 0.04    // Keep same Z offset as drive side for consistency
    };

    if (!crankBoltMesh) return;

    // Reset transformations
    crankBoltMesh.position.set(0, 0, 0);
    crankBoltMesh.rotation.set(0, 0, 0);
    crankBoltMesh.scale.set(1, 1, 1);

    // Position at non-drive crank center with offset
    crankBoltMesh.position.copy(points.Crnk_Center_NonD);
    crankBoltMesh.position.z += BOLT.Z_OFFSET;

    // Handle isRHD: invert Z scale when drive switches sides
    const zScale = params.isRHD ? -BOLT.SCALE : BOLT.SCALE;
    crankBoltMesh.scale.set(-BOLT.SCALE, BOLT.SCALE, zScale);

    // Apply 180-degree Y rotation for mirroring
    crankBoltMesh.rotation.y = Math.PI;
}

export function genCrankBoltNonDrive(geometry, scene, crankBoltBaseGeometry) {
    // Create the mesh
    const mesh = createCrankBoltNonDriveMesh(crankBoltBaseGeometry);
    if (!mesh) return null;

    // Position the mesh
    positionCrankBoltNonDrive(mesh, geometry);

    // Register and add to scene
    componentRegistry.crankBoltNonDrive = mesh; // Register component
    scene.add(mesh);

    return mesh;
}





// --- Drive Side Bottom Bracket Assembly ---

function createBBDriveMeshes(bbConeBaseGeometry, bbSpacerBaseGeometry, params, bbCoverColor = 0x404040, bbSpacerColor = 0x404040) {
    let bbCoverMesh = null;
    const bbSpacerMeshes = [];

    const coverMaterial = createComponentMaterial('bbCover', { color: bbCoverColor });
    const spacerMaterial = createComponentMaterial('bbSpacer', { color: bbSpacerColor });

    // Create BB Cover Mesh
    if (bbConeBaseGeometry) {
        bbCoverMesh = new THREE.Mesh(bbConeBaseGeometry.clone(), coverMaterial);
        bbCoverMesh.userData.componentType = 'bbCover'; // Explicitly tag for lookup
    }

    // Create BB Spacer Meshes
    if (bbSpacerBaseGeometry && params.BB_SpacerCount > 0) {
        for (let i = 0; i < params.BB_SpacerCount; i++) {
            const spacerMesh = new THREE.Mesh(bbSpacerBaseGeometry.clone(), spacerMaterial.clone());
            spacerMesh.userData.componentType = 'bbSpacer'; // Explicitly tag for lookup
            spacerMesh.userData.spacerIndex = i; // Add index for debugging
            bbSpacerMeshes.push(spacerMesh);
        }
    }

    return { bbCoverMesh, bbSpacerMeshes };
}
// Updated positioning function for BB Drive
export function positionBBDrive(meshes, geometry) {
    const { bbCoverMesh, bbSpacerMeshes } = meshes;
    const { points, params } = geometry;
    const BB = {
        BASE_SCALE: 1 // Base X/Y scale
    };

    // Position BB Cover
    if (bbCoverMesh) {
        // Reset transformations
        bbCoverMesh.position.set(0, 0, 0);
        bbCoverMesh.rotation.set(0, 0, 0);
        bbCoverMesh.scale.set(1, 1, 1);

        bbCoverMesh.geometry.computeBoundingBox(); // Ensure bounding box is up-to-date
        const bbox = bbCoverMesh.geometry.boundingBox;
        const originalLength = bbox.max.z - bbox.min.z;
        const targetLength = points.BB_headsetEnd.distanceTo(points.BB_headsetStart);
        let zScaleFactor = originalLength === 0 ? 1 : targetLength / originalLength; // Avoid division by zero

        // Handle isRHD: invert zScaleFactor when drive switches sides
        if (params.isRHD) {
            zScaleFactor = -zScaleFactor;
        }

        bbCoverMesh.scale.set(BB.BASE_SCALE, BB.BASE_SCALE, zScaleFactor);
        
        // Position in local space (relative to group at midAxel)
        const localPosition = new THREE.Vector3().subVectors(points.BB_headsetStart, points.midAxel);
        bbCoverMesh.position.copy(localPosition);
    }

    // Position BB Spacers
    if (bbSpacerMeshes && bbSpacerMeshes.length > 0) {
        const spacerDirection = new THREE.Vector3()
            .subVectors(points.BB_SpacerEnd, points.BB_headsetEnd)
            .normalize();

        bbSpacerMeshes.forEach((spacerMesh, i) => {
            // Reset transformations
            spacerMesh.position.set(0, 0, 0);
            spacerMesh.rotation.set(0, 0, 0);
            spacerMesh.scale.set(1, 1, 1);

            spacerMesh.geometry.computeBoundingBox(); // Ensure bounding box is up-to-date
            const spacerBBox = spacerMesh.geometry.boundingBox;
            const originalSpacerLength = spacerBBox.max.z - spacerBBox.min.z;
            let spacerZScale = originalSpacerLength === 0 ? 1 : params.BB_SpacerWidth / originalSpacerLength; // Avoid division by zero

            // Handle isRHD: invert spacerZScale when drive switches sides
            if (params.isRHD) {
                spacerZScale = -spacerZScale;
            }

            spacerMesh.scale.set(BB.BASE_SCALE, BB.BASE_SCALE, spacerZScale);

            // Calculate spacer offset from headset end
            const spacerOffset = spacerDirection.clone().multiplyScalar(params.BB_SpacerWidth * i);
            const worldPosition = points.BB_headsetEnd.clone().add(spacerOffset);
            
            // Convert to local position (relative to group at midAxel)
            const localPosition = new THREE.Vector3().subVectors(worldPosition, points.midAxel);
            spacerMesh.position.copy(localPosition);
        });
    }
}

export function genBB(geometry, scene, bbConeBaseGeometry, bbSpacerBaseGeometry) {
    // Create the individual meshes
    const meshes = createBBDriveMeshes(bbConeBaseGeometry, bbSpacerBaseGeometry, geometry.params, geometry.params.bbCoverColor, geometry.params.bbSpacerColor);
    if (!meshes.bbCoverMesh && meshes.bbSpacerMeshes.length === 0) {
        console.warn("No BB Drive meshes could be created");
        if (componentRegistry.bbDrive) delete componentRegistry.bbDrive;
        return null; // Nothing to generate
    }

    // Create a group for the assembly
    const bbGroupDrive = new THREE.Group();
    bbGroupDrive.userData.componentType = 'bbDrive'; // Add identification tag

    // Add meshes to the group
    if (meshes.bbCoverMesh) {
        bbGroupDrive.add(meshes.bbCoverMesh);
    }
    
    meshes.bbSpacerMeshes.forEach(spacer => {
        bbGroupDrive.add(spacer);
    });

    // Position the individual meshes within the group
    positionBBDrive(meshes, geometry);
    
    // Position the entire group at midAxel
    bbGroupDrive.position.copy(geometry.points.midAxel);

    // Register and add group to scene
    if (componentRegistry.bbDrive) {
        // Remove old instance if it exists
        scene.remove(componentRegistry.bbDrive);
    }
    
    componentRegistry.bbDrive = bbGroupDrive; // Register the group
    scene.add(bbGroupDrive);

    return bbGroupDrive;
}


// --- Non-Drive Side Bottom Bracket Assembly ---

function createBBNonDriveMeshes(bbConeBaseGeometry, bbSpacerBaseGeometry, params, bbCoverColor = 0x404040, bbSpacerColor = 0x404040) {
    let bbCoverMesh = null;
    const bbSpacerMeshes = [];

    const coverMaterial = createComponentMaterial('bbCover', { color: bbCoverColor });
    const spacerMaterial = createComponentMaterial('bbSpacer', { color: bbSpacerColor });

    // Create BB Cover Mesh
    if (bbConeBaseGeometry) {
        bbCoverMesh = new THREE.Mesh(bbConeBaseGeometry.clone(), coverMaterial);
        bbCoverMesh.userData.componentType = 'bbCover'; // Explicitly tag for lookup
    }

    // Create BB Spacer Meshes (using NonD count)
    if (bbSpacerBaseGeometry && params.BB_SpacerCount_NonD > 0) {
        for (let i = 0; i < params.BB_SpacerCount_NonD; i++) {
            const spacerMesh = new THREE.Mesh(bbSpacerBaseGeometry.clone(), spacerMaterial.clone());
            spacerMesh.userData.componentType = 'bbSpacer'; // Explicitly tag for lookup
            spacerMesh.userData.spacerIndex = i; // Add index for debugging
            bbSpacerMeshes.push(spacerMesh);
        }
    }

    return { bbCoverMesh, bbSpacerMeshes };
}

export function positionBBNonDrive(meshes, geometry) {
    const { bbCoverMesh, bbSpacerMeshes } = meshes;
    const { points, params } = geometry;
    const BB = {
        BASE_SCALE: 1 // Base X/Y scale
    };

    // Position BB Cover
    if (bbCoverMesh) {
        // Reset transformations
        bbCoverMesh.position.set(0, 0, 0);
        bbCoverMesh.rotation.set(0, 0, 0);
        bbCoverMesh.scale.set(1, 1, 1);
        
        // Make sure the mesh is visible
        bbCoverMesh.visible = true;

        bbCoverMesh.geometry.computeBoundingBox();
        const bbox = bbCoverMesh.geometry.boundingBox;
        const originalLength = bbox.max.z - bbox.min.z;
        const targetLength = points.BB_headsetEnd_NonD.distanceTo(points.BB_headsetStart_NonD);
        let zScaleFactor = originalLength === 0 ? 1 : targetLength / originalLength;

        // Handle isRHD: invert zScaleFactor when drive switches sides
        if (params.isRHD) {
            zScaleFactor = -zScaleFactor;
        }

        // Apply negative Z scale for non-drive side (or positive if inverted by isRHD)
        bbCoverMesh.scale.set(BB.BASE_SCALE, BB.BASE_SCALE, -zScaleFactor);
        
        // Position in local space (relative to group at midAxel)
        const localPosition = new THREE.Vector3().subVectors(points.BB_headsetStart_NonD, points.midAxel);
        bbCoverMesh.position.copy(localPosition);
    }

    // Position BB Spacers
    if (bbSpacerMeshes && bbSpacerMeshes.length > 0) {
        const spacerDirection = new THREE.Vector3()
            .subVectors(points.BB_SpacerEnd_NonD, points.BB_headsetEnd_NonD)
            .normalize();

        bbSpacerMeshes.forEach((spacerMesh, i) => {
            // Make sure the mesh is visible
            spacerMesh.visible = true;
            
            // Reset transformations
            spacerMesh.position.set(0, 0, 0);
            spacerMesh.rotation.set(0, 0, 0);
            spacerMesh.scale.set(1, 1, 1);

            spacerMesh.geometry.computeBoundingBox();
            const spacerBBox = spacerMesh.geometry.boundingBox;
            const originalSpacerLength = spacerBBox.max.z - spacerBBox.min.z;
            let spacerZScale = originalSpacerLength === 0 ? 1 : params.BB_SpacerWidth_NonD / originalSpacerLength;

            // Handle isRHD: invert spacerZScale when drive switches sides
            if (params.isRHD) {
                spacerZScale = -spacerZScale;
            }

            // Apply negative Z scale for non-drive side (or positive if inverted by isRHD)
            spacerMesh.scale.set(BB.BASE_SCALE, BB.BASE_SCALE, -spacerZScale);

            // Calculate spacer offset
            const spacerOffset = spacerDirection.clone().multiplyScalar(params.BB_SpacerWidth_NonD * i);
            const worldPosition = points.BB_headsetEnd_NonD.clone().add(spacerOffset);
            
            // Convert to local position (relative to group at midAxel)
            const localPosition = new THREE.Vector3().subVectors(worldPosition, points.midAxel);
            spacerMesh.position.copy(localPosition);
        });
    }
}

export function genBBNonDrive(geometry, scene, bbConeBaseGeometry, bbSpacerBaseGeometry) {
    // Create the individual meshes
    const meshes = createBBNonDriveMeshes(bbConeBaseGeometry, bbSpacerBaseGeometry, geometry.params, geometry.params.bbCoverColor, geometry.params.bbSpacerColor);
    if (!meshes.bbCoverMesh && meshes.bbSpacerMeshes.length === 0) {
        console.warn("No BB Non-Drive meshes could be created");
        if (componentRegistry.bbNonDrive) delete componentRegistry.bbNonDrive;
        return null;
    }

    // Create a group for the assembly
    const bbGroupNonDrive = new THREE.Group();
    bbGroupNonDrive.userData.componentType = 'bbNonDrive'; // Add identification tag

    // Add positioned meshes to the group
    if (meshes.bbCoverMesh) {
        bbGroupNonDrive.add(meshes.bbCoverMesh);
    }
    meshes.bbSpacerMeshes.forEach(spacer => bbGroupNonDrive.add(spacer));

    // Position the individual meshes within the group
    positionBBNonDrive(meshes, geometry);
    
    // Position the entire group at midAxel
    bbGroupNonDrive.position.copy(geometry.points.midAxel);

    // Register and add group to scene
    if (componentRegistry.bbNonDrive) {
        // Remove old instance if it exists
        scene.remove(componentRegistry.bbNonDrive);
    }
    
    componentRegistry.bbNonDrive = bbGroupNonDrive; // Register the group
    scene.add(bbGroupNonDrive);

    return bbGroupNonDrive;
}


