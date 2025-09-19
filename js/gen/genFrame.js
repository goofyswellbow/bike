console.log('Loading genFrame.js...');
import * as THREE from 'three';
import * as Constants from '../constants.js';
import { addLine, createBeveledPoint, createTaperedTube, mirrorGeometryX, mirrorGeometryZ } from './genUtil.js';
import { componentRegistry } from '../registry.js';
import { createComponentMaterial } from '../materials.js';



// --- Frame Headtube ---

function stretchMeshY(geometry_already_scaled, targetLength, preserveEnds = 0.2) {
    const stretchedGeo = geometry_already_scaled.clone();
    const positions = stretchedGeo.attributes.position;
    if (!positions) { console.warn("No position data to stretch."); return stretchedGeo; }

    const bbox = new THREE.Box3().setFromBufferAttribute(positions);
    const currentHeight = bbox.max.y - bbox.min.y;
    const currentBottomY = bbox.min.y; // Get the original bottom Y value

    if (currentHeight <= 1e-6 || Math.abs(currentHeight - targetLength) < 1e-6) {
        stretchedGeo.computeVertexNormals();
        return stretchedGeo;
    }

    // Calculate stretch parameters based on CURRENT height and TARGET length
    const preservedLength = currentHeight * (preserveEnds * 2);
    const currentMiddleLength = currentHeight - preservedLength;
    const targetMiddleLength = targetLength - preservedLength;

    // Ensure middle length is non-negative before division
    const stretchFactorMiddle = (currentMiddleLength > 1e-6) ? targetMiddleLength / currentMiddleLength : 1;

    // Define boundaries relative to the original bottom Y
    const preserveBottomBoundary = currentBottomY + currentHeight * preserveEnds;
    const preserveTopBoundary = currentBottomY + currentHeight * (1.0 - preserveEnds);

    // Calculate the total shift needed for the top section relative to the original top boundary
    const topShift = targetMiddleLength - currentMiddleLength;

    for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i);
        let newY = y;

        if (y > preserveBottomBoundary && y < preserveTopBoundary) {
            // Stretch middle part relative to its base (preserveBottomBoundary)
            // How far is this vertex into the *original* middle section? (0 to 1)
            const middleT = (y - preserveBottomBoundary) / currentMiddleLength;
            // Calculate the new position based on the *new* middle section length
            newY = preserveBottomBoundary + middleT * targetMiddleLength;
        } else if (y >= preserveTopBoundary) {
            // Shift the top part relative to its original position
            newY = y + topShift;
        }
        // Else (y <= preserveBottomBoundary): Bottom part coordinates remain unchanged

        positions.setY(i, newY);
    }

    positions.needsUpdate = true;
    stretchedGeo.computeVertexNormals();
    return stretchedGeo;
}

function createHeadTubeGeometry(headTubeBaseGeometry, geometry) {
    const { points } = geometry;
    const EXTENSION_BELOW = 0.5;
    const SCALE_FACTOR = 0.9;
    const PRESERVE_ENDS = 0.2; // Preserve ratio for stretching ends

     if (!headTubeBaseGeometry || !points.F_end || !points.P_end) { console.error("Missing inputs."); return null; }

    // Calculate the required total length in world space
    const targetLength = points.F_end.distanceTo(points.P_end) + EXTENSION_BELOW;
     if (targetLength <= 0) { console.error(`Invalid target length: ${targetLength}`); return null; }

    // --- Replicate Original Sequence ---
    // 1. Clone
    const clonedGeometry = headTubeBaseGeometry.clone();
    // 2. Scale Clone
    clonedGeometry.scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
    // 3. Stretch the SCALED clone using the corrected helper
    const finalGeometry = stretchMeshY(
        clonedGeometry,    // Pass the already scaled geometry
        targetLength,      // Pass target world length
        PRESERVE_ENDS
    );
    // --- End Replication ---

    return finalGeometry; // This geometry is scaled, stretched, and Y-axis aligned
}

function createHeadTubeMesh(headTubeGeometry, frameColor = 0x800080) {
    if (!headTubeGeometry) return null;
    console.log('createHeadTubeMesh frameColor:', frameColor, typeof frameColor);
    const material = createComponentMaterial('headTube', { color: frameColor });
    const headTubeMesh = new THREE.Mesh(headTubeGeometry, material);
    headTubeMesh.userData.componentType = 'headTube';
    return headTubeMesh;
}

export function positionHeadTube(headTubeMesh, geometry) {
    const { points } = geometry;
    const EXTENSION_BELOW = 0.5;

    if (!headTubeMesh || !points.F_end || !points.P_end) { console.error("Missing inputs."); return; }

   // Reset transformations
   headTubeMesh.position.set(0, 0, 0); headTubeMesh.rotation.set(0, 0, 0); headTubeMesh.scale.set(1, 1, 1);

   // Calculate the direction vector (F_end towards P_end)
   const direction = new THREE.Vector3().subVectors(points.P_end, points.F_end).normalize();

   // Calculate the world-space base point (offset below F_end)
   // CORRECTED: Multiply by -EXTENSION_BELOW or subtract along direction
   const basePoint = points.F_end.clone().add(direction.clone().multiplyScalar(-EXTENSION_BELOW));
   // OR equivalently: const basePoint = points.F_end.clone().sub(direction.clone().multiplyScalar(EXTENSION_BELOW));


   // Position the mesh origin AT THE BASE POINT
   headTubeMesh.position.copy(basePoint);

   // Rotate mesh around basePoint
   const yAxis = new THREE.Vector3(0, 1, 0);
   const quaternion = new THREE.Quaternion();
   quaternion.setFromUnitVectors(yAxis, direction);
   headTubeMesh.setRotationFromQuaternion(quaternion);
}

export function genFrameHeadTubeGeo(geometry, scene, headTubeBaseGeometry) {
    const headTubeGeometry = createHeadTubeGeometry(headTubeBaseGeometry, geometry);
    if (!headTubeGeometry) { if (componentRegistry.headTube) delete componentRegistry.headTube; return null; }
    const headTubeMesh = createHeadTubeMesh(headTubeGeometry, geometry.params.frameColor);
    if (!headTubeMesh) { if (componentRegistry.headTube) delete componentRegistry.headTube; return null; }
    positionHeadTube(headTubeMesh, geometry);
    componentRegistry.headTube = headTubeMesh;
    scene.add(headTubeMesh);
    return headTubeMesh;
}


// --- Frame Bottom Bracket ---

function stretchMeshZ(geometry, targetLength, preserveEnds, scale) {
    const stretchedGeo = geometry.clone();
    stretchedGeo.scale(scale, scale, scale); // Apply uniform base scale first
    const positions = stretchedGeo.attributes.position;
    if (!positions) { console.warn("No position data to stretch."); return stretchedGeo; }
    const bbox = new THREE.Box3().setFromBufferAttribute(positions);
    const currentLength = bbox.max.z - bbox.min.z; // Z-axis length

    if (currentLength <= 1e-6 || Math.abs(currentLength - targetLength) < 1e-6) {
        stretchedGeo.computeVertexNormals(); return stretchedGeo;
    }
    const preservedLength = currentLength * (preserveEnds * 2);
    const currentMiddleLength = currentLength - preservedLength;
    const targetMiddleLength = targetLength - preservedLength;
    const stretchFactor = (currentMiddleLength > 1e-6) ? targetMiddleLength / currentMiddleLength : 1;
    const centerZ = (bbox.max.z + bbox.min.z) / 2;
    const preserveFrontOriginal = centerZ + currentMiddleLength / 2; // Boundaries based on original middle section
    const preserveBackOriginal = centerZ - currentMiddleLength / 2;
    const totalShift = targetMiddleLength - currentMiddleLength; // Total change in middle section length

    for (let i = 0; i < positions.count; i++) {
        const z = positions.getZ(i); let newZ = z;
        if (z > preserveBackOriginal && z < preserveFrontOriginal) {
            // Stretch middle relative to center
            const distFromCenter = z - centerZ;
            newZ = centerZ + distFromCenter * stretchFactor;
        } else if (z >= preserveFrontOriginal) {
             // Shift front part
            newZ = z + totalShift / 2;
        } else { // z <= preserveBackOriginal
             // Shift back part
            newZ = z - totalShift / 2;
        }
        positions.setZ(i, newZ); // Set Z coordinate
    }
    positions.needsUpdate = true; stretchedGeo.computeVertexNormals(); return stretchedGeo;
}

function createBottomBracketGeometry(bbBaseGeometry, geometry) {
    const { points } = geometry;
     // Constants from original function
     const BB_PARAMS = {
        SCALE: 1,
        PRESERVE_ENDS: 0.2
    };

    if (!bbBaseGeometry || !points.B_start || !points.midAxel) {
        console.error("Missing base geometry or points B_start/midAxel for BB.");
        return null;
    }

    // Calculate distance from B_start to midAxel
    const singleLength = points.B_start.distanceTo(points.midAxel);
    // Double it for total stretch length (as per original logic)
    const targetLength = singleLength * 2;
     if (targetLength <= 0) {
         console.error(`Invalid BB target length calculated: ${targetLength}`);
         return null;
     }


    // Apply scaling and stretching (along Z) using the helper
    const stretchedGeometry = stretchMeshZ(
        bbBaseGeometry,
        targetLength,
        BB_PARAMS.PRESERVE_ENDS,
        BB_PARAMS.SCALE
    );

    return stretchedGeometry; // Geometry is scaled, stretched, and Z-axis aligned
}

function createBottomBracketMesh(bbGeometry, frameColor = 0x800080) {
    if (!bbGeometry) return null;

    const material = createComponentMaterial('bottomBracket', { color: frameColor });

    const bbMesh = new THREE.Mesh(bbGeometry, material);
    bbMesh.userData.componentType = 'bottomBracket'; // Tag

    return bbMesh;
}

export function positionBottomBracket(bbMesh, geometry) {
    const { points } = geometry;
    if (!bbMesh || !points.B_start || !points.midAxel) {
         console.error("Missing mesh or points B_start/midAxel for BB positioning.");
        return;
    }

    // Reset transformations
    bbMesh.position.set(0, 0, 0);
    bbMesh.rotation.set(0, 0, 0);
    bbMesh.scale.set(1, 1, 1); // Scale/stretch is baked into geometry

    // --- Replicate original positioning & rotation ---
    // Position mesh origin at B_start
    bbMesh.position.copy(points.B_start);

    // Calculate direction from B_start to midAxel
    const direction = new THREE.Vector3().subVectors(points.midAxel, points.B_start).normalize();

    // Rotate mesh to align its Z-axis with the calculated direction
    const zAxis = new THREE.Vector3(0, 0, 1); // Model's default alignment axis
    const quaternion = new THREE.Quaternion();
    // Handle potential zero direction vector
    if (direction.lengthSq() > 1e-6) {
        quaternion.setFromUnitVectors(zAxis, direction);
        bbMesh.setRotationFromQuaternion(quaternion);
    } else {
        console.warn("BB direction vector is zero, cannot calculate rotation.");
    }
    // --- End Replication ---
}

export function genFrameBottomBracketGeo(geometry, scene, bbBaseGeometry) {
    // 1. Create Geometry
    const bbGeometry = createBottomBracketGeometry(bbBaseGeometry, geometry);
    if (!bbGeometry) {
        if (componentRegistry.bottomBracket) delete componentRegistry.bottomBracket;
        return null;
    }

    // 1b. Create Mesh
    const bbMesh = createBottomBracketMesh(bbGeometry, geometry.params.frameColor);
     if (!bbMesh) {
         if (componentRegistry.bottomBracket) delete componentRegistry.bottomBracket;
        return null;
     }

    // 2. Position Mesh
    positionBottomBracket(bbMesh, geometry);

    // Register and add to scene
    componentRegistry.bottomBracket = bbMesh; // Register
    scene.add(bbMesh);

    return bbMesh;
}


// --- Frame Top Tube ---

function createTopTubeGeometry(geometry) {
    // Extract specific member data for the top tube
    const frameMember = geometry.frameMembers?.topTube;
    if (!frameMember || !frameMember.points || !frameMember.params) {
        console.error("Top tube data missing in geometry object.");
        return null;
    }
    const { start, end } = frameMember.points;
    const { params } = frameMember;

    if (!start || !end || params.diameter === undefined) {
         console.error("Start/end points or diameter missing for top tube geometry.");
         return null;
    }

    // Calculate length based on world points
    const length = start.distanceTo(end);
    if (length <= 0) {
        console.error(`Invalid top tube length calculated: ${length}`);
        return null;
    }

    // Create basic cylinder geometry (Y-axis aligned)
    const tubeRadius = params.diameter / 2;
    const radialSegments = 8; // Or get from params if defined
    const cylinderGeometry = new THREE.CylinderGeometry(
        tubeRadius,
        tubeRadius,
        length,
        radialSegments
    );

    return cylinderGeometry;
}

function createTopTubeMesh(topTubeGeometry, frameColor = 0x800080) {
    if (!topTubeGeometry) return null;

    const material = createComponentMaterial('topTube', { color: frameColor });

    const topTubeMesh = new THREE.Mesh(topTubeGeometry, material);
    topTubeMesh.userData.componentType = 'topTube'; // Tag

    return topTubeMesh;
}

export function positionTopTube(topTubeMesh, geometry) {
    const frameMember = geometry.frameMembers?.topTube;
     if (!topTubeMesh || !frameMember || !frameMember.points) {
         console.error("Missing mesh or points for top tube positioning.");
         return;
     }
     const { start, end } = frameMember.points;
     if (!start || !end) {
          console.error("Start/end points missing for top tube positioning.");
          return;
     }


    // Reset transformations
    topTubeMesh.position.set(0, 0, 0);
    topTubeMesh.rotation.set(0, 0, 0);
    topTubeMesh.scale.set(1, 1, 1);

    // Calculate world-space direction and midpoint
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // Position the mesh at the midpoint
    topTubeMesh.position.copy(midpoint);

    // Calculate rotation to align the cylinder's Y-axis with the direction
    const yAxis = new THREE.Vector3(0, 1, 0); // Cylinder default axis
    const quaternion = new THREE.Quaternion();
     // Handle potential zero direction vector
     if (direction.lengthSq() > 1e-6) {
        quaternion.setFromUnitVectors(yAxis, direction);
        topTubeMesh.setRotationFromQuaternion(quaternion);
     } else {
         console.warn("Top tube direction vector is zero, cannot calculate rotation.");
     }
}

export function genFrameTopTubeGeo(geometry, scene) {
    // 1. Create Geometry
    const topTubeGeometry = createTopTubeGeometry(geometry);
    if (!topTubeGeometry) {
        if (componentRegistry.topTube) delete componentRegistry.topTube;
        return null;
    }

    // 1b. Create Mesh
    const topTubeMesh = createTopTubeMesh(topTubeGeometry, geometry.params.frameColor);
    if (!topTubeMesh) {
        if (componentRegistry.topTube) delete componentRegistry.topTube;
        return null;
    }

    // 2. Position Mesh
    positionTopTube(topTubeMesh, geometry);

    // Register and add to scene
    componentRegistry.topTube = topTubeMesh; // Register
    scene.add(topTubeMesh);

    return topTubeMesh;
}


// --- Frame Seat Tube ---

function createSeatTubeGeometry(geometry) {
    // Extract specific member data for the seat tube
    const frameMember = geometry.frameMembers?.seatTube;
    if (!frameMember || !frameMember.points || !frameMember.params) {
        console.error("Seat tube data missing in geometry object.");
        return null;
    }
    const { start, end } = frameMember.points;
    const { params } = frameMember; // Contains diameter and extension

    if (!start || !end || params.diameter === undefined || params.extension === undefined) {
         console.error("Start/end points, diameter, or extension missing for seat tube geometry.");
         return null;
    }

    // Calculate total length including extension
    const baseLength = start.distanceTo(end);
    const length = baseLength + params.extension;
    if (length <= 0) {
        console.error(`Invalid seat tube length calculated: ${length}`);
        return null;
    }

    // Create basic cylinder geometry (Y-axis aligned)
    const tubeRadius = params.diameter / 2;
    const radialSegments = 32; // Use higher segments like original code
    const cylinderGeometry = new THREE.CylinderGeometry(
        tubeRadius,
        tubeRadius,
        length,
        radialSegments
    );

    return cylinderGeometry;
}

function createSeatTubeMesh(seatTubeGeometry, frameColor = 0x800080) {
    if (!seatTubeGeometry) return null;

    const material = createComponentMaterial('seatTube', { color: frameColor });

    const seatTubeMesh = new THREE.Mesh(seatTubeGeometry, material);
    seatTubeMesh.userData.componentType = 'seatTube'; // Tag

    return seatTubeMesh;
}

export function positionSeatTube(seatTubeMesh, geometry) {
    const frameMember = geometry.frameMembers?.seatTube;
     if (!seatTubeMesh || !frameMember || !frameMember.points || !frameMember.params) {
         console.error("Missing mesh, points, or params for seat tube positioning.");
         return;
     }
     const { start, end } = frameMember.points;
     const { params } = frameMember; // Need extension param

     if (!start || !end || params.extension === undefined) {
         console.error("Start/end points or extension missing for seat tube positioning.");
         return;
     }

    // Reset transformations
    seatTubeMesh.position.set(0, 0, 0);
    seatTubeMesh.rotation.set(0, 0, 0);
    seatTubeMesh.scale.set(1, 1, 1);

    // Calculate world-space direction and extended end point
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const extendedEnd = end.clone().add(direction.clone().multiplyScalar(params.extension));

    // Calculate world-space midpoint between start and extended end
    const midpoint = new THREE.Vector3().addVectors(start, extendedEnd).multiplyScalar(0.5);

    // Position the mesh at the midpoint
    seatTubeMesh.position.copy(midpoint);

    // Calculate rotation to align the cylinder's Y-axis with the direction
    const yAxis = new THREE.Vector3(0, 1, 0); // Cylinder default axis
    const quaternion = new THREE.Quaternion();
     if (direction.lengthSq() > 1e-6) {
        quaternion.setFromUnitVectors(yAxis, direction);
        seatTubeMesh.setRotationFromQuaternion(quaternion);
     } else {
          console.warn("Seat tube direction vector is zero, cannot calculate rotation.");
     }
}

export function genFrameSeatTubeGeo(geometry, scene) {
    // 1. Create Geometry
    const seatTubeGeometry = createSeatTubeGeometry(geometry);
    if (!seatTubeGeometry) {
        if (componentRegistry.seatTube) delete componentRegistry.seatTube;
        return null;
    }

    // 1b. Create Mesh
    const seatTubeMesh = createSeatTubeMesh(seatTubeGeometry, geometry.params.frameColor);
    if (!seatTubeMesh) {
         if (componentRegistry.seatTube) delete componentRegistry.seatTube;
        return null;
    }

    // 2. Position Mesh
    positionSeatTube(seatTubeMesh, geometry);

    // Register and add to scene
    componentRegistry.seatTube = seatTubeMesh; // Register
    scene.add(seatTubeMesh);

    return seatTubeMesh;
}


// --- Frame Down Tube ---

function createDownTubeGeometry(geometry) {
    // Extract specific member data and global points
    const frameMember = geometry.frameMembers?.downTube;
    const globalPoints = geometry.points;
    if (!frameMember || !frameMember.points || !frameMember.params || !globalPoints?.A_end || !globalPoints?.F_end) {
        console.error("Down tube data or required global points (A_end, F_end) missing in geometry object.");
        return null;
    }
    const { start, end } = frameMember.points; // Note: 'end' here corresponds to F_end for calculation
    const { params } = frameMember;
    const { A_end, F_end } = globalPoints; // Use global points for offset calculation

     if (!start || !end || !A_end || !F_end || params.diameter === undefined || params.offset === undefined) {
         console.error("Start/end points, A_end/F_end, diameter, or offset missing for down tube geometry.");
         return null;
     }

     // Calculate offset end point based on F_end, A_end and offset param
     // Direction from F_end towards A_end
    const offsetDirection = new THREE.Vector3().subVectors(A_end, F_end).normalize();
     // Calculate the offset point starting from F_end (which is the 'end' point for this tube)
    const offsetEnd = end.clone().add(offsetDirection.multiplyScalar(params.offset));


    // Calculate length using B_start (which is the 'start' point) and the calculated offsetEnd
    const length = start.distanceTo(offsetEnd);
    if (length <= 0) {
        console.error(`Invalid down tube length calculated: ${length}`);
        return null;
    }

    // Create basic cylinder geometry (Y-axis aligned)
    const tubeRadius = params.diameter / 2;
    const radialSegments = 32; // Match original code
    const cylinderGeometry = new THREE.CylinderGeometry(
        tubeRadius,
        tubeRadius,
        length,
        radialSegments
    );

    return cylinderGeometry;
}

function createDownTubeMesh(downTubeGeometry, frameColor = 0x800080) {
    if (!downTubeGeometry) return null;

    const material = createComponentMaterial('downTube', { color: frameColor });

    const downTubeMesh = new THREE.Mesh(downTubeGeometry, material);
    downTubeMesh.userData.componentType = 'downTube'; // Tag

    return downTubeMesh;
}

export function positionDownTube(downTubeMesh, geometry) {
    const frameMember = geometry.frameMembers?.downTube;
    const globalPoints = geometry.points;
     if (!downTubeMesh || !frameMember || !frameMember.points || !frameMember.params || !globalPoints?.A_end || !globalPoints?.F_end) {
         console.error("Missing mesh, member data, or points for down tube positioning.");
         return;
     }
    const { start, end } = frameMember.points; // start=B_start, end=F_end
    const { params } = frameMember;
    const { A_end, F_end } = globalPoints;

     if (!start || !end || !A_end || !F_end || params.offset === undefined) {
          console.error("Start/end points, A_end/F_end, or offset missing for down tube positioning.");
          return;
     }

    // Reset transformations
    downTubeMesh.position.set(0, 0, 0);
    downTubeMesh.rotation.set(0, 0, 0);
    downTubeMesh.scale.set(1, 1, 1);

    // --- Replicate original positioning & rotation ---
    // Calculate offset end point (needed for direction and midpoint)
    const offsetDirection = new THREE.Vector3().subVectors(A_end, F_end).normalize();
    const offsetEnd = end.clone().add(offsetDirection.multiplyScalar(params.offset));

    // Calculate world-space tube direction (from start=B_start to offsetEnd)
    const tubeDirection = new THREE.Vector3().subVectors(offsetEnd, start).normalize();

    // Calculate world-space midpoint between start=B_start and offsetEnd
    const midpoint = new THREE.Vector3().addVectors(start, offsetEnd).multiplyScalar(0.5);

    // Position the mesh at the midpoint
    downTubeMesh.position.copy(midpoint);

    // Calculate rotation to align the cylinder's Y-axis with the tubeDirection
    const yAxis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
     if (tubeDirection.lengthSq() > 1e-6) {
        quaternion.setFromUnitVectors(yAxis, tubeDirection);
        downTubeMesh.setRotationFromQuaternion(quaternion);
     } else {
         console.warn("Down tube direction vector is zero, cannot calculate rotation.");
     }
     // --- End Replication ---
}

export function genFrameDownTubeGeo(geometry, scene) {
    // 1. Create Geometry
    const downTubeGeometry = createDownTubeGeometry(geometry);
    if (!downTubeGeometry) {
        if (componentRegistry.downTube) delete componentRegistry.downTube;
        return null;
    }

    // 1b. Create Mesh
    const downTubeMesh = createDownTubeMesh(downTubeGeometry, geometry.params.frameColor);
    if (!downTubeMesh) {
        if (componentRegistry.downTube) delete componentRegistry.downTube;
        return null;
    }

    // 2. Position Mesh
    positionDownTube(downTubeMesh, geometry);

    // Register and add to scene
    componentRegistry.downTube = downTubeMesh; // Register
    scene.add(downTubeMesh);

    return downTubeMesh;
}


// --- Frame Chainstay Bottom Assembly ---

// --- Frame Chainstay Bottom Assembly (Refactored) ---

// 1. Creation function - generates the geometry
// --- Frame Chainstay Bottom Assembly (Refactored) ---

// --- Frame Chainstay Bottom Assembly (Refactored) ---

// 1. Creation function - generates the geometry and meshes
function createChainstayBottomComponents(geometry) {
    const { points } = geometry;
    const { B_startOffset, chainstayNeck, chainstayElbow, S_end_stay } = points;
    const chainstayMember = Constants.CHAINSTAY_MEMBERS.bottomStay;
    const { params } = chainstayMember;
    
    // Create main chainstay curve
    const curvePoints = [
        B_startOffset,
        chainstayNeck,
        ...createBeveledPoint(
            chainstayNeck,
            chainstayElbow,
            S_end_stay,
            {
                bevelDistance: params.elbowBevel.distance,
                bevelDivisions: params.elbowBevel.divisions
            }
        ),
        S_end_stay
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'centripetal');
    
    // Create main tube geometry
    const mainTubeGeometry = new THREE.TubeGeometry(
        curve,
        params.segments,
        params.baseRadius,
        params.radialSegments,
        false
    );
    
    // Find point for crossbar
    const crossbarStartPoint = curve.getPoint(0.12);
    const crossbarEndPoint = crossbarStartPoint.clone();
    // Set Z to 0 (the plane) instead of a fixed offset
    crossbarEndPoint.z = 0;
    
    // Create crossbar geometry
    const crossbarCurve = new THREE.LineCurve3(crossbarStartPoint, crossbarEndPoint);
    const crossbarGeometry = new THREE.TubeGeometry(
        crossbarCurve,
        8,
        params.baseRadius * 0.8,
        params.radialSegments,
        false
    );
    
    const material = createComponentMaterial('chainstayBottomAssembly', { 
        color: geometry.params.frameColor !== undefined ? geometry.params.frameColor : 0x800080 
    });
    
    // Create meshes directly
    const mainTube = new THREE.Mesh(mainTubeGeometry, material.clone());
    mainTube.userData.componentType = 'chainstayBottomMain';
    
    const crossbar = new THREE.Mesh(crossbarGeometry, material.clone());
    crossbar.userData.componentType = 'chainstayBottomCrossbar';
    
    // Mirror the geometries
    const mirroredMainGeometry = mainTubeGeometry.clone();
    const mainPositions = mirroredMainGeometry.attributes.position.array;
    for (let i = 0; i < mainPositions.length; i += 3) {
        mainPositions[i + 2] = -mainPositions[i + 2]; // Mirror Z
    }
    mirroredMainGeometry.attributes.position.needsUpdate = true;
    mirroredMainGeometry.computeVertexNormals();
    
    const mainTubeMirrored = new THREE.Mesh(mirroredMainGeometry, material.clone());
    mainTubeMirrored.userData.componentType = 'chainstayBottomMainMirrored';
    
    const mirroredCrossbarGeometry = crossbarGeometry.clone();
    const crossbarPositions = mirroredCrossbarGeometry.attributes.position.array;
    for (let i = 0; i < crossbarPositions.length; i += 3) {
        crossbarPositions[i + 2] = -crossbarPositions[i + 2]; // Mirror Z
    }
    mirroredCrossbarGeometry.attributes.position.needsUpdate = true;
    mirroredCrossbarGeometry.computeVertexNormals();
    
    const crossbarMirrored = new THREE.Mesh(mirroredCrossbarGeometry, material.clone());
    crossbarMirrored.userData.componentType = 'chainstayBottomCrossbarMirrored';
    
    return {
        mainTube,
        crossbar,
        mainTubeMirrored,
        crossbarMirrored
    };
}

// 2. Main generator function
export function genFrameChainstayBottomGeo(geometry, scene) {
    // Create components
    const components = createChainstayBottomComponents(geometry);
    if (!components) {
        if (componentRegistry.chainstayBottomAssembly) delete componentRegistry.chainstayBottomAssembly;
        return null;
    }
    
    // Create a group to hold all parts
    const chainstayGroup = new THREE.Group();
    chainstayGroup.userData.componentType = 'chainstayBottomAssembly';
    
    // Add all meshes to the group
    chainstayGroup.add(components.mainTube);
    chainstayGroup.add(components.crossbar);
    chainstayGroup.add(components.mainTubeMirrored);
    chainstayGroup.add(components.crossbarMirrored);
    
    // Add the group to the scene
    scene.add(chainstayGroup);
    
    // Register in the component registry
    componentRegistry.chainstayBottomAssembly = chainstayGroup;
    
    return chainstayGroup;
}

// The key to making selective updates work properly
export function positionChainstayBottomAssembly(chainstayGroup, geometry) {
    if (!chainstayGroup) {
        console.error("Missing chainstay group for positioning");
        return false;
    }
    
    // For chainstays, we need to recreate the geometry when the bike's shape changes
    // This is because the chainstay geometry is built directly from world space points
    
    // 1. Create new components based on the updated geometry
    const newComponents = createChainstayBottomComponents(geometry);
    if (!newComponents) {
        return false;
    }
    
    // 2. Update each mesh in the group with the new geometry
    const childrenToUpdate = [
        { mesh: chainstayGroup.children.find(c => c.userData.componentType === 'chainstayBottomMain'), 
          newGeo: newComponents.mainTube.geometry },
        { mesh: chainstayGroup.children.find(c => c.userData.componentType === 'chainstayBottomCrossbar'), 
          newGeo: newComponents.crossbar.geometry },
        { mesh: chainstayGroup.children.find(c => c.userData.componentType === 'chainstayBottomMainMirrored'), 
          newGeo: newComponents.mainTubeMirrored.geometry },
        { mesh: chainstayGroup.children.find(c => c.userData.componentType === 'chainstayBottomCrossbarMirrored'), 
          newGeo: newComponents.crossbarMirrored.geometry }
    ];
    
    // Update each mesh's geometry
    childrenToUpdate.forEach(item => {
        if (item.mesh && item.newGeo) {
            // Dispose of the old geometry to prevent memory leaks
            if (item.mesh.geometry) {
                item.mesh.geometry.dispose();
            }
            // Update with the new geometry
            item.mesh.geometry = item.newGeo;
        }
    });
    
    return true;
}


// --- Frame Chainstay Top Assembly (Refactored) ---
// --- Frame Chainstay Top Assembly (Refactored) ---

// 1. Creation function - generates the geometry and meshes
function createChainstayTopComponents(geometry) {
    const { points } = geometry;
    const { B_startOffset_T, chainstayNeck_T, chainstayElbow_T, S_end_stay_T } = points;
    const chainstayMember = Constants.CHAINSTAY_MEMBERS.topStay;
    const { params } = chainstayMember;
    
    // Create main chainstay curve
    const curvePoints = [
        B_startOffset_T,
        chainstayNeck_T,
        ...createBeveledPoint(
            chainstayNeck_T,
            chainstayElbow_T,
            S_end_stay_T,
            {
                bevelDistance: params.elbowBevel.distance,
                bevelDivisions: params.elbowBevel.divisions
            }
        ),
        S_end_stay_T
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'centripetal');
    
    // Create main tube geometry
    const mainTubeGeometry = new THREE.TubeGeometry(
        curve,
        params.segments,
        params.baseRadius,
        params.radialSegments,
        false
    );
    
    // Find point for crossbar - using 0.25 for top chainstay
    const crossbarStartPoint = curve.getPoint(0.25);
    const crossbarEndPoint = crossbarStartPoint.clone();
    // Set Z to 0 (the plane) instead of a fixed offset
    crossbarEndPoint.z = 0;
    
    // Create crossbar geometry
    const crossbarCurve = new THREE.LineCurve3(crossbarStartPoint, crossbarEndPoint);
    const crossbarGeometry = new THREE.TubeGeometry(
        crossbarCurve,
        8,
        params.baseRadius * 0.8,
        params.radialSegments,
        false
    );
    
    const material = createComponentMaterial('chainstayTopAssembly', { 
        color: geometry.params.frameColor !== undefined ? geometry.params.frameColor : 0x800080 
    });
    
    // Create meshes directly
    const mainTube = new THREE.Mesh(mainTubeGeometry, material.clone());
    mainTube.userData.componentType = 'chainstayTopMain';
    
    const crossbar = new THREE.Mesh(crossbarGeometry, material.clone());
    crossbar.userData.componentType = 'chainstayTopCrossbar';
    
    // Mirror the geometries
    const mirroredMainGeometry = mainTubeGeometry.clone();
    const mainPositions = mirroredMainGeometry.attributes.position.array;
    for (let i = 0; i < mainPositions.length; i += 3) {
        mainPositions[i + 2] = -mainPositions[i + 2]; // Mirror Z
    }
    mirroredMainGeometry.attributes.position.needsUpdate = true;
    mirroredMainGeometry.computeVertexNormals();
    
    const mainTubeMirrored = new THREE.Mesh(mirroredMainGeometry, material.clone());
    mainTubeMirrored.userData.componentType = 'chainstayTopMainMirrored';
    
    const mirroredCrossbarGeometry = crossbarGeometry.clone();
    const crossbarPositions = mirroredCrossbarGeometry.attributes.position.array;
    for (let i = 0; i < crossbarPositions.length; i += 3) {
        crossbarPositions[i + 2] = -crossbarPositions[i + 2]; // Mirror Z
    }
    mirroredCrossbarGeometry.attributes.position.needsUpdate = true;
    mirroredCrossbarGeometry.computeVertexNormals();
    
    const crossbarMirrored = new THREE.Mesh(mirroredCrossbarGeometry, material.clone());
    crossbarMirrored.userData.componentType = 'chainstayTopCrossbarMirrored';
    
    return {
        mainTube,
        crossbar,
        mainTubeMirrored,
        crossbarMirrored
    };
}

// 2. Main generator function
export function genFrameChainstayTopGeo(geometry, scene) {
    // Create components
    const components = createChainstayTopComponents(geometry);
    if (!components) {
        if (componentRegistry.chainstayTopAssembly) delete componentRegistry.chainstayTopAssembly;
        return null;
    }
    
    // Create a group to hold all parts
    const chainstayGroup = new THREE.Group();
    chainstayGroup.userData.componentType = 'chainstayTopAssembly';
    
    // Add all meshes to the group
    chainstayGroup.add(components.mainTube);
    chainstayGroup.add(components.crossbar);
    chainstayGroup.add(components.mainTubeMirrored);
    chainstayGroup.add(components.crossbarMirrored);
    
    // Add the group to the scene
    scene.add(chainstayGroup);
    
    // Register in the component registry
    componentRegistry.chainstayTopAssembly = chainstayGroup;
    
    return chainstayGroup;
}

// The key to making selective updates work properly
export function positionChainstayTopAssembly(chainstayGroup, geometry) {
    if (!chainstayGroup) {
        console.error("Missing chainstay group for positioning");
        return false;
    }
    
    // For chainstays, we need to recreate the geometry when the bike's shape changes
    // This is because the chainstay geometry is built directly from world space points
    
    // 1. Create new components based on the updated geometry
    const newComponents = createChainstayTopComponents(geometry);
    if (!newComponents) {
        return false;
    }
    
    // 2. Update each mesh in the group with the new geometry
    const childrenToUpdate = [
        { mesh: chainstayGroup.children.find(c => c.userData.componentType === 'chainstayTopMain'), 
          newGeo: newComponents.mainTube.geometry },
        { mesh: chainstayGroup.children.find(c => c.userData.componentType === 'chainstayTopCrossbar'), 
          newGeo: newComponents.crossbar.geometry },
        { mesh: chainstayGroup.children.find(c => c.userData.componentType === 'chainstayTopMainMirrored'), 
          newGeo: newComponents.mainTubeMirrored.geometry },
        { mesh: chainstayGroup.children.find(c => c.userData.componentType === 'chainstayTopCrossbarMirrored'), 
          newGeo: newComponents.crossbarMirrored.geometry }
    ];
    
    // Update each mesh's geometry
    childrenToUpdate.forEach(item => {
        if (item.mesh && item.newGeo) {
            // Dispose of the old geometry to prevent memory leaks
            if (item.mesh.geometry) {
                item.mesh.geometry.dispose();
            }
            // Update with the new geometry
            item.mesh.geometry = item.newGeo;
        }
    });
    
    return true;
}


// --- Chainstay Bottom End Assembly ---

function createChainstayBottomEndMeshes(csEndBaseGeometry, frameColor = 0x800080) {
    if (!csEndBaseGeometry) return { leftEndMesh: null, rightEndMesh: null };

    const material = createComponentMaterial('chainstayBottomEndAssembly', { color: frameColor });

    // Create left end mesh - don't position or rotate yet
    const leftEndMesh = new THREE.Mesh(csEndBaseGeometry.clone(), material.clone());
    leftEndMesh.userData.componentType = 'chainstayBottomEndLeft'; // Tag

    // Create right end mesh - don't position or rotate yet
    const rightEndMesh = new THREE.Mesh(csEndBaseGeometry.clone(), material.clone());
    rightEndMesh.userData.componentType = 'chainstayBottomEndRight'; // Tag

    return { leftEndMesh, rightEndMesh };
}

export function positionChainstayBottomEndAssembly(meshes, geometry) {
    const { leftEndMesh, rightEndMesh } = meshes;
    const { points } = geometry;
    const { S_end_stay, chainstayElbow } = points;
    
    // Constants matching original
    const params = { 
        scale: 1.9
    };

    // Position LEFT mesh - closely following original approach
    if (leftEndMesh) {
        // Reset transformations first
        leftEndMesh.position.set(0, 0, 0);
        leftEndMesh.rotation.set(0, 0, 0);
        leftEndMesh.scale.set(1, 1, 1);
        
        // 1. Set scale
        leftEndMesh.scale.set(params.scale, params.scale, params.scale);
        
        // 2. Calculate direction vector for orientation
        const direction = new THREE.Vector3().subVectors(chainstayElbow, S_end_stay).normalize();
        
        // 3. Create quaternion for rotation
        const defaultUp = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(defaultUp, direction);
        
        // 4. Position DIRECTLY at S_end_stay
        leftEndMesh.position.copy(S_end_stay);
        
        // 5. Apply rotation
        leftEndMesh.setRotationFromQuaternion(quaternion);
        leftEndMesh.rotateZ(-Math.PI / 2);
    }

    // Position RIGHT mesh - closely following original approach
    if (rightEndMesh) {
        // Reset transformations first
        rightEndMesh.position.set(0, 0, 0);
        rightEndMesh.rotation.set(0, 0, 0);
        rightEndMesh.scale.set(1, 1, 1);
        
        // 1. Set mirrored scale
        rightEndMesh.scale.set(params.scale, params.scale, -params.scale);
        
        // 2. Get mirrored points for right side
        const S_end_stay_right = new THREE.Vector3(S_end_stay.x, S_end_stay.y, -S_end_stay.z);
        const chainstayElbow_right = new THREE.Vector3(chainstayElbow.x, chainstayElbow.y, -chainstayElbow.z);
        
        // 3. Calculate direction for right side
        const directionRight = new THREE.Vector3().subVectors(chainstayElbow_right, S_end_stay_right).normalize();
        const defaultUp = new THREE.Vector3(0, 1, 0);
        const quaternionRight = new THREE.Quaternion();
        quaternionRight.setFromUnitVectors(defaultUp, directionRight);
        
        // 4. Position DIRECTLY at mirrored S_end_stay
        rightEndMesh.position.copy(S_end_stay_right);
        
        // 5. Apply rotation
        rightEndMesh.setRotationFromQuaternion(quaternionRight);
        rightEndMesh.rotateZ(-Math.PI / 2);
    }
}

export function genChainstayBottomEnd(geometry, scene, csEndBaseGeometry) {
    // Create the meshes but don't position yet
    const meshes = createChainstayBottomEndMeshes(csEndBaseGeometry, geometry.params.frameColor);
    if (!meshes.leftEndMesh || !meshes.rightEndMesh) {
        if(componentRegistry.chainstayEndAssemblyBottom) delete componentRegistry.chainstayEndAssemblyBottom;
        return null;
    }

    // Create the group to hold both meshes
    const csEndGroupBottom = new THREE.Group();
    csEndGroupBottom.userData.componentType = 'chainstayEndAssemblyBottom'; // Tag the group

    // Add meshes to the group
    csEndGroupBottom.add(meshes.leftEndMesh);
    csEndGroupBottom.add(meshes.rightEndMesh);

    // Position the meshes to their world positions
    positionChainstayBottomEndAssembly(meshes, geometry);

    // The group itself stays at origin since meshes have world positions
    csEndGroupBottom.position.set(0, 0, 0);

    // Register and add group to scene
    componentRegistry.chainstayEndAssemblyBottom = csEndGroupBottom; // Register the group
    scene.add(csEndGroupBottom);

    return csEndGroupBottom;
}

// --- Chainstay Top End Assembly ---

function createChainstayTopEndMeshes(csEndBaseGeometry, frameColor = 0x800080) {
    if (!csEndBaseGeometry) return { leftEndMesh: null, rightEndMesh: null };

    const material = createComponentMaterial('chainstayTopEndAssembly', { color: frameColor });

    // Create left end mesh - don't position or rotate yet
    const leftEndMesh = new THREE.Mesh(csEndBaseGeometry.clone(), material.clone());
    leftEndMesh.userData.componentType = 'chainstayTopEndLeft'; // Tag

    // Create right end mesh - don't position or rotate yet
    const rightEndMesh = new THREE.Mesh(csEndBaseGeometry.clone(), material.clone());
    rightEndMesh.userData.componentType = 'chainstayTopEndRight'; // Tag

    return { leftEndMesh, rightEndMesh };
}

export function positionChainstayTopEndAssembly(meshes, geometry) {
    const { leftEndMesh, rightEndMesh } = meshes;
    const { points } = geometry;
    const { S_end_stay_T, chainstayElbow_T } = points;
    
    // Constants matching original
    const params = { 
        scale: 1.9
    };

    // Position LEFT mesh - closely following original approach
    if (leftEndMesh) {
        // Reset transformations first
        leftEndMesh.position.set(0, 0, 0);
        leftEndMesh.rotation.set(0, 0, 0);
        leftEndMesh.scale.set(1, 1, 1);
        
        // 1. Set scale
        leftEndMesh.scale.set(params.scale, params.scale, params.scale);
        
        // 2. Calculate direction vector for orientation
        const direction = new THREE.Vector3().subVectors(chainstayElbow_T, S_end_stay_T).normalize();
        
        // 3. Create quaternion for rotation
        const defaultUp = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(defaultUp, direction);
        
        // 4. Position DIRECTLY at S_end_stay_T
        leftEndMesh.position.copy(S_end_stay_T);
        
        // 5. Apply rotation
        leftEndMesh.setRotationFromQuaternion(quaternion);
        leftEndMesh.rotateZ(-Math.PI / 2);
    }

    // Position RIGHT mesh - closely following original approach
    if (rightEndMesh) {
        // Reset transformations first
        rightEndMesh.position.set(0, 0, 0);
        rightEndMesh.rotation.set(0, 0, 0);
        rightEndMesh.scale.set(1, 1, 1);
        
        // 1. Set mirrored scale
        rightEndMesh.scale.set(params.scale, params.scale, -params.scale);
        
        // 2. Get mirrored points for right side
        const S_end_stay_T_right = new THREE.Vector3(S_end_stay_T.x, S_end_stay_T.y, -S_end_stay_T.z);
        const chainstayElbow_T_right = new THREE.Vector3(chainstayElbow_T.x, chainstayElbow_T.y, -chainstayElbow_T.z);
        
        // 3. Calculate direction for right side
        const directionRight = new THREE.Vector3().subVectors(chainstayElbow_T_right, S_end_stay_T_right).normalize();
        const defaultUp = new THREE.Vector3(0, 1, 0);
        const quaternionRight = new THREE.Quaternion();
        quaternionRight.setFromUnitVectors(defaultUp, directionRight);
        
        // 4. Position DIRECTLY at mirrored S_end_stay_T
        rightEndMesh.position.copy(S_end_stay_T_right);
        
        // 5. Apply rotation
        rightEndMesh.setRotationFromQuaternion(quaternionRight);
        rightEndMesh.rotateZ(-Math.PI / 2);
    }
}

export function genChainstayTopEnd(geometry, scene, csEndBaseGeometry) {
    // Create the meshes but don't position yet
    const meshes = createChainstayTopEndMeshes(csEndBaseGeometry, geometry.params.frameColor);
    if (!meshes.leftEndMesh || !meshes.rightEndMesh) {
        if(componentRegistry.chainstayEndAssemblyTop) delete componentRegistry.chainstayEndAssemblyTop;
        return null;
    }

    // Create the group to hold both meshes
    const csEndGroupTop = new THREE.Group();
    csEndGroupTop.userData.componentType = 'chainstayEndAssemblyTop'; // Tag the group

    // Add meshes to the group
    csEndGroupTop.add(meshes.leftEndMesh);
    csEndGroupTop.add(meshes.rightEndMesh);

    // Position the meshes to their world positions
    positionChainstayTopEndAssembly(meshes, geometry);

    // The group itself stays at origin since meshes have world positions
    csEndGroupTop.position.set(0, 0, 0);

    // Register and add group to scene
    componentRegistry.chainstayEndAssemblyTop = csEndGroupTop; // Register the group
    scene.add(csEndGroupTop);

    return csEndGroupTop;
}

// --- Chainstay Dropout Assembly ---

function createChainStayDropoutMeshes(dropoutCSBaseGeometry, frameColor = 0x800080) {
    if (!dropoutCSBaseGeometry) return { leftDropoutMesh: null, rightDropoutMesh: null };

    const material = createComponentMaterial('chainstayDropoutAssembly', { color: frameColor });

    // Create left dropout mesh - don't position or rotate yet
    const leftDropoutMesh = new THREE.Mesh(dropoutCSBaseGeometry.clone(), material.clone());
    leftDropoutMesh.userData.componentType = 'chainstayDropoutLeft';

    // Create right dropout mesh - don't position or rotate yet
    const rightDropoutMesh = new THREE.Mesh(dropoutCSBaseGeometry.clone(), material.clone());
    rightDropoutMesh.userData.componentType = 'chainstayDropoutRight';

    return { leftDropoutMesh, rightDropoutMesh };
}

export function positionChainStayDropoutAssembly(meshes, geometry) {
    const { leftDropoutMesh, rightDropoutMesh } = meshes;
    // Points needed based on the ORIGINAL logic
    const { points } = geometry;
    const { rearAxel, B_start } = points; 

    // Constants from the ORIGINAL logic
    const params = { 
        scale: 1.6,
        zOffset: 0.3 // Adjust this value to move dropouts closer to center
    };

    // Common calculations based on ORIGINAL logic
    const modifiedBStart = new THREE.Vector3(
        B_start.x,
        B_start.y,
        rearAxel.z // Use rearAxel's Z coordinate
    );
    const direction = new THREE.Vector3().subVectors(modifiedBStart, rearAxel).normalize();
    const defaultUp = new THREE.Vector3(0, 1, 0); // Assuming model's default orientation
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(defaultUp, direction);

    // Position LEFT dropout (matches original `dropoutMesh`)
    if (leftDropoutMesh) {
        // Reset transformations first (good practice from refactored version)
        leftDropoutMesh.position.set(0, 0, 0);
        leftDropoutMesh.rotation.set(0, 0, 0);
        leftDropoutMesh.scale.set(1, 1, 1);
        
        // 1. Apply initial scale (from original logic)
        leftDropoutMesh.scale.set(-params.scale, params.scale, params.scale);
        
        // 2. Position at rearAxel point (from original logic)
        leftDropoutMesh.position.copy(rearAxel);
        
        // 3. Apply Z offset (from original logic)
        leftDropoutMesh.position.z += params.zOffset; // Move left dropout closer to center
        
        // 4. Apply the directional rotation (from original logic)
        leftDropoutMesh.setRotationFromQuaternion(quaternion);
        
        // 5. Add 90-degree rotation (from original logic)
        leftDropoutMesh.rotateZ(-Math.PI / 2);
    }

    // Position RIGHT dropout (matches original `dropoutMeshRight`)
    if (rightDropoutMesh) {
        // Reset transformations first
        rightDropoutMesh.position.set(0, 0, 0);
        rightDropoutMesh.rotation.set(0, 0, 0);
        rightDropoutMesh.scale.set(1, 1, 1);

        // 1. Apply mirrored scale (from original logic)
        rightDropoutMesh.scale.set(-params.scale, params.scale, -params.scale); // Mirror scale on Z axis and maintain negative X

        // 2. Position based on rearAxel, mirroring the Z offset calculation
        //    The original mirrored the *final* Z position of the left mesh.
        //    So, calculate the target Z for the right mesh: -(rearAxel.z + params.zOffset)
        rightDropoutMesh.position.copy(rearAxel);
        rightDropoutMesh.position.z = -(rearAxel.z + params.zOffset); // Mirrored Z position relative to original rearAxel.z

        // 3. Apply the same directional rotation (from original logic)
        rightDropoutMesh.setRotationFromQuaternion(quaternion);

        // 4. Add the same 90-degree rotation (from original logic)
        rightDropoutMesh.rotateZ(-Math.PI / 2);
    }
}

export function genChainStayDropout(geometry, scene, dropoutCSBaseGeometry) {

    // Create the meshes but don't position yet
    const meshes = createChainStayDropoutMeshes(dropoutCSBaseGeometry, geometry.params.frameColor);
    if (!meshes.leftDropoutMesh || !meshes.rightDropoutMesh) {
        // Clean up potential existing assembly if creation fails
        if(typeof componentRegistry !== 'undefined' && componentRegistry.chainstayDropoutAssembly) {
             // You might want to remove it from the scene as well if it was added previously
             // scene.remove(componentRegistry.chainstayDropoutAssembly); 
             delete componentRegistry.chainstayDropoutAssembly;
        }
        return null;
    }

    // Create the group to hold both meshes
    const dropoutGroup = new THREE.Group();
    dropoutGroup.userData.componentType = 'chainstayDropoutAssembly';

    // Add meshes to the group
    dropoutGroup.add(meshes.leftDropoutMesh);
    dropoutGroup.add(meshes.rightDropoutMesh);

    // Position the meshes using the updated function implementing original logic
    positionChainStayDropoutAssembly(meshes, geometry);

    // The group itself stays at origin since meshes have world positions
    dropoutGroup.position.set(0, 0, 0);

    // Register and add group to scene (assuming componentRegistry exists)
    if (typeof componentRegistry !== 'undefined') {
        // Remove old one if it exists to prevent duplicates
        if (componentRegistry.chainstayDropoutAssembly) {
            scene.remove(componentRegistry.chainstayDropoutAssembly);
        }
        componentRegistry.chainstayDropoutAssembly = dropoutGroup;
    }
    scene.add(dropoutGroup);

    return dropoutGroup;
}

