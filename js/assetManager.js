import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { createComponentMaterial } from './materials.js';

// =============================================================================
// ASSET URLS
// =============================================================================

// URLS
const hdrTextureURL = new URL('../img/MR_INT-003_Kitchen_Pierre.hdr', import.meta.url);

// Frame
const headtubeURL = new URL('../mod/HeadTube_RS.glb', import.meta.url);
const bbModelURL = new URL('../mod/BottomBracket_RS.glb', import.meta.url);

// Fork
const dropoutForkAURL = new URL('../mod/dropoutForkA-ext.glb', import.meta.url);
const dropoutForkBURL = new URL('../mod/dropoutForkB.glb', import.meta.url);

// Chainstay
const dropoutCSURL = new URL('../mod/dropoutCS.glb', import.meta.url);
const csEndURL = new URL('../mod/csEnd.glb', import.meta.url);

// Wheels
const rimProfileURL = new URL('../img/rimv2.svg', import.meta.url);
const tireBaseProfileURL = new URL('../img/Asset 1.svg', import.meta.url);
const tireTopProfileURL = new URL('../img/tireTopProfilev2.svg', import.meta.url);
const tireTreadPatternURL = new URL('../img/tireTreadv1.svg', import.meta.url);
const spokeNippleURL = new URL('../mod/SpokeNipple_RS.glb', import.meta.url);
const airNozzleURL = new URL('../mod/AirNozzle_RS.glb', import.meta.url);

// Cranks
const crankURL = new URL('../mod/CrankArm_RS.glb', import.meta.url);
const crankBoltURL = new URL('../mod/CrankBolt_RS.glb', import.meta.url);

// Pedal
const pedalURL = new URL('../mod/PedalBase_RS.glb', import.meta.url);
const pedalAxleURL = new URL('../mod/PedalAxel_RS_v2.glb', import.meta.url);

// Sprocket
const sprocketURL = new URL('../mod/Sprocket_V3_RS.glb', import.meta.url);
const sprocketBoltURL = new URL('../mod/SprocketBolt_RS.glb', import.meta.url);
const sprocketGuardURL = new URL('../mod/SprocketGuard_RS.glb', import.meta.url);

// Driver

// Chain and Teeth
const chainLinkURL = new URL('../mod/ChainHalfLink_RS.glb', import.meta.url);
const chainFullLinkAURL = new URL('../mod/ChainFullLinkA_RS.glb', import.meta.url);
const chainFullLinkBURL = new URL('../mod/ChainFullLinkB_RS.glb', import.meta.url);
const gearToothURL = new URL('../mod/gearToothHQ.glb', import.meta.url);

// Front Hub
const hubFrontCoreURL = new URL('../mod/HubCore_Front_RS.glb', import.meta.url);
const hubFrontEndBoltURL = new URL('../mod/HubEndFront_RS.glb', import.meta.url);
const hubFrontAxelBoltURL = new URL('../mod/HubBolt_Front_RS.glb', import.meta.url);
const hubFrontGuardURL = new URL('../mod/HubGuardFront_RS.glb', import.meta.url);

// Rear Hub
const hubRearCoreURL = new URL('../mod/HubCore_Rear_RS.glb', import.meta.url);
const hubRearEndBoltURL = new URL('../mod/HubEndBolt_RS.glb', import.meta.url);
const hubRearDriverBoltURL = new URL('../mod/HubDriveBolt_RS.glb', import.meta.url);
const hubRearAxelBoltURL = new URL('../mod/HubBolt_Rear_RS.glb', import.meta.url);
const hubRearGuardDriverURL = new URL('../mod/HubGuardDriver_RS.glb', import.meta.url);
const hubRearGuardURL = new URL('../mod/HubGuardRear_RS.glb', import.meta.url);

// Stem
const stemCoreURL = new URL('../mod/stemCoreV3-1.glb', import.meta.url);
const stemBaseURL = new URL('../mod/stemBaseV3-1.glb', import.meta.url);
const stemClampURL = new URL('../mod/stemClampV3.glb', import.meta.url);

// Headset
const hsCoverURL = new URL('../mod/HSCover_RS.glb', import.meta.url);
const hsSpacerURL = new URL('../mod/HSSpacer_RS.glb', import.meta.url);

// BB Headset
const bbConeDriveURL = new URL('../mod/BBCover_RS.glb', import.meta.url);
const bbSpacerURL = new URL('../mod/BBSpacer_RS.glb', import.meta.url);

// Bars
const barEndURL = new URL('../mod/BarEnd_RS.glb', import.meta.url);

// Pegs
const pegURL = new URL('../mod/Peg_RS.glb', import.meta.url);

// Seat
const seatURL = new URL('../mod/SeatBase_RS.glb', import.meta.url);
const seatUnderURL = new URL('../mod/SeatUnder_RS.glb', import.meta.url);
const seatPostURL = new URL('../mod/SeatPost_RS.glb', import.meta.url);
const seatClampURL = new URL('../mod/SeatClamp_RS.glb', import.meta.url);



// =============================================================================
// ASSET STORAGE OBJECT
// =============================================================================

// Centralized Asset Storage
const assets = {
    // Frame
    headtube: null,
    bbModel: null,
    // Fork
    dropoutForkA: null,
    dropoutForkB: null,
    // Chainstay
    dropoutCS: null,
    csEnd: null,
    // Wheels
    rimProfile: null,
    tireBaseProfile: null,
    tireTopProfile: null,
    tireTreadPattern: null,
    spokeNippleInstancedMesh: null,
    airNozzle: null,
    // Cranks
    crank: null,
    crankBolt: null,
    // Pedal
    pedal: null,
    pedalAxle: null,
    // Sprocket
    sprocket: null,
    sprocketBolt: null,
    sprocketGuard: null,
    // Chain & Teeth
    chainLinkInstancedMesh: null,
    chainFullLinkAInstancedMesh: null,
    chainFullLinkBInstancedMesh: null,
    sprocketToothInstancedMesh: null,
    gearToothInstancedMesh: null,
     // Hubs (Front & Rear)
    hubCoreFront: null,
    frontHubEnd: null,
    frontHubGuard: null,
    bolt: null, // Front bolt
    hubCoreRear: null,
    rearHubEnd: null, // Non-drive end
    rearHubDriverBolt: null, // Drive-side end
    boltRear: null, // Rear bolt
    rearHubGuard: null, // Non-drive guard
    HubGuardDriver: null, // Drive-side guard
    // Stem
    stemCore: null,
    stemBase: null,
    stemClamp: null,
    // Headset
    hsCover: null,
    hsSpacer: null,
    // BB Headset
    bbConeDrive: null,
    bbSpacer: null,
    // Bars
    barEnd: null,
    // Pegs
    peg: null,
    // Seat
    seat: null,
    seatUnder: null,
    seatPost: null,
    seatClamp: null
};

// Dummy instances for instanced meshes
const spokeNippleInst = new THREE.Object3D();
const sprocketToothInst = new THREE.Object3D();
const gearToothInst = new THREE.Object3D();
const chainLinkInst = new THREE.Object3D();
const chainFullLinkAInst = new THREE.Object3D();
const chainFullLinkBInst = new THREE.Object3D();

// =============================================================================
// LOADING HELPER FUNCTIONS 
// =============================================================================

// Helper function to load a GLB model and merge its geometries
function loadAndMergeGLB(url) {
    return new Promise((resolve, reject) => {
        const assetLoader = new GLTFLoader();
        assetLoader.load(url,
            function(gltf) {
                const originalModel = gltf.scene;
                const geometries = [];
                originalModel.traverse((child) => {
                    if (child.isMesh) {
                        const geometry = child.geometry.clone();
                        child.updateMatrixWorld(true);
                        geometry.applyMatrix4(child.matrixWorld);
                        geometries.push(geometry);
                    }
                });

                if (geometries.length > 0) {
                   const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
                   resolve(mergedGeometry);
                } else {
                   console.warn(`No mesh geometries found in GLB: ${url}`);
                   resolve(null);
                }
            },
            undefined,
            (error) => {
                 console.error(`Failed to load GLB: ${url}`, error);
                 reject(error);
            }
        );
    });
}

// Helper function to load an SVG file
function loadSVG(url) {
    return new Promise((resolve, reject) => {
        const svgLoader = new SVGLoader();
        svgLoader.load(url,
            function(data) {
                resolve(data);
            },
            undefined,
             (error) => {
                 console.error(`Failed to load SVG: ${url}`, error);
                 reject(error);
            }
        );
    });
}

// =============================================================================
// MAIN LOADING FUNCTION
// =============================================================================

function loadModels() {
    return new Promise((resolve, reject) => {
        Promise.all([
            // Frame
            loadAndMergeGLB(headtubeURL.href).then(geo => assets.headtube = geo),
            loadAndMergeGLB(bbModelURL.href).then(geo => assets.bbModel = geo),

            // Fork
            loadAndMergeGLB(dropoutForkAURL.href).then(geo => assets.dropoutForkA = geo),
            loadAndMergeGLB(dropoutForkBURL.href).then(geo => assets.dropoutForkB = geo),

            // Chainstay
            loadAndMergeGLB(dropoutCSURL.href).then(geo => assets.dropoutCS = geo),
            loadAndMergeGLB(csEndURL.href).then(geo => assets.csEnd = geo),

            // Wheels
            loadSVG(rimProfileURL.href).then(data => assets.rimProfile = data),
            loadSVG(tireBaseProfileURL.href).then(data => assets.tireBaseProfile = data),
            loadSVG(tireTopProfileURL.href).then(data => assets.tireTopProfile = data),
            loadSVG(tireTreadPatternURL.href).then(data => assets.tireTreadPattern = data),
            loadAndMergeGLB(spokeNippleURL.href).then(geo => {
                 if (geo) {
                     const material = createComponentMaterial('spokeNipple');
                     // Store the instanced mesh in the assets object
                     assets.spokeNippleInstancedMesh = new THREE.InstancedMesh(geo, material, 1000);
                 }
            }),
            loadAndMergeGLB(airNozzleURL.href).then(geo => assets.airNozzle = geo),

            // Cranks
            loadAndMergeGLB(crankURL.href).then(geo => assets.crank = geo),
            loadAndMergeGLB(crankBoltURL.href).then(geo => assets.crankBolt = geo),

            // Pedals
            loadAndMergeGLB(pedalURL.href).then(geo => assets.pedal = geo),
            loadAndMergeGLB(pedalAxleURL.href).then(geo => assets.pedalAxle = geo),

            // Sprocket
            loadAndMergeGLB(sprocketURL.href).then(geo => assets.sprocket = geo),
            loadAndMergeGLB(sprocketBoltURL.href).then(geo => assets.sprocketBolt = geo),
            loadAndMergeGLB(sprocketGuardURL.href).then(geo => assets.sprocketGuard = geo),

           // Chain and Teeth (Instanced meshes setup)
            loadAndMergeGLB(chainLinkURL.href).then(geo => {
                 if (geo) {
                     const material = createComponentMaterial('chainLink');
                     // Store in assets object
                     assets.chainLinkInstancedMesh = new THREE.InstancedMesh(geo, material, 1000);
                 }
            }),
             loadAndMergeGLB(chainFullLinkAURL.href).then(geo => {
                 if (geo) {
                     const material = createComponentMaterial('chainFullLinkA');
                      // Store in assets object
                     assets.chainFullLinkAInstancedMesh = new THREE.InstancedMesh(geo, material, 1000);
                 }
            }),
             loadAndMergeGLB(chainFullLinkBURL.href).then(geo => {
                 if (geo) {
                     const material = createComponentMaterial('chainFullLinkB');
                      // Store in assets object
                     assets.chainFullLinkBInstancedMesh = new THREE.InstancedMesh(geo, material, 1000);
                 }
            }),
             loadAndMergeGLB(gearToothURL.href).then(geo => {
                 if (geo) {
                     const sprocketMaterial = createComponentMaterial('sprocketTooth');
                     const driverMaterial = createComponentMaterial('driverTooth');
                      // Store both instanced meshes in assets object
                     assets.sprocketToothInstancedMesh = new THREE.InstancedMesh(geo.clone(), sprocketMaterial, 1000);
                     assets.gearToothInstancedMesh = new THREE.InstancedMesh(geo, driverMaterial, 1000);
                 }
            }),

            // Hubs (Front & Rear)
            loadAndMergeGLB(hubFrontCoreURL.href).then(geo => assets.hubCoreFront = geo),
            loadAndMergeGLB(hubFrontEndBoltURL.href).then(geo => assets.frontHubEnd = geo),
            loadAndMergeGLB(hubFrontGuardURL.href).then(geo => assets.frontHubGuard = geo),
            loadAndMergeGLB(hubFrontAxelBoltURL.href).then(geo => assets.bolt = geo), // Front bolt

            loadAndMergeGLB(hubRearCoreURL.href).then(geo => assets.hubCoreRear = geo),
            loadAndMergeGLB(hubRearEndBoltURL.href).then(geo => assets.rearHubEnd = geo), // Non-drive end
            loadAndMergeGLB(hubRearDriverBoltURL.href).then(geo => assets.rearHubDriverBolt = geo), // Drive-side end
            loadAndMergeGLB(hubRearAxelBoltURL.href).then(geo => assets.boltRear = geo), // Rear bolt
            loadAndMergeGLB(hubRearGuardDriverURL.href).then(geo => assets.HubGuardDriver = geo), // Drive-side guard
            loadAndMergeGLB(hubRearGuardURL.href).then(geo => assets.rearHubGuard = geo), // Non-drive guard


            // Stem
            loadAndMergeGLB(stemCoreURL.href).then(geo => assets.stemCore = geo),
            loadAndMergeGLB(stemBaseURL.href).then(geo => assets.stemBase = geo),
            loadAndMergeGLB(stemClampURL.href).then(geo => assets.stemClamp = geo),

            // Headset
            loadAndMergeGLB(hsCoverURL.href).then(geo => assets.hsCover = geo),
            loadAndMergeGLB(hsSpacerURL.href).then(geo => assets.hsSpacer = geo),

            // BB Headset
            loadAndMergeGLB(bbConeDriveURL.href).then(geo => assets.bbConeDrive = geo),
            loadAndMergeGLB(bbSpacerURL.href).then(geo => assets.bbSpacer = geo),

             // Bars
             loadAndMergeGLB(barEndURL.href).then(geo => assets.barEnd = geo),

             // Pegs
             loadAndMergeGLB(pegURL.href).then(geo => assets.peg = geo),

             // Seat
             loadAndMergeGLB(seatURL.href).then(geo => assets.seat = geo),
             loadAndMergeGLB(seatUnderURL.href).then(geo => assets.seatUnder = geo),
             loadAndMergeGLB(seatPostURL.href).then(geo => assets.seatPost = geo),
             loadAndMergeGLB(seatClampURL.href).then(geo => assets.seatClamp = geo),

        ]).then(() => {
             console.log("All models loaded successfully.");
             resolve();
        }).catch(error => {
             console.error("Error loading one or more models:", error);
             reject(error);
        });
    });
}

// =============================================================================
// EXPORTS
// =============================================================================
export { 
    assets, 
    loadModels,
    spokeNippleInst,
    sprocketToothInst, 
    gearToothInst,
    chainLinkInst,
    chainFullLinkAInst,
    chainFullLinkBInst,
    hdrTextureURL
};