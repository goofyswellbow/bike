
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 25;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);



function updateLines() {
  // Clear the scene by removing all objects
  while (scene.children.length > 0) {
      scene.remove(scene.children[0]);
  }

  // Parameters
  const B_length = document.getElementById('B_length').value;
  const A_length = document.getElementById('A_length').value;
  const B_angle_degrees = document.getElementById('B_angle').value;
  const B_angle = B_angle_degrees * (Math.PI / 180);
  const H_length = document.getElementById('H_length').value; // New parameter
  const D_length = document.getElementById('D_length').value;
  const D_angle_degrees = document.getElementById('D_angle').value;
  const D_angle = D_angle_degrees * (Math.PI / 180);
  const B_drop = parseFloat(document.getElementById('B_drop').value);
  const F_length = parseFloat(document.getElementById('F_length').value); // New parameter
  const S_length = document.getElementById('S_length').value;
  const T_length = parseFloat(document.getElementById('T_length').value);

  // Hypotenuse value (c) and A_end_Y calculation
  const c = parseFloat(F_length) + parseFloat(H_length); // convert F_length to a number and add 5
  const A_end_Y = c * Math.cos(D_angle); // a = c * cos(β)

  // Calculate B's start and end positions
  const B_start = new THREE.Vector3(0, B_drop, 0); // Start of B is translated downward by B_drop
  const B_end = new THREE.Vector3(
    B_length * Math.sin(B_angle),
    B_length * Math.cos(B_angle) + B_drop, // End of B is translated downward by B_drop
    0
  );

  // Calculate S's position
  const S_angle = Math.acos(B_start.y / S_length);
  const S_end = new THREE.Vector3(
    B_start.x + S_length * Math.sin(S_angle),
    0,
    0
  );

  // Calculate A's positions
  const A_angle = Math.acos((A_end_Y - B_end.y) / A_length);
  const A_end = new THREE.Vector3(
    B_end.x - A_length * Math.sin(A_angle),
    A_end_Y,
    0
  );

  // Calculate D's position
  const D_end = new THREE.Vector3(
    A_end.x + D_length * Math.sin(D_angle),
    A_end.y - D_length * Math.cos(D_angle),
    0
  );

  // Extended x value of line D where it intersects y = 0
  const xInterceptD = D_end.x - D_end.y * (D_end.x - A_end.x) / (D_end.y - A_end.y);

  // Update D's endpoint to the xInterceptD
  D_end.x = xInterceptD;
  D_end.y = 0;

  // Calculate F's endpoint
  const F_end = new THREE.Vector3(
    D_end.x - F_length * Math.sin(D_angle),
    D_end.y + F_length * Math.cos(D_angle),
    0
  );
  
  // Calculate T's direction, which is perpendicular to D
  const T_angle = D_angle + Math.PI;

  // Calculate T's end position
  const T_end = new THREE.Vector3(
    D_end.x + T_length * Math.cos(T_angle),
    D_end.y + T_length * Math.sin(T_angle),
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

  // Fetch the W1_size value
  const W1_size = parseFloat(document.getElementById('W1_size').value); // Assuming you have an input element with id 'W1_size'
  // Create a ring geometry that looks like a circle line
  const ringThickness = 0.001; // adjust this value as necessary
  const circleGeometry = new THREE.RingBufferGeometry(W1_size - ringThickness, W1_size, 32);
  const circleMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 }); // Black color
  const circleLine = new THREE.LineLoop(circleGeometry, circleMaterial);
  circleLine.position.set(T_end.x, T_end.y, T_end.z);
  scene.add(circleLine);

  // Fetch the W2_size value
  const W2_size = parseFloat(document.getElementById('W2_size').value); // Assuming you have an input element with id 'W1_size'
  const circleGeometry2 = new THREE.RingBufferGeometry(W2_size - ringThickness, W2_size, 32);
  const circleLine2 = new THREE.LineLoop(circleGeometry2, circleMaterial);
  circleLine2.position.set(S_end.x, S_end.y, S_end.z);
  scene.add(circleLine2);


  

  // Create a small sphere geometry to represent the point
  const geometry = new THREE.SphereGeometry(0.1, 32, 32); // Increase radius to make it more visible
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow color
  const sphere = new THREE.Mesh(geometry, material);
  const sphere2 = new THREE.Mesh(geometry, material);
  // Set the position of the sphere to the intersection point
  sphere.position.set(T_end.x, T_end.y, T_end.z);
  sphere2.position.set(S_end.x, 0, 0);
  // Add the sphere to the scene
  scene.add(sphere);
  scene.add(sphere2);
  

  // Add lines
  addLine(B_start, B_end, 0x0000ff); // Side B
  addLine(B_end, A_end, 0x00ff00); // Side A
  addLine(A_end, D_end, 0xff00ff); // Side D
  addLine(D_end, F_end, 0x00ffff); // Side F (new line)
  addLine(F_end, B_start, 0xff0000); // Side C (adjusted)
  addLine(B_start, S_end, 0xabcdef); // Side S
  addLine(B_end, S_end, 0x123456);
  addLine(D_end, T_end, 0x987654); // Side T


 


  function addLine(v1, v2, color) {
      const points = [];
      points.push(v1);
      points.push(v2);
    
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
    }
    


  function animate() {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}

// Call this function when the page is loaded
updateLines();

document.getElementById('B_length').addEventListener('input', updateLines);
document.getElementById('A_length').addEventListener('input', updateLines);
document.getElementById('B_angle').addEventListener('input', updateLines);
document.getElementById('A_end_Y').addEventListener('input', updateLines);
document.getElementById('D_length').addEventListener('input', updateLines);
document.getElementById('D_angle').addEventListener('input', updateLines);
document.getElementById('B_drop').addEventListener('input', updateLines);
document.getElementById('F_length').addEventListener('input', updateLines);
document.getElementById('H_length').addEventListener('input', updateLines);
document.getElementById('S_length').addEventListener('input', updateLines);
document.getElementById('T_length').addEventListener('input', updateLines);
document.getElementById('W1_size').addEventListener('input', updateLines);
document.getElementById('W2_size').addEventListener('input', updateLines);
