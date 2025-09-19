console.log('Loading genUtil.js...');
import * as THREE from 'three';
import { componentRegistry } from '../registry.js';


// Utility functions
export function addLine(v1, v2, color, scene) {
    if ([v1.x, v1.y, v1.z, v2.x, v2.y, v2.z].some(isNaN)) {
      console.error('NaN detected in vectors:', v1, v2);
      return;
    }
  
    const geometry = new THREE.BufferGeometry().setFromPoints([v1, v2]);
    const material = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    return line;
}

export function createBeveledPoint(prevPoint, currentPoint, nextPoint, bevelParams) {
    const { bevelDistance, bevelDivisions } = bevelParams;
    
    // Calculate normalized direction vectors
    const tangentPrev = new THREE.Vector3()
        .subVectors(currentPoint, prevPoint)
        .normalize();
    const tangentNext = new THREE.Vector3()
        .subVectors(currentPoint, nextPoint)
        .normalize();

    // Calculate offset points for bevel start and end
    const offsetPrev = new THREE.Vector3()
        .copy(currentPoint)
        .sub(tangentPrev.multiplyScalar(bevelDistance));
    const offsetNext = new THREE.Vector3()
        .copy(currentPoint)
        .sub(tangentNext.multiplyScalar(bevelDistance));

    // Create quadratic Bezier control points
    const P0 = offsetPrev;
    const P1 = currentPoint;
    const P2 = offsetNext;

    // Generate points along the Bezier curve
    const bevelPoints = [];
    for (let i = 0; i <= bevelDivisions; i++) {
        const t = i / bevelDivisions;
        // Quadratic Bezier interpolation
        const bezierPos = new THREE.Vector3();
        bezierPos.x = (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x;
        bezierPos.y = (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y;
        bezierPos.z = (1 - t) * (1 - t) * P0.z + 2 * (1 - t) * t * P1.z + t * t * P2.z;
        bevelPoints.push(bezierPos);
    }

    return bevelPoints;
}

export function createTaperedTube(curve, memberParams) {
    // Extract taper-related parameters
    const {
        baseRadius = 0.5,
        endRadius = 0.5,
        startTaper = 0,
        endTaper = 1,
        segments = 32,
        radialSegments = 8
    } = memberParams;

    // Calculate total curve length for accurate position mapping
    const curveLengthSamples = 100;
    const curveLength = (() => {
        let length = 0;
        let prevPoint = curve.getPoint(0);
        for (let i = 1; i <= curveLengthSamples; i++) {
            const t = i / curveLengthSamples;
            const point = curve.getPoint(t);
            length += point.distanceTo(prevPoint);
            prevPoint = point;
        }
        return length;
    })();

    // Function to convert curve parameter t to actual distance along curve
    const getDistanceAlongCurve = (t) => {
        let distance = 0;
        let prevPoint = curve.getPoint(0);
        const samples = Math.floor(t * curveLengthSamples);
        for (let i = 1; i <= samples; i++) {
            const currT = i / curveLengthSamples;
            const point = curve.getPoint(currT);
            distance += point.distanceTo(prevPoint);
            prevPoint = point;
        }
        return distance / curveLength;
    };

    // Radius function using actual distance along curve
    const radiusFunction = (t) => {
        // Convert t to actual distance along curve
        const actualPosition = getDistanceAlongCurve(t);

        // If base and end radius are equal, return constant radius
        if (Math.abs(baseRadius - endRadius) < 0.0001) {
            return baseRadius;
        }

        // Before start taper: constant baseRadius
        if (actualPosition < startTaper) {
            return baseRadius;
        }
        // After end taper: constant endRadius
        if (actualPosition > endTaper) {
            return endRadius;
        }
        // During taper: smooth transition from baseRadius to endRadius
        const taperProgress = (actualPosition - startTaper) / (endTaper - startTaper);
        return baseRadius + (endRadius - baseRadius) * taperProgress;
    };

    // Create the tube geometry
    const tubeGeometry = new THREE.BufferGeometry();
    
    // Arrays to store all vertex data
    const positions = [];
    const indices = [];
    const startCapPositions = [];
    const endCapPositions = [];
    const startCapIndices = [];
    const endCapIndices = [];

    // Generate tube vertices
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const radius = radiusFunction(t);
        const curvePoint = curve.getPoint(t);
        const tangent = curve.getTangent(t);
        
        const normal = new THREE.Vector3(1, 0, 0);
        if (Math.abs(tangent.x) > 0.99) {
            normal.set(0, 1, 0);
        }
        
        const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
        normal.crossVectors(binormal, tangent).normalize();

        // Generate circle vertices
        for (let j = 0; j <= radialSegments; j++) {
            const angle = (j / radialSegments) * Math.PI * 2;
            
            const x = (normal.x * Math.cos(angle) + binormal.x * Math.sin(angle)) * radius;
            const y = (normal.y * Math.cos(angle) + binormal.y * Math.sin(angle)) * radius;
            const z = (normal.z * Math.cos(angle) + binormal.z * Math.sin(angle)) * radius;
            
            positions.push(curvePoint.x + x, curvePoint.y + y, curvePoint.z + z);

            // Store first and last ring vertices for caps
            if (i === 0) {
                startCapPositions.push(curvePoint.x + x, curvePoint.y + y, curvePoint.z + z);
            } else if (i === segments) {
                endCapPositions.push(curvePoint.x + x, curvePoint.y + y, curvePoint.z + z);
            }
        }
    }

    // Generate tube faces
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const a = i * (radialSegments + 1) + j;
            const b = a + 1;
            const c = (i + 1) * (radialSegments + 1) + j;
            const d = c + 1;

            indices.push(a, b, d);
            indices.push(d, c, a);
        }
    }

    // Add center points for caps
    const startPoint = curve.getPoint(0);
    const endPoint = curve.getPoint(1);
    
    // Generate cap faces
    for (let i = 0; i < radialSegments; i++) {
        // Start cap
        startCapIndices.push(
            0,  // Center vertex
            i + 1,
            i + 2
        );

        // End cap
        endCapIndices.push(
            0,  // Center vertex
            i + 1,
            i + 2
        );
    }

    // Combine all geometry
    const allPositions = [
        ...positions,
        ...startPoint.toArray(),  // Start cap center
        ...startCapPositions,
        ...endPoint.toArray(),    // End cap center
        ...endCapPositions
    ];
    
    const allIndices = [
        ...indices,
        ...startCapIndices.map(i => i + positions.length / 3),
        ...endCapIndices.map(i => i + (positions.length / 3 + startCapPositions.length / 3 + 1))
    ];

    // Set up the geometry
    tubeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
    tubeGeometry.setIndex(allIndices);
    tubeGeometry.computeVertexNormals();

    return tubeGeometry;
}

export function mirrorGeometryX(objects, scene) {
    const geometryArray = Array.isArray(objects) ? objects : [objects];
    
    geometryArray.forEach(obj => {
        if (obj instanceof THREE.Vector3) {
            // Mirror point
            const mirroredPoint = new THREE.Vector3(obj.x, obj.y, -obj.z);
            return mirroredPoint;
            
        } else if (obj instanceof THREE.Line) {
            // Get start and end points of the line
            const positions = obj.geometry.attributes.position.array;
            const start = new THREE.Vector3(positions[0], positions[1], positions[2]);
            const end = new THREE.Vector3(positions[3], positions[4], positions[5]);
            
            // Create mirrored points
            const mirroredStart = new THREE.Vector3(start.x, start.y, -start.z);
            const mirroredEnd = new THREE.Vector3(end.x, end.y, -end.z);
            
            // Create mirrored line
            const mirroredLine = addLine(mirroredStart, mirroredEnd, obj.material.color.getHex(), scene);
            
            // Copy all properties from original object
            if (obj.material && obj.material.depthTest !== undefined) {
                mirroredLine.material.depthTest = obj.material.depthTest;
            }
            if (obj.renderOrder !== undefined) {
                mirroredLine.renderOrder = obj.renderOrder;
            }
            if (obj.userData && obj.userData.isGuideObject) {
                mirroredLine.userData.isGuideObject = true;
            }
            
        } else if (obj instanceof THREE.Mesh) {
            // Clone the geometry
            const mirroredGeometry = obj.geometry.clone();
            const positions = mirroredGeometry.attributes.position.array;
            
            // Mirror all vertices (flip Z coordinate)
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 2] = -positions[i + 2];
            }
        
            // Add this section to flip normals
            if (mirroredGeometry.attributes.normal) {
                const normals = mirroredGeometry.attributes.normal.array;
                for (let i = 0; i < normals.length; i += 3) {
                    normals[i + 2] = -normals[i + 2]; // Flip Z component of normals
                }
            }
        
            // Get indices
            const indices = mirroredGeometry.getIndex();
            if (indices) {
                // Create new array for reversed triangles
                const newIndices = new Uint32Array(indices.array.length);
                
                // Reverse the triangle order to maintain correct face orientation
                for (let i = 0; i < indices.array.length; i += 3) {
                    newIndices[i] = indices.array[i];
                    newIndices[i + 1] = indices.array[i + 2];
                    newIndices[i + 2] = indices.array[i + 1];
                }
                
                // Set the new indices
                mirroredGeometry.setIndex(new THREE.BufferAttribute(newIndices, 1));
            }
            
            // Recompute normals
            mirroredGeometry.computeVertexNormals();
            mirroredGeometry.normalizeNormals(); // Add this line
            
            // Create new mesh with mirrored geometry
            const mirroredMesh = new THREE.Mesh(
                mirroredGeometry,
                obj.material.clone()
            );
            
            // Copy other properties
            mirroredMesh.position.copy(obj.position);
            mirroredMesh.rotation.copy(obj.rotation);
            mirroredMesh.scale.copy(obj.scale);
            
            // Copy userData from original object
            if (obj.userData && obj.userData.isGuideObject) {
                mirroredMesh.userData.isGuideObject = true;
            }
            
            scene.add(mirroredMesh);
        }
    });
}
  
export function mirrorGeometryZ(objects, scene) {
    const geometryArray = Array.isArray(objects) ? objects : [objects];

    geometryArray.forEach(obj => {
        if (obj instanceof THREE.Vector3) {
            return new THREE.Vector3(obj.x, obj.y, -obj.z);
        } else if (obj instanceof THREE.Line) {
            const positions = obj.geometry.attributes.position.array;
            const start = new THREE.Vector3(positions[0], positions[1], positions[2]);
            const end = new THREE.Vector3(positions[3], positions[4], positions[5]);
            
            const mirroredStart = new THREE.Vector3(start.x, start.y, -start.z);
            const mirroredEnd = new THREE.Vector3(end.x, end.y, -end.z);
            
            addLine(mirroredStart, mirroredEnd, obj.material.color.getHex(), scene);
        } else if (obj instanceof THREE.Mesh) {
            const mirroredGeometry = obj.geometry.clone();
            const positions = mirroredGeometry.attributes.position.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 2] = -positions[i + 2]; // Flip Z coordinate
            }
            
            mirroredGeometry.attributes.position.needsUpdate = true;
            const mirroredMesh = new THREE.Mesh(
                mirroredGeometry,
                obj.material.clone()
            );
            scene.add(mirroredMesh);
        }
    });
}


export function stretchHubMeshZ(geometry, targetLength, preserveEnds, scale) {
    // Clone geometry and apply base scale
    const stretchedGeo = geometry.clone();
    stretchedGeo.scale(scale, scale, scale); // Apply uniform base scale first
    const positions = stretchedGeo.attributes.position;

    // Calculate current bounds along Z axis *after* base scaling
    const bbox = new THREE.Box3().setFromBufferAttribute(positions);
    const currentLength = bbox.max.z - bbox.min.z;

    // If current length is zero or target is same, return geometry as is
    if (currentLength <= 1e-6 || Math.abs(currentLength - targetLength) < 1e-6) {
        stretchedGeo.computeVertexNormals(); // Ensure normals are computed
        return stretchedGeo;
    }

    // Calculate preserved portions
    const preservedLength = currentLength * (preserveEnds * 2);
    const currentMiddleLength = currentLength - preservedLength;
    const targetMiddleLength = targetLength - preservedLength;

    // Avoid division by zero if middle section is tiny or non-existent
    const stretchFactor = (currentMiddleLength > 1e-6) ? targetMiddleLength / currentMiddleLength : 1;

    // Calculate preserve ranges along Z axis (relative to center)
    const centerZ = (bbox.max.z + bbox.min.z) / 2;
    const preserveFront = centerZ + currentMiddleLength / 2 * stretchFactor + (preservedLength / 2);
    const preserveBack = centerZ - currentMiddleLength / 2 * stretchFactor - (preservedLength / 2);
    const preserveTopOriginal = centerZ + currentMiddleLength / 2 + (preservedLength / 2);
    const preserveBottomOriginal = centerZ - currentMiddleLength / 2 - (preservedLength / 2);


    // Update vertices
    for (let i = 0; i < positions.count; i++) {
        const z = positions.getZ(i);
        let newZ = z; // Default to original Z

        if (z > preserveBottomOriginal && z < preserveTopOriginal) {
             // Stretch middle section relative to the center
             const distFromCenter = z - centerZ;
             newZ = centerZ + distFromCenter * stretchFactor;

        } else if (z >= preserveTopOriginal) {
            // Move top section
            const offset = (targetMiddleLength - currentMiddleLength) / 2;
            newZ = z + offset;
        } else { // z <= preserveBottomOriginal
            // Move bottom section
             const offset = (targetMiddleLength - currentMiddleLength) / 2;
            newZ = z - offset;
        }
         positions.setZ(i, newZ);
    }

    positions.needsUpdate = true;
    stretchedGeo.computeVertexNormals();

    return stretchedGeo;
}

