console.log('Loading genGuide.js...');
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { addLine, mirrorGeometryX } from './genUtil.js';



// Drawing Line Function - now respects showGuides parameter
export function drawTotalBikeSkeleton(geometry, scene, showGuides = true) {
    if (!showGuides) return;
    const { points, sizes, rotations  } = geometry;
    const totalRotation = rotations.total; 

    // --- DOTS (SPHERES) ---
    const dotGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const allDots = [

        // Drivetrain dots
        { point: points.BB_headsetStart, color: 0xff0000 },
        { point: points.BB_headsetEnd, color: 0x00ff00 },
        { point: points.BB_SpacerEnd, color: 0x0000ff },
        { point: points.Crnk_Center, color: 0xffff00 },
        { point: points.Crnk_End, color: 0xffff00 },

        { point: points.BB_headsetStart_NonD, color: 0xff0000 },
        { point: points.BB_headsetEnd_NonD, color: 0x00ff00 },
        { point: points.BB_SpacerEnd_NonD, color: 0x0000ff },
        { point: points.Crnk_Center_NonD, color: 0xffff00 },
        { point: points.Crnk_End_NonD, color: 0xffff00 },

        { point: points.Spkt_Center, color: 0xff00ff },
        { point: points.Drv_Center, color: 0xcccccc },

        // Axel dots
        { point: points.frontAxel, color: 0xff0000 },
        { point: points.midAxel, color: 0xff0000 },
        { point: points.rearAxel, color: 0xff0000 },

        // Wheel center dots
        { point: points.T_end, color: 0xffff00 },
        { point: points.S_end, color: 0xffff00, z: 0 }
    ];

    allDots.forEach(({ point, color, z }) => {
        const sphere = new THREE.Mesh(
            dotGeometry,
            new THREE.MeshBasicMaterial({ 
                color,
                depthTest: false
            })
        );
        sphere.position.set(point.x, point.y, z !== undefined ? z : point.z);
        sphere.renderOrder = 999;
        sphere.userData.isGuideObject = true; // Mark as guide object
        scene.add(sphere);
    });

    // --- CIRCLES ---
    const ringThickness = 0.001;
    const allCircles = [

        // Wheel and Rim circles
        { size: sizes.W1_size, position: points.T_end, color: 0xffff00 },  // Front wheel
        { size: sizes.R1_size, position: points.T_end, color: 0xffff00 },  // Front rim
        { size: sizes.W2_size, position: points.S_end, color: 0xffff00 },  // Rear wheel
        { size: sizes.R2_size, position: points.S_end, color: 0xffff00 },  // Rear rim

        // Drive system circles
        { size: sizes.D2_size, position: points.B_start, color: 0xcccccc, z: points.Spkt_Center.z},  // Custom z position for sprocket
        { size: sizes.D1_size, position: points.S_end, color: 0xcccccc, z: points.Drv_Center.z}  // Custom z position for driver
    ];

    allCircles.forEach(({ size, position, color, z }) => {
        const geometry = new THREE.RingGeometry(
            size - ringThickness,
            size,
            32
        );
        const circle = new THREE.LineLoop(
            geometry,
            new THREE.LineBasicMaterial({ 
                color,
                depthTest: false
            })
        );
        circle.position.set(
            position.x,
            position.y,
            z !== undefined ? z : position.z
        );
        circle.renderOrder = 999;
        circle.userData.isGuideObject = true; // Mark as guide object
        scene.add(circle);
    });

    // --- LINES ---
    const allLines = [

        // Ground and Gear Tangents
        { start: points.tangentPointA, end: points.tangentPointB, color: 0xffffff },
        { start: points.tangentPointS1, end: points.tangentPointD1, color: 0xffffff },
        { start: points.tangentPointS2, end: points.tangentPointD2, color: 0xffffff },

        // Frame Lines
        { start: points.B_start, end: points.B_end, color: 0x0000ff },     // Seat Tube
        { start: points.B_end, end: points.A_end, color: 0x00ff00 },       // Top Tube
        { start: points.A_end, end: points.F_end, color: 0xff00ff },       // Head Tube
        { start: points.D_end, end: points.F_end, color: 0x00ffff },       // Fork
        { start: points.F_end, end: points.B_start, color: 0xff0000 },     // Bottom Tube
        { start: points.B_start, end: points.S_end, color: 0xabcdef },     // Chainstay Bottom
        { start: points.B_end, end: points.S_end, color: 0x123456 },       // Chainstay Top
        { start: points.D_end, end: points.T_end, color: 0x987654 },       // Dropout
        { start: points.B_end, end: points.Z_end, color: 0x987654 },       // Seat Post
        { start: points.A_end, end: points.P_end, color: 0x987654 },       // Head Tube Stem Connection

        // Stem Lines
        { start: points.headset_Start, end: points.headset_End, color: 0xffa500 },    // Orange
        { start: points.headset_End, end: points.spacer_end, color: 0x800080 },       // Purple
        { start: points.spacer_end, end: points.stem_center, color: 0x008080 },       // Teal
        { start: points.stem_center, end: points.L_end, color: 0x000080 },            // Navy
        { start: points.L_end, end: points.R_end, color: 0x808000 }                   // Olive
        //
    ];

    // Create regular lines with always-on-top rendering
    allLines.forEach(({ start, end, color }) => {
        const line = addLine(start, end, color, scene);
        if (line.material) {
            line.material.depthTest = false;
        }
        line.renderOrder = 999;
        line.userData.isGuideObject = true; // Mark as guide object
    });

    // Handle handlebar lines separately since they need mirroring
    const handlebarLines = [
        addLine(points.barC, points.B_corner, 0xffa07a, scene),           // Light Salmon
        addLine(points.B_corner, points.crossbar_pos, 0x20b2aa, scene),   // Light Sea Green
        addLine(points.Bg_end, points.crossbar_pos, 0xffffff, scene),     // White
        addLine(points.Bw_end, points.Bg_end, 0xffd700, scene),           // Gold
        addLine(points.barH_crossbar, points.crossbar_pos, 0x00ff00, scene)  // Green
    ];

    // Apply always-on-top rendering to handlebar lines
    handlebarLines.forEach(line => {
        if (line.material) {
            line.material.depthTest = false;
        }
        line.renderOrder = 999;
        line.userData.isGuideObject = true; // Mark as guide object
    });

    // Mirror handlebar lines
    mirrorGeometryX(handlebarLines, scene);
    //

    /*/ Front Spokes
    const frontRed = genSpokeSetLines(spokePatterns.front.spokes.red, 0xff0000, points.T_end, totalRotation);
    const frontYellow = genSpokeSetLines(spokePatterns.front.spokes.yellow, 0xffff00, points.T_end, totalRotation);

    // Rear Spokes
    const rearRed = genSpokeSetLines(spokePatterns.rear.spokes.red, 0xff0000, points.S_end, totalRotation);
    const rearYellow = genSpokeSetLines(spokePatterns.rear.spokes.yellow, 0xffff00, points.S_end, totalRotation);

    scene.add(frontRed);
    scene.add(frontYellow);
    scene.add(rearRed);
    scene.add(rearYellow);
    /*/

    // Add fork system visualization
    const forkLines = [
        // Main fork structure
        { start: points.moveD_end, end: points.forkElbow, color: 0x00ffff },
        { start: points.forkElbow, end: points.F_end_fork, color: 0x00ffff },
        { start: points.F_end_fork, end: points.forkBase, color: 0x00ffff }
    ];

    // Create fork lines
    forkLines.forEach(({ start, end, color }) => {
        const line = addLine(start, end, color, scene);
        if (line.material) {
            line.material.depthTest = false;
        }
        line.renderOrder = 999;
        line.userData.isGuideObject = true; // Mark as guide object
        mirrorGeometryX(line, scene);  // Mirror each fork line
    });


    // Add chainstay bottom visualization
    const chainstayBottomLines = [
        { start: points.B_start, end: points.B_startOffset, color: 0x00ffff },
        { start: points.B_startOffset, end: points.chainstayNeck, color: 0x00ffff },
        { start: points.chainstayNeck, end: points.chainstayElbow, color: 0x00ffff },
        { start: points.chainstayElbow, end: points.S_end_stay, color: 0x00ffff }
    ];

    // Create chainstay lines
    chainstayBottomLines.forEach(({ start, end, color }) => {
        const line = addLine(start, end, color, scene);
        if (line.material) {
            line.material.depthTest = false;
        }
        line.renderOrder = 999;
        line.userData.isGuideObject = true; // Mark as guide object
        mirrorGeometryX(line, scene);  // Mirror each chainstay line
    });

    // Add chainstay top visualization
    const chainstayTopLines = [
        { start: points.B_startOffset_T, end: points.chainstayNeck_T, color: 0x00ffff },
        { start: points.chainstayNeck_T, end: points.chainstayElbow_T, color: 0x00ffff },
        { start: points.chainstayElbow_T, end: points.S_end_stay_T, color: 0x00ffff }
    ];

    // Create chainstay lines
    chainstayTopLines.forEach(({ start, end, color }) => {
        const line = addLine(start, end, color, scene);
        if (line.material) {
            line.material.depthTest = false;
        }
        line.renderOrder = 999;
        line.userData.isGuideObject = true; // Mark as guide object
        mirrorGeometryX(line, scene);
    });
    //
    // Create Stem Profile lines
    //const stemGeometry = genStemProfile(geometry.points, Constants.STEM_MEMBERS.stemProfile);
    //scene.add(stemGeometry);

    // Test cube
    const testCube = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            wireframe: true 
        })
    );
    testCube.position.copy(points.Spkt_Center);
    testCube.rotateZ(totalRotation);
    testCube.material.depthTest = false;
    testCube.renderOrder = 999;
    testCube.userData.isGuideObject = true; // Mark as guide object
    scene.add(testCube);

}

// Function to draw point names using CSS2D labels (Houdini-style)
export function drawPointNames(geometry, scene, showPointNames = true) {
    if (!showPointNames) return;
    const { points } = geometry;

    // Define all points we want to label
    const pointsToLabel = [
        // Primary skeleton points
        { point: points.B_start, name: 'B_start' },
        { point: points.B_end, name: 'B_end' },
        { point: points.A_end, name: 'A_end' },
        { point: points.F_end, name: 'F_end' },
        { point: points.S_end, name: 'S_end' },
        { point: points.T_end, name: 'T_end' },
        { point: points.D_end, name: 'D_end' },
        { point: points.Z_end, name: 'Z_end' },
        { point: points.P_end, name: 'P_end' },
        
        // Axle points
        { point: points.frontAxel, name: 'frontAxel' },
        { point: points.midAxel, name: 'midAxel' },
        { point: points.rearAxel, name: 'rearAxel' },
        
        // Drivetrain points
        { point: points.Crnk_Center, name: 'Crnk_Center' },
        { point: points.Crnk_End, name: 'Crnk_End' },
        { point: points.Spkt_Center, name: 'Spkt_Center' },
        { point: points.Drv_Center, name: 'Drv_Center' },
        
        // Stem/handlebar points
        { point: points.stem_center, name: 'stem_center' },
        { point: points.L_end, name: 'L_end' },
        { point: points.R_end, name: 'R_end' },
        
        // Fork points
        { point: points.moveD_end, name: 'moveD_end' },
        { point: points.forkElbow, name: 'forkElbow' },
        { point: points.F_end_fork, name: 'F_end_fork' },
        { point: points.forkBase, name: 'forkBase' },
    ];

    pointsToLabel.forEach(({ point, name }) => {
        if (point) {
            // Create simple HTML label element
            const labelDiv = document.createElement('div');
            labelDiv.textContent = name;
            labelDiv.style.color = '#000';
            labelDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            labelDiv.style.padding = '2px 4px';
            labelDiv.style.fontSize = '11px';
            labelDiv.style.fontFamily = 'monospace';
            labelDiv.style.border = '1px solid #ccc';
            labelDiv.style.borderRadius = '3px';
            labelDiv.style.pointerEvents = 'none';
            labelDiv.style.userSelect = 'none';
            
            // Create CSS2DObject
            const label = new CSS2DObject(labelDiv);
            label.position.set(point.x, point.y, point.z);
            label.userData.isGuideObject = true; // Mark as guide object
            
            scene.add(label);
        }
    });
}
// updated - for skeleton lines only
export function genSpokeSetLines(points, color, attachPoint, rotation) {
    const positions = [];
    points.forEach(spoke => {
        positions.push(spoke.start.x, spoke.start.y, spoke.start.z);
        positions.push(spoke.end.x, spoke.end.y, spoke.end.z);
    });

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const lines = new THREE.LineSegments(
        lineGeometry, 
        new THREE.LineBasicMaterial({ color })
    );
    
    lines.position.copy(attachPoint);
    lines.rotation.z = rotation;

    return lines;
}



