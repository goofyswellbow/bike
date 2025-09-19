
import { stats, updatePerformanceMetrics } from './performanceTracker.js';
import { getComponentsToRedraw, getComponentsToReposition, getComponentsToRepaint, clearChanges, needsLeveling } from './updateManager.js';
import { componentRegistry } from './registry.js';
import { updateComponentMaterial, initComponentRegistry, componentGenerators, componentPositioners } from './componentRegistry.js';
import { assets, loadModels, spokeNippleInst, sprocketToothInst, gearToothInst, chainLinkInst, chainFullLinkAInst, chainFullLinkBInst, hdrTextureURL } from './assetManager.js';
import { initScene, handleResize, clearScene, updateGuides } from './sceneManager.js';
import { getParams, initGUI, getGUIController } from './params.js';
import { calcTotalSystem } from './calc.js';
import { drawTotalBikeSkeleton, drawPointNames } from './gen/genGuide.js';
import {
    genFrameTopTubeGeo,
    genFrameHeadTubeGeo,
    genFrameSeatTubeGeo,
    genFrameDownTubeGeo,
    genFrameBottomBracketGeo,
    genFrameChainstayBottomGeo,
    genFrameChainstayTopGeo,
    genChainStayDropout,
    genChainstayBottomEnd,
    genChainstayTopEnd,
} from './gen/genFrame.js';
import { genForkGeo, genForkSteerTubeGeo, genForkDropout } from './gen/genFork.js';
import { genSprocketGeo, genDriverGeo, genChainLoopGeo } from './gen/genGear.js';
import { genHandlebarGeo, genHandlebarCrossbarGeo, genGrips, genBarEnds } from './gen/genBars.js';
import { genRimFront, genRimRear,genTireFront, genTireRear } from './gen/genWheels.js';
import { genFrontSpokes, genRearSpokes, genSpokeNipplesGeo, genAirNozzleFront, genAirNozzleRear } from './gen/genSpokes.js';
import { genHubEndGeo, genHubFlangeGeo, genHubCoreGeo, genHubBolt, genPegFront } from './gen/genHubFront.js';
import { genHubBoltRear, genPegRear, genHubDriveBolt, genHubFlangeRearGeo, genHubRearCore, genHubEndRearGeo } from './gen/genHubRear.js';
import { genHeadset, genStemCore, genStemBase, genStemClamp, setupStemClippingPlane} from './gen/genStem.js';
import { genCrankArmDriverGeo, genSprocketBolt, genCrankBolt, genPedal, genBB, genBBNonDrive, genCrankArmNonDriveGeo, genPedalNonDrive, genCrankBoltNonDrive } from './gen/genCranks.js';
import { genSeat, genSeatPost, genSeatClamp } from './gen/genSeat.js';

// Initialize scene
const { 
    renderer, 
    labelRenderer, 
    scene,
    cameraManager,
    environmentManager } = initScene();

// Initialize GUI
const gui = initGUI();
gui.setOnChange(() => {
    console.log('Updating bike from GUI change');
    updateBike();
});



// UPDATE BIKE
function updateBike() {
    //clearRegistry();
    const updateStart = performance.now();
    const params = getParams();

    
    // Get components that need updating
    const componentsToRedraw = getComponentsToRedraw();
    const componentsToReposition = getComponentsToReposition();
    const componentsToRepaint = getComponentsToRepaint();

    // Check if full update is needed
    const fullUpdateNeeded = needsLeveling() || 
                             (componentsToRedraw.length === 0 && 
                              componentsToReposition.length === 0 &&
                              componentsToRepaint.length === 0);


    // Calculate base geometry
    const geometry = calcTotalSystem(params);

    // Update GUI elements that are always calculated (bbHeight)
    if (geometry.sizes.bbHeight !== undefined) {
        gui.updateParameter('frameGeometry', 'bbHeight', geometry.sizes.bbHeight);
    }

    if (fullUpdateNeeded) {
        // Perform full update as before
        console.log("Performing full bike update");
        clearScene(scene)
        //clearGroups();
        environmentManager.setupEnvironmentElements();
        
        // --- Generate Bike Components ---
        if (!params.hideBike) {
        // FRAME COMPONENTS
        genFrameTopTubeGeo(geometry, scene);
        genFrameHeadTubeGeo(geometry, scene, assets.headtube); 
        genFrameSeatTubeGeo(geometry, scene);
        genFrameDownTubeGeo(geometry, scene);
        genFrameBottomBracketGeo(geometry, scene, assets.bbModel); 
        genFrameChainstayBottomGeo(geometry, scene);
        genFrameChainstayTopGeo(geometry, scene);
        genChainStayDropout(geometry, scene, assets.dropoutCS);
        genChainstayBottomEnd(geometry, scene, assets.csEnd); 
        genChainstayTopEnd(geometry, scene, assets.csEnd);

        // FORK COMPONENTS
        genForkGeo(geometry, scene);
        genForkSteerTubeGeo(geometry, scene);
        genForkDropout(geometry, scene, assets.dropoutForkA, assets.dropoutForkB);

        // HANDLEBAR & GRIP COMPONENTS
        genHandlebarGeo(geometry, scene);
        genHandlebarCrossbarGeo(geometry, scene);
        genGrips(geometry, scene, assets.tireTreadPattern); 
        genBarEnds(geometry, scene, assets.barEnd); 

        // STEM & HEADSET COMPONENTS
        genHeadset(geometry, scene, assets.hsCover, assets.hsSpacer); 
        const clippingPlaneInfo = setupStemClippingPlane(geometry, scene);
        genStemCore(geometry, scene, assets.stemCore, clippingPlaneInfo); 
        genStemBase(geometry, scene, assets.stemBase);
        genStemClamp(geometry, scene, assets.stemClamp); 

        // WHEEL COMPONENTS (Spokes, Rims, Tires)
        genFrontSpokes(geometry, scene);
        genRearSpokes(geometry, scene);
        genSpokeNipplesGeo(geometry, scene, assets.spokeNippleInstancedMesh, spokeNippleInst); 
        genAirNozzleFront(geometry, scene, assets.airNozzle); 
        genAirNozzleRear(geometry, scene, assets.airNozzle); 
        genRimFront(geometry, scene, assets.rimProfile); 
        genRimRear(geometry, scene, assets.rimProfile);
        genTireFront(geometry, scene, assets.tireBaseProfile, assets.tireTopProfile, assets.tireTreadPattern); 
        genTireRear(geometry, scene, assets.tireBaseProfile, assets.tireTopProfile, assets.tireTreadPattern);

        // HUB COMPONENTS (Front & Rear)
        genHubFlangeGeo(geometry, scene);
        genHubCoreGeo(geometry, scene, assets.hubCoreFront); 
        genHubBolt(geometry, scene, assets.bolt); 
        genHubEndGeo(geometry, scene, assets.frontHubEnd, assets.frontHubGuard);
        genPegFront(geometry, scene, assets.peg); 
        genHubFlangeRearGeo(geometry, scene);
        genHubRearCore(geometry, scene, assets.hubCoreRear); 
        genHubBoltRear(geometry, scene, assets.boltRear); 
        genHubEndRearGeo(geometry, scene, assets.rearHubEnd, assets.rearHubGuard); 
        genHubDriveBolt(geometry, scene, assets.rearHubDriverBolt, assets.HubGuardDriver); 
        genPegRear(geometry, scene, assets.peg);

        // GEARING & CHAIN COMPONENTS
        genSprocketGeo(geometry, scene, assets.sprocketToothInstancedMesh, sprocketToothInst, assets.sprocket, assets.sprocketGuard); 
        genDriverGeo(geometry, scene, assets.gearToothInstancedMesh, gearToothInst); 
        genChainLoopGeo(
            geometry, scene,
            assets.chainLinkInstancedMesh, chainLinkInst, 
            assets.chainFullLinkAInstancedMesh, chainFullLinkAInst,
            assets.chainFullLinkBInstancedMesh, chainFullLinkBInst
        );

        // DRIVETRAIN COMPONENTS (Cranks, Pedals, BB)
        genCrankArmDriverGeo(geometry, scene, assets.crank); 
        genSprocketBolt(geometry, scene, assets.sprocketBolt); 
        genCrankBolt(geometry, scene, assets.crankBolt); 
        genPedal(geometry, scene, assets.pedal, assets.pedalAxle); 
        genBB(geometry, scene, assets.bbConeDrive, assets.bbSpacer); 

        // NON-DRIVE SIDE COMPONENTS
        genBBNonDrive(geometry, scene, assets.bbConeDrive, assets.bbSpacer);
        genCrankArmNonDriveGeo(geometry, scene, assets.crank);
        genCrankBoltNonDrive(geometry, scene, assets.crankBolt);
        genPedalNonDrive(geometry, scene, assets.pedal, assets.pedalAxle);

        // SEAT COMPONENTS
        genSeat(geometry, scene, assets.seat, assets.seatUnder); 
        genSeatPost(geometry, scene, assets.seatPost); 
        genSeatClamp(geometry, scene, assets.seatClamp); 
        }

    } else {
        console.log("Performing selective update");
        
        // Handle redraws
        if (componentsToRedraw.length > 0 && !params.hideBike) {
            console.log("Redrawing components:", componentsToRedraw);
            
            // Process all component redraws in a loop
            componentsToRedraw.forEach(componentName => {
                // Skip if we don't have a generator for this component
                if (!componentGenerators[componentName]) return;
                
                // Remove existing component if present
                if (componentRegistry[componentName]) {
                    scene.remove(componentRegistry[componentName]);
                }
                
                // Generate new component using our registry
                componentGenerators[componentName](geometry);
            });
        }
        
        // Handle repositions
        if (componentsToReposition.length > 0 && !params.hideBike) {
            console.log("Repositioning components:", componentsToReposition);
            
            // Process all component repositions in a loop
            componentsToReposition.forEach(componentName => {
                // Skip if we don't have a positioner for this component
                if (!componentPositioners[componentName]) return;
                
                const component = componentRegistry[componentName];
                if (component) {
                    componentPositioners[componentName](component, geometry);
                }
            });
        }
        
        // Handle repaints (material updates only)
        if (componentsToRepaint.length > 0 && !params.hideBike) {
            console.log("Repainting components:", componentsToRepaint);
            
            // Process all component repaints in a loop
            componentsToRepaint.forEach(componentName => {
                const component = componentRegistry[componentName];
                if (component) {
                    updateComponentMaterial(component, componentName, params);
                }
            });
        }
        
        // Clear bike components if hiding bike
        if (params.hideBike) {
            Object.keys(componentRegistry).forEach(componentName => {
                if (componentRegistry[componentName]) {
                    scene.remove(componentRegistry[componentName]);
                    componentRegistry[componentName] = null;
                }
            });
        }
    }

    // --- ALWAYS UPDATE GUIDES ---
    updateGuides(geometry, scene, params, drawTotalBikeSkeleton, drawPointNames);

    // PERFORMANCE TRACKING
    const totalUpdateTime = performance.now() - updateStart;
    updatePerformanceMetrics(totalUpdateTime);


    // Clear the change tracking
    clearChanges();
}


// Animation loop
function animate() {
    stats.begin();
    const camera = cameraManager.getCamera();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    
    // Update camera position display
    cameraManager.updatePositionDisplay();
    
    stats.end();
    requestAnimationFrame(animate);
}

// Initialize everything
async function init() {
    console.log('Initializing bike...');
    try {
        environmentManager.loadEnvironment(hdrTextureURL);
        await loadModels(); 
        initComponentRegistry(scene); // Initialize the registry here
        const params = getParams();
        console.log('Parameters loaded:', params);
        updateBike();
        animate();
        console.log('Bike updated successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

// Event Listeners
window.addEventListener('resize', function() {
    handleResize(null, renderer, labelRenderer, cameraManager, environmentManager);
});

// Start the application
init();


// BikeAPI - Frontend interface
import { createBikeAPI } from './bikeAPI.js';
export const bikeAPI = createBikeAPI(getGUIController, updateBike);

// Make bikeAPI available in console for testing
window.bikeAPI = bikeAPI;