import { dependencies } from './updateManager.js';
import { assets, spokeNippleInst, sprocketToothInst, gearToothInst, chainLinkInst, chainFullLinkAInst, chainFullLinkBInst } from './assetManager.js';

// Import all the generator and positioning functions
import {
    genFrameTopTubeGeo, genFrameHeadTubeGeo, genFrameSeatTubeGeo, genFrameDownTubeGeo, 
    genFrameChainstayBottomGeo, genFrameChainstayTopGeo,
    positionTopTube, positionSeatTube, positionDownTube, positionHeadTube, positionBottomBracket,
    positionChainstayBottomAssembly, positionChainstayTopAssembly,
    positionChainStayDropoutAssembly, positionChainstayBottomEndAssembly, positionChainstayTopEndAssembly } from './gen/genFrame.js';
import { 
    genForkGeo, genForkDropout,
    positionForkAssembly, positionSteerTube, positionForkDropoutAssembly } from './gen/genFork.js';
import {
    genSprocketGeo, genDriverGeo, genChainLoopGeo,
    positionSprocketAssembly, positionChainLinks, calculateChainPath, positionDriverAssembly } from './gen/genGear.js';
import { 
    genHandlebarGeo, genHandlebarCrossbarGeo, genGrips, genBarEnds,
    positionHandlebarAssembly, positionBarEndAssembly, positionCrossbarAssembly } from './gen/genBars.js';
import {
    genRimFront, genRimRear, genTireFront, genTireRear,
    positionRimFront, positionRimRear, positionTireFront, positionTireRear } from './gen/genWheels.js';
import {
    genFrontSpokes, genRearSpokes, genSpokeNipplesGeo,
    positionSpokeAssembly, positionSpokeNipples, positionAirNozzleFront, positionAirNozzleRear } from './gen/genSpokes.js';
import {
    genHubEndGeo, genHubFlangeGeo, genHubCoreGeo, genHubBolt, genPegFront,
    positionHubFlanges, positionHubCoreFront } from './gen/genHubFront.js';
import {
    genHubBoltRear, genPegRear, genHubDriveBolt, genHubFlangeRearGeo, genHubRearCore, genHubEndRearGeo,
    positionHubFlangesRear, positionHubCoreRear } from './gen/genHubRear.js';
import { genHeadset, genStemCore, genStemBase, genStemClamp, setupStemClippingPlane, positionHeadsetAssembly } from './gen/genStem.js';
import { 
    genCrankArmDriverGeo, genSprocketBolt, genBB, genBBNonDrive, genCrankArmNonDriveGeo,
    positionPedalNonDrive, positionPedalDrive, positionCrankBoltNonDrive, positionCrankBoltDrive, positionCrankArmDriver, positionCrankArmNonDrive, positionSprocketBolt, positionBBDrive, positionBBNonDrive } from './gen/genCranks.js';
import { genSeat, genSeatPost, positionSeat, positionSeatPost, positionSeatClamp } from './gen/genSeat.js';


// Component generator and positioner maps
let componentGenerators = {};
let componentPositioners = {};

function initComponentRegistry(scene) {

    //------------------------------
    // ----- REDRAW COMPONENTS -----
    //------------------------------
    componentGenerators = {
        // DRIVETRAIN
        'crankDrive': (geometry) => {
            return genCrankArmDriverGeo(geometry, scene, assets.crank);
        },
        'crankNonDrive': (geometry) => {
            return genCrankArmNonDriveGeo(geometry, scene, assets.crank);
        },
        'sprocketBolt': (geometry) => {
            return genSprocketBolt(geometry, scene, assets.sprocketBolt);
        },
        'bbDrive': (geometry) => genBB(geometry, scene, assets.bbConeDrive, assets.bbSpacer),
        'bbNonDrive': (geometry) => genBBNonDrive(geometry, scene, assets.bbConeDrive, assets.bbSpacer),
    
        // GEAR
        'sprocketAssembly' : (geometry) => {
            return genSprocketGeo(geometry, scene, assets.sprocketToothInstancedMesh, sprocketToothInst, assets.sprocket, assets.sprocketGuard);
        }, 
        'driverAssembly' : (geometry) => genDriverGeo(geometry, scene, assets.gearToothInstancedMesh, gearToothInst), 
        'chain' : (geometry) => genChainLoopGeo(
            geometry, scene,
            assets.chainLinkInstancedMesh, chainLinkInst, 
            assets.chainFullLinkAInstancedMesh, chainFullLinkAInst,
            assets.chainFullLinkBInstancedMesh, chainFullLinkBInst
        ),

        // HUB ENDS
        'hubEndAssemblyFront': (geometry) => genHubEndGeo(geometry, scene, assets.frontHubEnd, assets.frontHubGuard),
        'hubEndAssemblyRear': (geometry) => genHubEndRearGeo(geometry, scene, assets.rearHubEnd, assets.rearHubGuard),
        'hubEndAssemblyDrive': (geometry) => genHubDriveBolt(geometry, scene, assets.rearHubDriverBolt, assets.HubGuardDriver),

        // PEG 
        'pegAssemblyFront': (geometry) => {
            if (geometry.params.frontPegEnabled_L || geometry.params.frontPegEnabled_R) {
                return genPegFront(geometry, scene, assets.peg);
            }
            return null; // Return null when disabled
        },

        'pegAssemblyRear': (geometry) => {
            if (geometry.params.rearPegEnabled_L || geometry.params.rearPegEnabled_R) {
                return genPegRear(geometry, scene, assets.peg);
            }
            return null; // Return null when disabled
        },
        
        // SEAT
        'seat': (geometry) => genSeat(geometry, scene, assets.seat, assets.seatUnder),
        'seatPost': (geometry) => genSeatPost(geometry, scene, assets.seatPost),

        // BARS
        'handlebarAssembly': (geometry) => genHandlebarGeo(geometry, scene),
        'handlebarCrossbarAssembly': (geometry) => genHandlebarCrossbarGeo(geometry, scene),
        'gripAssembly': (geometry) => genGrips(geometry, scene, assets.tireTreadPattern),
        'barEndAssembly': (geometry) => {
            if (geometry.params.barEndEnabled) {
                return genBarEnds(geometry, scene, assets.barEnd);
            } else {
                return null;
            }
        },

        // STEM
        'stemCoreAssembly': (geometry) => {
            const clippingPlaneInfo = setupStemClippingPlane(geometry, scene);
            return genStemCore(geometry, scene, assets.stemCore, clippingPlaneInfo);
        },
        'stemBase': (geometry) => genStemBase(geometry, scene, assets.stemBase),
        'stemClamp': (geometry) => genStemClamp(geometry, scene, assets.stemClamp),

        // HEADSET
        'headsetAssembly': (geometry) => genHeadset(geometry, scene, assets.hsCover, assets.hsSpacer),

        // WHEELS
        'rearSpokes': (geometry) => genRearSpokes(geometry, scene),
        'frontSpokes': (geometry) => genFrontSpokes(geometry, scene),
        'spokeNipples': (geometry) => genSpokeNipplesGeo(geometry, scene, assets.spokeNippleInstancedMesh, spokeNippleInst),
        'rimFront': (geometry) => genRimFront(geometry, scene, assets.rimProfile),
        'rimRear': (geometry) => genRimRear(geometry, scene, assets.rimProfile),
        'tireFront': (geometry) => genTireFront(geometry, scene, assets.tireBaseProfile, assets.tireTopProfile, assets.tireTreadPattern),
        'tireRear': (geometry) => genTireRear(geometry, scene, assets.tireBaseProfile, assets.tireTopProfile, assets.tireTreadPattern),
        
        // FORK
        'forkAssembly': (geometry) => genForkGeo(geometry, scene),
        'forkDropoutAssembly': (geometry) => genForkDropout(geometry, scene, assets.dropoutForkA, assets.dropoutForkB),
        
        // FRAME
        'headTube': (geometry) => genFrameHeadTubeGeo(geometry, scene, assets.headtube),
        'topTube': (geometry) => genFrameTopTubeGeo(geometry, scene),
        'seatTube': (geometry) => genFrameSeatTubeGeo(geometry, scene),
        'downTube': (geometry) => genFrameDownTubeGeo(geometry, scene),
        'chainstayBottomAssembly': (geometry) => genFrameChainstayBottomGeo(geometry, scene),
        'chainstayTopAssembly': (geometry) => genFrameChainstayTopGeo(geometry, scene),

        // HUB COMPONENTS - FRONT
        'hubFlangeAssembly': (geometry) => genHubFlangeGeo(geometry, scene),
        'hubCoreFront': (geometry) => genHubCoreGeo(geometry, scene, assets.hubCoreFront),
        'hubEndAssemblyFront': (geometry) => genHubEndGeo(geometry, scene, assets.frontHubEnd, assets.frontHubGuard),
        'hubBoltAssemblyFront': (geometry) => genHubBolt(geometry, scene, assets.bolt),
        
        // HUB COMPONENTS - REAR
        'hubFlangeAssemblyRear': (geometry) => genHubFlangeRearGeo(geometry, scene),
        'hubCoreRear': (geometry) => genHubRearCore(geometry, scene, assets.hubCoreRear),
        'hubEndAssemblyRear': (geometry) => genHubEndRearGeo(geometry, scene, assets.rearHubEnd, assets.rearHubGuard),
        'hubEndAssemblyDrive': (geometry) => genHubDriveBolt(geometry, scene, assets.rearHubDriverBolt, assets.HubGuardDriver),
        'hubBoltAssemblyRear': (geometry) => genHubBoltRear(geometry, scene, assets.boltRear),        

    };
    
    // ------------------------------------------------    
    // ----- REPOSITION COMPONENTS WITHOUT REDRAW -----
    // ------------------------------------------------  

    componentPositioners = {
        // DRIVETRAIN
        'crankDrive': (component, geometry) => {
            positionCrankArmDriver(component, geometry);
        },
        'crankNonDrive': (component, geometry) => {
            positionCrankArmNonDrive(component, geometry);
        },
        'crankBoltDrive': (component, geometry) => positionCrankBoltDrive(component, geometry),
        'crankBoltNonDrive': (component, geometry) => positionCrankBoltNonDrive(component, geometry),
        'pedalGroupDrive': (component, geometry) => {
            positionPedalDrive(component, geometry);
        },
        'pedalGroupNonDrive': (component, geometry) => {
            positionPedalNonDrive(component, geometry);
        },
        'sprocketBolt': (component, geometry) => {
            positionSprocketBolt(component, geometry);
        },

        // GEAR
        'driverAssembly': (component, geometry) => {
            const meshes = {
                driverCoreMesh: component.children.find(child => child.userData.componentType === 'driverCore'),
                driverAttachMesh: component.children.find(child => child.userData.componentType === 'driverAttach')
            };
            return positionDriverAssembly(meshes, component, assets.gearToothInstancedMesh, gearToothInst, geometry);
        },

        'sprocketAssembly': (component, geometry) => {
            // Need the meshes info for proper sprocket positioning with teeth
            const meshes = {
                sprocketMesh: component.children.find(child => child.userData.componentType === 'sprocketCore'),
                guardMesh: component.children.find(child => child.userData.componentType === 'sprocketGuard')
            };
            positionSprocketAssembly(meshes, component, assets.sprocketToothInstancedMesh, sprocketToothInst, geometry);
        },

        // CHAIN
        'chain': (component, geometry) => {
            // Calculate chain path points using the existing function
            const chainPathPoints = calculateChainPath(geometry);
            
            // Chain might be either a single instanced mesh or an object containing fullLinkA and fullLinkB meshes
            if (component.fullLinkA && component.fullLinkB) {
                // For the object containing both mesh types (full links mode)
                positionChainLinks(
                    chainPathPoints,
                    geometry.params,
                    null, null,
                    component.fullLinkA, chainFullLinkAInst,
                    component.fullLinkB, chainFullLinkBInst
                );
            } else {
                // For single instanced mesh (half links mode)
                positionChainLinks(
                    chainPathPoints,
                    geometry.params,
                    component, chainLinkInst,
                    null, null,
                    null, null
                );
            }
        },
        
        // SEAT
        'seat': (component, geometry) => positionSeat(component, geometry, geometry.params),
        'seatPost': (component, geometry) => positionSeatPost(component, geometry, geometry.params),
        'seatClamp': (component, geometry) => positionSeatClamp(component, geometry, geometry.params),

        // BARS
        // Replace the existing handlebarAssembly handler in componentPositioners
        'handlebarAssembly': (component, geometry) => {
            // Call the standard positioning function which now handles rotations properly
            return positionHandlebarAssembly(component, geometry);
        },
        'handlebarCrossbarAssembly': (component, geometry) => positionCrossbarAssembly(component, geometry),
        'barEndAssembly': (component, geometry) => {
            const meshes = {
                leftBarEndMesh: component.children.find(child => child.userData.componentType === 'barEndLeft'),
                rightBarEndMesh: component.children.find(child => child.userData.componentType === 'barEndRight')
            };
            if (meshes.leftBarEndMesh && meshes.rightBarEndMesh) {
                return positionBarEndAssembly(meshes, geometry);
            }
            return false;
        },

        // WHEELS
        'rearSpokes': (component, geometry) => positionSpokeAssembly(component, geometry.points.S_end, geometry.rotations.total),
        'frontSpokes': (component, geometry) => positionSpokeAssembly(component, geometry.points.T_end, geometry.rotations.total),
        'spokeNipples': (component, geometry) => positionSpokeNipples(component, spokeNippleInst, geometry),
        'airNozzleFront': (component, geometry) => positionAirNozzleFront(component, geometry),
        'airNozzleRear': (component, geometry) => positionAirNozzleRear(component, geometry),
        'rimFront': (component, geometry) => positionRimFront(component, geometry),
        'rimRear': (component, geometry) => positionRimRear(component, geometry),
        'tireFront': (component, geometry) => positionTireFront(component, geometry),
        'tireRear': (component, geometry) => positionTireRear(component, geometry),
        
        // FORK
        'forkAssembly': (component, geometry) => {
            // Call the enhanced positioning function that handles rotation properly
            return positionForkAssembly(component, geometry);
        },
        'steerTube': (component, geometry) => positionSteerTube(component, geometry),

        //'forkDropoutAssembly': (component, geometry) => positionForkDropoutAssembly(meshes = component.children, geometry),

        'forkDropoutAssembly': (component, geometry) => {
            // Extract meshes from component
            const meshes = {
                leftDropoutMesh: component.children.find(c => c.userData.componentType === 'forkDropoutLeft'),
                rightDropoutMesh: component.children.find(c => c.userData.componentType === 'forkDropoutRight')
            };
            
            // Position the meshes directly to world positions
            positionForkDropoutAssembly(meshes, geometry);
        },

        // CHAINSTAY
        'chainstayBottomAssembly': (component, geometry) => {
            return positionChainstayBottomAssembly(component, geometry);
        },
        'chainstayTopAssembly': (component, geometry) => {
            return positionChainstayTopAssembly(component, geometry);
        },
 
        'chainstayDropoutAssembly': (component, geometry) => {
            // Extract meshes from component
            const meshes = {
                leftDropoutMesh: component.children.find(c => c.userData.componentType === 'chainstayDropoutLeft'),
                rightDropoutMesh: component.children.find(c => c.userData.componentType === 'chainstayDropoutRight')
            };
            
            // Position the meshes directly to world positions
            positionChainStayDropoutAssembly(meshes, geometry);
        },
        
        'chainstayEndAssemblyTop': (component, geometry) => {
            // Extract meshes from component
            const meshes = {
                leftEndMesh: component.children.find(c => c.userData.componentType === 'chainstayTopEndLeft'),
                rightEndMesh: component.children.find(c => c.userData.componentType === 'chainstayTopEndRight')
            };
            
            // Position the meshes directly to world positions
            positionChainstayTopEndAssembly(meshes, geometry);
        },

        'chainstayEndAssemblyBottom': (component, geometry) => {
            // Extract meshes from component
            const meshes = {
                leftEndMesh: component.children.find(c => c.userData.componentType === 'chainstayBottomEndLeft'),
                rightEndMesh: component.children.find(c => c.userData.componentType === 'chainstayBottomEndRight')
            };
            
            // Position the meshes directly to world positions
            positionChainstayBottomEndAssembly(meshes, geometry);
        },
        
        // FRAME
        'headTube': (component, geometry) => positionHeadTube(component, geometry),
        'bottomBracket': (component, geometry) => positionBottomBracket(component, geometry),
        'topTube': (component, geometry) => positionTopTube(component, geometry),
        'seatTube': (component, geometry) => positionSeatTube(component, geometry),
        'downTube': (component, geometry) => positionDownTube(component, geometry),
        
        // HEADSET
        'headsetAssembly': (component, geometry) => positionHeadsetAssembly({
            hsCoverMesh: component.children.find(c => c.userData.componentType === 'headsetCover'),
            hsSpacerMeshes: component.children.filter(c => c.userData.componentType === 'headsetSpacer')
        }, geometry),
        
        'bbDrive': (component, geometry) => {
            // First position the group itself at the midAxel
            component.position.copy(geometry.points.midAxel);
            
            // Then extract meshes from component
            const meshes = {
                bbCoverMesh: component.children.find(c => c.userData.componentType === 'bbCover'),
                bbSpacerMeshes: component.children.filter(c => c.userData.componentType === 'bbSpacer')
            };
            
            // Position meshes within the group
            positionBBDrive(meshes, geometry);
        },
        
        'bbNonDrive': (component, geometry) => {

            if (!component || !geometry || !geometry.points || !geometry.points.midAxel) {
                console.error("Missing component or geometry data for bbNonDrive positioning");
                return;
            }
            
            // First position the group itself at the midAxel
            component.position.copy(geometry.points.midAxel);
            component.visible = true; // Ensure the group is visible
            
            // Extract meshes from component
            const meshes = {
                bbCoverMesh: component.children.find(c => c.userData.componentType === 'bbCover'),
                bbSpacerMeshes: component.children.filter(c => c.userData.componentType === 'bbSpacer')
            };
            
            // Position meshes within the group
            positionBBNonDrive(meshes, geometry);
        },

        // HUB COMPONENTS - FRONT

        'hubFlangeAssembly': (component, geometry) => {
            // Extract meshes from component
            const meshes = {
                leftFlangeMesh: component.children.find(c => c.userData.componentType === 'hubFlangeLeft'),
                rightFlangeMesh: component.children.find(c => c.userData.componentType === 'hubFlangeRight')
            };
            
            // Use existing positioning function for internal mesh arrangement
            positionHubFlanges(meshes, geometry);
            
            // Additionally update the group position directly
            component.position.copy(geometry.points.T_end);
            
            // Apply the bike's total rotation
            component.rotation.z = geometry.rotations.total;
        },
        'hubCoreFront': (component, geometry) => positionHubCoreFront(component, geometry),
        'hubEndAssemblyFront': (component, geometry) => {
            // Update group position (position.z is handled internally)
            component.position.copy(geometry.points.frontAxel);
            component.position.z = 0;
        },
        'hubBoltAssemblyFront': (component, geometry) => {
            // Update group position (position.z is handled internally)
            component.position.copy(geometry.points.frontAxel);
            component.position.z = 0;
        },
        
        // HUB COMPONENTS - REAR

        'hubFlangeAssemblyRear': (component, geometry) => {
            // Extract meshes from component
            const meshes = {
                leftFlangeMesh: component.children.find(c => c.userData.componentType === 'hubFlangeRearLeft'),
                rightFlangeMesh: component.children.find(c => c.userData.componentType === 'hubFlangeRearRight')
            };
            
            // Use existing positioning function for internal mesh arrangement
            positionHubFlangesRear(meshes, geometry);
            
            // Additionally update the group position directly
            component.position.copy(geometry.points.S_end);
            
            // Apply the bike's total rotation to the rear hub flange
            component.rotation.z = geometry.rotations.total;
        },
        'hubCoreRear': (component, geometry) => positionHubCoreRear(component, geometry),
        'hubEndAssemblyRear': (component, geometry) => {
            component.position.copy(geometry.points.rearAxel);
            component.position.z = 0;
        },
        'hubEndAssemblyDrive': (component, geometry) => {
            component.position.copy(geometry.points.rearAxel);
            component.position.z = 0;
        },
        'hubBoltAssemblyRear': (component, geometry) => {
            component.position.copy(geometry.points.rearAxel);
            component.position.z = 0;
        },
        
        // PEG COMPONENTS
        'pegAssemblyFront': (component, geometry) => {
            component.position.copy(geometry.points.frontAxel);
            component.position.z = 0; // Z positioning is handled internally
        },
        
        'pegAssemblyRear': (component, geometry) => {
            component.position.copy(geometry.points.rearAxel);
            component.position.z = 0; // Z positioning is handled internally
        },
};
}

// Material update function for repaint optimization
function updateComponentMaterial(component, componentName, params) {
    // Import repaint mappings from updateManager to avoid duplication
    const repaintMappings = dependencies.repaint;
    
    // Special handling configurations for components that need non-standard behavior
    const specialHandling = {
        'seatColor': {
            updateStrategy: 'selective',
            targetComponentType: 'seatMain' // only update seatMain, not seatUnder
        },
        'headsetCoverColor': {
            updateStrategy: 'selective',
            targetComponentType: 'headsetCover' // only update headsetCover, not headsetSpacer
        },
        'headsetSpacerColor': {
            updateStrategy: 'selective',
            targetComponentType: 'headsetSpacer' // only update headsetSpacer, not headsetCover
        },
        'pedalColor': {
            updateStrategy: 'selective',
            targetComponentType: 'pedalMain' // only update pedalMain, not pedalAxle
        },
        'sprocketColor': {
            updateStrategy: 'sprocketSpecial' // Handle sprocket assembly + instanced teeth
        },
        'chainColor': {
            updateStrategy: 'chainSpecial' // Handle all 3 instanced chain meshes
        },
        'nippleColor': {
            updateStrategy: 'nippleSpecial' // Handle instanced nipple mesh
        },
        'frontSpokeAColor': {
            updateStrategy: 'spokeSelectiveA' // Handle front spoke set A only
        },
        'frontSpokeBColor': {
            updateStrategy: 'spokeSelectiveB' // Handle front spoke set B only
        },
        'rearSpokeAColor': {
            updateStrategy: 'spokeSelectiveA' // Handle rear spoke set A only
        },
        'rearSpokeBColor': {
            updateStrategy: 'spokeSelectiveB' // Handle rear spoke set B only
        },
        'bbCoverColor': {
            updateStrategy: 'selective',
            targetComponentType: 'bbCover' // only update bbCover, not bbSpacer
        },
        'bbSpacerColor': {
            updateStrategy: 'selective',
            targetComponentType: 'bbSpacer' // only update bbSpacer, not bbCover
        },
        'tireFrontColor': {
            updateStrategy: 'tireSpecial' // Handle multi-material array
        },
        'tireRearColor': {
            updateStrategy: 'tireSpecial' // Handle multi-material array
        },
        'gripColor': {
            updateStrategy: 'gripSpecial' // Handle complex grip assembly
        }
        // Can add more special cases here as needed
    };
    
    // Helper function to convert color to proper format for Three.js
    const convertColor = (color) => {
        if (typeof color === 'string' && color.startsWith('#')) {
            return parseInt(color.substring(1), 16);
        } else if (typeof color === 'string') {
            return parseInt(color, 16);
        }
        return color;
    };
    
    // Find which parameter affects this component by checking repaint mappings
    // Handle ALL matching parameters (important for components like headsetAssembly with multiple colors)
    for (const [paramName, componentList] of Object.entries(repaintMappings)) {
        if (componentList.includes(componentName)) {
            const color = convertColor(params[paramName]);
            const special = specialHandling[paramName];
            
            // Apply color based on special handling or default behavior
            if (special?.updateStrategy === 'selective') {
                // Selective: only update children with specific componentType
                if (component.children) {
                    component.children.forEach((child) => {
                        if (child.material && child.userData.componentType === special.targetComponentType) {
                            child.material.color.setHex(color);
                        }
                    });
                } else if (component.material) {
                    component.material.color.setHex(color);
                }
            } else if (special?.updateStrategy === 'sprocketSpecial') {
                // Special handling for sprocket: update assembly + instanced teeth
                // Update the sprocket assembly (core + guard)
                if (component.children) {
                    component.traverse((child) => {
                        if (child.material) {
                            child.material.color.setHex(color);
                        }
                    });
                }
                // Update the instanced teeth material
                if (assets.sprocketToothInstancedMesh && assets.sprocketToothInstancedMesh.material) {
                    assets.sprocketToothInstancedMesh.material.color.setHex(color);
                }
            } else if (special?.updateStrategy === 'chainSpecial') {
                // Special handling for chain: update all 3 instanced mesh materials
                if (assets.chainLinkInstancedMesh && assets.chainLinkInstancedMesh.material) {
                    assets.chainLinkInstancedMesh.material.color.setHex(color);
                }
                if (assets.chainFullLinkAInstancedMesh && assets.chainFullLinkAInstancedMesh.material) {
                    assets.chainFullLinkAInstancedMesh.material.color.setHex(color);
                }
                if (assets.chainFullLinkBInstancedMesh && assets.chainFullLinkBInstancedMesh.material) {
                    assets.chainFullLinkBInstancedMesh.material.color.setHex(color);
                }
            } else if (special?.updateStrategy === 'nippleSpecial') {
                // Special handling for nipples: update instanced nipple mesh
                if (assets.spokeNippleInstancedMesh && assets.spokeNippleInstancedMesh.material) {
                    assets.spokeNippleInstancedMesh.material.color.setHex(color);
                }
            } else if (special?.updateStrategy === 'spokeSelectiveA') {
                // Special handling for spoke set A: only update Red (A) spoke groups
                if (component.children) {
                    component.children.forEach((child) => {
                        if (child.userData.componentType && child.userData.componentType.includes('Red')) {
                            child.traverse((spokeChild) => {
                                if (spokeChild.material) {
                                    spokeChild.material.color.setHex(color);
                                }
                            });
                        }
                    });
                }
            } else if (special?.updateStrategy === 'spokeSelectiveB') {
                // Special handling for spoke set B: only update Yellow (B) spoke groups
                if (component.children) {
                    component.children.forEach((child) => {
                        if (child.userData.componentType && child.userData.componentType.includes('Yellow')) {
                            child.traverse((spokeChild) => {
                                if (spokeChild.material) {
                                    spokeChild.material.color.setHex(color);
                                }
                            });
                        }
                    });
                }
            } else if (special?.updateStrategy === 'tireSpecial') {
                // Special handling for tires: multi-material array (base, tread, connector)
                if (component.material && Array.isArray(component.material)) {
                    // Update all materials in the array
                    component.material.forEach((material) => {
                        if (material && material.color) {
                            material.color.setHex(color);
                        }
                    });
                } else if (component.material && component.material.color) {
                    // Fallback for single material
                    component.material.color.setHex(color);
                }
            } else if (special?.updateStrategy === 'gripSpecial') {
                // Special handling for grips: complex group with multiple materials
                if (component.children) {
                    component.traverse((child) => {
                        if (child.material && child.material.color) {
                            child.material.color.setHex(color);
                        }
                    });
                }
            } else {
                // Default: traverse all children and update materials
                if (component.material) {
                    component.material.color.setHex(color);
                } else if (component.children) {
                    component.traverse((child) => {
                        if (child.material) {
                            child.material.color.setHex(color);
                        }
                    });
                }
            }
            // DON'T break - continue checking other parameters that might affect this component
        }
    }
}

export { 
    updateComponentMaterial,
    initComponentRegistry,
    componentGenerators,
    componentPositioners
};