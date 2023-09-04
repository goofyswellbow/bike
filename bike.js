import * as THREE from './three.module.js'; 
import { OrbitControls } from './OrbitControls.js';

// Initialize scene, camera, renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

initializeScene();



function initializeScene() {
  camera.position.z = 50;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Inputs to be monitored for changes
  const inputsToUpdate = [
    'B_length', 'A_length', 'B_angle', 'D_angle',
    'B_drop', 'F_length', 'H_length', 'S_length', 'T_length', 'W1_size', 'W2_size'
  ];

  for (let input of inputsToUpdate) {
    document.getElementById(input).addEventListener('input', updateLines);
  }

  updateLines();
  
}

const controls = new OrbitControls(camera, renderer.domElement);





// This function retrieves and updates all parameters
function updateParameters() {
  const B_angle_degrees = parseFloat(document.getElementById('B_angle').value);
  const D_angle_degrees = parseFloat(document.getElementById('D_angle').value);
  const params = {
      B_length: parseFloat(document.getElementById('B_length').value),
      A_length: parseFloat(document.getElementById('A_length').value),
      B_angle: B_angle_degrees * (Math.PI / 180),
      H_length: parseFloat(document.getElementById('H_length').value), 
      D_angle: D_angle_degrees * (Math.PI / 180),
      B_drop: parseFloat(document.getElementById('B_drop').value),
      F_length: parseFloat(document.getElementById('F_length').value), 
      S_length: parseFloat(document.getElementById('S_length').value),
      T_length: parseFloat(document.getElementById('T_length').value),
      W1_size: parseFloat(document.getElementById('W1_size').value),
      W2_size: parseFloat(document.getElementById('W2_size').value), 
  };
  console.log(params);
  return params;
}

// This function creates a line using two vectors and a color
function addLine(v1, v2, color) {
  if (isNaN(v1.x) || isNaN(v1.y) || isNaN(v1.z) || isNaN(v2.x) || isNaN(v2.y) || isNaN(v2.z)) {
    console.error('NaN detected in vectors:', v1, v2, 'Called from:', new Error().stack);
    return;
  }
  const points = [];
  points.push(v1);
  points.push(v2);

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
}

// This function CALCULATES the geometry
function calculateGeometry(params) {

  // Hypotenuse value (c) and A_end_Y calculation
  const c = parseFloat(params.F_length) + parseFloat(params.H_length); // convert F_length to a number and add 5
  const A_end_Y = c * Math.cos(params.D_angle); // a = c * cos(β)

  // Calculate B's start and end positions
  const B_start = new THREE.Vector3(0, params.B_drop, 0); // Start of B is translated downward by B_drop
  const B_end = new THREE.Vector3(
    params.B_length * Math.sin(params.B_angle),
    params.B_length * Math.cos(params.B_angle) + params.B_drop, // End of B is translated downward by B_drop
    0
  );

  // Calculate S's position
  const S_angle = Math.acos(B_start.y / params.S_length);
  const S_end = new THREE.Vector3(
    B_start.x + params.S_length * Math.sin(S_angle),
    0,
    0
  );

  // Calculate A's positions
  const A_angle = Math.acos((A_end_Y - B_end.y) / params.A_length);
  const A_end = new THREE.Vector3(
    B_end.x - params.A_length * Math.sin(A_angle),
    A_end_Y,
    0
  );

  // Calculate D's position
  const D_length = 1
  const D_end = new THREE.Vector3(
    A_end.x + D_length * Math.sin(params.D_angle),
    A_end.y - D_length * Math.cos(params.D_angle),
    0
  );

  // Extended x value of line D where it intersects y = 0
  const xInterceptD = D_end.x - D_end.y * (D_end.x - A_end.x) / (D_end.y - A_end.y);

  // Update D's endpoint to the xInterceptD
  D_end.x = xInterceptD;
  D_end.y = 0;

  // Calculate F's endpoint
  const F_end = new THREE.Vector3(
    D_end.x - params.F_length * Math.sin(params.D_angle),
    D_end.y + params.F_length * Math.cos(params.D_angle),
    0
  );
  
  // Calculate T's direction, which is perpendicular to D
  const T_angle = params.D_angle + Math.PI;

  // Calculate T's end position
  const T_end = new THREE.Vector3(
    D_end.x + params.T_length * Math.cos(T_angle),
    D_end.y + params.T_length * Math.sin(T_angle),
    0
  );

  // Calculate the angle required to make T_end align with the X-axis
  const angleToRotate = -Math.atan2(T_end.y - S_end.y, T_end.x - S_end.x) + Math.PI;

  // Function to rotate a point around another point by a given angle
  function rotatePoint(pivot, point, angle) {
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const dx = point.x - pivot.x;
    const dy = point.y - pivot.y;
    const x = cosAngle * dx - sinAngle * dy + pivot.x;
    const y = sinAngle * dx + cosAngle * dy + pivot.y;
    return new THREE.Vector3(x, y, point.z);
  }

  // Rotate all points around S_end by the calculated angle
  const pointsToRotate = [B_start, B_end, A_end, D_end, F_end, T_end];
  for (let i = 0; i < pointsToRotate.length; i++) {
    pointsToRotate[i].copy(rotatePoint(S_end, pointsToRotate[i], angleToRotate));
  }

  // Calculate bottom direct common tangent of W1 and W2
  const dSquared = Math.pow(S_end.x - T_end.x, 2) + Math.pow(S_end.y - T_end.y, 2);
  const d = Math.sqrt(dSquared);
  
  const theta = -Math.atan2(S_end.y - T_end.y, S_end.x - T_end.x);
  const alpha = Math.asin((params.W2_size - params.W1_size) / d);
  
  const tangentAx = T_end.x - params.W1_size * Math.sin(theta + alpha);
  const tangentAy = T_end.y - params.W1_size * Math.cos(theta + alpha);
  
  const tangentPointA = new THREE.Vector3(tangentAx, tangentAy, 0);
  
  const tangentBx = S_end.x - params.W2_size * Math.sin(theta + alpha);
  const tangentBy = S_end.y - params.W2_size * Math.cos(theta + alpha);

  const tangentPointB = new THREE.Vector3(tangentBx, tangentBy, 0);

  // Calculate angle of the tangent line with respect to the X-axis
  const tangentAngle = Math.atan2(tangentPointB.y - tangentPointA.y, tangentPointB.x - tangentPointA.x);

  // We want the tangent line to be parallel to X-axis. So, our desired rotation is -tangentAngle
  const rotationAngle = -tangentAngle;

  // Calculate the midpoint of the tangent line
  const tangentMidpoint = new THREE.Vector3(
    (tangentPointA.x + tangentPointB.x) / 2,
    (tangentPointA.y + tangentPointB.y) / 2,
    0
  );

  // Rotate all objects around the tangentMidpoint
  const allPoints = [B_start, B_end, A_end, D_end, F_end, T_end, S_end, tangentPointA, tangentPointB];
  for (let i = 0; i < allPoints.length; i++) {
    allPoints[i].copy(rotatePoint(tangentMidpoint, allPoints[i], rotationAngle));
  }

  // Determine the y-offset required to move the tangent line to the ground plane
  const yOffset = tangentMidpoint.y;

  // Translate every point by this y-offset
  for (let point of allPoints) {
    point.y -= yOffset;
  }

  return {
    B_start, B_end, A_end, D_end, F_end, T_end, S_end,
    tangentPointA, tangentPointB,
    params // Pass the params object as well for further use in the drawing function.
  };
}

// This function RENDERS the geometry
function drawGeometry(geometry) {
  // Get updated parameters
  const {
    B_start, B_end, A_end, D_end, F_end, T_end, S_end,
    tangentPointA, tangentPointB,
    params
  } = geometry;
  

  // Draw the tangent line
  addLine(tangentPointA, tangentPointB, 0xffffff); // White color for the tangent
  
  // Create a ring geometry for W1
  const ringThickness = 0.001; // adjust this value as necessary
  const circleGeometry = new THREE.RingBufferGeometry(params.W1_size - ringThickness, params.W1_size, 32);
  const circleMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 }); 
  const circleLine = new THREE.LineLoop(circleGeometry, circleMaterial);
  circleLine.position.set(T_end.x, T_end.y, T_end.z);
  scene.add(circleLine);


  // Create a ring geometry for W2
  const circleGeometry2 = new THREE.RingBufferGeometry(params.W2_size - ringThickness, params.W2_size, 32);
  const circleMaterial2 = new THREE.LineBasicMaterial({ color: 0xffff00 }); 
  const circleLine2 = new THREE.LineLoop(circleGeometry2, circleMaterial2);
  circleLine2.position.set(S_end.x, S_end.y, S_end.z);
  scene.add(circleLine2);


  // Create a small sphere geometry to represent the point
  const dotGeometry = new THREE.SphereGeometry(0.1, 32, 32); // Increase radius to make it more visible
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); 
  const sphere = new THREE.Mesh(dotGeometry, material);
  const sphere2 = new THREE.Mesh(dotGeometry, material);
  // Set the position of the sphere to the intersection point
  sphere.position.set(T_end.x, T_end.y, T_end.z);
  sphere2.position.set(S_end.x, 0, 0);
  // Add the sphere to the scene
  scene.add(sphere);
  scene.add(sphere2);
  

  // Add lines
  addLine(B_start, B_end, 0x0000ff);
  addLine(B_end, A_end, 0x00ff00); 
  addLine(A_end, D_end, 0xff00ff); 
  addLine(D_end, F_end, 0x00ffff); 
  addLine(F_end, B_start, 0xff0000); 
  addLine(B_start, S_end, 0xabcdef); 
  addLine(B_end, S_end, 0x123456);
  addLine(D_end, T_end, 0x987654); 
  
}


function updateLines() {
  // Get updated parameters
  const params = updateParameters();
  
  // Clear the scene by removing all objects
  while (scene.children.length > 0) {
      scene.remove(scene.children[0]);
  }

  // Re-add the ground plane
  addGroundPlane();

  const geometry = calculateGeometry(params);
  drawGeometry(geometry);
}

function addGroundPlane() {
  // ... (your existing code for adding a ground plane)
  const planeGeometry = new THREE.PlaneGeometry(1000, 1000); // Geometry for the ground
  const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x1f1f1f, side: THREE.DoubleSide }); // Material for the ground (using a basic gray color here)
  const ground = new THREE.Mesh(planeGeometry, planeMaterial); // Create the ground mesh using the geometry and material
  ground.rotation.x = Math.PI / 2; // Rotate the ground to be horizontal (planes are vertical by default)
  scene.add(ground);// Add the ground to the scene
  
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 2, 4);  // Position of the light source
  scene.add(light);
}


function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

updateLines();
animate();
