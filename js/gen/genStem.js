console.log('Loading genStem.js...');
import * as THREE from 'three';
import { CSG } from 'three-csg-ts';
import { componentRegistry } from '../registry.js';
import { createComponentMaterial } from '../materials.js';


// Shared constants for stem components
const STEM_CONSTANTS = {
    // Common properties for all stem components
    SCALE: 2.3,
    MATERIAL: {
        COLOR: 0xffffff,
        ROUGHNESS: 0.1,
        METALNESS: 0.8,
        SIDE: THREE.DoubleSide
    },
    
    // Rotation properties used by stemCore and stemClamp
    ROTATION: {
        MIN_R_LENGTH: 0.525,    // R_length where rotation is 0 (front load)
        MAX_R_LENGTH: 2.97,     // R_length where rotation is 90 (top load)
        MIN_ROTATION: 0,       // Rotation angle in radians for front load (0 degrees)
        MAX_ROTATION: Math.PI/2 // Rotation angle in radians for top load (90 degrees)
    },
    
    // Clipping plane properties
    CLIPPING: {
        VISUALIZATION: false,  // Whether to show planes for debugging
        PLANE_SIZE: 10,        // Size of clipping plane for visualization
        BASE_X_OFFSET: 4.9,    // Base offset for clipping planes
        X_SLIDE_MAX: 1.3,      // Maximum amount to slide the plane perpendicular to stem axis
        CLIP_OFFSET: 0.4       // Offset for stemBase clipping plane from L_end
    }
};

// Helper function to create standard stem material (legacy - will be replaced)
function createStemMaterial(options = {}) {
    return new THREE.MeshStandardMaterial({
        color: STEM_CONSTANTS.MATERIAL.COLOR,
        roughness: STEM_CONSTANTS.MATERIAL.ROUGHNESS,
        metalness: STEM_CONSTANTS.MATERIAL.METALNESS,
        side: STEM_CONSTANTS.MATERIAL.SIDE,
        ...options
    });
}

// Helper function to calculate stem rotation based on R_length
function calculateStemRotation(r_length) {
    const { MIN_R_LENGTH, MAX_R_LENGTH, MIN_ROTATION, MAX_ROTATION } = STEM_CONSTANTS.ROTATION;
    
    if (r_length <= MIN_R_LENGTH) {
        // Front load (no rotation)
        return MIN_ROTATION;
    } else if (r_length >= MAX_R_LENGTH) {
        // Top load (90 degree rotation)
        return MAX_ROTATION;
    } else {
        // Transitional rotation - linear interpolation between min and max
        const t = (r_length - MIN_R_LENGTH) / (MAX_R_LENGTH - MIN_R_LENGTH);
        return THREE.MathUtils.lerp(MIN_ROTATION, MAX_ROTATION, t);
    }
}


export function setupStemClippingPlane(geometry, scene) {
    const { points, params } = geometry;
    const { spacer_end, stem_center } = points;
    
    // Constants for clipping plane
    const CLIP_PLANE = {
        SIZE: STEM_CONSTANTS.CLIPPING.PLANE_SIZE,
        VISUALIZATION: STEM_CONSTANTS.CLIPPING.VISUALIZATION,
        X_SLIDE_MAX: STEM_CONSTANTS.CLIPPING.X_SLIDE_MAX,
        BASE_X_OFFSET: STEM_CONSTANTS.CLIPPING.BASE_X_OFFSET - params.L_length
    };

    // Create the clipping plane
    // First, calculate the normal vector (perpendicular to stem_center:spacer_end)
    const stemVector = new THREE.Vector3().subVectors(stem_center, spacer_end).normalize();

    // Calculate the rotation factor (0 to 1) based on R_length
    const { MIN_R_LENGTH, MAX_R_LENGTH } = STEM_CONSTANTS.ROTATION;
    
    let slideFactor = 0;
    if (params.R_length <= MIN_R_LENGTH) {
        // Front load (minimum rotation) - maximum slide
        slideFactor = 1.0;
    } else if (params.R_length >= MAX_R_LENGTH) {
        // Top load (maximum rotation) - minimum slide
        slideFactor = 0.0;
    } else {
        // Transitional - linear interpolation
        slideFactor = 1.0 - (params.R_length - MIN_R_LENGTH) / 
                    (MAX_R_LENGTH - MIN_R_LENGTH);
    }

    // Calculate perpendicular direction to slide along
    // This is perpendicular to the stem axis in the XY plane
    const slideDirection = new THREE.Vector3(stemVector.y, -stemVector.x, 0).normalize();

    // Apply base offset first
    const baseOffset = slideDirection.clone().multiplyScalar(CLIP_PLANE.BASE_X_OFFSET);
    let planePosition = spacer_end.clone().add(baseOffset);

    // Then apply the dynamic sliding offset
    const slideOffset = slideDirection.clone().multiplyScalar(CLIP_PLANE.X_SLIDE_MAX * slideFactor);
    planePosition.add(slideOffset);

    // Create THREE.Plane object for the red plane (main clipping plane)
    const redClippingPlane = new THREE.Plane();
    redClippingPlane.setFromNormalAndCoplanarPoint(stemVector, planePosition);

    // Create perpendicular green plane
    // We need a normal vector that is perpendicular to stemVector
    // We'll use the slide direction for this, which is already perpendicular to stemVector in the XY plane
    const greenNormal = slideDirection.clone();
    
    // Calculate the L_end:stem_center direction vector
    const lToStemDirection = new THREE.Vector3().subVectors(stem_center, points.L_end).normalize();
    
    // Move the green plane along the L_end:stem_center vector by negative half of the red plane's size
    const greenPlaneOffset = lToStemDirection.clone().multiplyScalar(CLIP_PLANE.SIZE * -0.5);
    const greenPlanePosition = planePosition.clone().add(greenPlaneOffset);
    
    const greenClippingPlane = new THREE.Plane();
    greenClippingPlane.setFromNormalAndCoplanarPoint(greenNormal, greenPlanePosition);

    // For visualization purposes, create visible plane helpers
    if (CLIP_PLANE.VISUALIZATION) {
        // Create red plane geometry (perpendicular to stemVector)
        const redPlaneGeometry = new THREE.PlaneGeometry(CLIP_PLANE.SIZE, CLIP_PLANE.SIZE);
        const redPlaneMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        const redPlaneMesh = new THREE.Mesh(redPlaneGeometry, redPlaneMaterial);
        redPlaneMesh.position.copy(planePosition);
        
        // Align the red plane to be perpendicular to stemVector
        const angleToRotate = Math.atan2(stemVector.y, stemVector.x);
        redPlaneMesh.rotation.z = angleToRotate;
        
        // Rotate the red plane 90 degrees to be perpendicular
        redPlaneMesh.rotateZ(Math.PI / 2);
        
        // Add 90-degree rotation on the X axis
        redPlaneMesh.rotateX(Math.PI / 2);
        
        // Create green plane geometry (perpendicular to slideDirection)
        const greenPlaneGeometry = new THREE.PlaneGeometry(CLIP_PLANE.SIZE, CLIP_PLANE.SIZE);
        const greenPlaneMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        const greenPlaneMesh = new THREE.Mesh(greenPlaneGeometry, greenPlaneMaterial);
        greenPlaneMesh.position.copy(greenPlanePosition);
        
        // Align the green plane to be perpendicular to greenNormal (slideDirection)
        const greenAngleToRotate = Math.atan2(greenNormal.y, greenNormal.x);
        greenPlaneMesh.rotation.z = greenAngleToRotate;
        
        // Rotate the green plane 90 degrees to be perpendicular
        greenPlaneMesh.rotateZ(Math.PI / 2);
        
        // Add 90-degree rotation on the X axis
        greenPlaneMesh.rotateX(Math.PI / 2);
        
        scene.add(redPlaneMesh);
        scene.add(greenPlaneMesh);
    }
    
    return {
        redClippingPlane,
        greenClippingPlane,
        planePosition,
        greenPlanePosition,
        stemVector,
        slideDirection: greenNormal,
        capColor: STEM_CONSTANTS.MATERIAL.COLOR, // Use the same material color for caps
        planeSize: CLIP_PLANE.SIZE
    };
}

export function genStemCore(geometry, scene, stemCore, clippingPlaneInfo) {
    if (!stemCore) return null;
   
    const { points, params } = geometry;
    const stemColor = geometry.params.stemColor !== undefined ? geometry.params.stemColor : 0xffffff;
    const { R_end, spacer_end, stem_center } = points;
   
    // Extract clipping plane info
    const { 
        redClippingPlane, 
        greenClippingPlane, 
        planePosition, 
        greenPlanePosition,
        stemVector, 
        slideDirection,
        capColor, 
        planeSize 
    } = clippingPlaneInfo;
   
    // Create main material with both clipping planes for first part
    const material = createStemMaterial({ color: stemColor });
   
    // Create mesh with stemCore geometry for first part
    const coreMesh = new THREE.Mesh(stemCore, material);
   
    // Apply uniform scaling
    coreMesh.scale.set(
        STEM_CONSTANTS.SCALE,
        STEM_CONSTANTS.SCALE,
        STEM_CONSTANTS.SCALE
    );
   
    // Position at R_end point (where handlebar connects)
    coreMesh.position.copy(R_end);
   
    // Align with the stem vector (spacer_end to stem_center)
    const angleToRotate = Math.atan2(stemVector.y, stemVector.x);
    coreMesh.rotation.z = angleToRotate - Math.PI/2;
   
    // Calculate rotation based on R_length
    const rotationAmount = calculateStemRotation(params.R_length);
   
    // Apply front/top load rotation on the Z axis with negative value as requested
    coreMesh.rotation.z -= rotationAmount;
   
    // Apply both clipping planes to first part
    material.clippingPlanes = [redClippingPlane, greenClippingPlane];
    material.clipIntersection = false; // Only clip where OUTSIDE both planes
    material.needsUpdate = true;
    
    // --------------------------------------
    // Create the second part of stemCore
    // This part is only clipped by green plane on inverse side
    // --------------------------------------
    
    // Create inverse green clipping plane
    const inverseGreenClippingPlane = greenClippingPlane.clone();
    inverseGreenClippingPlane.negate(); // Flip the normal to clip the opposite side
    
    // Create material for second part - only affected by inverse green plane
    const backMaterial = createStemMaterial({ color: stemColor });
    
    // Apply only inverse green clipping plane to second part
    backMaterial.clippingPlanes = [inverseGreenClippingPlane];
    backMaterial.clipIntersection = false; // Clip where outside plane
    backMaterial.needsUpdate = true;
    
    // Create mesh for second part using same geometry
    const backCoreMesh = new THREE.Mesh(stemCore, backMaterial);
    
    // Apply same transformations to ensure perfect alignment
    backCoreMesh.scale.copy(coreMesh.scale);
    backCoreMesh.position.copy(coreMesh.position);
    backCoreMesh.rotation.copy(coreMesh.rotation);
    
    // --------------------------------------
    // FIX: Create the cap for the red clipping plane only
    // --------------------------------------
    
    // PASS 1: Back face stencil material - increment stencil buffer
    // Only use the RED clipping plane for stencil operations
    const redBackFaceStencilMat = new THREE.MeshBasicMaterial();
    redBackFaceStencilMat.depthWrite = false;
    redBackFaceStencilMat.depthTest = false;
    redBackFaceStencilMat.colorWrite = false;
    redBackFaceStencilMat.stencilWrite = true;
    redBackFaceStencilMat.stencilFunc = THREE.AlwaysStencilFunc;
    redBackFaceStencilMat.side = THREE.BackSide;
    redBackFaceStencilMat.stencilFail = THREE.IncrementWrapStencilOp;
    redBackFaceStencilMat.stencilZFail = THREE.IncrementWrapStencilOp;
    redBackFaceStencilMat.stencilZPass = THREE.IncrementWrapStencilOp;
    // FIX: Only use red clipping plane for stencil
    redBackFaceStencilMat.clippingPlanes = [redClippingPlane];
    redBackFaceStencilMat.clipIntersection = false;
    
    // PASS 2: Front face stencil material - decrement stencil buffer
    const redFrontFaceStencilMat = new THREE.MeshBasicMaterial();
    redFrontFaceStencilMat.depthWrite = false;
    redFrontFaceStencilMat.depthTest = false;
    redFrontFaceStencilMat.colorWrite = false;
    redFrontFaceStencilMat.stencilWrite = true;
    redFrontFaceStencilMat.stencilFunc = THREE.AlwaysStencilFunc;
    redFrontFaceStencilMat.side = THREE.FrontSide;
    redFrontFaceStencilMat.stencilFail = THREE.DecrementWrapStencilOp;
    redFrontFaceStencilMat.stencilZFail = THREE.DecrementWrapStencilOp;
    redFrontFaceStencilMat.stencilZPass = THREE.DecrementWrapStencilOp;
    // FIX: Only use red clipping plane for stencil
    redFrontFaceStencilMat.clippingPlanes = [redClippingPlane];
    redFrontFaceStencilMat.clipIntersection = false;
    
    // PASS 3: Cap material for RED plane - render where stencil buffer is not equal to zero
    const redCapMaterial = createStemMaterial({ 
        color: stemColor,
        stencilWrite: true,
        stencilRef: 0,
        stencilFunc: THREE.NotEqualStencilFunc,
        stencilFail: THREE.ReplaceStencilOp,
        stencilZFail: THREE.ReplaceStencilOp,
        stencilZPass: THREE.ReplaceStencilOp,
        // FIX: Remove clipping planes from the cap itself
        // This ensures the cap is not affected by any clipping
        clippingPlanes: []
    });
    
    // 2. Create stencil meshes
    
    // Create a clone of the stemCore geometry for stencil operations
    // This ensures we precisely match the original shape
    const stencilGeometry = stemCore.clone();
    
    // Back face mesh (for red cap)
    const backFaceMesh = new THREE.Mesh(stencilGeometry, redBackFaceStencilMat);
    backFaceMesh.scale.copy(coreMesh.scale);
    backFaceMesh.position.copy(coreMesh.position);
    backFaceMesh.rotation.copy(coreMesh.rotation);
    backFaceMesh.renderOrder = 0;
    
    // Front face mesh (for red cap)
    const frontFaceMesh = new THREE.Mesh(stencilGeometry, redFrontFaceStencilMat);
    frontFaceMesh.scale.copy(coreMesh.scale);
    frontFaceMesh.position.copy(coreMesh.position);
    frontFaceMesh.rotation.copy(coreMesh.rotation);
    frontFaceMesh.renderOrder = 1;
    
    // Red cap plane mesh
    const planeGeom = new THREE.PlaneGeometry(planeSize, planeSize);
    const redCapMesh = new THREE.Mesh(planeGeom, redCapMaterial);
    redCapMesh.position.copy(planePosition);
    
    // Forward vector (normal to the original plane)
    const forwardVector = new THREE.Vector3(0, 0, 1);
    
    // Create the red plane's orientation to match the red clipping plane
    redCapMesh.quaternion.setFromUnitVectors(forwardVector, stemVector);
    redCapMesh.renderOrder = 2;  // Render after the stencil setup meshes
    
    // FIX: Add small offset to avoid z-fighting
    const offsetDistance = 0.001;
    const offsetVector = stemVector.clone().multiplyScalar(offsetDistance);
    redCapMesh.position.add(offsetVector);


    // Create a group to hold the parts
    const stemCoreGroup = new THREE.Group();
    stemCoreGroup.userData.componentType = 'stemCoreAssembly';
    
    // Add front and back parts to the group
    if (coreMesh) {
        coreMesh.userData.componentType = 'stemCoreFrontPart';
        stemCoreGroup.add(coreMesh);
    }
    
    if (backCoreMesh) {
        backCoreMesh.userData.componentType = 'stemCoreBackPart';
        stemCoreGroup.add(backCoreMesh);
    }
    
    // Add cap meshes if they exist
    if (backFaceMesh) {
        backFaceMesh.userData.componentType = 'stemCoreStencilBack';
        stemCoreGroup.add(backFaceMesh);
    }
    
    if (frontFaceMesh) {
        frontFaceMesh.userData.componentType = 'stemCoreStencilFront';
        stemCoreGroup.add(frontFaceMesh);
    }
    
    if (redCapMesh) {
        redCapMesh.userData.componentType = 'stemCoreRedCap';
        stemCoreGroup.add(redCapMesh);
    }
    
    // Register and add to scene
    componentRegistry.stemCoreAssembly = stemCoreGroup;
    scene.add(stemCoreGroup);
    
    return stemCoreGroup;
}

export function genStemBase(geometry, scene, stemBase) {
    if (!stemBase) return null;
    
    const { points } = geometry;
    const stemColor = geometry.params.stemColor !== undefined ? geometry.params.stemColor : 0xffffff;
    const { stem_center, spacer_end, L_end } = points;
    
    // Create material
    const material = createComponentMaterial('stemBase', { color: stemColor });
    
    // Create mesh with stemBase geometry
    const baseMesh = new THREE.Mesh(stemBase, material);
    if (baseMesh) {
        baseMesh.userData.componentType = 'stemBase';
    }
    
    // Apply uniform scaling
    baseMesh.scale.set(
        STEM_CONSTANTS.SCALE,
        STEM_CONSTANTS.SCALE,
        STEM_CONSTANTS.SCALE
    );
    
    // Position at spacer_end point as requested in the update
    baseMesh.position.copy(spacer_end);
    
    // Calculate direction vectors for orientation
    
    // Vector from stem_center to L_end (primary alignment)
    const stemLVector = new THREE.Vector3().subVectors(L_end, stem_center).normalize();
    
    // Align with the stem vector (stem_center to L_end)
    const angleToRotate = Math.atan2(stemLVector.y, stemLVector.x);
    
    // Apply rotation on Z-axis with the updated rotation formula
    baseMesh.rotation.z = angleToRotate + Math.PI; // Updated rotation as requested
    
    // --------------------------------------------------
    // Setup clipping plane for the stemBase
    // --------------------------------------------------

    // Calculate the L_end to stem_center vector for the clipping plane
    const lToStemVector = new THREE.Vector3().subVectors(stem_center, L_end).normalize();

    // Calculate the position of the clipping plane (L_end with offset)
    const planePosition = L_end.clone().add(
        lToStemVector.clone().multiplyScalar(STEM_CONSTANTS.CLIPPING.CLIP_OFFSET)
    );

    // Create the clipping plane - perpendicular to L_end:stem_center vector
    const clippingPlane = new THREE.Plane();
    clippingPlane.setFromNormalAndCoplanarPoint(lToStemVector, planePosition);

    // Apply the clipping plane to the mesh material
    material.clippingPlanes = [clippingPlane];
    material.clipIntersection = false;
    material.needsUpdate = true;

    // For visualization purposes, create a visible plane helper (if enabled)
    if (STEM_CONSTANTS.CLIPPING.VISUALIZATION) {
        // Create a plane geometry
        const planeGeometry = new THREE.PlaneGeometry(5, 5); // Adjust size as needed
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00, // Green color to differentiate from stemCore clipping plane
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        planeMesh.position.copy(planePosition);
        
        // Create a stable coordinate system to prevent unwanted rotation
        // 1. Start with the normal vector (lToStemVector)
        const zAxis = lToStemVector.clone();
        
        // 2. Create a consistent reference vector (use world up or along bike direction)
        // Use world up vector (0,1,0) as our reference
        const worldUp = new THREE.Vector3(0, 1, 0);
        
        // 3. Create x-axis (perpendicular to both normal and reference)
        const xAxis = new THREE.Vector3().crossVectors(worldUp, zAxis).normalize();
        
        // 4. Create y-axis (perpendicular to both x-axis and normal)
        const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
        
        // 5. Create rotation matrix from these axes
        const rotationMatrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
        
        // 6. Apply rotation to the plane mesh
        planeMesh.setRotationFromMatrix(rotationMatrix);
        
        // Add visualization plane to scene
        scene.add(planeMesh);
    }
    
    // Register component
    componentRegistry.stemBase = baseMesh;

    // Add base mesh to scene
    scene.add(baseMesh);
    
    return baseMesh;
}

export function genStemClamp(geometry, scene, stemClamp) {
    if (!stemClamp) return null;
    
    const { points, params } = geometry;
    const stemColor = geometry.params.stemColor !== undefined ? geometry.params.stemColor : 0xffffff;
    const { R_end, spacer_end, stem_center } = points;
    
    // Create material
    const material = createComponentMaterial('stemClamp', { color: stemColor });
    
    // Create mesh with stemClamp geometry
    const clampMesh = new THREE.Mesh(stemClamp, material);
    clampMesh.userData.componentType = 'stemClamp';
    // Apply uniform scaling
    clampMesh.scale.set(
        STEM_CONSTANTS.SCALE,
        STEM_CONSTANTS.SCALE,
        STEM_CONSTANTS.SCALE
    );
    
    // Position at R_end point
    clampMesh.position.copy(R_end);
    
    // Calculate orientation to match stemCore
    
    // Get the stem vector for basic alignment
    const stemVector = new THREE.Vector3().subVectors(stem_center, spacer_end).normalize();
    
    // Calculate the base rotation angle as in stemCore
    const angleToRotate = Math.atan2(stemVector.y, stemVector.x);
    clampMesh.rotation.z = angleToRotate - Math.PI/2;
    
    // Calculate rotation based on R_length - same as in stemCore
    const rotationAmount = calculateStemRotation(params.R_length);
    
    // Apply the same rotation adjustment as stemCore
    clampMesh.rotation.z -= rotationAmount;
    

    // Register in registry
    componentRegistry.stemClamp = clampMesh;

    // Add to scene
    scene.add(clampMesh);
    
    return clampMesh;
}



// --- Headset Assembly ---

function createHeadsetMeshes(hsCoverBaseGeometry, hsSpacerBaseGeometry, params, headsetCoverColor = 0x404040, headsetSpacerColor = 0x404040) {
    let hsCoverMesh = null;
    const hsSpacerMeshes = [];

    // Create Cover Mesh
    if (hsCoverBaseGeometry) {
        const material = createComponentMaterial('headsetCover', { color: headsetCoverColor });
        hsCoverMesh = new THREE.Mesh(hsCoverBaseGeometry.clone(), material);
        hsCoverMesh.userData.componentType = 'headsetCover'; // Tag
    }

    // Create Spacer Meshes (conditional)
    if (hsSpacerBaseGeometry && params.HS_SpacerCount > 0) {
        for (let i = 0; i < params.HS_SpacerCount; i++) {
            const material = createComponentMaterial('headsetSpacer', { color: headsetSpacerColor });
            const spacerMesh = new THREE.Mesh(hsSpacerBaseGeometry.clone(), material);
            spacerMesh.userData.componentType = 'headsetSpacer'; // Tag each spacer
            spacerMesh.userData.spacerIndex = i; // Optional: Add index if needed
            hsSpacerMeshes.push(spacerMesh);
        }
    }

    return { hsCoverMesh, hsSpacerMeshes };
}

export function positionHeadsetAssembly(meshes, geometry) {
    const { hsCoverMesh, hsSpacerMeshes } = meshes;
    const { points, params } = geometry; // Need points and params
    const HS = { BASE_SCALE: 0.9 }; // Constant from original

    // Check required points exist
    if (!points.P_end || !points.A_end || !points.headset_Start || !points.headset_End) {
         console.error("Required points missing for headset positioning.");
         return;
    }

    // Calculate head tube direction and orientation quaternion (once)
    const direction = new THREE.Vector3().subVectors(points.P_end, points.A_end).normalize(); // Use P_end and A_end for headtube axis
    const upVector = new THREE.Vector3(0, 1, 0); // Default up
    const quaternion = new THREE.Quaternion();
    const rotationMatrix = new THREE.Matrix4();
    // Align local Y axis with the head tube direction (matching original createHeadset logic)
    rotationMatrix.lookAt(new THREE.Vector3(0,0,0), direction, upVector); // Look along direction
    quaternion.setFromRotationMatrix(rotationMatrix);
    // Note: Original code had quaternion.setFromUnitVectors(upVector, direction);
    // Using lookAt might be more robust depending on model orientation. Test needed.
    // If using setFromUnitVectors, ensure the local axis matches the intended alignment axis.

    // Position Headset Cover
    if (hsCoverMesh) {
        // Reset transforms
        hsCoverMesh.position.set(0, 0, 0);
        hsCoverMesh.rotation.set(0, 0, 0);
        hsCoverMesh.scale.set(1, 1, 1);

        hsCoverMesh.geometry.computeBoundingBox(); // Needed for scaling calc
        const bbox = hsCoverMesh.geometry.boundingBox;
        // Assuming original model is oriented along Z for length calculation
        const originalLength = bbox.max.z - bbox.min.z;
        const targetLength = points.headset_End.distanceTo(points.headset_Start);
        const zScaleFactor = (originalLength === 0) ? 1 : targetLength / originalLength;

        // Apply scaling (Note negative Z scale from original)
        hsCoverMesh.scale.set(HS.BASE_SCALE, HS.BASE_SCALE, -zScaleFactor);

        // Apply orientation: Initial rotation + Headtube alignment
        //hsCoverMesh.rotation.x = Math.PI / 2; // Initial rotation from original code
        hsCoverMesh.quaternion.multiplyQuaternions(quaternion, hsCoverMesh.quaternion); // Apply alignment

        // Set position
        hsCoverMesh.position.copy(points.headset_Start);
    }

    // Position Headset Spacers
    if (hsSpacerMeshes.length > 0 && hsSpacerMeshes[0].geometry) { // Check geometry exists
        hsSpacerMeshes[0].geometry.computeBoundingBox(); // Compute bounds once using first spacer
        const spacerBBox = hsSpacerMeshes[0].geometry.boundingBox;
        const originalSpacerLength = spacerBBox.max.z - spacerBBox.min.z;
        // Calculate Z scale based on param width
        const spacerZScale = (originalSpacerLength === 0) ? 1 : params.HS_SpacerWidth / originalSpacerLength;
        // Calculate direction for spacer offset (headset_Start -> headset_End)
        const spacerOffsetDirection = new THREE.Vector3().subVectors(points.headset_End, points.headset_Start).normalize();


        hsSpacerMeshes.forEach((spacerMesh, i) => {
            // Reset transforms
            spacerMesh.position.set(0, 0, 0);
            spacerMesh.rotation.set(0, 0, 0);
            spacerMesh.scale.set(1, 1, 1);

            // Apply scaling (Note negative Z scale from original)
            spacerMesh.scale.set(HS.BASE_SCALE, HS.BASE_SCALE, -spacerZScale);

            // Apply orientation: Initial rotation + Headtube alignment
            //spacerMesh.rotation.x = Math.PI / 2; // Initial rotation
            spacerMesh.quaternion.multiplyQuaternions(quaternion, spacerMesh.quaternion); // Apply alignment

            // Calculate position: Start at headset_End + offset along spacerDirection
            const offset = spacerOffsetDirection.clone().multiplyScalar(params.HS_SpacerWidth * i);
            spacerMesh.position.copy(points.headset_End).add(offset);
        });
    }
}

export function genHeadset(geometry, scene, hsCoverBaseGeometry, hsSpacerBaseGeometry) {
    // 1b. Create Meshes
    const meshes = createHeadsetMeshes(
        hsCoverBaseGeometry, 
        hsSpacerBaseGeometry, 
        geometry.params,
        geometry.params.headsetCoverColor,
        geometry.params.headsetSpacerColor
    );
     if (!meshes.hsCoverMesh && meshes.hsSpacerMeshes.length === 0) {
         if(componentRegistry.headsetAssembly) delete componentRegistry.headsetAssembly;
         return null; // Nothing created
     }

    // 2. Position Meshes
    positionHeadsetAssembly(meshes, geometry);

    // 3. Group, Tag, Register, Add to Scene
    const headsetGroup = new THREE.Group();
    headsetGroup.userData.componentType = 'headsetAssembly'; // Tag the group

    // Add meshes to the group
    if (meshes.hsCoverMesh) headsetGroup.add(meshes.hsCoverMesh);
    meshes.hsSpacerMeshes.forEach(spacer => headsetGroup.add(spacer));

    // Group itself sits at world origin as children are world-positioned
    headsetGroup.position.set(0, 0, 0);
    headsetGroup.rotation.set(0, 0, 0);
    headsetGroup.scale.set(1, 1, 1);

    // Register and add group to scene
    componentRegistry.headsetAssembly = headsetGroup; // Register the group
    scene.add(headsetGroup);

    return headsetGroup;
}




