import * as THREE from './three.module.js'; 
import { OrbitControls } from './OrbitControls.js';

// ------------------------------------
// Utility Functions
// ------------------------------------

function degreesToRadians(deg) {
  return deg * (Math.PI / 180);
}

function rotatePoint(pivot, point, angle) {
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  const x = cosAngle * dx - sinAngle * dy + pivot.x;
  const y = sinAngle * dx + cosAngle * dy + pivot.y;
  return new THREE.Vector3(x, y, point.z);
}

function mirrorGeometryX(objects) {

  // Usage examples:
  // Single line:
  // mirrorGeometryX(addLine(point1, point2, 0xff0000));

  // Multiple lines:
  // const lines = [
  //     addLine(pointA1, pointA2, 0xff0000),
  //     addLine(pointB1, pointB2, 0x00ff00)
  // ];
  // mirrorGeometryX(lines);

  // Mix of points and lines:
  // const geometry = [
  //     new THREE.Vector3(0, 1, 1),
  //     addLine(point1, point2, 0xff0000),
  //     meshObject
  // ];
  // mirrorGeometryX(geometry);


  // If single object passed, convert to array
  const geometryArray = Array.isArray(objects) ? objects : [objects];
  
  geometryArray.forEach(obj => {
      if (obj instanceof THREE.Vector3) {
          // Mirror point
          const mirroredPoint = new THREE.Vector3(obj.x, obj.y, -obj.z);
          // Return or use mirroredPoint as needed
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
          addLine(mirroredStart, mirroredEnd, obj.material.color.getHex());
          
      } else if (obj instanceof THREE.Mesh) {
          // For 3D geometry
          const mirroredGeometry = obj.geometry.clone();
          const positions = mirroredGeometry.attributes.position.array;
          
          // Mirror all vertices
          for (let i = 0; i < positions.length; i += 3) {
              positions[i + 2] = -positions[i + 2]; // Flip Z coordinate
          }
          
          // Update geometry
          mirroredGeometry.attributes.position.needsUpdate = true;
          
          // Create new mesh with mirrored geometry
          const mirroredMesh = new THREE.Mesh(
              mirroredGeometry,
              obj.material.clone()
          );
          
          scene.add(mirroredMesh);
      }
  });
}

function mirrorGeometryZ(objects) {
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
          
          addLine(mirroredStart, mirroredEnd, obj.material.color.getHex());
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

// ------------------------------------
// Scene, Camera, Renderer Initialization
// ------------------------------------

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 50;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);


// ------------------------------------
// Parameter Management
// ------------------------------------

const PARAM_IDS = [
  'B_length', 'A_length', 'B_angle', 'D_angle',
  'B_drop', 'F_length', 'H_length', 'S_length',
  'T_length',
  'D2_count', 'D1_count','D_width',
  'Z_length','P_length',
  'HS_BaseHeight','HS_SpacerWidth','HS_SpacerCount','HS_StemCenter','L_length','R_length',
  'F_mode', 'F_const',
  'S_mode', 'S_const',
  'R1_size', 'T1_size', 'R2_size', 'T2_size',
  'B_height', 'B_width', 'Bg_width', 'upsweep','backsweep','B_rotation',
  'frontAxel_Z', 'midAxel_Z', 'rearAxel_Z',
  'BB_BaseHeight', 'BB_SpacerWidth', 'BB_SpacerCount', 'SpktAttachDistance', 'CrankAttachDistance', 'CrankLength', 'CrankOffset'
];

function getParamsFromDOM() {
  return {
    B_length: parseFloat(document.getElementById('B_length').value),
    A_length: parseFloat(document.getElementById('A_length').value),
    B_angle: degreesToRadians(parseFloat(document.getElementById('B_angle').value)),
    H_length: parseFloat(document.getElementById('H_length').value),
    D_angle: degreesToRadians(parseFloat(document.getElementById('D_angle').value)),
    B_drop: parseFloat(document.getElementById('B_drop').value),
    F_length: parseFloat(document.getElementById('F_length').value),
    S_length: parseFloat(document.getElementById('S_length').value),
    T_length: parseFloat(document.getElementById('T_length').value),
    D2_count: parseFloat(document.getElementById('D2_count').value),
    D1_count: parseFloat(document.getElementById('D1_count').value),
    D_width: parseFloat(document.getElementById('D_width').value),
    Z_length: parseFloat(document.getElementById('Z_length').value),
    P_length: parseFloat(document.getElementById('P_length').value),
    HS_BaseHeight: parseFloat(document.getElementById('HS_BaseHeight').value),
    HS_SpacerWidth: parseFloat(document.getElementById('HS_SpacerWidth').value),
    HS_SpacerCount: parseFloat(document.getElementById('HS_SpacerCount').value),
    HS_StemCenter: parseFloat(document.getElementById('HS_StemCenter').value),
    L_length: parseFloat(document.getElementById('L_length').value),
    R_length: parseFloat(document.getElementById('R_length').value),
    F_mode: parseFloat(document.getElementById('F_mode').value),
    F_const: parseFloat(document.getElementById('F_const').value),
    S_mode: parseFloat(document.getElementById('S_mode').value),
    S_const: parseFloat(document.getElementById('S_const').value),
    R1_size: parseFloat(document.getElementById('R1_size').value),
    R2_size: parseFloat(document.getElementById('R2_size').value),
    T1_size: parseFloat(document.getElementById('T1_size').value),
    T2_size: parseFloat(document.getElementById('T2_size').value),
    B_height: parseFloat(document.getElementById('B_height').value),
    B_width: parseFloat(document.getElementById('B_width').value),
    Bg_width: parseFloat(document.getElementById('Bg_width').value),
    upsweep: parseFloat(document.getElementById('upsweep').value),
    backsweep: parseFloat(document.getElementById('backsweep').value),
    B_rotation: parseFloat(document.getElementById('B_rotation').value),
    frontAxel_Z: parseFloat(document.getElementById('frontAxel_Z').value),
    midAxel_Z: parseFloat(document.getElementById('midAxel_Z').value),
    rearAxel_Z: parseFloat(document.getElementById('rearAxel_Z').value),
    BB_BaseHeight: parseFloat(document.getElementById('BB_BaseHeight').value),
    BB_SpacerWidth: parseFloat(document.getElementById('BB_SpacerWidth').value),
    BB_SpacerCount: parseFloat(document.getElementById('BB_SpacerCount').value),
    SpktAttachDistance: parseFloat(document.getElementById('SpktAttachDistance').value),
    CrankAttachDistance: parseFloat(document.getElementById('CrankAttachDistance').value),
    CrankLength: parseFloat(document.getElementById('CrankLength').value),
    CrankOffset: parseFloat(document.getElementById('CrankOffset').value),

  };
}

function updateParameters() {
  const params = getParamsFromDOM();
  console.log(params); // Useful for debugging
  return params;
}

// ------------------------------------
// FRAME MEMBERS
// ------------------------------------

const FRAME_MEMBERS = {
  topTube: {
      name: 'topTube',
      type: 'tube',
      pointRefs: {
          start: 'B_end',
          end: 'A_end'
      },
      params: {
          diameter: 1.1  // We can update this with actual params later
      }
  },
  downTube: {
      name: 'downTube',
      type: 'tube',
      pointRefs: {
          start: 'B_start',
          end: 'F_end'
      },
      params: {
          diameter: 1.2
      }
  },
  seatTube: {
      name: 'seatTube',
      type: 'tube',
      pointRefs: {
          start: 'B_start',
          end: 'B_end'
      },
      params: {
          diameter: 1.0
      }
  },
  headTube: {
      name: 'headTube',
      type: 'tube',
      pointRefs: {
          start: 'F_end',
          end: 'A_end'
      },
      params: {
          diameter: 1.2
      }
  }
};

// ------------------------------------
// GEOMETRY CALCULATIONS
// ------------------------------------

function calculatePrimarySkeleton(params) {

  // ------------------------------------
  // PRE CALCULATIONS
  // ------------------------------------

  // Sproket and Driver D2 & D1 Size Calculate by Tooth Count
  const D2_size = (params.D_width * params.D2_count) / (Math.PI * 2);
  const D1_size = (params.D_width * params.D1_count) / (Math.PI * 2);

  // Rim and Tire Size to Calculate Wheel Size
  const W1_size = params.R1_size + params.T1_size;
  const W2_size = params.R2_size + params.T2_size;

  // Contrain Options Based on Wheel Sizes
  let comp_F = params.F_length;
  if (params.F_mode === 1) {
      comp_F = W1_size + params.F_const;
  }

  let comp_S = params.S_length;
  if (params.S_mode === 1) {
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
      Object.entries(FRAME_MEMBERS).map(([key, member]) => {
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
          D1_size,
          D2_size,
          W1_size,
          W2_size
      },
      frameMembers
  };
}

function calculateAxelPoints(params, primarySkeleton) {
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

function calculateDrivetrainSystem(params, attachPoint) {
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

function calculateGearSystem(params, points) {
  // Calculate gear sizes
  const D2_size = (params.D_width * params.D2_count) / (Math.PI * 2);  // Sprocket
  const D1_size = (params.D_width * params.D1_count) / (Math.PI * 2);  // Driver

  const { B_start, S_end, Spkt_Center, rearAxel } = points;

  // Calculate in XY plane first
  const dSquared1 = Math.pow(B_start.x - S_end.x, 2) + 
                    Math.pow(B_start.y - S_end.y, 2);
  const d1 = Math.sqrt(dSquared1);
  const theta1 = -Math.atan2(B_start.y - S_end.y, B_start.x - S_end.x);
  const alpha1 = Math.asin((D2_size - D1_size) / d1);

  // Create tangent points with Z positions
  const tangentPointS1 = new THREE.Vector3(
      B_start.x - D2_size * Math.sin(theta1 + alpha1),
      B_start.y - D2_size * Math.cos(theta1 + alpha1),
      Spkt_Center.z  // Use Spkt_Center Z position
  );

  const tangentPointD1 = new THREE.Vector3(
      S_end.x - D1_size * Math.sin(theta1 + alpha1),
      S_end.y - D1_size * Math.cos(theta1 + alpha1),
      rearAxel.z  // Use rearAxel Z position
  );

  // Bottom tangent points
  const theta2 = theta1;  // Same angle as top
  const alpha2 = alpha1;  // Same angle as top

  const tangentPointS2 = new THREE.Vector3(
      B_start.x + D2_size * Math.sin(theta2 - alpha2),
      B_start.y + D2_size * Math.cos(theta2 - alpha2),
      Spkt_Center.z
  );

  const tangentPointD2 = new THREE.Vector3(
      S_end.x + D1_size * Math.sin(theta2 - alpha2),
      S_end.y + D1_size * Math.cos(theta2 - alpha2),
      rearAxel.z
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

function levelWheelbase(skeleton) {
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
      'tangentPointS1', 'tangentPointD1', 'tangentPointS2', 'tangentPointD2'
  ];
  
  pointsToRotate.forEach(pointName => {
      points[pointName] = rotatePoint(points.S_end, points[pointName], angleToRotate);
  });

  return skeleton;
}

function levelWheelTangent(skeleton) {
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
    'Spkt_Center', 'Crnk_Center','Crnk_End',
    'tangentPointS1', 'tangentPointD1', 'tangentPointS2', 'tangentPointD2'
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

  return skeleton;
}

function calculateStemSystem(params, attachPoint, F_end, P_end) {
  // Calculate all points at origin first
  const headset_Start = new THREE.Vector3(0, 0, 0);
  const headset_End = new THREE.Vector3(0, params.HS_BaseHeight, 0);
  
  // Spacer calculations
  const spacer_distance = params.HS_SpacerCount * params.HS_SpacerWidth;
  const spacer_end = new THREE.Vector3(0, headset_End.y + spacer_distance, 0);
  
  // Stem center
  const stem_center = new THREE.Vector3(0, spacer_end.y + params.HS_StemCenter, 0);
  
  // L_end
  const direction_LB_90 = new THREE.Vector3(-1, 0, 0);
  const L_end = new THREE.Vector3().copy(stem_center).add(
      direction_LB_90.multiplyScalar(params.L_length)
  );
  
  // R_end
  const direction_R_90 = new THREE.Vector3(0, 1, 0);
  const R_end = new THREE.Vector3().copy(L_end).sub(
      direction_R_90.multiplyScalar(params.R_length)
  );

  // Calculate orientation angle based on F_end to P_end
  const stemVector = new THREE.Vector3().subVectors(F_end, P_end).normalize();
  const angleToRotate = Math.atan2(stemVector.y, stemVector.x) + Math.PI / 2;
  
  // Create rotation matrix
  const rotationMatrix = new THREE.Matrix4().makeRotationZ(angleToRotate);

  // Points to rotate and translate
  const stemPoints = [
      headset_Start, headset_End, spacer_end,
      stem_center, L_end, R_end
  ];

  // Apply rotation
  stemPoints.forEach(point => point.applyMatrix4(rotationMatrix));

  // Apply translation to attach point
  const translationVector = new THREE.Vector3().copy(attachPoint);
  stemPoints.forEach(point => point.add(translationVector));

  // Return points with descriptive names
  return {
      headset_Start: stemPoints[0],
      headset_End: stemPoints[1],
      spacer_end: stemPoints[2],
      stem_center: stemPoints[3],
      L_end: stemPoints[4],
      R_end: stemPoints[5]
  };
}

function calculateGeometry(params) {

  const primarySkeleton = calculatePrimarySkeleton(params);
  
  const axelSkeleton = calculateAxelPoints(params, primarySkeleton);
  
  // Calculate drivetrain points
  const drivetrainPoints = calculateDrivetrainSystem(params, axelSkeleton.points.midAxel);
  
  // Combine all points
  const combinedPoints = {
      ...axelSkeleton.points,
      ...drivetrainPoints
  };
  

  // Calculate gear system
  const gearSystem = calculateGearSystem(params, combinedPoints);

  // Add gear points to combined points
  const allPoints = {
    ...combinedPoints,
    ...gearSystem.points
  };


  // Update skeleton with all points
  const fullSkeleton = {
    ...axelSkeleton,
    points: allPoints,
    sizes: {
        ...primarySkeleton.sizes,
        ...gearSystem.sizes
    }
  };
  
  const leveledPrimary = levelWheelbase(fullSkeleton);
  const leveledGeometry = levelWheelTangent(leveledPrimary);

  // Extract all points
  const {
      B_start, B_end, A_end, D_end, F_end, T_end, S_end, Z_end, P_end,
      frontAxel, midAxel, rearAxel,
      tangentPointA, tangentPointB,
      BB_headsetStart, BB_headsetEnd, BB_SpacerEnd,
      Spkt_Center, Crnk_Center, Crnk_End,
      tangentPointS1, tangentPointD1, tangentPointS2, tangentPointD2
  } = leveledGeometry.points;


  // Create frame members with final transformed points
  const finalFrameMembers = Object.fromEntries(
      Object.entries(FRAME_MEMBERS).map(([key, member]) => {
          return [key, {
              ...member,
              points: {
                  start: leveledGeometry.points[member.pointRefs.start],
                  end: leveledGeometry.points[member.pointRefs.end]
              }
          }];
      })
  );


  // ------------------------------------
  // GEO BUILD
  // ------------------------------------

  // Generate Tube geometry using final points
  const topTube = generateTubeGeometry(finalFrameMembers.topTube);
  scene.add(topTube);

  const seatTube = generateTubeGeometry(finalFrameMembers.seatTube);
  scene.add(seatTube);

  const downTube = generateTubeGeometry(finalFrameMembers.downTube);
  scene.add(downTube);

  const headTube = generateTubeGeometry(finalFrameMembers.headTube);
  scene.add(headTube);

  // Visualize axel points
  const dotGeometry = new THREE.SphereGeometry(0.1, 32, 32);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  const frontAxelSphere = new THREE.Mesh(dotGeometry, dotMaterial);
  frontAxelSphere.position.copy(frontAxel);
  scene.add(frontAxelSphere);

  const midAxelSphere = new THREE.Mesh(dotGeometry, dotMaterial);
  midAxelSphere.position.copy(midAxel);
  scene.add(midAxelSphere);

  const rearAxelSphere = new THREE.Mesh(dotGeometry, dotMaterial);
  rearAxelSphere.position.copy(rearAxel);
  scene.add(rearAxelSphere);

  // Visualize Drivetrain points
  const drivetrainDots = [
      { point: BB_headsetStart, color: 0xff0000 },
      { point: BB_headsetEnd, color: 0x00ff00 },
      { point: BB_SpacerEnd, color: 0x0000ff },
      { point: Spkt_Center, color: 0xff00ff },
      { point: Crnk_Center, color: 0xffff00 },
      { point: Crnk_End, color: 0xffff00 }
  ];

  drivetrainDots.forEach(({ point, color }) => {
      const dotMaterial = new THREE.MeshBasicMaterial({ color });
      const sphere = new THREE.Mesh(dotGeometry, dotMaterial);
      sphere.position.copy(point);
      scene.add(sphere);
  });

  // Sprocket Circle
  const sprocketRingGeometry = new THREE.RingGeometry(
    gearSystem.sizes.D2_size - 0.001,
    gearSystem.sizes.D2_size,
    32
  );
  const sprocketMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc });
  const sprocketCircle = new THREE.LineLoop(sprocketRingGeometry, sprocketMaterial);
  sprocketCircle.position.set(B_start.x, B_start.y, Spkt_Center.z);
  scene.add(sprocketCircle);

  // Driver Circle
  const driverRingGeometry = new THREE.RingGeometry(
      gearSystem.sizes.D1_size - 0.001,
      gearSystem.sizes.D1_size,
      32
  );
  const driverMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc });
  const driverCircle = new THREE.LineLoop(driverRingGeometry, driverMaterial);
  driverCircle.position.set(S_end.x, S_end.y, rearAxel.z);
  scene.add(driverCircle);

  // Gear Tangent Lines
  addLine(tangentPointS1, tangentPointD1, 0xffffff);  // Top tangent
  addLine(tangentPointS2, tangentPointD2, 0xffffff);  // Bottom tangent


  // Create test cube with tracked rotations
  const totalRotation = leveledGeometry.rotations.wheelbase + 
                      leveledGeometry.rotations.wheelTangent;
  
  const testCube = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),  // Made smaller for better visibility
    new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        wireframe: true 
    })
  );
  
  testCube.position.copy(Spkt_Center);
  testCube.rotateZ(totalRotation);
  scene.add(testCube);





  // ------------------------------------
  // SECONDARY CALCULATIONS
  // ------------------------------------




  // ------------------------------------
  // STEM CALCULATIONS
  // ------------------------------------
  
  // Declare main components & attributes
  const headset_Start = new THREE.Vector3(0, 0, 0);

  const HS_Base = params.HS_BaseHeight;
  const headset_End = new THREE.Vector3(0, HS_Base, 0);

  // Calculate Spacer attributes & end position
  const HS_SpacerWidth = params.HS_SpacerWidth;
  const HS_SpacerCount = params.HS_SpacerCount;

  const direction_HS = new THREE.Vector3(0, 1, 0); //new THREE.Vector3().subVectors(headset_End, headset_Start).normalize();
  const spacer_distance = HS_SpacerCount * HS_SpacerWidth;// + 0.0001;
  const spacer_end = new THREE.Vector3().copy(headset_End).add(direction_HS.multiplyScalar(spacer_distance));

  // Calculate Stem Center
  const direction_HS_original = new THREE.Vector3(0, 1, 0); // Create a fresh copy of the original direction vector
  const HS_StemCenter = params.HS_StemCenter;
  const stem_center = new THREE.Vector3().copy(spacer_end).add(direction_HS_original.clone().multiplyScalar(HS_StemCenter));

  // Calculate L_end
  const direction_LB_90 = new THREE.Vector3(-1, 0, 0); // new THREE.Vector3(direction_HS.z, direction_HS.x, direction_HS.y);
  const L_length = params.L_length;
  const L_end = new THREE.Vector3().copy(stem_center).add(direction_LB_90.multiplyScalar(L_length));

  // Calculate R_end
  const direction_R_90 = new THREE.Vector3(0, 1, 0); // new THREE.Vector3(direction_LB_90.x, direction_LB_90.z, direction_LB_90.y);
  const R_length = params.R_length;
  const R_end = new THREE.Vector3().copy(L_end).sub(direction_R_90.multiplyScalar(R_length));
//

  // ------------------------------------
  // ATTACH STEM TO FRAME
  // ------------------------------------

  // Calculate the angle between P_end and F_end
  const pEndToFEndVector = new THREE.Vector3().subVectors(F_end, P_end).normalize();
  const angleToRotateStem = Math.atan2(pEndToFEndVector.y, pEndToFEndVector.x) + Math.PI / 2;

  // Create a rotation matrix
  const rotationMatrix = new THREE.Matrix4().makeRotationZ(angleToRotateStem);

  // Apply the rotation to the stem geometry
  headset_Start.applyMatrix4(rotationMatrix);
  headset_End.applyMatrix4(rotationMatrix);
  spacer_end.applyMatrix4(rotationMatrix);
  stem_center.applyMatrix4(rotationMatrix);
  L_end.applyMatrix4(rotationMatrix);
  R_end.applyMatrix4(rotationMatrix);

  // Calculate the translation vector
  const translationVector = new THREE.Vector3().copy(P_end).sub(headset_Start);

  // Apply the translation to the stem geometry
  headset_Start.add(translationVector);
  headset_End.add(translationVector);
  spacer_end.add(translationVector);
  stem_center.add(translationVector);
  L_end.add(translationVector);
  R_end.add(translationVector);


  // ------------------------------------
  // HANDLEBAR CALCULATION
  // ------------------------------------
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
  // Change 90° rotation to work in YZ plane instead of XY
  const direction_BW_90 = new THREE.Vector3(direction_BW.z, -direction_BW.x, direction_BW.y);
  let Bw_end = barH.clone().add(direction_BW_90.multiplyScalar(barWidth));

  // Calculate Grip End
  const direction_Bg = barH.clone().sub(Bw_end).normalize();
  const adjustedGripWidth = barWidth <= threshold ? 0 : Math.min(gripWidth, Bw_end.z); 
  let Bg_end = Bw_end.clone().add(direction_Bg.multiplyScalar(adjustedGripWidth));

  // Calculate Rotation Matrices for Upsweep and Backsweep
  const upsweepAngle = params.upsweep * (Math.PI / 180) *-1;
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

  barC.applyMatrix4(rotZ);
  barH.applyMatrix4(rotZ);
  Bw_end.applyMatrix4(rotZ);
  Bg_end.applyMatrix4(rotZ);
  B_corner.applyMatrix4(rotZ);
  crossbar_pos.applyMatrix4(rotZ);
  barH_crossbar.applyMatrix4(rotZ);



  // ------------------------------------
  // ATTACH HANDLEBAR TO STEM
  // ------------------------------------

  // Calculate the stem's orientation based on direction vector from F_end to P_end
  const stemDirection = new THREE.Vector3().subVectors(F_end, P_end).normalize();
  const angleToRotateBars = Math.atan2(stemDirection.y, stemDirection.x) + Math.PI / 2;


  // Create rotation matrix for aligning bars with stem
  const alignmentMatrix = new THREE.Matrix4().makeRotationZ(angleToRotateBars);

  // Apply alignment rotation to all bar points BEFORE translation
  barC.applyMatrix4(alignmentMatrix);
  barH.applyMatrix4(alignmentMatrix);
  Bw_end.applyMatrix4(alignmentMatrix);
  Bg_end.applyMatrix4(alignmentMatrix);
  B_corner.applyMatrix4(alignmentMatrix);
  crossbar_pos.applyMatrix4(alignmentMatrix);
  barH_crossbar.applyMatrix4(alignmentMatrix);

  // Calculate the translation vector from origin to R_end
  const translationVector_stem = new THREE.Vector3().copy(R_end);

  // Translate all points
  barC.add(translationVector_stem);
  barH.add(translationVector_stem);
  Bw_end.add(translationVector_stem);
  Bg_end.add(translationVector_stem);
  B_corner.add(translationVector_stem);
  crossbar_pos.add(translationVector_stem);
  barH_crossbar.add(translationVector_stem);

  // All the drawing code remains the same...



  // ------------------------------------
  // RETURN CALCULATED POINTS
  // ------------------------------------

  return {
    D1_size: leveledGeometry.sizes.D1_size,
    D2_size: leveledGeometry.sizes.D2_size,
    W1_size: leveledGeometry.sizes.W1_size,
    W2_size: leveledGeometry.sizes.W2_size,
    R1_size: params.R1_size,
    R2_size: params.R2_size,
    params,
    points: {
      points: leveledGeometry.points,
      B_start,
      B_end,
      A_end,
      D_end,
      F_end,
      T_end,
      S_end,
      frontAxel,
      midAxel,
      rearAxel,
      tangentPointA,
      tangentPointB,
      tangentPointD1,
      tangentPointS1,
      tangentPointD2,
      tangentPointS2,
      Z_end,
      P_end,
      headset_Start: headset_Start,
      headset_End: headset_End,
      spacer_end: spacer_end,
      stem_center: stem_center,
      L_end: L_end,
      R_end: R_end,
      barC: barC,           // Updated to barC
      barH: barH,           // Updated to barH
      Bw_end: Bw_end,       // Added Bw_end
      Bg_end: Bg_end,       // Added Bg_end
      B_corner: B_corner,   // Added B_corner
      crossbar_pos: crossbar_pos, // Added crossbar_pos
      barH_crossbar,

    },
      frameMembers: finalFrameMembers,
      geometry: {
        topTube
    }

  };
}


// ------------------------------------
// Drawing / Rendering Functions
// ------------------------------------

function addLine(v1, v2, color) {
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

function drawCircles(T_end, S_end, W1_size, R1_size, W2_size, R2_size) {
  const ringThickness = 0.001; 
  const W1_geometry = new THREE.RingGeometry(W1_size - ringThickness, W1_size, 32);
  const W1_material = new THREE.LineBasicMaterial({ color: 0xffff00 }); 
  const W1_circle = new THREE.LineLoop(W1_geometry, W1_material);
  W1_circle.position.set(T_end.x, T_end.y, T_end.z);
  scene.add(W1_circle);

  const R1_geometry = new THREE.RingGeometry(R1_size - ringThickness, R1_size, 32);
  const R1_material = new THREE.LineBasicMaterial({ color: 0xffff00 }); 
  const R1_circle = new THREE.LineLoop(R1_geometry, R1_material);
  R1_circle.position.set(T_end.x, T_end.y, T_end.z);
  scene.add(R1_circle);

  const R2_geometry = new THREE.RingGeometry(R2_size - ringThickness, R2_size, 32);
  const R2_material = new THREE.LineBasicMaterial({ color: 0xffff00 }); 
  const R2_circle = new THREE.LineLoop(R2_geometry, R2_material);
  R2_circle.position.set(S_end.x, S_end.y, S_end.z);
  scene.add(R2_circle);

  const W2_geometry = new THREE.RingGeometry(W2_size - ringThickness, W2_size, 32);
  const W2_material = new THREE.LineBasicMaterial({ color: 0xffff00 }); 
  const W2_circle = new THREE.LineLoop(W2_geometry, W2_material);
  W2_circle.position.set(S_end.x, S_end.y, S_end.z);
  scene.add(W2_circle);
}


function drawSpheres(T_end, S_end) {
  const dotGeometry = new THREE.SphereGeometry(0.1, 32, 32);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

  const sphere1 = new THREE.Mesh(dotGeometry, dotMaterial);
  sphere1.position.set(T_end.x, T_end.y, T_end.z);
  scene.add(sphere1);

  const sphere2 = new THREE.Mesh(dotGeometry, dotMaterial);
  sphere2.position.set(S_end.x, S_end.y, 0);
  scene.add(sphere2);
}

function drawGeometry(geometry) {
  const { params, points, W1_size, R1_size, W2_size, R2_size } = geometry;
  const {
    B_start, B_end, A_end, D_end, F_end, T_end, S_end,
    tangentPointA, tangentPointB,
    Z_end, P_end, 
    headset_Start, headset_End, spacer_end, stem_center, L_end, R_end,
    barC, barH, Bw_end, Bg_end, B_corner, crossbar_pos, barH_crossbar
  } = points;

  // Ground Wheelbase Tangent line
  addLine(tangentPointA, tangentPointB, 0xffffff);



  // Wheels (W1 & W2)
  drawCircles(T_end, S_end, W1_size, R1_size, W2_size, R2_size);


  // Spheres
  drawSpheres(T_end, S_end);

  // Frame lines (initial skeleton lines)
  addLine(B_start, B_end, 0x0000ff); // Seat Tube --- B_length
  addLine(B_end, A_end, 0x00ff00); // Top Tube --- A_length
  addLine(A_end, F_end, 0xff00ff); // Head Tube --- D_length
  addLine(D_end, F_end, 0x00ffff); // Fork --- F_length
  addLine(F_end, B_start, 0xff0000); // Bottom Tube --- NULL
  addLine(B_start, S_end, 0xabcdef); // Chainstay Bottom --- S_length
  addLine(B_end, S_end, 0x123456); // Chainstay Top --- NULL
  addLine(D_end, T_end, 0x987654); // Dropout --- T_length
  addLine(B_end, Z_end, 0x987654); // Seat Post --- Z_length
  addLine(A_end, P_end, 0x987654); // Head Tube Stem Connection --- P_length

  // Stem Lines
  addLine(headset_Start, headset_End, 0xffa500); // Orange // Headset C to Headset B
  addLine(headset_End, spacer_end, 0x800080); // Purple // Headset B to Spacer End
  addLine(spacer_end, stem_center, 0x008080); // Teal // Spacer End to Stem Center
  addLine(stem_center, L_end, 0x000080); // Navy // Stem Center to L_end
  addLine(L_end, R_end, 0x808000); // Olive // L_end to R_end


  
  // Handlebar lines
  const handlebarLines = [];

  handlebarLines.push(addLine(barC, B_corner, 0xffa07a)); // Light Salmon
  handlebarLines.push(addLine(B_corner, crossbar_pos, 0x20b2aa)); // Light Sea Green
  handlebarLines.push(addLine(Bg_end, crossbar_pos, 0xffffff)); // White
  handlebarLines.push(addLine(Bw_end, Bg_end, 0xffd700)); // Gold
  //handlebarLines.push(addLine(barH, Bg_end, 0x9370db)); // Medium Purple
  handlebarLines.push(addLine(barH_crossbar, crossbar_pos, 0x00ff00)); // Green

  // Mirror all Handlebar lines
  mirrorGeometryX(handlebarLines);

}



function generateTubeGeometry(frameMember) {
  const { points, params } = frameMember;
  const { start, end } = points;
  
  // Calculate direction and length
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  
  // Create basic geometry
  const tubeRadius = params.diameter / 2;
  const radialSegments = 8;
  const geometry = new THREE.CylinderGeometry(
      tubeRadius,
      tubeRadius,
      length,
      radialSegments
  );
  
  // Create mesh
  const material = new THREE.MeshBasicMaterial({ color: 0x808080 });
  const tube = new THREE.Mesh(geometry, material);
  
  // 1. First position the center of the tube at the midpoint
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  tube.position.copy(midpoint);
  
  // 2. Create rotation quaternion from up vector to direction
  const upVector = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(upVector, direction.normalize());
  
  // 3. Apply rotation
  tube.setRotationFromQuaternion(quaternion);
  
  return tube;
}


// ------------------------------------
// Scene Management
// ------------------------------------

function clearScene() {
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
}

function addGroundPlane() {
  const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
  const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x131313, side: THREE.DoubleSide });
  const ground = new THREE.Mesh(planeGeometry, planeMaterial);
  ground.rotation.x = Math.PI / 2;
  scene.add(ground);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 2, 4);
  scene.add(light);
}
// Update (Redraw) on parameter changes
function updateLines() {
  const params = updateParameters();

  clearScene();
  addGroundPlane();

  const geometry = calculateGeometry(params);
  drawGeometry(geometry);
}


// ------------------------------------
// Initialization
// ------------------------------------

PARAM_IDS.forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', updateLines);
});

// Initial Draw
updateLines();

// ------------------------------------
// Animation Loop
// ------------------------------------

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();


/*/ 
NOTES & TODO

PRIORITY

  Wheel Tangent Structure Rotation

  attach geo to point and orient function

  apply axel calc
  driver calc > update gearing calc
  spoke calc
  format calcs
  format drawing
  output groups / name pieces
  clean variable names
  clean annotations

Reusable functions

  Mirror X
  Mirror Z
  Attach Geo to Point and Orient to Vector


CLEAN UP & FUTURE PROOF

  parameter names and variables
  breakdown calculation geo
  breakdown drawing lines
  Name Primary Pieces / output line groups
  Annotations

REMAINING CALC

  CALC Axel Points
  CALC Drivetrain
  CALC Spoke Sys




/// Z DEPTH GEO PREP ///

Fork Skeleton
Chainstay Skeleton






/*/
