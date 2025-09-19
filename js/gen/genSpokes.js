console.log('Loading genSpokes.js...');
import * as THREE from 'three';
import { componentRegistry } from '../registry.js';
import { createComponentMaterial } from '../materials.js';



//----------------------------------------------------------------
// SPOKE ETC -----------------------------------------------------
//----------------------------------------------------------------

// --- Spoke Assemblies ---

function createSingleSpokeSetGroup(spokeData, color, tag, materialType) {
    if (!spokeData || spokeData.length === 0) return null;

    const spokeRadius = 0.09;
    const radialSegments = 8;
    const group = new THREE.Group();
    group.userData.componentType = tag; // Tag this specific set

    const material = createComponentMaterial(materialType, { color: color });

    spokeData.forEach(spoke => {
        if (!spoke || !spoke.start || !spoke.end) {
            console.warn(`Invalid spoke data encountered in set ${tag}`);
            return; // Skip invalid spoke data
        }
        const direction = new THREE.Vector3().subVectors(spoke.end, spoke.start);
        const length = direction.length();
        // Handle potential zero length spokes
        if (length < 1e-6) {
             console.warn(`Zero length spoke detected in set ${tag}`);
             return; // Skip zero-length spoke
        }

        const cylinderGeometry = new THREE.CylinderGeometry(
            spokeRadius,
            spokeRadius,
            length,
            radialSegments
        );

        const spokeMesh = new THREE.Mesh(cylinderGeometry, material);

        // Position and orient the individual spoke mesh relative to the group origin
        const midpoint = new THREE.Vector3().addVectors(spoke.start, spoke.end).multiplyScalar(0.5);
        spokeMesh.position.copy(midpoint);

        const upVector = new THREE.Vector3(0, 1, 0); // Cylinder default axis
        const quaternion = new THREE.Quaternion();
        // Normalize direction before using setFromUnitVectors
        quaternion.setFromUnitVectors(upVector, direction.normalize());
        spokeMesh.setRotationFromQuaternion(quaternion);

        group.add(spokeMesh);
    });

    // Return the group with spokes positioned relative to (0,0,0)
    return group;
}

export function positionSpokeAssembly(assemblyGroup, attachPoint, totalRotation) {
    if (!assemblyGroup) return;

    // Reset transformations (relative to scene)
    assemblyGroup.position.set(0, 0, 0);
    assemblyGroup.rotation.set(0, 0, 0);
    assemblyGroup.scale.set(1, 1, 1);

    // Position the entire assembly group
    assemblyGroup.position.copy(attachPoint);
    // Rotate the entire assembly group
    assemblyGroup.rotation.z = totalRotation;
}

export function genFrontSpokes(geometry, scene) {
    const { points, spokePatterns, rotations, params } = geometry;
    
    // Get colors from parameters or use defaults
    const frontSpokeAColor = params.frontSpokeAColor !== undefined ? params.frontSpokeAColor : 0xff4444;
    const frontSpokeBColor = params.frontSpokeBColor !== undefined ? params.frontSpokeBColor : 0x44ff44;

    // Create individual spoke set groups
    const frontRedGroup = createSingleSpokeSetGroup(spokePatterns.front.spokes.red, frontSpokeAColor, 'spokeSetFrontRed', 'spokeSetA');
    const frontYellowGroup = createSingleSpokeSetGroup(spokePatterns.front.spokes.yellow, frontSpokeBColor, 'spokeSetFrontYellow', 'spokeSetB');

    // If neither set could be created, exit
    if (!frontRedGroup && !frontYellowGroup) {
        if (componentRegistry.frontSpokes) delete componentRegistry.frontSpokes;
        return null;
    }

    // Create the main assembly group
    const frontSpokesGroup = new THREE.Group();
    frontSpokesGroup.userData.componentType = 'frontSpokeAssembly'; // Tag the assembly

    // Add the individual sets to the main group
    if (frontRedGroup) frontSpokesGroup.add(frontRedGroup);
    if (frontYellowGroup) frontSpokesGroup.add(frontYellowGroup);

    // Position the main assembly group
    positionSpokeAssembly(frontSpokesGroup, points.T_end, rotations.total);

    // Register and add to scene
    componentRegistry.frontSpokes = frontSpokesGroup;
    scene.add(frontSpokesGroup);

    return frontSpokesGroup;
}

export function genRearSpokes(geometry, scene) {
    const { points, spokePatterns, rotations, params } = geometry;
    
    // Get colors from parameters or use defaults
    const rearSpokeAColor = params.rearSpokeAColor !== undefined ? params.rearSpokeAColor : 0x4444ff;
    const rearSpokeBColor = params.rearSpokeBColor !== undefined ? params.rearSpokeBColor : 0xff44ff;

    // Create individual spoke set groups
    const rearRedGroup = createSingleSpokeSetGroup(spokePatterns.rear.spokes.red, rearSpokeAColor, 'spokeSetRearRed', 'spokeSetA');
    const rearYellowGroup = createSingleSpokeSetGroup(spokePatterns.rear.spokes.yellow, rearSpokeBColor, 'spokeSetRearYellow', 'spokeSetB');

     // If neither set could be created, exit
    if (!rearRedGroup && !rearYellowGroup) {
        if (componentRegistry.rearSpokes) delete componentRegistry.rearSpokes;
        return null;
    }

    // Create the main assembly group
    const rearSpokesGroup = new THREE.Group();
    rearSpokesGroup.userData.componentType = 'rearSpokeAssembly'; // Tag the assembly

    // Add the individual sets to the main group
    if (rearRedGroup) rearSpokesGroup.add(rearRedGroup);
    if (rearYellowGroup) rearSpokesGroup.add(rearYellowGroup);

    // Position the main assembly group
    positionSpokeAssembly(rearSpokesGroup, points.S_end, rotations.total);

    // Register and add to scene
    componentRegistry.rearSpokes = rearSpokesGroup;
    scene.add(rearSpokesGroup);

    return rearSpokesGroup;
}

// --- Spoke Nipples (Instanced) ---

export function positionSpokeNipples(spokeNippleInstancedMesh, spokeNippleInst, geometry) {
    if (!spokeNippleInstancedMesh || !spokeNippleInst) return;

    const { spokePatterns, rotations, points } = geometry;
    const totalRotation = rotations.total;

    // Define constants for nipple positioning
    const NIPPLE = {
        SCALE: 1,
        RIM_OFFSET: 1,
        ROTATION_X: Math.PI / 2
    };

    let nippleIndex = 0; // Initialize instance counter

    // Helper function for placing nipples correctly oriented along spokes
    function placeNipplesOnSpokeSet(spokeSet, wheelCenter) {
        if (!spokeSet) return; // Skip if spoke data is missing

        spokeSet.forEach(spoke => {
            if (!spoke || !spoke.start || !spoke.end) {
                 console.warn("Invalid spoke data in placeNipplesOnSpokeSet");
                 return; // Skip invalid spoke
            }

            const rimEnd = spoke.end.clone();
            const hubEnd = spoke.start.clone();
            const spokeDirection = new THREE.Vector3().subVectors(hubEnd, rimEnd).normalize();
            const nipplePosition = rimEnd.clone();
            if (NIPPLE.RIM_OFFSET !== 0) { // Apply offset only if non-zero
                nipplePosition.add(spokeDirection.clone().multiplyScalar(NIPPLE.RIM_OFFSET));
            }

            // Reset dummy instance transformations
            spokeNippleInst.position.set(0, 0, 0);
            spokeNippleInst.rotation.set(0, 0, 0);
            spokeNippleInst.scale.set(1, 1, 1);

            // Position at the calculated nipple position
            spokeNippleInst.position.copy(nipplePosition);

            // --- Orientation ---
            const tempObject = new THREE.Object3D();
            tempObject.position.copy(nipplePosition);
            // Look along the spoke towards the hub
            const lookTarget = nipplePosition.clone().add(spokeDirection);
            tempObject.lookAt(lookTarget);
            // Apply lookAt orientation
            spokeNippleInst.quaternion.copy(tempObject.quaternion);
            // Apply additional rotation based on model orientation
            spokeNippleInst.rotateX(NIPPLE.ROTATION_X);
            // --- End Orientation ---

            // Apply scale
            spokeNippleInst.scale.set(NIPPLE.SCALE, NIPPLE.SCALE, NIPPLE.SCALE);

            // Get the local matrix of the dummy instance
            spokeNippleInst.updateMatrix();
            const localMatrix = spokeNippleInst.matrix.clone();

            // Create the world transformation matrix for the wheel
            const wheelMatrix = new THREE.Matrix4()
                .makeTranslation(wheelCenter.x, wheelCenter.y, wheelCenter.z) // Wheel position
                .multiply(new THREE.Matrix4().makeRotationZ(totalRotation));   // Wheel rotation

            // Combine wheel transformation with local nipple transformation
            const finalMatrix = new THREE.Matrix4().multiplyMatrices(wheelMatrix, localMatrix);

            // Set matrix for this instance
            // Ensure nippleIndex does not exceed allocated buffer size if pre-allocated fixed size
            if (nippleIndex < spokeNippleInstancedMesh.count) {
                spokeNippleInstancedMesh.setMatrixAt(nippleIndex, finalMatrix);
            } else {
                 console.warn(`Nipple index ${nippleIndex} exceeds allocated instance count ${spokeNippleInstancedMesh.count}`);
            }
            nippleIndex++;
        });
    }

    // Calculate total count
    let totalNipples = 0;
    if (spokePatterns?.front?.spokes?.red) totalNipples += spokePatterns.front.spokes.red.length;
    if (spokePatterns?.front?.spokes?.yellow) totalNipples += spokePatterns.front.spokes.yellow.length;
    if (spokePatterns?.rear?.spokes?.red) totalNipples += spokePatterns.rear.spokes.red.length;
    if (spokePatterns?.rear?.spokes?.yellow) totalNipples += spokePatterns.rear.spokes.yellow.length;

     // IMPORTANT: Ensure InstancedMesh count is sufficient BEFORE setting matrices
     // If the InstancedMesh was created with a smaller count initially, you might need
     // to dispose and recreate it, or ensure it's created with max possible count.
     // For now, we just set the count, assuming the underlying buffer is large enough or dynamically handled.
    spokeNippleInstancedMesh.count = totalNipples;


    // Reset index before placing
    nippleIndex = 0;

    // Process each spoke set individually
    if (spokePatterns?.front?.spokes) {
        placeNipplesOnSpokeSet(spokePatterns.front.spokes.red, points.T_end);
        placeNipplesOnSpokeSet(spokePatterns.front.spokes.yellow, points.T_end);
    }
     if (spokePatterns?.rear?.spokes) {
        placeNipplesOnSpokeSet(spokePatterns.rear.spokes.red, points.S_end);
        placeNipplesOnSpokeSet(spokePatterns.rear.spokes.yellow, points.S_end);
     }

    // Check if the number of matrices set matches the expected count
     if (nippleIndex !== totalNipples) {
         console.warn(`Mismatch in nipple count: Expected ${totalNipples}, Placed ${nippleIndex}`);
         // Optionally adjust count if fewer were placed due to errors
         // spokeNippleInstancedMesh.count = nippleIndex;
     }

    // Mark instance matrix for update
    spokeNippleInstancedMesh.instanceMatrix.needsUpdate = true;
}

export function genSpokeNipplesGeo(geometry, scene, spokeNippleInstancedMesh, spokeNippleInst) {
    // Validate required inputs
    if (!spokeNippleInstancedMesh || !spokeNippleInst) {
        console.warn("Spoke nipple InstancedMesh or dummy instance not provided.");
        // Ensure registry is cleared if previously present
         if (componentRegistry.spokeNipples) delete componentRegistry.spokeNipples;
        return null;
    }
     if (!geometry || !geometry.spokePatterns || !geometry.points || !geometry.rotations) {
         console.warn("Required geometry data (spokePatterns, points, rotations) missing for spoke nipples.");
         // Ensure registry is cleared if previously present
         if (componentRegistry.spokeNipples) delete componentRegistry.spokeNipples;
         spokeNippleInstancedMesh.count = 0; // Set count to 0 if data is missing
         spokeNippleInstancedMesh.instanceMatrix.needsUpdate = true;
        return spokeNippleInstancedMesh; // Return empty mesh
     }

    // Position the instances
    positionSpokeNipples(spokeNippleInstancedMesh, spokeNippleInst, geometry);

    // Add tag
    spokeNippleInstancedMesh.userData.componentType = 'spokeNipples';

    // Register
    componentRegistry.spokeNipples = spokeNippleInstancedMesh;

    // Ensure mesh is in the scene
    if (!scene.children.includes(spokeNippleInstancedMesh)) {
        scene.add(spokeNippleInstancedMesh);
    }

    return spokeNippleInstancedMesh;
}

// --- Air Nozzle (Front) ---

function createAirNozzleFrontMesh(airNozzleBaseGeometry) {
    if (!airNozzleBaseGeometry) return null;

    const material = createComponentMaterial('airNozzle');

    const nozzleMesh = new THREE.Mesh(airNozzleBaseGeometry.clone(), material);
    nozzleMesh.userData.componentType = 'airNozzleFront'; // Tag

    return nozzleMesh;
}

export function positionAirNozzleFront(nozzleGroup, geometry) {
    const { sizes } = geometry;
    const NOZZLE = {
        SCALE: 1,
        RIM_OFFSET: 1,
        ROTATION_X: Math.PI / 2, // Renamed to ROTATION_X to be clear
        POSITION_ANGLE: -Math.PI / 4
    };

    if (!nozzleGroup) return;

    // Get the mesh from the group (first child)
    const nozzleMesh = nozzleGroup.children.length > 0 ? 
                       nozzleGroup.children[0] : null;
    
    if (!nozzleMesh) return;

    // Reset group transformations
    nozzleGroup.position.set(0, 0, 0);
    nozzleGroup.rotation.set(0, 0, 0);
    nozzleGroup.scale.set(1, 1, 1);
    
    // Reset mesh local transformations
    nozzleMesh.position.set(0, 0, 0);
    nozzleMesh.rotation.set(0, 0, 0);
    nozzleMesh.scale.set(1, 1, 1);

    // Apply scale to mesh
    nozzleMesh.scale.set(NOZZLE.SCALE, NOZZLE.SCALE, NOZZLE.SCALE);

    // Calculate position along the rim relative to wheel center
    const wheelRadius = sizes.R1_size;
    const rimPosition = new THREE.Vector3(
        Math.cos(NOZZLE.POSITION_ANGLE) * wheelRadius,
        Math.sin(NOZZLE.POSITION_ANGLE) * wheelRadius,
        0
    );
    const radialDirection = rimPosition.clone().normalize();
    
    // Apply rim offset
    rimPosition.sub(radialDirection.clone().multiplyScalar(NOZZLE.RIM_OFFSET));
    
    // Set local position to the mesh
    nozzleMesh.position.copy(rimPosition);

    // Calculate local orientation
    const tempObject = new THREE.Object3D();
    tempObject.position.copy(rimPosition);
    tempObject.lookAt(new THREE.Vector3(0, 0, 0));
    nozzleMesh.quaternion.copy(tempObject.quaternion);
    
    // Apply additional rotation - using rotateX as this is the correct axis based on model
    nozzleMesh.rotateX(NOZZLE.ROTATION_X);
    
    // Position the group at wheel center
    nozzleGroup.position.copy(geometry.points.T_end);
    nozzleGroup.rotation.z = geometry.rotations.total;
}

export function genAirNozzleFront(geometry, scene, airNozzleBaseGeometry) {
    // Create the mesh
    const nozzleMesh = createAirNozzleFrontMesh(airNozzleBaseGeometry);
    if (!nozzleMesh) return null;

    // Create the group
    const nozzleGroupFront = new THREE.Group();
    nozzleGroupFront.userData.componentType = 'airNozzleAssemblyFront';
    nozzleGroupFront.add(nozzleMesh);

    // Position the group and mesh
    positionAirNozzleFront(nozzleGroupFront, geometry);

    // Register and add group to scene
    componentRegistry.airNozzleFront = nozzleGroupFront;
    scene.add(nozzleGroupFront);

    return nozzleGroupFront;
}


// --- Air Nozzle (Rear) ---

function createAirNozzleRearMesh(airNozzleBaseGeometry) {
     if (!airNozzleBaseGeometry) return null;

    const material = createComponentMaterial('airNozzle');

    const nozzleMesh = new THREE.Mesh(airNozzleBaseGeometry.clone(), material);
    nozzleMesh.userData.componentType = 'airNozzleRear'; // Tag

    return nozzleMesh;
}

export function positionAirNozzleRear(nozzleGroup, geometry) {
    const { sizes } = geometry;
    const NOZZLE = {
        SCALE: 1,
        RIM_OFFSET: 1,
        ROTATION_X: Math.PI / 2, // Renamed for clarity
        POSITION_ANGLE: Math.PI / 4
    };

    if (!nozzleGroup) return;

    // Get the mesh from the group
    const nozzleMesh = nozzleGroup.children.length > 0 ? 
                       nozzleGroup.children[0] : null;
    
    if (!nozzleMesh) return;

    // Reset group transformations
    nozzleGroup.position.set(0, 0, 0);
    nozzleGroup.rotation.set(0, 0, 0);
    nozzleGroup.scale.set(1, 1, 1);
    
    // Reset mesh local transformations
    nozzleMesh.position.set(0, 0, 0);
    nozzleMesh.rotation.set(0, 0, 0);
    nozzleMesh.scale.set(1, 1, 1);

    // Apply scale to mesh
    nozzleMesh.scale.set(NOZZLE.SCALE, NOZZLE.SCALE, NOZZLE.SCALE);

    // Calculate position along the rim
    const wheelRadius = sizes.R2_size;
    const rimPosition = new THREE.Vector3(
        Math.cos(NOZZLE.POSITION_ANGLE) * wheelRadius,
        Math.sin(NOZZLE.POSITION_ANGLE) * wheelRadius,
        0
    );
    const radialDirection = rimPosition.clone().normalize();
    
    // Apply rim offset
    rimPosition.sub(radialDirection.clone().multiplyScalar(NOZZLE.RIM_OFFSET));
    
    // Set local position
    nozzleMesh.position.copy(rimPosition);

    // Calculate local orientation
    const tempObject = new THREE.Object3D();
    tempObject.position.copy(rimPosition);
    tempObject.lookAt(new THREE.Vector3(0, 0, 0));
    nozzleMesh.quaternion.copy(tempObject.quaternion);
    
    // Apply additional rotation
    nozzleMesh.rotateX(NOZZLE.ROTATION_X);
    
    // Position the group at wheel center
    nozzleGroup.position.copy(geometry.points.S_end);
    nozzleGroup.rotation.z = geometry.rotations.total;
}

export function genAirNozzleRear(geometry, scene, airNozzleBaseGeometry) {
    // Create the mesh
    const nozzleMesh = createAirNozzleRearMesh(airNozzleBaseGeometry);
    if (!nozzleMesh) return null;

    // Create the group
    const nozzleGroupRear = new THREE.Group();
    nozzleGroupRear.userData.componentType = 'airNozzleAssemblyRear';
    nozzleGroupRear.add(nozzleMesh);

    // Position the group and mesh
    positionAirNozzleRear(nozzleGroupRear, geometry);

    // Register and add group to scene
    componentRegistry.airNozzleRear = nozzleGroupRear;
    scene.add(nozzleGroupRear);

    return nozzleGroupRear;
}

