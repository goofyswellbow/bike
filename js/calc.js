console.log('Loading calc.js...');
import * as THREE from 'three';
import * as Constants from './constants.js';

console.log('Imported constants in calc.js:', Constants);
// Utility function needed for calculations
export function rotatePoint(pivot, point, angle) {
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const dx = point.x - pivot.x;
    const dy = point.y - pivot.y;
    const x = cosAngle * dx - sinAngle * dy + pivot.x;
    const y = sinAngle * dx + cosAngle * dy + pivot.y;
    return new THREE.Vector3(x, y, point.z);
}

export function calcPrimarySkeleton(params) {

// ------------------------------------
// PRE CALCULATIONS
// ------------------------------------

    // Rim and Tire Size to Calculate Wheel Size
    const W1_size = params.R1_size + params.T1_size;
    const W2_size = params.R2_size + params.T2_size;

    // Contrain Options Based on Wheel Sizes
    let comp_F = params.F_length;
    if (params.F_mode === true) {
        comp_F = W1_size + params.F_const;
    }

    let comp_S = params.S_length;
    if (params.S_mode === true) {
        comp_S = W2_size + params.S_const;
    }

// ------------------------------------
// PRIMARY CALCULATIONS
// ------------------------------------

    // Hypotenuse and A_end_Y
    const c = comp_F + params.H_length;
    const A_end_Y = c * Math.cos(params.D_angle);

    // B start and end
    const B_start = new THREE.Vector3(0, params.B_drop, 0);
    const B_end = new THREE.Vector3(
        params.B_length * Math.sin(params.B_angle),
        params.B_length * Math.cos(params.B_angle) + params.B_drop,
        0
    );

    // S position
    const S_angle = Math.acos(B_start.y / comp_S);
    const S_end = new THREE.Vector3(
        B_start.x + comp_S * Math.sin(S_angle),
        0,
        0
    );

    // A positions
    const A_angle = Math.acos((A_end_Y - B_end.y) / params.A_length);
    const A_end = new THREE.Vector3(
        B_end.x - params.A_length * Math.sin(A_angle),
        A_end_Y,
        0
    );

    // D position (initial)
    const D_length = 1;
    const D_end_initial = new THREE.Vector3(
        A_end.x + D_length * Math.sin(params.D_angle),
        A_end.y - D_length * Math.cos(params.D_angle),
        0
    );

    // Extend D to ground (y=0)
    const xInterceptD = D_end_initial.x - D_end_initial.y *
        (D_end_initial.x - A_end.x) / (D_end_initial.y - A_end.y);
    const D_end = new THREE.Vector3(xInterceptD, 0, 0);

    // F end
    const F_end = new THREE.Vector3(
        D_end.x - comp_F * Math.sin(params.D_angle),
        D_end.y + comp_F * Math.cos(params.D_angle),
        0
    );

    // T direction
    const T_angle = params.D_angle + Math.PI;
    const T_end = new THREE.Vector3(
        D_end.x + params.T_length * Math.cos(T_angle),
        D_end.y + params.T_length * Math.sin(T_angle),
        0
    );

    // Z end - Calculate Seat Height
    const directionZ = new THREE.Vector3().subVectors(B_end, B_start).normalize();
    const Z_end = new THREE.Vector3().copy(B_end).add(
        directionZ.multiplyScalar(params.Z_length)
    );

    // P end - Calculate Top of HeadTube/Stem Anchor
    const direction_P = new THREE.Vector3().subVectors(A_end, F_end).normalize();
    const P_end = new THREE.Vector3().copy(A_end).add(
        direction_P.multiplyScalar(params.P_length)
    );

    const points = {
        B_start,
        B_end,
        A_end,
        D_end,
        F_end,
        T_end,
        S_end,
        Z_end,
        P_end
    };

    // Create frame members with actual points
    const frameMembers = Object.fromEntries(
        Object.entries(Constants.FRAME_MEMBERS).map(([key, member]) => {
            return [key, {
                ...member,
                points: {
                    start: points[member.pointRefs.start],
                    end: points[member.pointRefs.end]
                }
            }];
        })
    );

    return {
        points,
        sizes: {
            W1_size,
            W2_size
        },
        frameMembers
    };
}

export function calcAxelPoints(params, primarySkeleton) {
    const { points } = primarySkeleton;

    // Create axel points by extending from base points in +Z
    const frontAxel = new THREE.Vector3(
        points.T_end.x,
        points.T_end.y,
        params.frontAxel_Z
    );

    const midAxel = new THREE.Vector3(
        points.B_start.x,
        points.B_start.y,
        params.midAxel_Z
    );

    const rearAxel = new THREE.Vector3(
        points.S_end.x,
        points.S_end.y,
        params.rearAxel_Z
    );

    return {
        ...primarySkeleton,
        points: {
            ...primarySkeleton.points,
            frontAxel,
            midAxel,
            rearAxel
        }
    };
}

export function calcDrivetrainSystem(params, attachPoint) {
    // Calculate points at origin
    const BB_headsetStart = new THREE.Vector3(0, 0, 0);
    const BB_headsetEnd = new THREE.Vector3(0, 0, params.BB_BaseHeight);

    const BB_SpacerDistance = params.BB_SpacerWidth * params.BB_SpacerCount;
    const BB_SpacerEnd = new THREE.Vector3(0, 0, BB_headsetEnd.z + BB_SpacerDistance);

    const Spkt_Center = new THREE.Vector3(0, 0, BB_SpacerEnd.z + params.SpktAttachDistance);

    // Calculate true Crank Center
    const Crnk_Center = new THREE.Vector3(0, 0, Spkt_Center.z + params.CrankAttachDistance);
        

    // Calculate Crank End from Crank Center
    const Crnk_End = new THREE.Vector3(
        -params.CrankLength,
        0,
        Crnk_Center.z + params.CrankOffset
    );



    // Translate all points to attach point
    const points = {
        BB_headsetStart: BB_headsetStart.add(attachPoint),
        BB_headsetEnd: BB_headsetEnd.add(attachPoint),
        BB_SpacerEnd: BB_SpacerEnd.add(attachPoint),
        Spkt_Center: Spkt_Center.add(attachPoint),
        Crnk_Center: Crnk_Center.add(attachPoint),
        Crnk_End: Crnk_End.add(attachPoint)
    };

    return points;
}

export function calcNonDrivetrainSystem(params, attachPoint) {
    // Calculate points at origin
    const BB_headsetStart_NonD = new THREE.Vector3(0, 0, 0);
    const BB_headsetEnd_NonD = new THREE.Vector3(0, 0, -params.BB_BaseHeight_NonD);
    const BB_SpacerDistance_NonD = params.BB_SpacerWidth_NonD * params.BB_SpacerCount_NonD;
    const BB_SpacerEnd_NonD = new THREE.Vector3(0, 0, BB_headsetEnd_NonD.z - BB_SpacerDistance_NonD);
    
    // Calculate Crank Center (no sprocket needed for non-drive side)
    const Crnk_Center_NonD = new THREE.Vector3(0, 0, BB_SpacerEnd_NonD.z - params.CrankAttachDistance_NonD);
    
    // Calculate Crank End - mirrored from drive side
    const Crnk_End_NonD = new THREE.Vector3(
        params.CrankLength,  // Positive X (opposite of drive side)
        0,
        Crnk_Center_NonD.z - params.CrankOffset  // Subtract offset (opposite of drive side)
    );

    // Create attachment point with same X,Y but negative Z
    const negativeAttachPoint = new THREE.Vector3(
        attachPoint.x,
        attachPoint.y,
        -attachPoint.z
    );

    // Create new vectors for translated points to avoid modifying originals
    const points = {
        BB_headsetStart_NonD: BB_headsetStart_NonD.clone().add(negativeAttachPoint),
        BB_headsetEnd_NonD: BB_headsetEnd_NonD.clone().add(negativeAttachPoint),
        BB_SpacerEnd_NonD: BB_SpacerEnd_NonD.clone().add(negativeAttachPoint),
        Crnk_Center_NonD: Crnk_Center_NonD.clone().add(negativeAttachPoint),
        Crnk_End_NonD: Crnk_End_NonD.clone().add(negativeAttachPoint)
    };

    return points;
}

export function calcDriverSystem(params, rearAxel) {
    // Calculate Driver Center point directly from rearAxel
    const Drv_Center = new THREE.Vector3(
        rearAxel.x,
        rearAxel.y,
        rearAxel.z + params.DrvAttachDistance
    );

    return {
        Drv_Center
    };
}

export function calcGearSystem(params, points) {
    // Calculate gear sizes
    const D2_size = (params.D_width * params.D2_count) / (Math.PI * 2);  // Sprocket
    const D1_size = (params.D_width * params.D1_count) / (Math.PI * 2);  // Driver

    const { B_start, S_end, Spkt_Center, Drv_Center } = points;

    // Calculate in XY plane
    const dSquared = Math.pow(B_start.x - S_end.x, 2) + Math.pow(B_start.y - S_end.y, 2);
    const d = Math.sqrt(dSquared);
    const theta = -Math.atan2(B_start.y - S_end.y, B_start.x - S_end.x);
    const alpha = Math.asin((D2_size - D1_size) / d);

    // Top tangent points
    const tangentPointS1 = new THREE.Vector3(
        B_start.x - D2_size * Math.sin(theta + alpha),
        B_start.y - D2_size * Math.cos(theta + alpha),
        Spkt_Center.z  // Use Spkt_Center Z position
    );

    const tangentPointD1 = new THREE.Vector3(
        S_end.x - D1_size * Math.sin(theta + alpha),
        S_end.y - D1_size * Math.cos(theta + alpha),
        Drv_Center.z  // Use rearAxel Z position
    );

    // Bottom tangent points
    const tangentPointS2 = new THREE.Vector3(
        B_start.x + D2_size * Math.sin(theta - alpha),
        B_start.y + D2_size * Math.cos(theta - alpha),
        Spkt_Center.z
    );

    const tangentPointD2 = new THREE.Vector3(
        S_end.x + D1_size * Math.sin(theta - alpha),
        S_end.y + D1_size * Math.cos(theta - alpha),
        Drv_Center.z
    );

    return {
        points: {
            tangentPointS1,
            tangentPointD1,
            tangentPointS2,
            tangentPointD2
        },
        sizes: {
            D1_size,
            D2_size
        }
    };
}

export function calcSpokeSystem(params, radius, isRear = false) {
    const total_spokes = 18;
    const cross = 3;
    const half_section_angle = Math.PI / total_spokes;

    // Use the appropriate parameters based on wheel type
    const hub_radius = isRear ? params.hub_radius_R : params.hub_radius_F;
    const hub_offset = isRear ? params.hub_offset_R : params.hub_offset_F;
    const rim_offset = isRear ? params.rim_offset_R : params.rim_offset_F;
    const hub_red_offset = isRear ? params.hub_red_offset_R : params.hub_red_offset_F;
    const hub_yellow_offset = isRear ? params.hub_yellow_offset_R : params.hub_yellow_offset_F;

    // Rest of the function remains the same, but uses these specific parameters
    const hubPointsRight = [];
    const hubPointsLeft = [];
    const rimPointsRight = [];
    const rimPointsLeft = [];

    // Create Hub Points
    for (let i = 0; i < total_spokes; i++) {
        const angle = i * 2 * Math.PI / total_spokes;
        const isRed = i % 2 === 0;
        
        const flangeTopOffset = isRed ? 
            (hub_offset * 0.5 + hub_red_offset) : 
            (hub_offset * 0.5 + hub_yellow_offset);
        const flangeBottomOffset = isRed ? 
            (-hub_offset * 0.5 - hub_red_offset) : 
            (-hub_offset * 0.5 - hub_yellow_offset);
            
        // Top set (hubR)
        hubPointsRight.push(new THREE.Vector3(
            hub_radius * Math.cos(angle),
            hub_radius * Math.sin(angle),
            flangeTopOffset
        ));
        
        // Bottom set (hubL)
        const angleLeft = angle + half_section_angle;
        hubPointsLeft.push(new THREE.Vector3(
            hub_radius * Math.cos(angleLeft),
            hub_radius * Math.sin(angleLeft),
            flangeBottomOffset
        ));
    }

    // Create Rim Points
    for (let i = 0; i < total_spokes; i++) {
        const angle = i * 2 * Math.PI / total_spokes;
        
        // rimR (top)
        rimPointsRight.push(new THREE.Vector3(
            radius * Math.cos(angle),
            radius * Math.sin(angle),
            rim_offset * 0.5
        ));
        
        // rimL (bottom)
        const angleLeft = angle + half_section_angle;
        rimPointsLeft.push(new THREE.Vector3(
            radius * Math.cos(angleLeft),
            radius * Math.sin(angleLeft),
            -rim_offset * 0.5
        ));
    }

    // Pre-determined pattern arrays
    const evenRimIndices = [9, 11, 13, 15, 17, 1, 3, 5, 7];
    const oddRimIndices = [10, 12, 14, 16, 0, 2, 4, 6, 8];

    // Arrays to store spoke connections
    const spokes = {
        red: [],    // Each spoke will be {start: Vector3, end: Vector3}
        yellow: []
    };

    // Connect top spokes
    let redCount = 0;
    for (let i = 0; i < total_spokes; i += 2) {
        const hubPt = hubPointsRight[i];
        const rimIdx = evenRimIndices[(redCount + cross) % 9];
        const rimPt = rimPointsRight[rimIdx];
        spokes.red.push({ start: hubPt, end: rimPt });
        redCount++;
    }

    let yellowCount = 0;
    for (let i = 1; i < total_spokes; i += 2) {
        const hubPt = hubPointsRight[i];
        const rimIdx = oddRimIndices[(yellowCount + (9 - cross)) % 9];
        const rimPt = rimPointsRight[rimIdx];
        spokes.yellow.push({ start: hubPt, end: rimPt });
        yellowCount++;
    }

    // Connect bottom spokes
    redCount = 0;
    for (let i = 0; i < total_spokes; i += 2) {
        const hubPt = hubPointsLeft[i];
        const rimIdx = evenRimIndices[(redCount + (9 - cross)) % 9];
        const rimPt = rimPointsLeft[rimIdx];
        spokes.red.push({ start: hubPt, end: rimPt });
        redCount++;
    }

    yellowCount = 0;
    for (let i = 1; i < total_spokes; i += 2) {
        const hubPt = hubPointsLeft[i];
        const rimIdx = oddRimIndices[(yellowCount + cross) % 9];
        const rimPt = rimPointsLeft[rimIdx];
        spokes.yellow.push({ start: hubPt, end: rimPt });
        yellowCount++;
    }

    return {
        points: {
            hubR: hubPointsRight,
            hubL: hubPointsLeft,
            rimR: rimPointsRight,
            rimL: rimPointsLeft
        },
        spokes: spokes
    };
}

export function levelWheelbase(skeleton) {
    const { points } = skeleton;

    const angleToRotate = -Math.atan2(points.T_end.y - points.S_end.y, 
                                        points.T_end.x - points.S_end.x) + Math.PI;

    // Store rotation info
    skeleton.rotations = {
        wheelbase: angleToRotate
    };

    const pointsToRotate = [
        'B_start', 'B_end', 'A_end', 'D_end', 'F_end', 'T_end', 'Z_end','P_end',
        'frontAxel', 'midAxel', 'rearAxel',
        'BB_headsetStart', 'BB_headsetEnd', 'BB_SpacerEnd',
        'Spkt_Center', 'Crnk_Center', 'Crnk_End',
        'tangentPointS1', 'tangentPointD1', 'tangentPointS2', 'tangentPointD2',
        'BB_headsetStart_NonD', 'BB_headsetEnd_NonD', 'BB_SpacerEnd_NonD', 'Crnk_Center_NonD', 'Crnk_End_NonD'
    ];

    pointsToRotate.forEach(pointName => {
        points[pointName] = rotatePoint(points.S_end, points[pointName], angleToRotate);
    });

    return skeleton;
}

export function levelWheelTangent(skeleton) {
    const { points, sizes } = skeleton;

    // Calculate Wheels Bottom tangent line
    const dSquared = Math.pow(points.S_end.x - points.T_end.x, 2) + 
                        Math.pow(points.S_end.y - points.T_end.y, 2);
    const d = Math.sqrt(dSquared);
    const theta = -Math.atan2(points.S_end.y - points.T_end.y, 
                                points.S_end.x - points.T_end.x);
    const alpha = Math.asin((sizes.W2_size - sizes.W1_size) / d);

    // Calculate tangent points
    const tangentPointA = new THREE.Vector3(
        points.T_end.x - sizes.W1_size * Math.sin(theta + alpha),
        points.T_end.y - sizes.W1_size * Math.cos(theta + alpha),
        0
    );

    const tangentPointB = new THREE.Vector3(
        points.S_end.x - sizes.W2_size * Math.sin(theta + alpha),
        points.S_end.y - sizes.W2_size * Math.cos(theta + alpha),
        0
    );

    // Calculate tangent midpoint
    const tangentMidpoint = new THREE.Vector3(
        (tangentPointA.x + tangentPointB.x) / 2,
        (tangentPointA.y + tangentPointB.y) / 2,
        0
    );

    const tangentAngle = Math.atan2(
        tangentPointB.y - tangentPointA.y,
        tangentPointB.x - tangentPointA.x
    );

    const rotationAngle = -tangentAngle;

    // Store rotation info
    skeleton.rotations = {
        ...skeleton.rotations,
        wheelTangent: rotationAngle
    };

    // List all points to transform
    const pointNames = [
        'B_start', 'B_end', 'A_end', 'D_end', 'F_end', 'T_end', 'S_end', 'Z_end','P_end',
        'frontAxel', 'midAxel', 'rearAxel',
        'BB_headsetStart', 'BB_headsetEnd', 'BB_SpacerEnd',
        'Spkt_Center', 'Crnk_Center','Crnk_End','Drv_Center',
        'tangentPointS1', 'tangentPointD1', 'tangentPointS2', 'tangentPointD2',
        'BB_headsetStart_NonD', 'BB_headsetEnd_NonD', 'BB_SpacerEnd_NonD', 'Crnk_Center_NonD', 'Crnk_End_NonD'
    ];

    // Rotate and translate all points
    pointNames.forEach(pointName => {
        points[pointName] = rotatePoint(tangentMidpoint, points[pointName], rotationAngle);
        points[pointName].y -= tangentMidpoint.y;  // Apply y offset
    });

    // Update tangent points after rotation and translation
    points.tangentPointA = rotatePoint(tangentMidpoint, tangentPointA, rotationAngle);
    points.tangentPointA.y -= tangentMidpoint.y;

    points.tangentPointB = rotatePoint(tangentMidpoint, tangentPointB, rotationAngle);
    points.tangentPointB.y -= tangentMidpoint.y;

    skeleton.sizes.bbHeight = points.B_start.y;

    return skeleton;
}

export function calcStemSystem(params, attachPoint, F_end, P_end) {
    // Calculate all points at origin first
    const headset_Start = new THREE.Vector3(0, 0, 0);
    const headset_End = new THREE.Vector3(0, params.HS_BaseHeight, 0);

    // Spacer calculations
    const spacer_distance = params.HS_SpacerCount * params.HS_SpacerWidth;
    const direction_HS = new THREE.Vector3(0, 1, 0);
    const spacer_end = new THREE.Vector3().copy(headset_End).add(
        direction_HS.multiplyScalar(spacer_distance)
    );

    // Stem center
    const direction_HS_original = new THREE.Vector3(0, 1, 0);
    const stem_center = new THREE.Vector3().copy(spacer_end).add(
        direction_HS_original.clone().multiplyScalar(params.HS_StemCenter)
    );

    // L_end
    const direction_LB_90 = new THREE.Vector3(-1, 0, 0);
    const L_end = new THREE.Vector3().copy(stem_center).add(
        direction_LB_90.multiplyScalar(params.L_length)
    );

    // R_end
    const direction_R_90 = new THREE.Vector3(0, -1, 0);
    const R_end = new THREE.Vector3().copy(L_end).sub(
        direction_R_90.multiplyScalar(params.R_length)
    );

    // Calculate orientation angle
    const stemVector = new THREE.Vector3().subVectors(F_end, P_end).normalize();
    const angleToRotate = Math.atan2(stemVector.y, stemVector.x) + Math.PI / 2;

    // Create rotation matrix
    const rotationMatrix = new THREE.Matrix4().makeRotationZ(angleToRotate);

    // Apply rotation to all points
    const points = [headset_Start, headset_End, spacer_end, 
                    stem_center, L_end, R_end];
    points.forEach(point => point.applyMatrix4(rotationMatrix));

    // Translate all points to attach point
    const translationVector = new THREE.Vector3().copy(attachPoint).sub(points[0]);
    points.forEach(point => point.add(translationVector));

    // Return named points
    return {
        headset_Start: points[0],
        headset_End: points[1],
        spacer_end: points[2],
        stem_center: points[3],
        L_end: points[4],
        R_end: points[5]
    };
}

export function calcHandlebarSystem(params, attachPoint, stemVector) {
    // Parameters
    const barC = new THREE.Vector3(0, 0, 0);
    const barHeight = params.B_height;
    const barWidth = params.B_width;
    const gripWidth = Math.max(0, params.Bg_width);
    const threshold = 0.002;
    const percentage = 0.35;
    const crossbar = 0.8;

    // Calculate Bar Height and Width End
    const barH = new THREE.Vector3(0, barHeight, 0);
    const direction_BW = barH.clone().sub(barC).normalize();
    // Change 90Â° rotation to work in YZ plane instead of XY
    const direction_BW_90 = new THREE.Vector3(direction_BW.z, -direction_BW.x, direction_BW.y);
    let Bw_end = barH.clone().add(direction_BW_90.multiplyScalar(barWidth));

    // Calculate Grip End
    const direction_Bg = barH.clone().sub(Bw_end).normalize();
    const adjustedGripWidth = barWidth <= threshold ? 0 : Math.min(gripWidth, Bw_end.z);
    let Bg_end = Bw_end.clone().add(direction_Bg.multiplyScalar(adjustedGripWidth));

    // Calculate Rotation Matrices for Upsweep and Backsweep
    const upsweepAngle = params.upsweep * (Math.PI / 180) * -1;
    const backsweepAngle = params.backsweep * (Math.PI / 180);
    const rotY = new THREE.Matrix4().makeRotationY(backsweepAngle);
    const rotX = new THREE.Matrix4().makeRotationX(upsweepAngle);

    // Apply Rotations Only Between Bg_end and Bw_end
    const Bw_to_Bg = Bw_end.clone().sub(Bg_end);
    Bw_to_Bg.applyMatrix4(rotY).applyMatrix4(rotX);
    Bw_end = Bg_end.clone().add(Bw_to_Bg);

    // Calculate B_corner
    const B_corner_z = THREE.MathUtils.lerp(barC.z, Bg_end.z, percentage);
    const B_corner = new THREE.Vector3(0, barC.y, B_corner_z);

    // Calculate Crossbar Position
    const vec_crossbar = Bg_end.clone().sub(B_corner);
    const crossbar_pos = B_corner.clone().add(vec_crossbar.multiplyScalar(crossbar));

    // Calculate bar height at crossbar
    const barH_crossbar = new THREE.Vector3(0, crossbar_pos.y, 0);

    // Apply Rotation to the Whole Structure
    const rotationY = params.B_rotation * (Math.PI / 180);
    const rotZ = new THREE.Matrix4().makeRotationZ(rotationY);

    // Points to transform
    const points = [barC, barH, Bw_end, Bg_end, B_corner, 
                    crossbar_pos, barH_crossbar];

    // Apply internal rotation
    points.forEach(point => point.applyMatrix4(rotZ));

    // Calculate alignment with stem
    const stemDirection = stemVector;
    const angleToRotateBars = Math.atan2(stemDirection.y, stemDirection.x) + Math.PI / 2;
    const alignmentMatrix = new THREE.Matrix4().makeRotationZ(angleToRotateBars);

    // Apply alignment rotation
    points.forEach(point => point.applyMatrix4(alignmentMatrix));

    // Translate to attachment point
    const translationVector = attachPoint;
    points.forEach(point => point.add(translationVector));

    // Return named points
    return {
        barC: points[0],
        barH: points[1],
        Bw_end: points[2],
        Bg_end: points[3],
        B_corner: points[4],
        crossbar_pos: points[5],
        barH_crossbar: points[6],
        rotations: {
            userRotation: rotationY,          // B_rotation in radians
            stemAlignmentAngle: angleToRotateBars, // Stem alignment angle
            totalLocalRotation: rotationY + angleToRotateBars // Combined local rotation
        }
    };
}

export function calcForkSystem(params, D_end, F_end, frontAxel_Z) {
    // Calculate direction vector from D_end to F_end (reversed from before)
    const direction = new THREE.Vector3().subVectors(D_end, F_end).normalize();
    
    // Create moveD_end point by moving up from F_end --this should have been called moveF_end. you can see F_end is being copied here.
    const moveD_end = new THREE.Vector3().copy(F_end).add(
    direction.clone().multiplyScalar(params.moveD_end)
    );
    
    // Create forkElbow point along the line
    const forkElbow = new THREE.Vector3().copy(moveD_end).add(
    direction.clone().multiplyScalar(params.forkElbowPosition)
    );
    
    // Create D_end instance -- again, not sure why i named the const F since its copying D_end. 
    const F_end_fork = new THREE.Vector3().copy(D_end);
    
    // Create forkBase by extending from D_end in opposite direction
    const forkBase = new THREE.Vector3().copy(D_end).add(
    direction.clone().multiplyScalar(params.forkBase_distance)
    );
    
    // Move points in +Z by frontAxel amount
    const zOffset = new THREE.Vector3(0, 0, frontAxel_Z);
    forkElbow.add(zOffset);
    F_end_fork.add(zOffset);
    forkBase.add(zOffset);
    
    // Additional Z offset for forkElbow
    forkElbow.z += params.forkElbow_offset;
    
    return {
    moveD_end,
    forkElbow,
    F_end_fork,
    forkBase
    };
}

export function calcChainstayBottomSystem(params, B_start, S_end, rearAxel_Z) {
    // Calculate base direction vector from B_start to S_end
    const direction = new THREE.Vector3().subVectors(S_end, B_start).normalize();
    const totalLength = B_start.distanceTo(S_end);
    
    // Create B_startOffset point - moving in +Z
    const B_startOffset = new THREE.Vector3().copy(B_start);
    B_startOffset.z += params.B_startOffset;
    
    // Create chainstayNeck point - base position
    const neckPosition = B_startOffset.clone().add(
        direction.clone().multiplyScalar(params.chainstayNeckPos)
    );
    
    // Apply neck offset in Z direction
    const chainstayNeck = neckPosition.clone();
    chainstayNeck.z += params.chainstayNeckOffset;
    
    // Create chainstayElbow point along the line
    const chainstayElbow = new THREE.Vector3().copy(B_start).add(
        direction.clone().multiplyScalar(params.chainstayElbowPosition)
    );
    chainstayElbow.add(new THREE.Vector3(0, 0, rearAxel_Z));
    chainstayElbow.z += params.chainstayElbow_offset;
    
    // Calculate rearAxel point for reference
    const rearAxel = new THREE.Vector3().copy(S_end);
    rearAxel.z = rearAxel_Z;
    
    // Calculate S_end_stay using vector from rearAxel to chainstayElbow
    const stayDirection = new THREE.Vector3().subVectors(chainstayElbow, rearAxel).normalize();
    const S_end_stay = new THREE.Vector3().copy(rearAxel).add(
        stayDirection.multiplyScalar(params.chainstayEndInset)
    );
    
    // Add the additional Z offset to S_end_stay
    S_end_stay.z += params.chainstayEndOffset;

    // Apply pitch rotation around B_start
    if (params.chainstayPitchOffset !== 0) {
        const pitchAngle = (params.chainstayPitchOffset * Math.PI) / 180; // Convert to radians
        const pointsToRotate = [chainstayNeck, chainstayElbow, S_end_stay];
        
        // Create rotation matrix around X axis
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationX(pitchAngle);
        
        // Apply rotation to each point relative to B_start
        pointsToRotate.forEach(point => {
            // Move to origin
            point.sub(B_start);
            // Apply rotation
            point.applyMatrix4(rotationMatrix);
            // Move back
            point.add(B_start);
        });
    }
    
    return {
        B_startOffset,
        chainstayNeck,
        chainstayElbow,
        S_end_stay
    };
}

export function calcChainstayTopSystem(params, B_end, S_end, rearAxel_Z) {
    // Calculate base direction vector from B_end to S_end
    const direction = new THREE.Vector3().subVectors(S_end, B_end).normalize();
    
    // Create B_startOffset point - moving in +Z
    const B_startOffset_T = new THREE.Vector3().copy(B_end);
    B_startOffset_T.z += params.B_startOffset_T;
    
    // Create chainstayNeck point - base position
    const neckPosition = B_startOffset_T.clone().add(
        direction.clone().multiplyScalar(params.chainstayNeckPos_T)
    );
    
    // Apply neck offset in Z direction
    const chainstayNeck_T = neckPosition.clone();
    chainstayNeck_T.z += params.chainstayNeckOffset_T;
    
    // Create chainstayElbow point along the line
    const chainstayElbow_T = new THREE.Vector3().copy(B_end).add(
        direction.clone().multiplyScalar(params.chainstayElbowPosition_T)
    );
    chainstayElbow_T.add(new THREE.Vector3(0, 0, rearAxel_Z));
    chainstayElbow_T.z += params.chainstayElbow_offset_T;
    
    // Calculate rearAxel point for reference
    const rearAxel = new THREE.Vector3().copy(S_end);
    rearAxel.z = rearAxel_Z;
    
    // Calculate S_end_stay using vector from rearAxel to chainstayElbow
    const stayDirection = new THREE.Vector3().subVectors(chainstayElbow_T, rearAxel).normalize();
    const S_end_stay_T = new THREE.Vector3().copy(rearAxel).add(
        stayDirection.multiplyScalar(params.chainstayEndInset_T)
    );
    
    // Add the additional Z offset to S_end_stay
    S_end_stay_T.z += params.chainstayEndOffset_T;
    
    return {
        B_startOffset_T,
        chainstayNeck_T,
        chainstayElbow_T,
        S_end_stay_T
    };
}

// Combine and Return All Points
export function calcTotalSystem(params) {
    // Get primary points
    const primarySkeleton = calcPrimarySkeleton(params);

    // Start our main points object
    let points = {...primarySkeleton.points};

    // Add axel points
    points = {
        ...points,
        ...calcAxelPoints(params, { points }).points
    };

    // Add drivetrain points
    points = {
        ...points,
        ...calcDrivetrainSystem(params, points.midAxel),
        ...calcNonDrivetrainSystem(params, points.midAxel)
    };

    // Add driver point
    points = {
        ...points,
        ...calcDriverSystem(params, points.rearAxel)
    };


    // Handle leftFootForward parameter - rotate crank positions 180° around bottom bracket center
    // When isRHD=true, we need to apply opposite stance to maintain visual appearance
    const effectiveStance = params.isRHD ? !params.leftFootForward : params.leftFootForward;
    

    
    if (!effectiveStance) {

        const rotationAngle = Math.PI; // 180 degrees in radians
        const rotationAxis = new THREE.Vector3(0, 0, 1); // Z-axis
        const bottomBracketCenter = points.B_start;



        // Rotate drive side crank end around bottom bracket center
        points.Crnk_End.sub(bottomBracketCenter);
        points.Crnk_End.applyAxisAngle(rotationAxis, rotationAngle);
        points.Crnk_End.add(bottomBracketCenter);

        // Rotate non-drive side crank end around bottom bracket center
        points.Crnk_End_NonD.sub(bottomBracketCenter);
        points.Crnk_End_NonD.applyAxisAngle(rotationAxis, rotationAngle);
        points.Crnk_End_NonD.add(bottomBracketCenter);

    }

    // Handle isRHD parameter - flip drivetrain across X-axis (negate Z coordinates)

    if (params.isRHD) {

        
        // Flip drivetrain system points (drive side)
        points.BB_headsetStart.z = -points.BB_headsetStart.z;
        points.BB_headsetEnd.z = -points.BB_headsetEnd.z;
        points.BB_SpacerEnd.z = -points.BB_SpacerEnd.z;
        points.Spkt_Center.z = -points.Spkt_Center.z;
        points.Crnk_Center.z = -points.Crnk_Center.z;
        points.Crnk_End.z = -points.Crnk_End.z;
        
        // Flip non-drivetrain system points (non-drive side)
        points.BB_headsetStart_NonD.z = -points.BB_headsetStart_NonD.z;
        points.BB_headsetEnd_NonD.z = -points.BB_headsetEnd_NonD.z;
        points.BB_SpacerEnd_NonD.z = -points.BB_SpacerEnd_NonD.z;
        points.Crnk_Center_NonD.z = -points.Crnk_Center_NonD.z;
        points.Crnk_End_NonD.z = -points.Crnk_End_NonD.z;
        
        // Flip driver system point
        points.Drv_Center.z = -points.Drv_Center.z;
        

    }

    // Add gear system points and sizes
    const gearSystem = calcGearSystem(params, points);
    points = {
        ...points,
        ...gearSystem.points
    };



    // Calculate spoke patterns
    const frontSpokePattern = calcSpokeSystem(params, params.R1_size, false);
    const rearSpokePattern = calcSpokeSystem(params, params.R2_size, true);


    // Create skeleton with all points and sizes
    let skeleton = {
        points,
        sizes: {
            ...primarySkeleton.sizes,
            ...gearSystem.sizes
        },
        spokePatterns: {
            front: frontSpokePattern,  // Use directly from params for now
            rear: rearSpokePattern
        }
    };

    // Level everything
    skeleton = levelWheelbase(skeleton);
    skeleton = levelWheelTangent(skeleton);

        // Calculate fork system - add after leveling
        const forkPoints = calcForkSystem(
            params,
            skeleton.points.D_end,
            skeleton.points.F_end,
            skeleton.points.frontAxel.z
        );
        
        // Calculate chainstay system - add after leveling
        const chainstayBottomPoints = calcChainstayBottomSystem(
            params,
            skeleton.points.B_start,
            skeleton.points.S_end,
            skeleton.points.rearAxel.z
        );

        const chainstayTopPoints = calcChainstayTopSystem(
            params,
            skeleton.points.B_end,
            skeleton.points.S_end,
            skeleton.points.rearAxel.z
        );

        // Update skeleton points with fork points
        skeleton.points = {
            ...skeleton.points,
            ...forkPoints,
            ...chainstayBottomPoints,
            ...chainstayTopPoints
        };

    // Calculate and add stem points
    points = {
        ...skeleton.points,
        ...calcStemSystem(
            params, 
            skeleton.points.P_end,
            skeleton.points.F_end,
            skeleton.points.P_end
        )
    };

    // Calculate orientation vector for handlebar system
    const stemVector = new THREE.Vector3().subVectors(
        skeleton.points.F_end,
        skeleton.points.P_end
    ).normalize();

    // Add handlebar points
    points = {
        ...points,
        ...calcHandlebarSystem(params, points.R_end, stemVector)
    };





    // Update skeleton with final points
    skeleton.points = points;

    // Create frame members with final transformed points
    const finalFrameMembers = Object.fromEntries(
        Object.entries(Constants.FRAME_MEMBERS).map(([key, member]) => {
            return [key, {
                ...member,
                points: {
                    start: skeleton.points[member.pointRefs.start],
                    end: skeleton.points[member.pointRefs.end]
                }
            }];
        })
    );

    const totalRotation = skeleton.rotations.wheelbase + skeleton.rotations.wheelTangent;

    // ------------------------------------
    // RETURN CALCULATED POINTS
    // ------------------------------------

    return {
        sizes: {
            ...skeleton.sizes,
            R1_size: params.R1_size,
            R2_size: params.R2_size
        },
        params,
        points: skeleton.points,
        spokePatterns: skeleton.spokePatterns,
        frameMembers: finalFrameMembers,
        rotations: {
            ...skeleton.rotations,
            total: totalRotation
        }
    };
}
  
