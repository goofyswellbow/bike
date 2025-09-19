console.log('Loading genWheels.js...');
import * as THREE from 'three';
import { componentRegistry } from '../registry.js';
import { createComponentMaterial, createTireMaterials } from '../materials.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';




//----------------------------------------------------------------
// RIMS ----------------------------------------------------------
//----------------------------------------------------------------

function createRimGeometry(svgProfile, rimRadius, extrudeSegments, shapeSamples, scaleFactor) {
    if (!svgProfile || !svgProfile.paths.length) {
        console.error("Invalid SVG profile data provided.");
        return null;
    }

    const firstPath = svgProfile.paths[0];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    // Calculate bounds (same logic as before)
    firstPath.subPaths[0].curves.forEach(curve => {
        [curve.v0, curve.v1, curve.v2, curve.v3].forEach(v => {
            if (v) {
                minX = Math.min(minX, v.x);
                maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y);
                maxY = Math.max(maxY, v.y);
            }
        });
    });

    const centerX = (minX + maxX) / 2;
    const bottomY = maxY; // Assuming SVG Y-axis might be inverted

    // --- Create Shape from SVG ---
    const shape = new THREE.Shape();
    const sampledPoints = []; // To build the shape

    // Helper function to get Bezier points (same as before)
    function getBezierPoint(p0, p1, p2, p3, t) {
         const cX = 3 * (p1.x - p0.x);
         const bX = 3 * (p2.x - p1.x) - cX;
         const aX = p3.x - p0.x - cX - bX;
         const cY = 3 * (p1.y - p0.y);
         const bY = 3 * (p2.y - p1.y) - cY;
         const aY = p3.y - p0.y - cY - bY;
         const x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
         const y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;
         return { x, y };
     }

    try {
        firstPath.subPaths[0].curves.forEach((curve, i) => {
             if (curve.type === 'CubicBezierCurve') {
                 const p0 = { x: (curve.v0?.x || curve.v1.x) - centerX, y: (curve.v0?.y || curve.v1.y) - bottomY };
                 const p1 = { x: curve.v1.x - centerX, y: curve.v1.y - bottomY };
                 const p2 = { x: curve.v2.x - centerX, y: curve.v2.y - bottomY };
                 const p3 = { x: curve.v3.x - centerX, y: curve.v3.y - bottomY };

                 for (let j = (i === 0 ? 0 : 1); j <= shapeSamples; j++) { // Start j from 1 if not the first curve to avoid duplicate points
                     const t = j / shapeSamples;
                     const point = getBezierPoint(p0, p1, p2, p3, t);
                     sampledPoints.push({ x: point.x * scaleFactor, y: point.y * scaleFactor });
                 }
             } else if (curve.type === 'LineCurve') {
                // Ensure the start point is added only once
                if (i === 0 || sampledPoints.length === 0) {
                   sampledPoints.push({ x: (curve.v1.x - centerX) * scaleFactor, y: (curve.v1.y - bottomY) * scaleFactor });
                }
                 sampledPoints.push({ x: (curve.v2.x - centerX) * scaleFactor, y: (curve.v2.y - bottomY) * scaleFactor });
             } else {
                console.warn("Unsupported curve type in SVG:", curve.type);
             }
        });

        if (sampledPoints.length > 0) {
            shape.moveTo(sampledPoints[0].x, sampledPoints[0].y);
            for (let i = 1; i < sampledPoints.length; i++) {
                shape.lineTo(sampledPoints[i].x, sampledPoints[i].y);
            }
             shape.closePath(); // Ensure the shape is closed
        } else {
             console.error("No points sampled from SVG profile.");
             return null;
        }

    } catch (error) {
        console.error('Error processing SVG curves:', error);
        return null;
    }

    // --- Create Extrusion Path ---
    const segments = [];
    const angleStep = (2 * Math.PI) / extrudeSegments;
    // Ensure radius is positive
    const effectiveRadius = Math.max(0.01, rimRadius); // Use a small positive value if radius is zero or negative

    for (let i = extrudeSegments; i >= 0; i--) { // Correct loop direction for consistent winding order
        const angle = i * angleStep;
        const x = effectiveRadius * Math.cos(angle);
        const y = effectiveRadius * Math.sin(angle);
        segments.push(new THREE.Vector3(x, y, 0));
    }

    const curve = new THREE.CatmullRomCurve3(segments);
    curve.closed = true; // Path is a closed circle

    const extrudeSettings = {
        steps: extrudeSegments,
        bevelEnabled: false,
        extrudePath: curve
    };

    // --- Extrude and Smooth ---
    try {
        const rimGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        // Apply smoothing (optional, consider performance impact)
        const smoothedGeometry = BufferGeometryUtils.toCreasedNormals(rimGeometry, 0.1); // Crease angle might need tuning
        return smoothedGeometry; // Return the geometry

    } catch (error) {
        console.error('Error creating ExtrudeGeometry or smoothing:', error);
        return null;
    }
}

// --- Front Rim ---

function createRimFrontGeometry(geometry, rimProfile) {
    const { sizes } = geometry;
    // Constants from original genRimFront
    const scaleFactor = 0.1;
    const shapeSamples = 20;
    const extrudeSegments = 64;

    if (!rimProfile) {
        console.error("Rim profile SVG data is missing for front rim.");
        return null;
    }

    const rimGeometry = createRimGeometry(
        rimProfile,
        sizes.R1_size, // Use front rim radius
        extrudeSegments,
        shapeSamples,
        scaleFactor
    );

    if (!rimGeometry) {
        console.error("Failed to generate front rim geometry in createRimFrontGeometry.");
        return null;
    }
    return rimGeometry;
}

function createRimFrontMesh(rimGeometry, rimColor = 0x888888) {
    if (!rimGeometry) return null;

    const material = createComponentMaterial('rimFront', { color: rimColor });

    const rimMesh = new THREE.Mesh(rimGeometry, material);
    rimMesh.userData.componentType = 'rimFront'; // Tag

    return rimMesh;
}

export function positionRimFront(rimMesh, geometry) {
    const { points, rotations } = geometry;
    if (!rimMesh) return;

    // Reset transformations
    rimMesh.position.set(0, 0, 0);
    rimMesh.rotation.set(0, 0, 0);
    rimMesh.scale.set(1, 1, 1);

    // Position at front wheel center
    rimMesh.position.copy(points.T_end);
    // Apply overall bike rotation
    rimMesh.rotation.z = rotations.total;
}

export function genRimFront(geometry, scene, rimProfile) {
    // Create Geometry
    const rimGeometry = createRimFrontGeometry(geometry, rimProfile);
    if (!rimGeometry) return null;

    // Create Mesh
    const rimMesh = createRimFrontMesh(rimGeometry, geometry.params.frontRimColor);
    if (!rimMesh) return null;

    // Position Mesh
    positionRimFront(rimMesh, geometry);

    // Register and Add to Scene
    componentRegistry.rimFront = rimMesh; // Register
    scene.add(rimMesh);

    return rimMesh;
}


// --- Rear Rim ---

function createRimRearGeometry(geometry, rimProfile) {
    const { sizes } = geometry;
     // Constants from original genRimRear
    const scaleFactor = 0.1;
    const shapeSamples = 20;
    const extrudeSegments = 64;

    if (!rimProfile) {
        console.error("Rim profile SVG data is missing for rear rim.");
        return null;
    }

    // Use the SAME helper function, just pass the rear rim radius (R2_size)
    const rimGeometry = createRimGeometry(
        rimProfile,
        sizes.R2_size, // Use rear rim radius
        extrudeSegments,
        shapeSamples,
        scaleFactor
    );

     if (!rimGeometry) {
        console.error("Failed to generate rear rim geometry in createRimRearGeometry.");
        return null;
     }
     return rimGeometry;
}

function createRimRearMesh(rimGeometry, rimColor = 0x888888) {
     if (!rimGeometry) return null;

    const material = createComponentMaterial('rimRear', { color: rimColor });

    const rimMesh = new THREE.Mesh(rimGeometry, material);
    rimMesh.userData.componentType = 'rimRear'; // Tag

    return rimMesh;
}

export function positionRimRear(rimMesh, geometry) {
    const { points, rotations } = geometry;
    if (!rimMesh) return;

    // Reset transformations
    rimMesh.position.set(0, 0, 0);
    rimMesh.rotation.set(0, 0, 0);
    rimMesh.scale.set(1, 1, 1);

    // Position at REAR wheel center
    rimMesh.position.copy(points.S_end);
    // Apply overall bike rotation
    rimMesh.rotation.z = rotations.total;
}

export function genRimRear(geometry, scene, rimProfile) {
    // Create Geometry
    const rimGeometry = createRimRearGeometry(geometry, rimProfile);
    if (!rimGeometry) return null;

    // Create Mesh
    const rimMesh = createRimRearMesh(rimGeometry, geometry.params.rearRimColor);
     if (!rimMesh) return null;

    // Position Mesh
    positionRimRear(rimMesh, geometry);

    // Register and Add to Scene
    componentRegistry.rimRear = rimMesh; // Register
    scene.add(rimMesh);

    return rimMesh;
}



//----------------------------------------------------------------
// TIRES ---------------------------------------------------------
//----------------------------------------------------------------

// --- Front Tire ---

function createTireFrontGeometryAndMaterials(geometry, tireBaseProfile, tireTopProfile, tireTreadPattern) {
    const { sizes } = geometry;

    // Constants
    const BASE_PROFILE_OFFSET = 0.5;
    const BASE_PROFILE_SCALE = 0.09;
    const TOP_PROFILE_SCALE = 0.14;
    const PATTERN_REPEAT = 8; // Original multiplier constant
    const PATTERN_X_STRETCH = 1.05;

    // --- Nested Helper Functions ---
    // getBezierPoint, createShapePoints, createCirclePath, createSweepGeometry,
    // connectProfiles, createNormalMap (Assumed defined correctly as in the previous revised version)
    /* ... */
    function getBezierPoint(p0, p1, p2, p3, t) { /* ... */
        const cX = 3 * (p1.x - p0.x); const bX = 3 * (p2.x - p1.x) - cX; const aX = p3.x - p0.x - cX - bX;
        const cY = 3 * (p1.y - p0.y); const bY = 3 * (p2.y - p1.y) - cY; const aY = p3.y - p0.y - cY - bY;
        const x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
        const y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;
        return { x, y };
     }
    function createShapePoints(profile, profileScale) { /* ... */
        if (!profile || !profile.paths || !profile.paths[0]) return null;
        const firstPath = profile.paths[0]; let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        firstPath.subPaths[0].curves.forEach(curve => { [curve.v0, curve.v1, curve.v2, curve.v3].forEach(v => { if (v) { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); } }); });
        const centerX = (minX + maxX) / 2; const bottomY = maxY; const points = []; const samples = 20;
        firstPath.subPaths[0].curves.forEach((curve, curveIndex) => { if (curve.type === 'CubicBezierCurve') { const p0 = {x: (curve.v0?.x || curve.v1.x) - centerX, y: (curve.v0?.y || curve.v1.y) - bottomY}; const p1 = {x: curve.v1.x - centerX, y: curve.v1.y - bottomY}; const p2 = {x: curve.v2.x - centerX, y: curve.v2.y - bottomY}; const p3 = {x: curve.v3.x - centerX, y: curve.v3.y - bottomY}; const startJ = (curveIndex === 0) ? 0 : 1; for (let j = startJ; j <= samples; j++) { const t = j / samples; const point = getBezierPoint(p0, p1, p2, p3, t); points.push(new THREE.Vector2(point.x * profileScale, point.y * profileScale)); } } else if (curve.type === 'LineCurve') { if (curveIndex === 0) { points.push(new THREE.Vector2((curve.v1.x - centerX) * profileScale, (curve.v1.y - bottomY) * profileScale)); } points.push(new THREE.Vector2((curve.v2.x - centerX) * profileScale, (curve.v2.y - bottomY) * profileScale)); } else { console.warn("Unsupported curve type:", curve.type); } }); return points;
    }
    function createCirclePath(radius) { /* ... */
        const circlePoints = 64; const path = []; const angleStep = (2 * Math.PI) / circlePoints; const diameter = radius * 2;
        for (let i = 0; i <= circlePoints; i++) { const angle = i * angleStep; path.push(new THREE.Vector3(diameter * Math.cos(angle), diameter * Math.sin(angle), 0)); } return path;
     }
    function createSweepGeometry(profilePoints, pathPoints) { /* ... */
        const positions = []; const indices = []; const normals = []; const uvs = []; const vertexMap = new Map(); let currentIndex = 0; let totalLength = 0; for (let i = 1; i < pathPoints.length; i++) { totalLength += pathPoints[i].distanceTo(pathPoints[i - 1]); } let currentLength = 0;
        for (let i = 0; i < pathPoints.length; i++) { const pathPoint = pathPoints[i]; if (i > 0) { currentLength += pathPoints[i].distanceTo(pathPoints[i - 1]); } const u = totalLength === 0 ? 0 : currentLength / totalLength; let tangent; if (i < pathPoints.length - 1) { tangent = pathPoints[i + 1].clone().sub(pathPoint).normalize(); } else { tangent = pathPoint.clone().sub(pathPoints[i - 1]).normalize(); } const radial = pathPoint.clone().normalize(); if (radial.lengthSq() < 1e-6) radial.set(0,1,0); const right = new THREE.Vector3().crossVectors(tangent, radial).normalize(); const up = radial; /* Use original up = radial */ profilePoints.forEach((profilePoint, j) => { const point = new THREE.Vector3(profilePoint.x * right.x + profilePoint.y * up.x, profilePoint.x * right.y + profilePoint.y * up.y, profilePoint.x * right.z + profilePoint.y * up.z ).add(pathPoint); positions.push(point.x, point.y, point.z); const normal = point.clone().sub(pathPoint).normalize(); normals.push(normal.x, normal.y, normal.z); const v = (profilePoints.length <= 1) ? 0 : j / (profilePoints.length - 1); uvs.push(u, v); const key = `${i}-${j}`; vertexMap.set(key, currentIndex++); }); }
        for (let i = 0; i < pathPoints.length - 1; i++) { for (let j = 0; j < profilePoints.length - 1; j++) { const current = vertexMap.get(`${i}-${j}`); const next = vertexMap.get(`${i}-${j + 1}`); const nextRingCurrent = vertexMap.get(`${i + 1}-${j}`); const nextRingNext = vertexMap.get(`${i + 1}-${j + 1}`); if(current === undefined || next === undefined || nextRingCurrent === undefined || nextRingNext === undefined) continue; indices.push(current, nextRingCurrent, next); indices.push(next, nextRingCurrent, nextRingNext); } } return { positions, normals, indices, uvs, vertexMap };
     }
    function connectProfiles(baseGeo, topGeo, basePath, topPath) { /* ... */
        if (!baseGeo || !topGeo || !baseGeo.positions || !topGeo.positions) return { positions:[], normals:[], indices:[], uvs:[], groups:[] };
        const positions = [...baseGeo.positions, ...topGeo.positions]; const normals = [...baseGeo.normals, ...topGeo.normals]; const uvs = [...baseGeo.uvs, ...topGeo.uvs]; const indices = [...baseGeo.indices, ...topGeo.indices.map(i => i + baseGeo.positions.length / 3)]; const materialIndices = [];
        const basePointCount = baseGeo.positions.length / 3; const segmentCount = basePath.length; if(segmentCount === 0) return { positions:[], normals:[], indices:[], uvs:[], groups:[] }; const baseProfileLength = basePointCount / segmentCount; const topProfileLength = topGeo.positions.length / 3 / segmentCount;
        for (let i = 0; i < baseGeo.indices.length / 3; i++) { materialIndices.push(0); } for (let i = 0; i < topGeo.indices.length / 3; i++) { materialIndices.push(1); }
        for (let i = 0; i < segmentCount - 1; i++) { const baseStartIdx = Math.floor(i * baseProfileLength); const topStartIdx = basePointCount + Math.floor(i * topProfileLength); const baseEndIdx = Math.floor(i * baseProfileLength + baseProfileLength - 1); const topEndIdx = basePointCount + Math.floor(i * topProfileLength + topProfileLength - 1); const nextBaseStartIdx = Math.floor((i + 1) * baseProfileLength); const nextTopStartIdx = basePointCount + Math.floor((i + 1) * topProfileLength); const nextBaseEndIdx = Math.floor((i + 1) * baseProfileLength + baseProfileLength - 1); const nextTopEndIdx = basePointCount + Math.floor((i + 1) * topProfileLength + topProfileLength - 1); if(nextBaseStartIdx >= basePointCount || nextTopStartIdx >= positions.length/3 || nextBaseEndIdx >= basePointCount || nextTopEndIdx >= positions.length/3 ) continue; indices.push( baseStartIdx, topStartIdx, nextBaseStartIdx, nextBaseStartIdx, topStartIdx, nextTopStartIdx, baseEndIdx, topEndIdx, nextBaseEndIdx, nextBaseEndIdx, topEndIdx, nextTopEndIdx ); materialIndices.push(2, 2, 2, 2); }
        const groups = []; let faceCount = 0; let currentMaterial = materialIndices[0]; let startIndex = 0;
        for (let i = 0; i < materialIndices.length; i++) { if (materialIndices[i] !== currentMaterial) { if (faceCount > startIndex) { groups.push({start: startIndex * 3, count: (faceCount - startIndex) * 3, materialIndex: currentMaterial}); } currentMaterial = materialIndices[i]; startIndex = faceCount; } faceCount++; } if (faceCount > startIndex) { groups.push({start: startIndex * 3, count: (faceCount - startIndex) * 3, materialIndex: currentMaterial}); } return { positions, normals, indices, uvs, groups };
     }
     function createNormalMap(diffuseCanvas) { /* ... */
         const normalCanvas = document.createElement('canvas'); const normalCtx = normalCanvas.getContext('2d'); normalCanvas.width = diffuseCanvas.width; normalCanvas.height = diffuseCanvas.height; normalCtx.drawImage(diffuseCanvas, 0, 0); const diffuseData = normalCtx.getImageData(0, 0, normalCanvas.width, normalCanvas.height); const normalData = normalCtx.createImageData(normalCanvas.width, normalCanvas.height); const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]; const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
         for (let y = 0; y < normalCanvas.height; y++) { for (let x = 0; x < normalCanvas.width; x++) { let gx = 0, gy = 0; for (let ky = -1; ky <= 1; ky++) { for (let kx = -1; kx <= 1; kx++) { const px = (x + kx + normalCanvas.width) % normalCanvas.width; const py = (y + ky + normalCanvas.height) % normalCanvas.height; const idx = (py * normalCanvas.width + px) * 4; const value = diffuseData.data[idx] / 255; gx += value * sobelX[(ky + 1) * 3 + (kx + 1)]; gy += value * sobelY[(ky + 1) * 3 + (kx + 1)]; } } const scale = 5.0; const nx = gx * scale; const ny = gy * scale; const nz = 1.0; const length = Math.sqrt(nx * nx + ny * ny + nz * nz); const idx = (y * normalCanvas.width + x) * 4; normalData.data[idx] = ((nx / length) * 0.5 + 0.5) * 255; normalData.data[idx + 1] = ((ny / length) * 0.5 + 0.5) * 255; normalData.data[idx + 2] = ((nz / length) * 0.5 + 0.5) * 255; normalData.data[idx + 3] = 255; } } normalCtx.putImageData(normalData, 0, 0); return normalCanvas;
     }

    function createTreadPattern(treadSVG, radius) { // Radius parameter is W1_size or W2_size
        if (!treadSVG) return { diffuseMap: null, normalMap: null };
        const baseTileSize = 256; const canvas = document.createElement('canvas'); canvas.width = baseTileSize; canvas.height = baseTileSize; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        let minX = Infinity, minY = Infinity; let maxX = -Infinity, maxY = -Infinity; treadSVG.paths.forEach(path => { path.subPaths.forEach(subPath => { subPath.getPoints().forEach(point => { minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x); minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y); }); }); });
        const svgWidth = maxX - minX; const svgHeight = maxY - minY; if(svgWidth <= 0 || svgHeight <= 0) return { diffuseMap: null, normalMap: null }; const scale = Math.min(canvas.width / svgWidth, canvas.height / svgHeight);
        ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(3 * Math.PI / 2); // Ensure rotation matches original
        ctx.scale(scale * PATTERN_X_STRETCH, scale); ctx.translate(-svgWidth/2, -svgHeight/2); ctx.fillStyle = '#ffffff'; treadSVG.paths.forEach(path => { path.subPaths.forEach(subPath => { ctx.beginPath(); const points = subPath.getPoints(); points.forEach((point, index) => { if (index === 0) { ctx.moveTo(point.x, point.y); } else { ctx.lineTo(point.x, point.y); } }); if (subPath.closed) { ctx.closePath(); } ctx.fill(); }); }); ctx.restore();

        const texture = new THREE.CanvasTexture(canvas); texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;

        // --- Repeat Calculation Logic (Matches Original) ---
        const circumference = Math.PI * (radius * 2); // Use diameter (W1_size or W2_size)
        const patternWidthOnModel = (baseTileSize / scale) * PATTERN_X_STRETCH; // Width of one pattern tile on the model
        const baseRepeatCount = Math.max(1, Math.ceil(circumference / patternWidthOnModel)); // How many tiles fit around circumference
        const repeatMultiplier = PATTERN_REPEAT; // Use the constant multiplier (16)
        const finalRepeatCount = baseRepeatCount * repeatMultiplier; // Final X repeat count
        // --- End Repeat Calculation ---

        // --- Set Correct Y Repeat ---
        texture.repeat.set(finalRepeatCount, 1); // Corrected Y repeat to 1
        // --- End Y Repeat Correction ---

        texture.needsUpdate = true;
        const normalMap = new THREE.CanvasTexture(createNormalMap(canvas)); normalMap.wrapS = THREE.RepeatWrapping; normalMap.wrapT = THREE.RepeatWrapping; normalMap.repeat.copy(texture.repeat); normalMap.needsUpdate = true; return { diffuseMap: texture, normalMap: normalMap };
    }
    // --- End Helper Functions ---

    // --- Main Geometry/Material Creation Logic ---
    try {
        const basePoints = createShapePoints(tireBaseProfile, BASE_PROFILE_SCALE);
        const topPoints = createShapePoints(tireTopProfile, TOP_PROFILE_SCALE);
        if (!basePoints || basePoints.length < 2 || !topPoints || topPoints.length < 2) { throw new Error("Failed to create sufficient profile points."); }
        const basePath = createCirclePath(sizes.R1_size / 2 + BASE_PROFILE_OFFSET);
        const topPath = createCirclePath(sizes.W1_size / 2); // Front wheel diameter
        const baseGeo = createSweepGeometry(basePoints, basePath);
        const topGeo = createSweepGeometry(topPoints, topPath);
        const finalGeoData = connectProfiles(baseGeo, topGeo, basePath, topPath);
        if (finalGeoData.positions.length === 0 || finalGeoData.indices.length === 0) { throw new Error("Failed to connect profiles or generate final geometry data."); }
        const tireGeometry = new THREE.BufferGeometry();
        tireGeometry.setAttribute('position', new THREE.Float32BufferAttribute(finalGeoData.positions, 3));
        tireGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(finalGeoData.normals, 3));
        tireGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(finalGeoData.uvs, 2));
        tireGeometry.setIndex(finalGeoData.indices);
        finalGeoData.groups.forEach(group => { if(group.start !== undefined && group.count !== undefined && group.materialIndex !== undefined && group.count > 0) { tireGeometry.addGroup(group.start, group.count, group.materialIndex); } else { console.warn("Skipping invalid geometry group:", group); } });
        tireGeometry.computeVertexNormals();

        const textures = createTreadPattern(tireTreadPattern, sizes.W1_size); // Use W1_size for front tire pattern repeats

        // Use centralized tire materials with dynamic color
        const tireFrontColor = geometry.params.tireFrontColor !== undefined ? geometry.params.tireFrontColor : 0xf0d805;
        const tireMaterials = createTireMaterials('tireFront', tireFrontColor, textures.normalMap);

        return { tireGeometry, tireMaterials };
    } catch (error) {
        console.error('Error creating front tire geometry and materials:', error);
        return null;
    }
}

function createTireFrontMesh(geometryAndMaterials) { /* ... */
    if (!geometryAndMaterials || !geometryAndMaterials.tireGeometry || !geometryAndMaterials.tireMaterials) return null;
    const { tireGeometry, tireMaterials } = geometryAndMaterials;
    const tireMesh = new THREE.Mesh(tireGeometry, tireMaterials);
    tireMesh.userData.componentType = 'tireFront'; // Tag
    return tireMesh;
 }

export function positionTireFront(tireMesh, geometry) { /* ... */
    const { points, rotations } = geometry;
    if (!tireMesh) return;
    tireMesh.position.set(0, 0, 0); tireMesh.rotation.set(0, 0, 0); tireMesh.scale.set(1, 1, 1); // Reset
    tireMesh.position.copy(points.T_end);
    tireMesh.rotation.z = rotations.total;
}

export function genTireFront(geometry, scene, tireBaseProfile, tireTopProfile, tireTreadPattern) { /* ... */
    const geometryAndMaterials = createTireFrontGeometryAndMaterials(geometry, tireBaseProfile, tireTopProfile, tireTreadPattern);
    if (!geometryAndMaterials) { if (componentRegistry.tireFront) delete componentRegistry.tireFront; return null; }
    const tireMesh = createTireFrontMesh(geometryAndMaterials);
    if (!tireMesh) { if (componentRegistry.tireFront) delete componentRegistry.tireFront; return null; }
    positionTireFront(tireMesh, geometry);
    componentRegistry.tireFront = tireMesh;
    scene.add(tireMesh);
    return tireMesh;
}

// --- Rear Tire ---

// 1. Create Geometry & Materials Function
function createTireRearGeometryAndMaterials(geometry, tireBaseProfile, tireTopProfile, tireTreadPattern) {
    const { sizes } = geometry; // Need sizes for radii and texture repeats

    // Constants (same as front tire)
    const BASE_PROFILE_OFFSET = 0.5;
    const BASE_PROFILE_SCALE = 0.09;
    const TOP_PROFILE_SCALE = 0.14;
    const PATTERN_REPEAT = 8;
    const PATTERN_X_STRETCH = 1.05;

    // --- Nested Helper Functions (Identical to the corrected ones in genTireFront) ---
    function getBezierPoint(p0, p1, p2, p3, t) { /* ... Bezier calculation ... */
        const cX = 3 * (p1.x - p0.x); const bX = 3 * (p2.x - p1.x) - cX; const aX = p3.x - p0.x - cX - bX;
        const cY = 3 * (p1.y - p0.y); const bY = 3 * (p2.y - p1.y) - cY; const aY = p3.y - p0.y - cY - bY;
        const x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
        const y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;
        return { x, y };
     }
    function createShapePoints(profile, profileScale) { /* ... SVG parsing, sampling, scaling ... */
        if (!profile || !profile.paths || !profile.paths[0]) return null;
        const firstPath = profile.paths[0]; let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        firstPath.subPaths[0].curves.forEach(curve => { [curve.v0, curve.v1, curve.v2, curve.v3].forEach(v => { if (v) { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); } }); });
        const centerX = (minX + maxX) / 2; const bottomY = maxY; const points = []; const samples = 20;
        firstPath.subPaths[0].curves.forEach((curve, curveIndex) => { if (curve.type === 'CubicBezierCurve') { const p0 = {x: (curve.v0?.x || curve.v1.x) - centerX, y: (curve.v0?.y || curve.v1.y) - bottomY}; const p1 = {x: curve.v1.x - centerX, y: curve.v1.y - bottomY}; const p2 = {x: curve.v2.x - centerX, y: curve.v2.y - bottomY}; const p3 = {x: curve.v3.x - centerX, y: curve.v3.y - bottomY}; const startJ = (curveIndex === 0) ? 0 : 1; for (let j = startJ; j <= samples; j++) { const t = j / samples; const point = getBezierPoint(p0, p1, p2, p3, t); points.push(new THREE.Vector2(point.x * profileScale, point.y * profileScale)); } } else if (curve.type === 'LineCurve') { if (curveIndex === 0) { points.push(new THREE.Vector2((curve.v1.x - centerX) * profileScale, (curve.v1.y - bottomY) * profileScale)); } points.push(new THREE.Vector2((curve.v2.x - centerX) * profileScale, (curve.v2.y - bottomY) * profileScale)); } else { console.warn("Unsupported curve type:", curve.type); } }); return points;
    }
    function createCirclePath(radius) { /* ... Creates points for a circular path ... */
        const circlePoints = 64; const path = []; const angleStep = (2 * Math.PI) / circlePoints; const diameter = radius * 2;
        for (let i = 0; i <= circlePoints; i++) { const angle = i * angleStep; path.push(new THREE.Vector3(diameter * Math.cos(angle), diameter * Math.sin(angle), 0)); } return path;
     }
    function createSweepGeometry(profilePoints, pathPoints) { /* ... Manual geometry generation, up = radial ... */
        const positions = []; const indices = []; const normals = []; const uvs = []; const vertexMap = new Map(); let currentIndex = 0; let totalLength = 0; for (let i = 1; i < pathPoints.length; i++) { totalLength += pathPoints[i].distanceTo(pathPoints[i - 1]); } let currentLength = 0;
        for (let i = 0; i < pathPoints.length; i++) { const pathPoint = pathPoints[i]; if (i > 0) { currentLength += pathPoints[i].distanceTo(pathPoints[i - 1]); } const u = totalLength === 0 ? 0 : currentLength / totalLength; let tangent; if (i < pathPoints.length - 1) { tangent = pathPoints[i + 1].clone().sub(pathPoint).normalize(); } else { tangent = pathPoint.clone().sub(pathPoints[i - 1]).normalize(); } const radial = pathPoint.clone().normalize(); if (radial.lengthSq() < 1e-6) radial.set(0,1,0); const right = new THREE.Vector3().crossVectors(tangent, radial).normalize(); const up = radial; /* Use original up = radial */ profilePoints.forEach((profilePoint, j) => { const point = new THREE.Vector3(profilePoint.x * right.x + profilePoint.y * up.x, profilePoint.x * right.y + profilePoint.y * up.y, profilePoint.x * right.z + profilePoint.y * up.z ).add(pathPoint); positions.push(point.x, point.y, point.z); const normal = point.clone().sub(pathPoint).normalize(); normals.push(normal.x, normal.y, normal.z); const v = (profilePoints.length <= 1) ? 0 : j / (profilePoints.length - 1); uvs.push(u, v); const key = `${i}-${j}`; vertexMap.set(key, currentIndex++); }); }
        for (let i = 0; i < pathPoints.length - 1; i++) { for (let j = 0; j < profilePoints.length - 1; j++) { const current = vertexMap.get(`${i}-${j}`); const next = vertexMap.get(`${i}-${j + 1}`); const nextRingCurrent = vertexMap.get(`${i + 1}-${j}`); const nextRingNext = vertexMap.get(`${i + 1}-${j + 1}`); if(current === undefined || next === undefined || nextRingCurrent === undefined || nextRingNext === undefined) continue; indices.push(current, nextRingCurrent, next); indices.push(next, nextRingCurrent, nextRingNext); } } return { positions, normals, indices, uvs, vertexMap };
     }
    function connectProfiles(baseGeo, topGeo, basePath, topPath) { /* ... Combines geometry data ... */
         if (!baseGeo || !topGeo || !baseGeo.positions || !topGeo.positions) return { positions:[], normals:[], indices:[], uvs:[], groups:[] };
        const positions = [...baseGeo.positions, ...topGeo.positions]; const normals = [...baseGeo.normals, ...topGeo.normals]; const uvs = [...baseGeo.uvs, ...topGeo.uvs]; const indices = [...baseGeo.indices, ...topGeo.indices.map(i => i + baseGeo.positions.length / 3)]; const materialIndices = [];
        const basePointCount = baseGeo.positions.length / 3; const segmentCount = basePath.length; if(segmentCount === 0) return { positions:[], normals:[], indices:[], uvs:[], groups:[] }; const baseProfileLength = basePointCount / segmentCount; const topProfileLength = topGeo.positions.length / 3 / segmentCount;
        for (let i = 0; i < baseGeo.indices.length / 3; i++) { materialIndices.push(0); } for (let i = 0; i < topGeo.indices.length / 3; i++) { materialIndices.push(1); }
        for (let i = 0; i < segmentCount - 1; i++) { const baseStartIdx = Math.floor(i * baseProfileLength); const topStartIdx = basePointCount + Math.floor(i * topProfileLength); const baseEndIdx = Math.floor(i * baseProfileLength + baseProfileLength - 1); const topEndIdx = basePointCount + Math.floor(i * topProfileLength + topProfileLength - 1); const nextBaseStartIdx = Math.floor((i + 1) * baseProfileLength); const nextTopStartIdx = basePointCount + Math.floor((i + 1) * topProfileLength); const nextBaseEndIdx = Math.floor((i + 1) * baseProfileLength + baseProfileLength - 1); const nextTopEndIdx = basePointCount + Math.floor((i + 1) * topProfileLength + topProfileLength - 1); if(nextBaseStartIdx >= basePointCount || nextTopStartIdx >= positions.length/3 || nextBaseEndIdx >= basePointCount || nextTopEndIdx >= positions.length/3 ) continue; indices.push( baseStartIdx, topStartIdx, nextBaseStartIdx, nextBaseStartIdx, topStartIdx, nextTopStartIdx, baseEndIdx, topEndIdx, nextBaseEndIdx, nextBaseEndIdx, topEndIdx, nextTopEndIdx ); materialIndices.push(2, 2, 2, 2); }
        const groups = []; let faceCount = 0; let currentMaterial = materialIndices[0]; let startIndex = 0;
        for (let i = 0; i < materialIndices.length; i++) { if (materialIndices[i] !== currentMaterial) { if (faceCount > startIndex) { groups.push({start: startIndex * 3, count: (faceCount - startIndex) * 3, materialIndex: currentMaterial}); } currentMaterial = materialIndices[i]; startIndex = faceCount; } faceCount++; } if (faceCount > startIndex) { groups.push({start: startIndex * 3, count: (faceCount - startIndex) * 3, materialIndex: currentMaterial}); } return { positions, normals, indices, uvs, groups };
     }
     function createNormalMap(diffuseCanvas) { /* ... Sobel filter normal map generation ... */
         const normalCanvas = document.createElement('canvas'); const normalCtx = normalCanvas.getContext('2d'); normalCanvas.width = diffuseCanvas.width; normalCanvas.height = diffuseCanvas.height; normalCtx.drawImage(diffuseCanvas, 0, 0); const diffuseData = normalCtx.getImageData(0, 0, normalCanvas.width, normalCanvas.height); const normalData = normalCtx.createImageData(normalCanvas.width, normalCanvas.height); const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]; const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
         for (let y = 0; y < normalCanvas.height; y++) { for (let x = 0; x < normalCanvas.width; x++) { let gx = 0, gy = 0; for (let ky = -1; ky <= 1; ky++) { for (let kx = -1; kx <= 1; kx++) { const px = (x + kx + normalCanvas.width) % normalCanvas.width; const py = (y + ky + normalCanvas.height) % normalCanvas.height; const idx = (py * normalCanvas.width + px) * 4; const value = diffuseData.data[idx] / 255; gx += value * sobelX[(ky + 1) * 3 + (kx + 1)]; gy += value * sobelY[(ky + 1) * 3 + (kx + 1)]; } } const scale = 5.0; const nx = gx * scale; const ny = gy * scale; const nz = 1.0; const length = Math.sqrt(nx * nx + ny * ny + nz * nz); const idx = (y * normalCanvas.width + x) * 4; normalData.data[idx] = ((nx / length) * 0.5 + 0.5) * 255; normalData.data[idx + 1] = ((ny / length) * 0.5 + 0.5) * 255; normalData.data[idx + 2] = ((nz / length) * 0.5 + 0.5) * 255; normalData.data[idx + 3] = 255; } } normalCtx.putImageData(normalData, 0, 0); return normalCanvas;
     }
    function createTreadPattern(treadSVG, radius) { // Radius parameter is W1_size or W2_size
         if (!treadSVG) return { diffuseMap: null, normalMap: null };
        const baseTileSize = 256; const canvas = document.createElement('canvas'); canvas.width = baseTileSize; canvas.height = baseTileSize; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        let minX = Infinity, minY = Infinity; let maxX = -Infinity, maxY = -Infinity; treadSVG.paths.forEach(path => { path.subPaths.forEach(subPath => { subPath.getPoints().forEach(point => { minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x); minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y); }); }); });
        const svgWidth = maxX - minX; const svgHeight = maxY - minY; if(svgWidth <= 0 || svgHeight <= 0) return { diffuseMap: null, normalMap: null }; const scale = Math.min(canvas.width / svgWidth, canvas.height / svgHeight);
        ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(3 * Math.PI / 2); ctx.scale(scale * PATTERN_X_STRETCH, scale); ctx.translate(-svgWidth/2, -svgHeight/2); ctx.fillStyle = '#ffffff'; treadSVG.paths.forEach(path => { path.subPaths.forEach(subPath => { ctx.beginPath(); const points = subPath.getPoints(); points.forEach((point, index) => { if (index === 0) { ctx.moveTo(point.x, point.y); } else { ctx.lineTo(point.x, point.y); } }); if (subPath.closed) { ctx.closePath(); } ctx.fill(); }); }); ctx.restore();
        const texture = new THREE.CanvasTexture(canvas); texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
        const circumference = Math.PI * (radius * 2); const patternWidthOnModel = (baseTileSize / scale) * PATTERN_X_STRETCH; const baseRepeatCount = Math.max(1, Math.ceil(circumference / patternWidthOnModel)); const repeatMultiplier = PATTERN_REPEAT; const finalRepeatCount = baseRepeatCount * repeatMultiplier;
        texture.repeat.set(finalRepeatCount, 1); // Y repeat = 1
        texture.needsUpdate = true;
        const normalMap = new THREE.CanvasTexture(createNormalMap(canvas)); normalMap.wrapS = THREE.RepeatWrapping; normalMap.wrapT = THREE.RepeatWrapping; normalMap.repeat.copy(texture.repeat); normalMap.needsUpdate = true; return { diffuseMap: texture, normalMap: normalMap };
    }
    // --- End Helper Functions ---

    // --- Main Geometry/Material Creation Logic ---
    try {
        const basePoints = createShapePoints(tireBaseProfile, BASE_PROFILE_SCALE);
        const topPoints = createShapePoints(tireTopProfile, TOP_PROFILE_SCALE);
        if (!basePoints || basePoints.length < 2 || !topPoints || topPoints.length < 2) { throw new Error("Failed to create sufficient profile points."); }

        // Use REAR radii for paths
        const basePath = createCirclePath(sizes.R2_size / 2 + BASE_PROFILE_OFFSET); // R2_size
        const topPath = createCirclePath(sizes.W2_size / 2); // W2_size

        const baseGeo = createSweepGeometry(basePoints, basePath);
        const topGeo = createSweepGeometry(topPoints, topPath);
        const finalGeoData = connectProfiles(baseGeo, topGeo, basePath, topPath);
        if (finalGeoData.positions.length === 0 || finalGeoData.indices.length === 0) { throw new Error("Failed to connect profiles or generate final geometry data."); }

        const tireGeometry = new THREE.BufferGeometry();
        tireGeometry.setAttribute('position', new THREE.Float32BufferAttribute(finalGeoData.positions, 3));
        tireGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(finalGeoData.normals, 3));
        tireGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(finalGeoData.uvs, 2));
        tireGeometry.setIndex(finalGeoData.indices);
        finalGeoData.groups.forEach(group => { if(group.start !== undefined && group.count !== undefined && group.materialIndex !== undefined && group.count > 0) { tireGeometry.addGroup(group.start, group.count, group.materialIndex); } else { console.warn("Skipping invalid geometry group:", group); } });
        tireGeometry.computeVertexNormals();

        // Use REAR diameter (W2_size) for texture repeats
        const textures = createTreadPattern(tireTreadPattern, sizes.W2_size);

        // Use centralized tire materials with dynamic color
        const tireRearColor = geometry.params.tireRearColor !== undefined ? geometry.params.tireRearColor : 0xf0d805;
        const tireMaterials = createTireMaterials('tireRear', tireRearColor, textures.normalMap);

        return { tireGeometry, tireMaterials };
    } catch (error) {
        console.error('Error creating rear tire geometry and materials:', error);
        return null;
    }
}

// 1b. Create Mesh Function
function createTireRearMesh(geometryAndMaterials) {
    if (!geometryAndMaterials || !geometryAndMaterials.tireGeometry || !geometryAndMaterials.tireMaterials) return null;
    const { tireGeometry, tireMaterials } = geometryAndMaterials;
    const tireMesh = new THREE.Mesh(tireGeometry, tireMaterials);
    tireMesh.userData.componentType = 'tireRear'; // Tag
    return tireMesh;
}

// 2. Position Function
export function positionTireRear(tireMesh, geometry) {
    const { points, rotations } = geometry;
    if (!tireMesh) return;
    // Reset transformations
    tireMesh.position.set(0, 0, 0);
    tireMesh.rotation.set(0, 0, 0);
    tireMesh.scale.set(1, 1, 1);
    // Position at rear wheel center
    tireMesh.position.copy(points.S_end);
    // Apply overall bike rotation
    tireMesh.rotation.z = rotations.total;
}

// 3. Gen Function (Orchestrator)
export function genTireRear(geometry, scene, tireBaseProfile, tireTopProfile, tireTreadPattern) {
    // Create Geometry and Materials
    const geometryAndMaterials = createTireRearGeometryAndMaterials(geometry, tireBaseProfile, tireTopProfile, tireTreadPattern);
    if (!geometryAndMaterials) {
        if (componentRegistry.tireRear) delete componentRegistry.tireRear;
        return null;
    }

    // Create Mesh
    const tireMesh = createTireRearMesh(geometryAndMaterials);
    if (!tireMesh) {
        if (componentRegistry.tireRear) delete componentRegistry.tireRear;
        return null;
    }

    // Position Mesh
    positionTireRear(tireMesh, geometry);

    // Register and Add to Scene
    componentRegistry.tireRear = tireMesh; // Register
    scene.add(tireMesh);

    return tireMesh;
}



