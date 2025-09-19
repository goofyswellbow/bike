console.log('Loading genGears.js...');
import * as THREE from 'three';
import { componentRegistry } from '../registry.js';
import { createComponentMaterial } from '../materials.js';


// --- Sprocket Assembly ---

function createSprocketMeshes(sprocketBaseGeometry, sprocketGuardBaseGeometry, params, sprocketColor = 0xffffff) {
    let sprocketMesh = null;
    let guardMesh = null;

    // Create sprocket core mesh
    if (sprocketBaseGeometry) {
        const material = createComponentMaterial('sprocketCore', { color: sprocketColor });
        sprocketMesh = new THREE.Mesh(sprocketBaseGeometry.clone(), material);
         // Add specific tag for the core mesh if needed for individual access later
        sprocketMesh.userData.componentType = 'sprocketCore';
    }

    // Create sprocket guard mesh if enabled
    if (sprocketGuardBaseGeometry && params.sprocketGuardEnabled) {
        const guardMaterial = createComponentMaterial('sprocketGuard', { color: sprocketColor });
        guardMesh = new THREE.Mesh(sprocketGuardBaseGeometry.clone(), guardMaterial);
        // Add specific tag for the guard mesh
        guardMesh.userData.componentType = 'sprocketGuard';
    }

    return { sprocketMesh, guardMesh };
}

export function positionSprocketAssembly(meshes, sprocketGroup, sprocketToothInstancedMesh, sprocketToothInstance, geometry) {
    const { sprocketMesh, guardMesh } = meshes;
    const { points, sizes, params, rotations } = geometry;
    const { D2_size, D2_count, totalRotation } = {
        D2_size: sizes.D2_size,
        D2_count: params.D2_count,
        totalRotation: rotations.total
    };
    const TOOTH = {
        SCALE: 2.2,
        OFFSET: -0.5,
    };
    const SPROCKET = {
        THICKNESS: 1 // Constant thickness regardless of scaling
    };
    const GUARD = {
        Z_OFFSET: 0.01 // Small offset to prevent z-fighting (increased slightly)
    };

    // --- Position Group ---
    // Reset group transformations first
    sprocketGroup.position.set(0, 0, 0);
    sprocketGroup.rotation.set(0, 0, 0);
    sprocketGroup.scale.set(1, 1, 1);

    // Set final group position and rotation
    sprocketGroup.position.copy(points.Spkt_Center);
    sprocketGroup.rotation.z = totalRotation;


    // --- Position/Scale Meshes *within* the Group ---
    let scaleFactor = 1; // Default scale factor

    // Apply leftFootForward logic - same as cranks and sprocket bolt
    const effectiveStance = params.isRHD ? !params.leftFootForward : params.leftFootForward;
    const stanceRotation = effectiveStance ? 0 : Math.PI; // 180° when right foot forward

    // Scale and position sprocket core
    if (sprocketMesh) {
        sprocketMesh.geometry.computeBoundingSphere(); // Ensure bounding sphere is calculated
        const originalRadius = sprocketMesh.geometry.boundingSphere.radius;
        const adjustedRadius = D2_size + TOOTH.OFFSET; // Base scaling on D2 size
        scaleFactor = (originalRadius > 0) ? adjustedRadius / originalRadius : 1; // Avoid division by zero

        // Reset mesh transforms relative to group
        sprocketMesh.position.set(0, 0, 0);
        sprocketMesh.rotation.set(0, 0, 0);
        sprocketMesh.scale.set(1,1,1);

        // Apply stance rotation (affects sprocket mesh only, not teeth)
        sprocketMesh.rotation.z = stanceRotation;
        
        // Apply Y-axis rotation for drive side
        if (params.isRHD) {
            sprocketMesh.rotation.y = Math.PI; // 180° flip for RHD
            sprocketMesh.rotation.z += Math.PI; // Additional 180° Z rotation for RHD
        }

        // Apply calculated scale (non-uniform)
        sprocketMesh.scale.set(scaleFactor, scaleFactor, SPROCKET.THICKNESS);
    }

    // Scale and position sprocket guard (using same scaleFactor)
    if (guardMesh) {
         // Reset mesh transforms relative to group
        guardMesh.position.set(0, 0, 0);
        guardMesh.rotation.set(0, 0, 0);
         guardMesh.scale.set(1,1,1);

        // Apply same stance rotation as sprocket core
        guardMesh.rotation.z = stanceRotation;
        
        // Apply Y-axis rotation for drive side
        if (params.isRHD) {
            guardMesh.rotation.y = Math.PI; // 180° flip for RHD
            guardMesh.rotation.z += Math.PI; // Additional 180° Z rotation for RHD
        }

        // Apply same scale as sprocket core
        guardMesh.scale.set(scaleFactor, scaleFactor, SPROCKET.THICKNESS);
        // Apply small Z offset relative to group origin
        guardMesh.position.z = GUARD.Z_OFFSET;
    }

    // --- Position Instanced Teeth (World Space) ---
    if (sprocketToothInstancedMesh && sprocketToothInstance) {
        sprocketToothInstancedMesh.count = D2_count; // Update count
        const angleStep = (Math.PI * 2) / D2_count;

        for (let i = 0; i < D2_count; i++) {
            const baseAngle = i * angleStep;
            // Combine base angle with total bike rotation for final orientation
            const toothAngle = baseAngle + totalRotation;
            const adjustedRadius = D2_size + TOOTH.OFFSET;

            // Calculate world position for the tooth
            const toothX = Math.cos(toothAngle) * adjustedRadius + points.Spkt_Center.x;
            const toothY = Math.sin(toothAngle) * adjustedRadius + points.Spkt_Center.y;
            const toothZ = points.Spkt_Center.z; // Use sprocket center's Z

            // Use the dummy instance object to calculate the matrix
            sprocketToothInstance.position.set(toothX, toothY, toothZ);
            sprocketToothInstance.rotation.set(0, 0, 0); // Reset rotation before applying new one
            sprocketToothInstance.scale.set(TOOTH.SCALE, TOOTH.SCALE, TOOTH.SCALE);

            // Apply rotation: first align model, then apply final angle
            sprocketToothInstance.rotateZ(-Math.PI / 2); // Initial alignment based on model orientation
            sprocketToothInstance.rotateZ(toothAngle);  // Final orientation

            // Update matrix and set it for the instance
            sprocketToothInstance.updateMatrix();
            sprocketToothInstancedMesh.setMatrixAt(i, sprocketToothInstance.matrix);
        }
        sprocketToothInstancedMesh.instanceMatrix.needsUpdate = true; // Mark matrix for update
    }
}

export function genSprocketGeo(geometry, scene, sprocketToothInstancedMesh, sprocketToothInstance, sprocketBaseGeometry, sprocketGuardBaseGeometry) {
    const sprocketColor = geometry.params.sprocketColor !== undefined ? geometry.params.sprocketColor : 0xffffff;

    // Create the core and guard meshes
    const meshes = createSprocketMeshes(sprocketBaseGeometry, sprocketGuardBaseGeometry, geometry.params, sprocketColor);
    if (!meshes.sprocketMesh && !meshes.guardMesh && !sprocketToothInstancedMesh) return null; // Nothing to generate

    // Create the group for the sprocket assembly (core + guard)
    const sprocketGroup = new THREE.Group();
    sprocketGroup.userData.componentType = 'sprocketAssembly'; // Add identification tag to the group

    // Add core and guard meshes to the group if they exist
    if (meshes.sprocketMesh) {
        sprocketGroup.add(meshes.sprocketMesh);
    }
    if (meshes.guardMesh) {
        sprocketGroup.add(meshes.guardMesh);
    }

    // Position the group contents and the instanced teeth
    positionSprocketAssembly(meshes, sprocketGroup, sprocketToothInstancedMesh, sprocketToothInstance, geometry);

    // Register the group
    componentRegistry.sprocketAssembly = sprocketGroup; // Register the assembly group

    // Add the group (core + guard) to the scene
    scene.add(sprocketGroup);

    // Manage the instanced mesh separately (added directly to scene)
    if (sprocketToothInstancedMesh) {
        // Ensure it's added to the scene if not already present
        if (!scene.children.includes(sprocketToothInstancedMesh)) {
            scene.add(sprocketToothInstancedMesh);
        }
         // We might also want to register the instanced mesh itself if needed later
         // componentRegistry.sprocketTeeth = sprocketToothInstancedMesh;
    }

    return sprocketGroup; // Return the main assembly group
}


// --- calculateChainPath (UPDATED with totalRotation adjustment) ---
export function calculateChainPath(geometry) {
    // Ensure geometry.rotations.total is available
    const { points, sizes, params, rotations } = geometry; 
    // Default totalRotation to 0 if it's not provided
    const totalRotation = rotations ? (rotations.total || 0) : 0; 

    // Helper function: normalizeAngle (Same as before)
    function normalizeAngle(angle) {
        angle = angle % (2 * Math.PI);
        if (angle < 0) {
            angle += 2 * Math.PI;
        }
        return angle;
    }

    // --- generateGearSegmentPoints (MODIFIED to use frame angles internally and rotate back) ---
    // Now accepts totalRotation and center point
    function generateGearSegmentPoints(center, radius, frameStartAngle, frameEndAngle, teethCount, totalRotation) {
        const segmentPoints = []; 
        // Internal angles are FRAME-RELATIVE
        let localStartAngle = normalizeAngle(frameStartAngle); 
        let localEndAngle = normalizeAngle(frameEndAngle);   

        // Handle angle wrap-around for loop comparison (using frame-relative angles)
        if (localEndAngle < localStartAngle) { 
            localEndAngle += 2 * Math.PI;
        } else if (localEndAngle === localStartAngle) {
             localEndAngle += 2 * Math.PI; // Assume full circle segment if angles are identical
        }

        const anglePerTooth = (2 * Math.PI) / teethCount;
        // Calculate starting tooth based on FRAME-RELATIVE start angle
        const firstToothAngle = Math.round(localStartAngle / anglePerTooth) * anglePerTooth; 
        let currentFrameAngle = firstToothAngle; // Current angle being checked is FRAME-RELATIVE

        const rotationAxis = new THREE.Vector3(0, 0, 1); // Rotation axis
        const maxIterations = teethCount * 2 + 20; // Increased safety limit
        let iterations = 0;


        while (currentFrameAngle <= localEndAngle && iterations < maxIterations) {
            iterations++;
             // Calculate the chain point angle BETWEEN teeth, relative to frame
            const frameChainPointAngle = currentFrameAngle + (anglePerTooth / 2); 

            // Check if this frame-relative angle is beyond the frame-relative end angle
            if (frameChainPointAngle > localEndAngle + 1e-6) { // Use tolerance
                 break; 
            }

             // Check if the point genuinely falls within the intended arc segment
             // (Using frame-relative angles for this check)
             let normalizedChainPointAngle = normalizeAngle(frameChainPointAngle);
             let normalizedStart = normalizeAngle(frameStartAngle);
             let normalizedEnd = normalizeAngle(frameEndAngle);
             let isInArc = false;
             if (normalizedStart <= normalizedEnd) {
                 if (normalizedChainPointAngle >= normalizedStart -1e-6 && normalizedChainPointAngle <= normalizedEnd + 1e-6) isInArc = true;
             } else { // Wrap around 0
                 if (normalizedChainPointAngle >= normalizedStart -1e-6 || normalizedChainPointAngle <= normalizedEnd + 1e-6) isInArc = true;
             }
              // Fallback check using potentially > 2PI localEndAngle
              if (!isInArc && frameChainPointAngle >= localStartAngle -1e-6 && frameChainPointAngle <= localEndAngle + 1e-6) {
                   isInArc = true;
              }


            if (isInArc) {
                // 1. Calculate position relative to center using FRAME angle
                const x_relative = radius * Math.cos(frameChainPointAngle);
                const y_relative = radius * Math.sin(frameChainPointAngle);
                const tempPos = new THREE.Vector3(x_relative, y_relative, 0);

                // 2. Rotate this relative vector by totalRotation to get world orientation
                tempPos.applyAxisAngle(rotationAxis, totalRotation);

                // 3. Add the world-space center position
                const finalPos = new THREE.Vector3().copy(tempPos).add(center);

                // 4. Calculate the final WORLD-SPACE angle for storage
                const worldChainPointAngle = normalizeAngle(frameChainPointAngle + totalRotation);

                segmentPoints.push({
                    position: finalPos, // Store final WORLD position
                    angle: worldChainPointAngle // Store final WORLD angle
                });
            }

            currentFrameAngle += anglePerTooth; 
        }
         if (iterations >= maxIterations) console.warn("Max iterations reached in generateGearSegmentPoints.");

        return segmentPoints;
    }
    // --- End of generateGearSegmentPoints ---


    // Helper function: generateConnectionPoints (Unchanged - works on world points)
    function generateConnectionPoints(startPoint, endPoint, spacing) {
        // ... (previous validated version) ...
         const connectionPoints = []; 
         if (!startPoint || !endPoint || !startPoint.position || !endPoint.position) { console.warn("generateConnectionPoints received invalid start or end point."); return connectionPoints; }
         const direction = new THREE.Vector3().subVectors(endPoint.position, startPoint.position);
         const distance = direction.length();
         if (distance < 1e-6 || spacing < 1e-6) { return connectionPoints; }
         const numPoints = Math.round(distance / spacing); 
         if (numPoints <= 1) return connectionPoints; 
         const currentDir = new THREE.Vector2(direction.x, direction.y).normalize();
         const perpDir = new THREE.Vector2(-currentDir.y, currentDir.x);
         const offsetFactor = -0.07; 
         const offset = perpDir.multiplyScalar(offsetFactor);
         const tangentAngle = Math.atan2(direction.y, direction.x); 
         for (let i = 1; i < numPoints; i++) { 
             const t = i / numPoints;
             connectionPoints.push({
                 position: new THREE.Vector3(
                     startPoint.position.x + (direction.x * t) + offset.x,
                     startPoint.position.y + (direction.y * t) + offset.y,
                     startPoint.position.z + (direction.z * t) 
                 ),
                 angle: tangentAngle 
             });
         }
         return connectionPoints;
    }

    // --- Path Calculation ---
    const baseSpacing = (2 * Math.PI * sizes.D2_size) / params.D2_count;

    // Calculate WORLD-SPACE angles from tangent points relative to centers
    const worldSprocketStartAngle = Math.atan2(points.tangentPointS1.y - points.Spkt_Center.y, points.tangentPointS1.x - points.Spkt_Center.x);
    const worldSprocketEndAngle = Math.atan2(points.tangentPointS2.y - points.Spkt_Center.y, points.tangentPointS2.x - points.Spkt_Center.x);
    const worldDriverStartAngle = Math.atan2(points.tangentPointD2.y - points.Drv_Center.y, points.tangentPointD2.x - points.Drv_Center.x);
    const worldDriverEndAngle = Math.atan2(points.tangentPointD1.y - points.Drv_Center.y, points.tangentPointD1.x - points.Drv_Center.x);

    // Convert to FRAME-RELATIVE angles by subtracting totalRotation
    const frameSprocketStartAngle = normalizeAngle(worldSprocketStartAngle - totalRotation);
    const frameSprocketEndAngle = normalizeAngle(worldSprocketEndAngle - totalRotation);
    const frameDriverStartAngle = normalizeAngle(worldDriverStartAngle - totalRotation);
    const frameDriverEndAngle = normalizeAngle(worldDriverEndAngle - totalRotation);


    // Generate points on gears using FRAME-RELATIVE angles, passing totalRotation
    // The function now rotates the points back to world space internally before returning
    const sprocketPoints = generateGearSegmentPoints(
        points.Spkt_Center, sizes.D2_size, 
        frameSprocketStartAngle, frameSprocketEndAngle, 
        params.D2_count, totalRotation 
    );
    const driverPoints = generateGearSegmentPoints(
        points.Drv_Center, sizes.D1_size, 
        frameDriverStartAngle, frameDriverEndAngle, 
        params.D1_count, totalRotation 
    );

    // Check if points were generated...
    if (!sprocketPoints || sprocketPoints.length === 0 || !driverPoints || driverPoints.length === 0) {
        console.warn("Could not generate sufficient points on gears for chain path.");
        return []; // Return empty path
    }

    // Generate points on tangents (using world-space points returned above)
    const topTangentStart = sprocketPoints[sprocketPoints.length - 1];
    const topTangentEnd = driverPoints[0];
    const bottomTangentStart = driverPoints[driverPoints.length - 1];
    const bottomTangentEnd = sprocketPoints[0];

    if (!topTangentStart || !topTangentEnd || !bottomTangentStart || !bottomTangentEnd) {
         console.warn("Could not define tangent connection points due to missing gear points.");
         return []; 
    }

    const topTangentPoints = generateConnectionPoints(topTangentStart, topTangentEnd, baseSpacing);
    const bottomTangentPoints = generateConnectionPoints(bottomTangentStart, bottomTangentEnd, baseSpacing);

    // Combine all points (all points are now correctly positioned AND phased in WORLD space)
    const allPoints = [
        ...sprocketPoints,
        ...topTangentPoints,
        ...driverPoints,
        ...bottomTangentPoints
    ];

    // REMOVE the previous post-calculation alignment rotation - it should no longer be needed.
    
    // Return the final world-space points
    return allPoints;
}

// --- positionChainLinks (Unchanged from previous version) ---
// ... remains the same, as it operates on the final world-space points ...
export function positionChainLinks(chainPathPoints, params, chainLinkInstancedMesh, chainLinkInst, chainFullLinkAInstancedMesh, chainFullLinkAInst, chainFullLinkBInstancedMesh, chainFullLinkBInst) {
    // ... (previous validated version) ...
     // Determine active mesh(es) and make others invisible
     const useFullLinks = params.chainFullEnabled && chainFullLinkAInstancedMesh && chainFullLinkBInstancedMesh;
     const useHalfLinks = !useFullLinks && chainLinkInstancedMesh;
 
     if (chainLinkInstancedMesh) chainLinkInstancedMesh.visible = useHalfLinks;
     if (chainFullLinkAInstancedMesh) chainFullLinkAInstancedMesh.visible = useFullLinks;
     if (chainFullLinkBInstancedMesh) chainFullLinkBInstancedMesh.visible = useFullLinks;
 
     if (!useFullLinks && !useHalfLinks) return; // No mesh to position
 
     const totalPoints = chainPathPoints.length;
      if (totalPoints === 0) return; // Cannot position on empty path
 
     const chainLinkScale = 1.0; 
 
     // Temporary object for matrix calculation
     const tempObject = new THREE.Object3D(); 
 
     if (useFullLinks) {
         const linkACount = Math.ceil(totalPoints / 2);
         const linkBCount = Math.floor(totalPoints / 2);
         chainFullLinkAInstancedMesh.count = Math.max(0, linkACount);
         chainFullLinkBInstancedMesh.count = Math.max(0, linkBCount);
 
         let linkAIndex = 0;
         let linkBIndex = 0;
 
         chainPathPoints.forEach((point, index) => {
             const isLinkA = index % 2 === 0;
             const instancedMesh = isLinkA ? chainFullLinkAInstancedMesh : chainFullLinkBInstancedMesh;
             const instanceIndex = isLinkA ? linkAIndex++ : linkBIndex++;
             
             const instanceObject = tempObject; 
 
             instanceObject.position.copy(point.position);
 
             const nextPoint = chainPathPoints[(index + 1) % totalPoints];
             const direction = new THREE.Vector3().subVectors(nextPoint.position, point.position).normalize();
             
             if (direction.lengthSq() < 0.0001) { 
                  if (index > 0) {
                      const prevPoint = chainPathPoints[index -1];
                       if(prevPoint && prevPoint.position.distanceToSquared(point.position) > 1e-6) {
                         direction.subVectors(point.position, prevPoint.position).normalize();
                      } else { 
                          direction.set(1, 0, 0); // Default X-axis
                      }
                  } else {
                       direction.set(1, 0, 0); 
                  }
             }
 
             const lookAt = new THREE.Matrix4();
             const up = new THREE.Vector3(0, 0, 1); 
             if (Math.abs(direction.dot(up)) > 0.9999) { 
                 up.set(0, 1, 0); 
                 if (Math.abs(direction.dot(up)) > 0.9999) {
                     up.set(1, 0, 0);
                 }
             }
             lookAt.lookAt(new THREE.Vector3(0,0,0), direction, up); 
 
             instanceObject.rotation.set(0,0,0); 
             instanceObject.scale.set(chainLinkScale, chainLinkScale, chainLinkScale); 
             instanceObject.setRotationFromMatrix(lookAt); 
 
             instanceObject.rotateX(Math.PI / 2);
             instanceObject.rotateY(Math.PI / 2);
             instanceObject.rotateZ(Math.PI / 2);
 
             instanceObject.updateMatrix();
              if (instanceIndex < instancedMesh.count) {
                 instancedMesh.setMatrixAt(instanceIndex, instanceObject.matrix);
              } else {
                   console.warn(`Attempted to set matrix at index ${instanceIndex} beyond count ${instancedMesh.count}`);
              }
         });
 
         if (chainFullLinkAInstancedMesh.count > 0) chainFullLinkAInstancedMesh.instanceMatrix.needsUpdate = true;
         if (chainFullLinkBInstancedMesh.count > 0) chainFullLinkBInstancedMesh.instanceMatrix.needsUpdate = true;
 
     } else { // Use Half Links
         chainLinkInstancedMesh.count = Math.max(0, totalPoints);
 
         chainPathPoints.forEach((point, index) => {
             const instanceObject = tempObject;
 
             instanceObject.position.copy(point.position);
 
             const nextPoint = chainPathPoints[(index + 1) % totalPoints];
             const direction = new THREE.Vector3().subVectors(nextPoint.position, point.position).normalize();
 
              if (direction.lengthSq() < 0.0001) {
                  if (index > 0) {
                      const prevPoint = chainPathPoints[index - 1];
                       if(prevPoint && prevPoint.position.distanceToSquared(point.position) > 1e-6) {
                          direction.subVectors(point.position, prevPoint.position).normalize();
                       } else {
                           direction.set(1, 0, 0); 
                       }
                  } else {
                       direction.set(1, 0, 0); 
                  }
             }
 
             const lookAt = new THREE.Matrix4();
             const up = new THREE.Vector3(0, 0, 1); 
             if (Math.abs(direction.dot(up)) > 0.9999) {
                 up.set(0, 1, 0); 
                 if (Math.abs(direction.dot(up)) > 0.9999) {
                     up.set(1, 0, 0);
                 }
             }
             lookAt.lookAt(new THREE.Vector3(0,0,0), direction, up); 
 
             instanceObject.rotation.set(0,0,0); 
             instanceObject.scale.set(chainLinkScale, chainLinkScale, chainLinkScale); 
             instanceObject.setRotationFromMatrix(lookAt); 
 
             instanceObject.rotateX(Math.PI / 2);
             instanceObject.rotateY(Math.PI / 2);
             instanceObject.rotateZ(Math.PI / 2);
 
             instanceObject.updateMatrix();
              if (index < chainLinkInstancedMesh.count) {
                  chainLinkInstancedMesh.setMatrixAt(index, instanceObject.matrix);
              } else {
                   console.warn(`Attempted to set matrix at index ${index} beyond count ${chainLinkInstancedMesh.count}`);
              }
 
         });
         if (chainLinkInstancedMesh.count > 0) chainLinkInstancedMesh.instanceMatrix.needsUpdate = true;
     }
}

// --- genChainLoopGeo (Unchanged from previous version - needs geometry.rotations passed in) ---
// ... Make sure when calling this, the 'geometry' object includes 'rotations: { total: ... }' ...
export function genChainLoopGeo(geometry, scene, chainLinkInstancedMesh, chainLinkInst, chainFullLinkAInstancedMesh, chainFullLinkAInst, chainFullLinkBInstancedMesh, chainFullLinkBInst) {
    // ... (previous validated version, just ensure geometry has rotations.total) ...
     // Assume componentRegistry is defined and imported
     // Example: let componentRegistry = {}; 

     // Calculate the path points using the UPDATED function (now includes rotation compensation)
     const chainPathPoints = calculateChainPath(geometry); // Requires geometry.rotations.total
     
     // Handle case where path generation fails
     if (!chainPathPoints || chainPathPoints.length === 0) {
          console.warn("Chain path calculation resulted in zero points. Cannot generate chain.");
          // Ensure any existing chain meshes are made invisible and removed
           if (chainLinkInstancedMesh) {
               chainLinkInstancedMesh.visible = false;
               if (scene.children.includes(chainLinkInstancedMesh)) scene.remove(chainLinkInstancedMesh);
               chainLinkInstancedMesh.count = 0; 
               chainLinkInstancedMesh.instanceMatrix.needsUpdate = true;
           }
           if (chainFullLinkAInstancedMesh) {
               chainFullLinkAInstancedMesh.visible = false;
               if (scene.children.includes(chainFullLinkAInstancedMesh)) scene.remove(chainFullLinkAInstancedMesh);
               chainFullLinkAInstancedMesh.count = 0; 
               chainFullLinkAInstancedMesh.instanceMatrix.needsUpdate = true;
           }
           if (chainFullLinkBInstancedMesh) {
               chainFullLinkBInstancedMesh.visible = false;
               if (scene.children.includes(chainFullLinkBInstancedMesh)) scene.remove(chainFullLinkBInstancedMesh);
               chainFullLinkBInstancedMesh.count = 0; 
               chainFullLinkBInstancedMesh.instanceMatrix.needsUpdate = true;
           }
 
          if (typeof componentRegistry !== 'undefined' && componentRegistry.chain) {
               delete componentRegistry.chain;
          }
          return null; // Cannot generate chain
      }
 
     // Position the links on the correctly phased world-space path
     positionChainLinks(chainPathPoints, geometry.params, chainLinkInstancedMesh, chainLinkInst, chainFullLinkAInstancedMesh, chainFullLinkAInst, chainFullLinkBInstancedMesh, chainFullLinkBInst);
 
     // --- Tagging, Registration, and Scene Management (Using Refactored Approach) ---
     let activeChainComponent = null;
 
      // Clear previous registration before setting the new one
      if (typeof componentRegistry !== 'undefined' && componentRegistry.chain) {
          // Placeholder - removal logic handled below
      }
 
 
     if (geometry.params.chainFullEnabled && chainFullLinkAInstancedMesh && chainFullLinkBInstancedMesh) {
         // ... (scene management logic remains the same) ...
         chainFullLinkAInstancedMesh.userData.componentType = 'chainLinkFullA';
         chainFullLinkBInstancedMesh.userData.componentType = 'chainLinkFullB';
         activeChainComponent = { fullLinkA: chainFullLinkAInstancedMesh, fullLinkB: chainFullLinkBInstancedMesh };
          if (typeof componentRegistry !== 'undefined') componentRegistry.chain = activeChainComponent;
         if (!scene.children.includes(chainFullLinkAInstancedMesh)) scene.add(chainFullLinkAInstancedMesh);
         if (!scene.children.includes(chainFullLinkBInstancedMesh)) scene.add(chainFullLinkBInstancedMesh);
         if (chainLinkInstancedMesh && scene.children.includes(chainLinkInstancedMesh)) scene.remove(chainLinkInstancedMesh);
 
 
     } else if (chainLinkInstancedMesh) {
          // ... (scene management logic remains the same) ...
         chainLinkInstancedMesh.userData.componentType = 'chainLinkHalf';
         activeChainComponent = chainLinkInstancedMesh;
          if (typeof componentRegistry !== 'undefined') componentRegistry.chain = activeChainComponent;
         if (!scene.children.includes(chainLinkInstancedMesh)) scene.add(chainLinkInstancedMesh);
         if (chainFullLinkAInstancedMesh && scene.children.includes(chainFullLinkAInstancedMesh)) scene.remove(chainFullLinkAInstancedMesh);
         if (chainFullLinkBInstancedMesh && scene.children.includes(chainFullLinkBInstancedMesh)) scene.remove(chainFullLinkBInstancedMesh);
 
     } else {
          // ... (scene management logic remains the same) ...
          if (chainLinkInstancedMesh && scene.children.includes(chainLinkInstancedMesh)) scene.remove(chainLinkInstancedMesh);
          if (chainFullLinkAInstancedMesh && scene.children.includes(chainFullLinkAInstancedMesh)) scene.remove(chainFullLinkAInstancedMesh);
          if (chainFullLinkBInstancedMesh && scene.children.includes(chainFullLinkBInstancedMesh)) scene.remove(chainFullLinkBInstancedMesh);
           if (typeof componentRegistry !== 'undefined' && componentRegistry.chain) delete componentRegistry.chain;
     }
 
     return activeChainComponent; 
 }

// --- Driver Assembly ---

function createDriverAssemblyGeometry(geometry) {
    const { points, sizes, params } = geometry;

    // --- Driver Core Geometry ---
    const CORE_THICKNESS = 0.7;
    const SEGMENTS_CORE = 32;
    const CORE_INNER_RADIUS = sizes.D1_size - 0.5; // Use D1_size (driver size)

    const coreGeometry = new THREE.CylinderGeometry(
        CORE_INNER_RADIUS,
        CORE_INNER_RADIUS,
        CORE_THICKNESS * 2,
        SEGMENTS_CORE
    );

    // --- Driver Attach Geometry ---
    const SEGMENTS_ATTACH = 32;
    const INNER_RADIUS_ATTACH = 1.2;
    const OUTER_RADIUS_ATTACH = 2.05;
    const SECTION_LENGTH_ATTACH = -0.25;

    const curve = new THREE.CurvePath();
    const startZ = points.Drv_Center.z; // Base Z on calculated Drv_Center

    // Define points relative to origin (will be positioned later)
    const p1 = new THREE.Vector2(INNER_RADIUS_ATTACH, 0); // Start at z=0 relative to Drv_Center
    const p2 = new THREE.Vector2(INNER_RADIUS_ATTACH, SECTION_LENGTH_ATTACH);

    
    // Adjust absolute Z reference to be relative Z offset from Drv_Center
    const hubOffsetZ = params.isRHD ? -params.hub_offset_R : params.hub_offset_R;
    const p3_z_relative = (hubOffsetZ * 0.5 + 0.3) - startZ;
    const p4_z_relative = (hubOffsetZ * 0.5) - startZ;

    
    const p3 = new THREE.Vector2(OUTER_RADIUS_ATTACH, p3_z_relative);
    const p4 = new THREE.Vector2(OUTER_RADIUS_ATTACH, p4_z_relative);


    curve.add(new THREE.LineCurve(p1, p2));
    curve.add(new THREE.LineCurve(p2, p3));
    curve.add(new THREE.LineCurve(p3, p4));

    const attachGeometry = new THREE.LatheGeometry(
        curve.getPoints(50),
        SEGMENTS_ATTACH,
        0,
        Math.PI * 2
    );

    return { coreGeometry, attachGeometry };
}

function createDriverAssemblyMeshes(geometries) {
    const { coreGeometry, attachGeometry } = geometries;
    let driverCoreMesh = null;
    let driverAttachMesh = null;

    // Create Core Mesh
    if (coreGeometry) {
        const coreMaterial = createComponentMaterial('driverCore');
        driverCoreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
        driverCoreMesh.userData.componentType = 'driverCore'; // Tag individual part
    }

    // Create Attach Mesh
     if (attachGeometry) {
        const attachMaterial = createComponentMaterial('driverAttach');
        driverAttachMesh = new THREE.Mesh(attachGeometry, attachMaterial);
        driverAttachMesh.userData.componentType = 'driverAttach'; // Tag individual part
     }

    return { driverCoreMesh, driverAttachMesh };
}

export function positionDriverAssembly(meshes, driverGroup, gearToothInstancedMesh, gearToothInstance, geometry) {
    const { driverCoreMesh, driverAttachMesh } = meshes;
    const { points, sizes, params, rotations } = geometry;
     const { D1_size, D1_count, totalRotation } = { // Use D1 for driver
        D1_size: sizes.D1_size,
        D1_count: params.D1_count,
        totalRotation: rotations.total
    };
    const TOOTH = {
        SCALE: 2.2,
        OFFSET: -0.5,
    };

    // --- Position Group ---
    // Reset group transformations
    driverGroup.position.set(0, 0, 0);
    driverGroup.rotation.set(0, 0, 0);
    driverGroup.scale.set(1, 1, 1);

    // Set final group position (at Drv_Center)
    driverGroup.position.copy(points.Drv_Center);
     // Apply overall rotation (optional, based on if core/attach need it)
    driverGroup.rotation.z = totalRotation;


    // --- Position/Rotate Meshes *within* the Group ---
    // Position Driver Core relative to group center
    if (driverCoreMesh) {
        driverCoreMesh.position.set(0, 0, 0); // Centered in the group
        driverCoreMesh.rotation.set(Math.PI / 2, 0, 0); // Rotate Cylinder upright
        driverCoreMesh.scale.set(1, 1, 1);
    }

    // Position Driver Attach relative to group center
    if (driverAttachMesh) {
        driverAttachMesh.position.set(0, 0, 0); // Centered in the group
        driverAttachMesh.rotation.set(Math.PI / 2, 0, 0); // Rotate Lathe upright
        driverAttachMesh.scale.set(1, 1, 1);
    }

    // --- Position Instanced Teeth (World Space) ---
    if (gearToothInstancedMesh && gearToothInstance) {
        gearToothInstancedMesh.count = D1_count; // Use D1_count
        const angleStep = (Math.PI * 2) / D1_count;

        for (let i = 0; i < D1_count; i++) {
            const baseAngle = i * angleStep;
            const toothAngle = baseAngle + totalRotation; // Combine angles
            const adjustedRadius = D1_size + TOOTH.OFFSET; // Use D1_size

            // Calculate world position based on Drv_Center
            const toothX = Math.cos(toothAngle) * adjustedRadius + points.Drv_Center.x;
            const toothY = Math.sin(toothAngle) * adjustedRadius + points.Drv_Center.y;
            const toothZ = points.Drv_Center.z; // Use Drv_Center's Z

            // Use dummy instance to calculate matrix
            gearToothInstance.position.set(toothX, toothY, toothZ);
            gearToothInstance.rotation.set(0, 0, 0);
            gearToothInstance.scale.set(TOOTH.SCALE, TOOTH.SCALE, TOOTH.SCALE);

            // Apply rotation
            gearToothInstance.rotateZ(-Math.PI / 2); // Initial model alignment
            gearToothInstance.rotateZ(toothAngle); // Final orientation

            gearToothInstance.updateMatrix();
            gearToothInstancedMesh.setMatrixAt(i, gearToothInstance.matrix);
        }
        gearToothInstancedMesh.instanceMatrix.needsUpdate = true;
    }
}

export function genDriverGeo(geometry, scene, gearToothInstancedMesh, gearToothInstance) {

    // Create the procedural geometries
    const geometries = createDriverAssemblyGeometry(geometry);
    if (!geometries.coreGeometry && !geometries.attachGeometry && !gearToothInstancedMesh) return null;

    // Create the meshes from geometries
    const meshes = createDriverAssemblyMeshes(geometries);

     // Create the group for the driver assembly (core + attach)
    const driverGroup = new THREE.Group();
    driverGroup.userData.componentType = 'driverAssembly'; // Tag the group

    // Add core and attach meshes to the group if they exist
    if (meshes.driverCoreMesh) {
        driverGroup.add(meshes.driverCoreMesh);
    }
    if (meshes.driverAttachMesh) {
        driverGroup.add(meshes.driverAttachMesh);
    }

    // Position the group contents and the instanced teeth
    positionDriverAssembly(meshes, driverGroup, gearToothInstancedMesh, gearToothInstance, geometry);

    // Register the group
    componentRegistry.driverAssembly = driverGroup; // Register the assembly group

    // Add the group (core + attach) to the scene
    scene.add(driverGroup);

    // Manage the instanced mesh separately (added directly to scene)
    if (gearToothInstancedMesh) {
        if (!scene.children.includes(gearToothInstancedMesh)) {
            scene.add(gearToothInstancedMesh);
        }
        // Optional: Register teeth instanced mesh
        // componentRegistry.driverTeeth = gearToothInstancedMesh;
    }

    return driverGroup; // Return the main assembly group
}



