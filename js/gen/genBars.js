console.log('Loading genBars.js...');
import * as THREE from 'three';
import * as Constants from '../constants.js';
import { addLine, createBeveledPoint, createTaperedTube, mirrorGeometryX, mirrorGeometryZ } from './genUtil.js';
import { componentRegistry } from '../registry.js';
import { createComponentMaterial, createGripMaterials } from '../materials.js';


function createEndCap(radius, position, direction, scene, handlebarColor = 0x800080) {
    const circleGeometry = new THREE.CircleGeometry(radius, 32);
    const material = createComponentMaterial('handlebarEndCap', { color: handlebarColor });

    // Create original cap
    const circle = new THREE.Mesh(circleGeometry, material);
    circle.position.copy(position);

    // Orient the cap
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    circle.setRotationFromQuaternion(quaternion);

    // Create mirrored cap
    const mirroredCircle = new THREE.Mesh(circleGeometry, material);
    // Mirror position across X axis (in Z direction)
    mirroredCircle.position.set(position.x, position.y, -position.z);
    
    // Mirror orientation
    const mirroredDirection = new THREE.Vector3(direction.x, direction.y, -direction.z);
    const mirroredQuaternion = new THREE.Quaternion();
    mirroredQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), mirroredDirection);
    mirroredCircle.setRotationFromQuaternion(mirroredQuaternion);
    
    // Add both caps to scene
    scene.add(circle);
    scene.add(mirroredCircle);
    
    return [circle, mirroredCircle];
}


// --- Handlebar Assembly ---

function createHandlebarGeometry(geometry) {
    const { points, params } = geometry;
    const { barC, B_corner, Bg_end, Bw_end } = points;
    const barMember = Constants.BAR_MEMBERS.barTube;
    const { params: barParams } = barMember;
    
    const isFourPiece = params.isFourPiece;
    
    // Calculate stem alignment (same as in calcHandlebarSystem)
    const stemDirection = new THREE.Vector3().subVectors(
        geometry.points.F_end,
        geometry.points.P_end
    ).normalize();
    const alignmentAngle = Math.atan2(stemDirection.y, stemDirection.x) + Math.PI / 2;
    
    // User rotation in radians
    const userRotationRad = params.B_rotation * (Math.PI / 180);
    
    // Total rotation applied during point calculation
    const totalRotation = userRotationRad + alignmentAngle;
    
    // Create inverse rotation matrix to get to standard orientation
    const inverseRotation = new THREE.Matrix4().makeRotationZ(-totalRotation);
    
    // Un-rotate points back to standard orientation
    // First make them relative to barC, then apply inverse rotation
    const standardB_corner = B_corner.clone().sub(barC).applyMatrix4(inverseRotation);
    const standardBg_end = Bg_end.clone().sub(barC).applyMatrix4(inverseRotation);
    const standardBw_end = Bw_end.clone().sub(barC).applyMatrix4(inverseRotation);
    
    // Important: Use standard orientation points to create geometry
    const result = {
        geometries: [],
        isFourPiece: isFourPiece,
        meshInfo: {
            barC: barC.clone(),  // Save original barC for positioning
            // Store rotation information for positioning
            standardOrientation: true,
            userRotation: userRotationRad,
            alignmentAngle: alignmentAngle,
            totalRotation: totalRotation
        }
    };
    
    if (isFourPiece) {
        // Generate bottom straight piece in standard orientation
        const bottomCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0), standardB_corner], false);
        const bottomTubeGeometry = new THREE.TubeGeometry(
            bottomCurve,
            barParams.segments,
            barParams.baseRadius,
            barParams.radialSegments,
            false
        );
        result.geometries.push(bottomTubeGeometry);

        // Extended base point calculation for 4-piece (in standard orientation)
        const extensionLength = 1.5;
        const extensionDirection = new THREE.Vector3().subVectors(standardB_corner, standardBg_end).normalize();
        const extendedBasePoint = new THREE.Vector3().copy(standardB_corner).add(
            extensionDirection.multiplyScalar(extensionLength)
        );
        
        // Store for positioning
        result.meshInfo.extendedBasePoint = extendedBasePoint.clone();
        
        // Generate top piece with existing bevels
        const gripBevelPoints = createBeveledPoint(
            standardB_corner,
            standardBg_end,
            standardBw_end,
            {
                bevelDistance: barParams.gripBevel.distance,
                bevelDivisions: barParams.gripBevel.divisions
            }
        );

        const topCurvePoints = [
            extendedBasePoint,
            standardB_corner,
            ...gripBevelPoints,
            standardBw_end
        ];

        const topCurve = new THREE.CatmullRomCurve3(topCurvePoints, false, 'centripetal');
        const topTubeGeometry = new THREE.TubeGeometry(
            topCurve,
            barParams.segments,
            barParams.baseRadius,
            barParams.radialSegments,
            false
        );
        result.geometries.push(topTubeGeometry);
        
        // Also store cap directions for positioning
        result.meshInfo.capDirection = new THREE.Vector3().subVectors(standardBg_end, extendedBasePoint).normalize();
        
    } else {
        // Original 2-piece implementation (in standard orientation)
        const cornerBevelPoints = createBeveledPoint(
            new THREE.Vector3(0,0,0),
            standardB_corner,
            standardBg_end,
            {
                bevelDistance: barParams.cornerBevel.distance,
                bevelDivisions: barParams.cornerBevel.divisions
            }
        );

        const gripBevelPoints = createBeveledPoint(
            standardB_corner,
            standardBg_end,
            standardBw_end,
            {
                bevelDistance: barParams.gripBevel.distance,
                bevelDivisions: barParams.gripBevel.divisions
            }
        );

        const curvePoints = [
            new THREE.Vector3(0,0,0),
            ...cornerBevelPoints,
            ...gripBevelPoints,
            standardBw_end
        ];

        const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'centripetal');
        const tubeGeometry = new THREE.TubeGeometry(
            curve,
            barParams.segments,
            barParams.baseRadius,
            barParams.radialSegments,
            false
        );
        
        result.geometries.push(tubeGeometry);
    }
    
    return result;
}
function createHandlebarMeshes(geometryData, handlebarColor = 0x800080) {
    if (!geometryData || !geometryData.geometries || geometryData.geometries.length === 0) {
        return null;
    }
    
    const material = createComponentMaterial('handlebarAssembly', { color: handlebarColor });
    
    const handlebarGroup = new THREE.Group();
    handlebarGroup.userData.componentType = 'handlebarAssembly';
    
    // Pass all meshInfo data to the group's userData
    if (geometryData.meshInfo) {
        handlebarGroup.userData.meshInfo = geometryData.meshInfo;
    }
    
    // Create meshes for each geometry
    geometryData.geometries.forEach((geo, index) => {
        const mesh = new THREE.Mesh(geo, material.clone());
        mesh.userData.componentType = index === 0 ? 
            'handlebarMain' : 
            `handlebarPart${index}`;
        handlebarGroup.add(mesh);
        
        // Create mirrored mesh
        const mirroredGeo = geo.clone();
        // Mirror by flipping Z coordinates
        const positions = mirroredGeo.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] = -positions[i + 2]; // Flip Z
        }
        
        // Fix normals
        if (mirroredGeo.attributes.normal) {
            const normals = mirroredGeo.attributes.normal.array;
            for (let i = 0; i < normals.length; i += 3) {
                normals[i + 2] = -normals[i + 2]; // Flip Z normals
            }
        }
        
        // Fix face winding order
        if (mirroredGeo.index) {
            const indices = mirroredGeo.index.array;
            const newIndices = new Uint32Array(indices.length);
            for (let i = 0; i < indices.length; i += 3) {
                newIndices[i] = indices[i];
                newIndices[i + 1] = indices[i + 2];
                newIndices[i + 2] = indices[i + 1];
            }
            mirroredGeo.setIndex(new THREE.BufferAttribute(newIndices, 1));
        }
        
        mirroredGeo.attributes.position.needsUpdate = true;
        if (mirroredGeo.attributes.normal) {
            mirroredGeo.attributes.normal.needsUpdate = true;
        }
        mirroredGeo.computeVertexNormals();
        
        const mirroredMesh = new THREE.Mesh(mirroredGeo, material.clone());
        mirroredMesh.userData.componentType = `handlebarMirrored${index}`;
        handlebarGroup.add(mirroredMesh);
    });
    
    // Create end caps if needed for 4-piece
    if (geometryData.isFourPiece && geometryData.meshInfo.extendedBasePoint && geometryData.meshInfo.capDirection) {
        const circleGeometry = new THREE.CircleGeometry(Constants.BAR_MEMBERS.barTube.params.baseRadius, 32);
        const capMaterial = createComponentMaterial('handlebarEndCap', { color: handlebarColor });
        
        // Left cap
        const leftCap = new THREE.Mesh(circleGeometry, capMaterial.clone());
        leftCap.userData.componentType = 'handlebarCapLeft';
        handlebarGroup.add(leftCap);
        
        // Right cap (mirrored)
        const rightCap = new THREE.Mesh(circleGeometry, capMaterial.clone());
        rightCap.userData.componentType = 'handlebarCapRight';
        handlebarGroup.add(rightCap);
    }
    
    return handlebarGroup;
}
export function positionHandlebarAssembly(handlebarGroup, geometry) {
    const { points, params } = geometry;
    
    if (!handlebarGroup || !points.barC) {
        console.error("Missing handlebar group or barC point for positioning");
        return false;
    }
    
    // Reset group transformations completely
    handlebarGroup.matrix.identity();
    handlebarGroup.position.set(0, 0, 0);
    handlebarGroup.rotation.set(0, 0, 0);
    handlebarGroup.scale.set(1, 1, 1);
    handlebarGroup.updateMatrix();
    
    // Position the group at barC point
    handlebarGroup.position.copy(points.barC);
    
    // If this is geometry created in standard orientation, apply all rotations
    if (handlebarGroup.userData.meshInfo && handlebarGroup.userData.meshInfo.standardOrientation) {
        // Calculate stem alignment (same as in creation)
        const stemDirection = new THREE.Vector3().subVectors(
            geometry.points.F_end,
            geometry.points.P_end
        ).normalize();
        const alignmentAngle = Math.atan2(stemDirection.y, stemDirection.x) + Math.PI / 2;
        
        // Apply user rotation + alignment
        const userRotationRad = params.B_rotation * (Math.PI / 180);
        handlebarGroup.rotation.z = userRotationRad + alignmentAngle;
        
        /*/ Debug logging to verify calculations
        console.log("Handlebar positioning:", {
            barC: points.barC,
            stemAlignment: alignmentAngle * (180/Math.PI) + "°",
            userRotation: params.B_rotation + "°",
            totalApplied: (userRotationRad + alignmentAngle) * (180/Math.PI) + "°"
        });*/
    }
    
    // Force updates to ensure transformations are applied
    handlebarGroup.updateMatrix();
    handlebarGroup.updateMatrixWorld(true);
    
    return true;
}
export function genHandlebarGeo(geometry, scene) {
    // 1. Create geometry data (now in standard orientation)
    const geometryData = createHandlebarGeometry(geometry);
    if (!geometryData || !geometryData.geometries || geometryData.geometries.length === 0) {
        if (componentRegistry.handlebarAssembly) delete componentRegistry.handlebarAssembly;
        return null;
    }
    
    // 2. Create meshes and group (with rotation info stored in userData)
    const handlebarGroup = createHandlebarMeshes(geometryData, geometry.params.handlebarColor);
    if (!handlebarGroup) {
        if (componentRegistry.handlebarAssembly) delete componentRegistry.handlebarAssembly;
        return null;
    }
    
    // 3. Position the handlebar assembly (now applying rotations)
    positionHandlebarAssembly(handlebarGroup, geometry);
    
    // 4. Register and add to scene
    componentRegistry.handlebarAssembly = handlebarGroup;
    scene.add(handlebarGroup);
    
    return handlebarGroup;
}

// --- Handlebar Crossbar Assembly ---

function createCrossbarLeftGeometry(geometry) {
    const { points } = geometry;
    const { crossbar_pos, barH_crossbar } = points; // These are world points from calc
    const crossbarMember = Constants.BAR_MEMBERS.crossbarTube;
    if (!crossbarMember || !crossbarMember.params) { console.error("Crossbar params missing."); return null; }
    const { params } = crossbarMember;

    if (!crossbar_pos || !barH_crossbar) { console.error("Crossbar points missing."); return null; }

    // --- Calculate points RELATIVE to barH_crossbar ---
    const origin = barH_crossbar;
    const rel_Start = new THREE.Vector3(0, 0, 0); // Center point is origin
    const rel_End = crossbar_pos.clone().sub(origin); // End point relative to center
    // --- End Relative Calculation ---

    // Create curve for the left half (origin to relative end)
    const curve = new THREE.LineCurve3(rel_Start, rel_End);

    // Generate tube geometry using TubeGeometry for a simple cylinder
    const crossbarTubeGeometry = new THREE.TubeGeometry(
        curve,
        params.segments || 32,       // Use param or default tube segments
        params.baseRadius,           // Use param radius
        params.radialSegments || 8, // Use param or default radial segments
        false                        // Not closed
    );

    return crossbarTubeGeometry; // Return geometry for the left half
}

function createCrossbarMeshes(crossbarLeftGeometry, handlebarColor = 0x800080) {
    if (!crossbarLeftGeometry) return { leftCrossbarMesh: null, rightCrossbarMesh: null };

    const material = createComponentMaterial('handlebarCrossbarAssembly', { color: handlebarColor });

    // Create left crossbar mesh
    const leftCrossbarMesh = new THREE.Mesh(crossbarLeftGeometry, material.clone());
    leftCrossbarMesh.userData.componentType = 'handlebarCrossbarLeft'; // Tag

    // --- Create Mirrored Right Mesh ---
    const mirroredGeometry = crossbarLeftGeometry.clone();
    const positions = mirroredGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        // Flip Z for mirroring, skip origin point (index 0, which is vertex 0,0,0)
        if (positions[i] !== 0 || positions[i+1] !== 0 || positions[i+2] !== 0) {
             positions[i + 2] = -positions[i + 2];
        }
    }
    // (Mirroring normals and indices - simplified)
    mirroredGeometry.attributes.position.needsUpdate = true;
    mirroredGeometry.computeVertexNormals();

    const rightCrossbarMesh = new THREE.Mesh(mirroredGeometry, material.clone());
    rightCrossbarMesh.userData.componentType = 'handlebarCrossbarRight'; // Tag
    // --- End Mirrored Right Mesh ---

    return { leftCrossbarMesh, rightCrossbarMesh };
}

export function positionCrossbarAssembly(crossbarGroup, geometry) {
    const { points } = geometry;
    if (!crossbarGroup || !points.barH_crossbar) { console.error("Missing group or origin point."); return; }

    // Reset group transformations
    crossbarGroup.position.set(0, 0, 0);
    crossbarGroup.rotation.set(0, 0, 0);
    crossbarGroup.scale.set(1, 1, 1);

    // Position the group origin at the world-space barH_crossbar (center point)
    crossbarGroup.position.copy(points.barH_crossbar);

    // No group rotation needed as geometry is defined relative to this center point

    // Ensure child meshes are at the group's origin (0,0,0)
    crossbarGroup.children.forEach(child => {
         if (child.isMesh) { child.position.set(0, 0, 0); child.rotation.set(0, 0, 0); child.scale.set(1, 1, 1); }
     });
}

export function genHandlebarCrossbarGeo(geometry, scene) {
    // 1. Create Geometry (left half, relative to center)
    const crossbarLeftGeometry = createCrossbarLeftGeometry(geometry);
    if (!crossbarLeftGeometry) { if(componentRegistry.handlebarCrossbarAssembly) delete componentRegistry.handlebarCrossbarAssembly; return null; }

    // 1b. Create Meshes (Left and Mirrored Right)
    const meshes = createCrossbarMeshes(crossbarLeftGeometry, geometry.params.handlebarColor);
    if (!meshes?.leftCrossbarMesh) { if(componentRegistry.handlebarCrossbarAssembly) delete componentRegistry.handlebarCrossbarAssembly; return null; }

    // 3. Group, Tag, Add Meshes
    const crossbarGroup = new THREE.Group();
    crossbarGroup.userData.componentType = 'handlebarCrossbarAssembly'; // Tag the group
    crossbarGroup.add(meshes.leftCrossbarMesh);
    crossbarGroup.add(meshes.rightCrossbarMesh);

    // 2. Position Group (Sets world position)
    positionCrossbarAssembly(crossbarGroup, geometry);

    // Register and add group to scene
    componentRegistry.handlebarCrossbarAssembly = crossbarGroup; // Register the group
    scene.add(crossbarGroup);

    return crossbarGroup;
}


// --- Bar End Assembly ---

function createBarEndMeshes(barEndBaseGeometry, barEndColor = 0xffffff) {
    if (!barEndBaseGeometry) return { leftBarEndMesh: null, rightBarEndMesh: null };

    const material = createComponentMaterial('barEnd', { color: barEndColor });

    // Create left bar end mesh
    const leftBarEndMesh = new THREE.Mesh(barEndBaseGeometry.clone(), material.clone());
    leftBarEndMesh.userData.componentType = 'barEndLeft'; // Tag

    // Create right bar end mesh
    const rightBarEndMesh = new THREE.Mesh(barEndBaseGeometry.clone(), material.clone());
    rightBarEndMesh.userData.componentType = 'barEndRight'; // Tag

    return { leftBarEndMesh, rightBarEndMesh };
}

export function positionBarEndAssembly(meshes, geometry) {
    const { leftBarEndMesh, rightBarEndMesh } = meshes;
    const { points } = geometry;
    const BAR_END = { // Constants from original function
        SCALE: 1,
        // OFFSET: 0 // Unused in original
    };

    // Check required points exist
    if (!leftBarEndMesh || !rightBarEndMesh || !points.Bg_end || !points.Bw_end) {
        console.error("Missing meshes or points for bar end positioning.");
        return;
    }

    // --- Position Left Bar End ---
    // Reset transforms
    leftBarEndMesh.position.set(0, 0, 0);
    leftBarEndMesh.rotation.set(0, 0, 0);
    leftBarEndMesh.scale.set(1, 1, 1);

    // Apply scale
    leftBarEndMesh.scale.set(BAR_END.SCALE, BAR_END.SCALE, BAR_END.SCALE);

    // Calculate direction vector for orientation (from Bg_end towards Bw_end)
    const directionLeft = new THREE.Vector3().subVectors(points.Bw_end, points.Bg_end).normalize();

    // Calculate quaternion for rotation (align local Y with direction)
    const defaultUp = new THREE.Vector3(0, 1, 0); // Assuming model's 'up' is Y
    const quaternionLeft = new THREE.Quaternion();
     if (directionLeft.lengthSq() > 1e-6) {
        quaternionLeft.setFromUnitVectors(defaultUp, directionLeft);
     }

    // Position at Bw_end
    leftBarEndMesh.position.copy(points.Bw_end);

    // Apply alignment rotation
    leftBarEndMesh.setRotationFromQuaternion(quaternionLeft);


    // --- Position Right Bar End (Mirrored Position & Orientation) ---
    // Reset transforms
    rightBarEndMesh.position.set(0, 0, 0);
    rightBarEndMesh.rotation.set(0, 0, 0);
    rightBarEndMesh.scale.set(1, 1, 1);

    // Apply scale (non-mirrored scale, mirroring handled by position/rotation)
    rightBarEndMesh.scale.set(BAR_END.SCALE, BAR_END.SCALE, BAR_END.SCALE);

    // Calculate mirrored world points for right side orientation
    const Bw_end_right = points.Bw_end.clone();
    Bw_end_right.z *= -1;
    const Bg_end_right = points.Bg_end.clone();
    Bg_end_right.z *= -1;

    // Calculate direction vector for right side orientation
    const directionRight = new THREE.Vector3().subVectors(Bw_end_right, Bg_end_right).normalize();

    // Calculate quaternion for right side rotation
    const quaternionRight = new THREE.Quaternion();
     if (directionRight.lengthSq() > 1e-6) {
        quaternionRight.setFromUnitVectors(defaultUp, directionRight);
     }

    // Position at the mirrored Bw_end_right world point
    rightBarEndMesh.position.copy(Bw_end_right);

    // Apply the right-specific alignment rotation
    rightBarEndMesh.setRotationFromQuaternion(quaternionRight);
}

export function genBarEnds(geometry, scene, barEndBaseGeometry) {
    // Check if bar ends are enabled in params
    if (!geometry.params.barEndEnabled) {
        // Ensure registry is cleared if previously enabled
        if (componentRegistry.barEndAssembly) delete componentRegistry.barEndAssembly;
        return null;
    }

    // 1b. Create Meshes
    const meshes = createBarEndMeshes(barEndBaseGeometry, geometry.params.barEndColor);
    // Check if mesh creation failed (e.g., no base geometry)
    if (!meshes.leftBarEndMesh || !meshes.rightBarEndMesh) {
        if (componentRegistry.barEndAssembly) delete componentRegistry.barEndAssembly;
        return null;
    }

    // 2. Position Meshes (Applies world transforms directly to meshes)
    positionBarEndAssembly(meshes, geometry);

    // 3. Group, Tag, Register, Add to Scene
    const barEndGroup = new THREE.Group();
    barEndGroup.userData.componentType = 'barEndAssembly'; // Tag the group

    // Add meshes to the group
    barEndGroup.add(meshes.leftBarEndMesh);
    barEndGroup.add(meshes.rightBarEndMesh);

    // Group itself sits at world origin as children are world-positioned
    barEndGroup.position.set(0, 0, 0);
    barEndGroup.rotation.set(0, 0, 0);
    barEndGroup.scale.set(1, 1, 1);

    // Register and add group to scene
    componentRegistry.barEndAssembly = barEndGroup; // Register the group
    scene.add(barEndGroup);

    return barEndGroup;
}


export function genGrips(geometry, scene, tireTreadPattern) {
    const { points, params } = geometry;
    const { Bg_end, Bw_end } = points;
    
    // Grip system constants
    const INNER_RADIUS = 1;
    const GRIP_OUTER_RADIUS = 1.55;
    const FLANGE_OUTER_RADIUS = params.hasGripFlange ? 2.7 : GRIP_OUTER_RADIUS;
    const TUBE_SEGMENTS = 32;
    const RADIAL_SEGMENTS = 16;
    const RING_SEGMENTS = 32;
    
    // Section-specific constants
    const BG_OFFSET = 2;
    const GRIP_END_LENGTH = 0.2;
    const GRIP_FLANGE_LENGTH = 0.3;
    const OVERLAP_AMOUNT = 0.02;

    function createTreadPattern(treadSVG, radius) {
        // Create a single pattern tile first
        const baseTileSize = 256;
        const canvas = document.createElement('canvas');
        canvas.width = baseTileSize;
        canvas.height = baseTileSize;
        
        // Set background
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Find bounds of the SVG paths
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        treadSVG.paths.forEach(path => {
            path.subPaths.forEach(subPath => {
                subPath.getPoints().forEach(point => {
                    minX = Math.min(minX, point.x);
                    maxX = Math.max(maxX, point.x);
                    minY = Math.min(minY, point.y);
                    maxY = Math.max(maxY, point.y);
                });
            });
        });
        
        // Calculate scale to fit canvas
        const svgWidth = maxX - minX;
        const svgHeight = maxY - minY;
        const scale = Math.min(canvas.width / svgWidth, canvas.height / svgHeight);
        
        // Setup transformation for pattern
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        //ctx.rotate(3 * Math.PI / 2);  // rotate title 270 degrees
        
        // Scale factor for X direction
        const xScaleMultiplier = 1.05; // scale the tile in the x
        ctx.scale(scale * xScaleMultiplier, scale);
        ctx.translate(-svgWidth/2, -svgHeight/2);
        
        // Draw the pattern
        ctx.fillStyle = '#ffffff';
        treadSVG.paths.forEach(path => {
            path.subPaths.forEach(subPath => {
                ctx.beginPath();
                const points = subPath.getPoints();
                points.forEach((point, index) => {
                    if (index === 0) {
                        ctx.moveTo(point.x, point.y);
                    } else {
                        ctx.lineTo(point.x, point.y);
                    }
                });
                if (subPath.closed) {
                    ctx.closePath();
                }
                ctx.fill();
            });
        });
        
        ctx.restore();
        
        // Create diffuse texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        // Calculate repeats - using grip circumference
        const circumference = Math.PI * (GRIP_OUTER_RADIUS * 2);
        const patternSize = baseTileSize / scale;
        const baseRepeatCount = Math.ceil(circumference / patternSize);
        const repeatMultiplier = 10; // X repeat
        const finalRepeatCount = baseRepeatCount * repeatMultiplier;
        
        texture.repeat.set(finalRepeatCount, 3); // Y repeat
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.LinearFilter;
        
        // Create normal map
        const normalMap = new THREE.CanvasTexture(createNormalMap(canvas));
        normalMap.wrapS = THREE.RepeatWrapping;
        normalMap.wrapT = THREE.RepeatWrapping;
        normalMap.repeat.copy(texture.repeat);
        
        return { diffuseMap: texture, normalMap: normalMap };
    }

    function createNormalMap(diffuseCanvas) {
        const normalCanvas = document.createElement('canvas');
        const normalCtx = normalCanvas.getContext('2d');
        normalCanvas.width = diffuseCanvas.width;
        normalCanvas.height = diffuseCanvas.height;
        
        normalCtx.drawImage(diffuseCanvas, 0, 0);
        const diffuseData = normalCtx.getImageData(0, 0, normalCanvas.width, normalCanvas.height);
        const normalData = normalCtx.createImageData(normalCanvas.width, normalCanvas.height);
        
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 0; y < normalCanvas.height; y++) {
            for (let x = 0; x < normalCanvas.width; x++) {
                let gx = 0, gy = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const px = (x + kx + normalCanvas.width) % normalCanvas.width;
                        const py = (y + ky + normalCanvas.height) % normalCanvas.height;
                        
                        const idx = (py * normalCanvas.width + px) * 4;
                        const value = diffuseData.data[idx] / 255;
                        gx += value * sobelX[(ky + 1) * 3 + (kx + 1)];
                        gy += value * sobelY[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                
                const scale = 5.0;
                const nx = gx * scale;
                const ny = gy * scale;
                const nz = 1.0;
                
                const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
                const idx = (y * normalCanvas.width + x) * 4;
                normalData.data[idx] = ((nx / length) * 0.5 + 0.5) * 255;
                normalData.data[idx + 1] = ((ny / length) * 0.5 + 0.5) * 255;
                normalData.data[idx + 2] = ((nz / length) * 0.5 + 0.5) * 255;
                normalData.data[idx + 3] = 255;
            }
        }
        
        normalCtx.putImageData(normalData, 0, 0);
        return normalCanvas;
    }

    function createGripEndSection(startPoint, endPoint, material, outerRadius, withStartCap = true, withEndCap = true) {
        const curve = new THREE.CatmullRomCurve3([startPoint, endPoint], false);
        const tubeGeometry = new THREE.TubeGeometry(
            curve,
            TUBE_SEGMENTS,
            outerRadius,
            RADIAL_SEGMENTS,
            false
        );
        
        const ringGeometry = new THREE.RingGeometry(
            INNER_RADIUS,
            outerRadius,
            RING_SEGMENTS
        );
        
        const meshes = [];
        const tubeMesh = new THREE.Mesh(tubeGeometry, material);
        meshes.push(tubeMesh);
        
        const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
        
        if (withStartCap) {
            const startRing = new THREE.Mesh(ringGeometry, material);
            startRing.position.copy(startPoint);
            const startQuaternion = new THREE.Quaternion();
            startQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
            startRing.setRotationFromQuaternion(startQuaternion);
            meshes.push(startRing);
        }
        
        if (withEndCap) {
            const endRing = new THREE.Mesh(ringGeometry, material);
            endRing.position.copy(endPoint);
            const endQuaternion = new THREE.Quaternion();
            endQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
            endRing.setRotationFromQuaternion(endQuaternion);
            meshes.push(endRing);
        }
        
        return meshes;
    }
    
    try {
        const gripDirection = new THREE.Vector3().subVectors(Bw_end, Bg_end).normalize();
        const gripStartPoint = new THREE.Vector3().copy(Bg_end).add(
            gripDirection.clone().multiplyScalar(BG_OFFSET)
        );
        const flangeEndPoint = new THREE.Vector3().copy(gripStartPoint).add(
            gripDirection.clone().multiplyScalar(GRIP_FLANGE_LENGTH)
        );
        const gripEndStartPoint = new THREE.Vector3().copy(Bw_end).sub(
            gripDirection.clone().multiplyScalar(GRIP_END_LENGTH)
        );
        const coreStartPoint = new THREE.Vector3().copy(flangeEndPoint).sub(
            gripDirection.clone().multiplyScalar(OVERLAP_AMOUNT)
        );
        const coreEndPoint = new THREE.Vector3().copy(gripEndStartPoint).add(
            gripDirection.clone().multiplyScalar(OVERLAP_AMOUNT)
        );

        // Create textures
        const textures = createTreadPattern(tireTreadPattern, GRIP_OUTER_RADIUS);
        
        // Use centralized grip materials with dynamic color
        const gripColor = geometry.params.gripColor !== undefined ? geometry.params.gripColor : 0x004fd6;
        const { plainMaterial, texturedMaterial } = createGripMaterials(gripColor, textures.normalMap);
        
        // Create sections with appropriate materials
        const flangeSection = createGripEndSection(
            gripStartPoint, 
            flangeEndPoint, 
            plainMaterial, 
            FLANGE_OUTER_RADIUS,
            true,
            true
        );
        
        const coreSection = createGripEndSection(
            coreStartPoint, 
            coreEndPoint, 
            texturedMaterial,  // Use textured material for core
            GRIP_OUTER_RADIUS,
            false,
            false
        );
        
        const endSection = createGripEndSection(
            gripEndStartPoint, 
            Bw_end, 
            plainMaterial,
            GRIP_OUTER_RADIUS,
            false,
            true
        );
        
        // Add and mirror each section, handling tubes and rings separately
        const allSections = [
            { meshes: flangeSection, name: 'flange' },
            { meshes: coreSection, name: 'core' },
            { meshes: endSection, name: 'end' }
        ];

            // Update the mirroring logic in the genGrips function
            // Replace the existing mirroring code within the allSections.forEach section
            const gripGroup = new THREE.Group();
            gripGroup.userData.componentType = 'gripAssembly';

            allSections.forEach(section => {
                section.meshes.forEach((mesh, index) => {
                    gripGroup.add(mesh);

                    // For the right side, we need to calculate everything independently
                    if (mesh.geometry instanceof THREE.RingGeometry) {
                        // Handle ring geometries (end caps)
                        const mirroredMesh = new THREE.Mesh(mesh.geometry.clone(), mesh.material.clone());
                        
                        // Mirror position
                        mirroredMesh.position.set(
                            mesh.position.x,
                            mesh.position.y,
                            -mesh.position.z
                        );
                        
                        // Create a mirrored direction vector for orientation
                        // We need to determine the direction the ring is facing
                        const direction = new THREE.Vector3();
                        mesh.getWorldDirection(direction);
                        
                        // Flip the direction for mirroring, but maintain proper orientation
                        const mirroredDirection = new THREE.Vector3(
                            direction.x,
                            direction.y,
                            -direction.z
                        );
                        
                        // Create quaternion for the mirrored direction
                        const targetQuaternion = new THREE.Quaternion();
                        // Use the mirrored direction to set the quaternion
                        // Assumes rings face along Z axis in their local space
                        const zAxis = new THREE.Vector3(0, 0, 1);
                        targetQuaternion.setFromUnitVectors(zAxis, mirroredDirection);
                        
                        mirroredMesh.quaternion.copy(targetQuaternion);
                        
                        // Add the mirrored ring to the scene
                        gripGroup.add(mirroredMesh);
                    } else {
                        // Handle tube geometries
                        // Create mirrored grip sections by using proper mirroring function
                        // that handles the geometry and normals correctly
                        
                        // Instead of using the utility function which might not handle all cases correctly,
                        // let's create a proper mirrored tube
                        
                        // For tubes, we need to:
                        // 1. Clone the geometry
                        const mirroredGeometry = mesh.geometry.clone();
                        
                        // 2. Mirror the vertices (flip Z coordinates)
                        const positions = mirroredGeometry.attributes.position.array;
                        for (let i = 0; i < positions.length; i += 3) {
                            positions[i + 2] = -positions[i + 2]; // Flip Z
                        }
                        
                        // 3. Fix normals by flipping them too
                        if (mirroredGeometry.attributes.normal) {
                            const normals = mirroredGeometry.attributes.normal.array;
                            for (let i = 0; i < normals.length; i += 3) {
                                normals[i + 2] = -normals[i + 2]; // Flip Z component of normals
                            }
                        }
                        
                        // 4. Fix face winding order to maintain correct normal direction
                        if (mirroredGeometry.index) {
                            const indices = mirroredGeometry.index.array;
                            const newIndices = new Uint32Array(indices.length);
                            
                            for (let i = 0; i < indices.length; i += 3) {
                                // Swap the order of the second and third vertices to flip the face
                                newIndices[i] = indices[i];
                                newIndices[i + 1] = indices[i + 2];
                                newIndices[i + 2] = indices[i + 1];
                            }
                            
                            mirroredGeometry.setIndex(new THREE.BufferAttribute(newIndices, 1));
                        }
                        
                        // 5. Update the geometry
                        mirroredGeometry.attributes.position.needsUpdate = true;
                        if (mirroredGeometry.attributes.normal) {
                            mirroredGeometry.attributes.normal.needsUpdate = true;
                        }
                        mirroredGeometry.computeVertexNormals();
                        
                        // 6. Create the mirrored mesh
                        const mirroredMesh = new THREE.Mesh(mirroredGeometry, mesh.material.clone());
                        
                        // 7. Add to the scene
                        gripGroup.add(mirroredMesh);
                    }
                });
            });

        // Register with component registry
        componentRegistry.gripAssembly = gripGroup;
        
        // Add the grip group to the scene
        scene.add(gripGroup);
        
        return {
            flange: flangeSection,
            core: coreSection,
            end: endSection,
            group: gripGroup // Return the group as part of the result
        };
        
    } catch (error) {
        console.error('Error creating grips:', error);
        return null;
    }
}





