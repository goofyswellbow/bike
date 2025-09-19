// Centralized material definitions for Proto.Bike components
import * as THREE from 'three';

// Material configurations for each component
export const ComponentMaterials = {
    // Frame components
    headTube: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false
    },
    topTube: {
        color: 0xffffff,
        roughness: 0,
        metalness: 0.1,
        wireframe: false
    },
    seatTube: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false
    },
    downTube: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false
    },
    bottomBracket: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false
    },
    // Chainstay components
    chainstayBottomEndAssembly: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false
    },
    chainstayTopEndAssembly: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false
    },
    chainstayDropoutAssembly: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false
    },
    chainstayBottomAssembly: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false,
        side: THREE.DoubleSide
    },
    chainstayTopAssembly: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Handlebar components
    handlebarAssembly: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false,
        side: THREE.DoubleSide
    },
    handlebarCrossbarAssembly: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false,
        side: THREE.DoubleSide
    },
    handlebarEndCap: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Fork components
    forkAssembly: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false
    },
    steerTube: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false
    },
    forkDropoutAssembly: {
        color: 0x800080,
        roughness: 0,
        metalness: 0.1,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Seat components
    seat: {
        color: 0x0f2b87,
        metalness: 0.1,
        roughness: 0.8,
        wireframe: false,
        side: THREE.DoubleSide
    },
    seatUnder: {
        color: 0x404040,
        metalness: 0.2,
        roughness: 0.7,
        wireframe: false,
        side: THREE.DoubleSide
    },
    seatPost: {
        color: 0x404040,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    seatClamp: {
        color: 0x303030,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Headset components
    headsetCover: {
        color: 0x404040,
        metalness: 0.8,
        roughness: 0.1,
        wireframe: false,
        side: THREE.DoubleSide
    },
    headsetSpacer: {
        color: 0x404040,
        metalness: 0.8,
        roughness: 0.1,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Stem components (unified color for all 3 stem parts)
    stemCore: {
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.1,
        wireframe: false,
        side: THREE.DoubleSide
    },
    stemBase: {
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.1,
        wireframe: false,
        side: THREE.DoubleSide
    },
    stemClamp: {
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.1,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Bar end components (unified color for left and right bar ends)
    barEnd: {
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Pedal components
    pedalBody: {
        color: 0x2f3588,
        metalness: 0.4,
        roughness: 0.4,
        wireframe: false,
        side: THREE.DoubleSide
    },
    pedalAxle: {
        color: 0x404040,
        metalness: 0.4,
        roughness: 0.4,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Bottom Bracket components
    bbCover: {
        color: 0x404040,
        metalness: 0.9,
        roughness: 0.2,
        envMapIntensity: 1.0,
        wireframe: false,
        side: THREE.DoubleSide
    },
    bbSpacer: {
        color: 0x404040,
        metalness: 0.9,
        roughness: 0.2,
        envMapIntensity: 1.0,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Crank components
    crankArm: {
        color: 0x404040,
        metalness: 0.9,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Bolt components
    bolt: {
        color: 0x404040,
        metalness: 0.9,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Sprocket components (unified color for all 3 sprocket components)
    sprocketCore: {
        color: 0xffffff,
        metalness: 0.9,
        roughness: 0.2,
        envMapIntensity: 1.0,
        wireframe: false,
        side: THREE.DoubleSide
    },
    sprocketGuard: {
        color: 0xffffff,
        metalness: 0.9,
        roughness: 0.2,
        envMapIntensity: 1.0,
        wireframe: false,
        side: THREE.DoubleSide
    },
    sprocketTooth: {
        color: 0xffffff,
        metalness: 0.9,
        roughness: 0.0,
        envMapIntensity: 1.0,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Driver components (no GUI control - fixed dark gray)
    driverCore: {
        color: 0x404040,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    driverAttach: {
        color: 0x040404, // Darker color for attach part
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    driverTooth: {
        color: 0x404040,
        metalness: 0.9,
        roughness: 0.0,
        envMapIntensity: 1.0,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Chain components (unified color for all 3 chain link types)
    chainLink: {
        color: 0x888888,
        metalness: 0.9,
        roughness: 0.0,
        envMapIntensity: 1.0,
        wireframe: false
    },
    chainFullLinkA: {
        color: 0x888888,
        metalness: 0.9,
        roughness: 0.0,
        envMapIntensity: 1.0,
        wireframe: false
    },
    chainFullLinkB: {
        color: 0x888888,
        metalness: 0.9,
        roughness: 0.0,
        envMapIntensity: 1.0,
        wireframe: false
    },
    // Rear Hub components (color-controlled)
    hubCoreRear: {
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    hubFlangeRear: {
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Rear Hub components (non-color, migrate only)
    hubEndRear: {
        color: 0x222222,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    hubGuardRear: {
        color: 0x404040,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    hubGuardDrive: {
        color: 0x404040,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    hubBoltRear: {
        color: 0x404040,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false
    },
    pegRear: {
        color: 0x404040,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false
    },
    // Front Hub components (color-controlled)
    hubCoreFront: {
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    hubFlangeFront: {
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Front Hub components (non-color, migrate only)
    hubEndFront: {
        color: 0x222222,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    hubGuardFront: {
        color: 0x404040,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    hubBoltFront: {
        color: 0x030303,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false
    },
    pegFront: {
        color: 0x404040,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false
    },
    // Spoke Nipple components (color-controlled)
    spokeNipple: {
        color: 0xc0c0c0,
        metalness: 0.9,
        roughness: 0.0,
        envMapIntensity: 1.0,
        wireframe: false
    },
    // Spoke components (color-controlled)
    spokeSetA: {
        color: 0xff4444,
        roughness: 0,
        metalness: 0.1,
        wireframe: false
    },
    spokeSetB: {
        color: 0x44ff44,
        roughness: 0,
        metalness: 0.1,
        wireframe: false
    },
    // Rim components (color-controlled)
    rimFront: {
        color: 0x888888,
        metalness: 0.9,
        roughness: 0.1,
        envMapIntensity: 1.0,
        wireframe: false,
        side: THREE.DoubleSide
    },
    rimRear: {
        color: 0x888888,
        metalness: 0.9,
        roughness: 0.1,
        envMapIntensity: 1.0,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Air Nozzle components (no color control, migrate only)
    airNozzle: {
        color: 0x303030,
        metalness: 0.9,
        roughness: 0.2,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Tire components (color-controlled) - Multi-material arrays
    tireFrontBase: {
        color: 0xf0d805,
        metalness: 0.1,
        roughness: 0.8,
        wireframe: false,
        side: THREE.DoubleSide
    },
    tireFrontTread: {
        color: 0xf0d805,
        metalness: 0.1,
        roughness: 0.9,
        wireframe: false,
        side: THREE.DoubleSide
    },
    tireFrontConnector: {
        color: 0xf0d805,
        metalness: 0.1,
        roughness: 0.8,
        wireframe: false,
        side: THREE.DoubleSide
    },
    tireRearBase: {
        color: 0xf0d805,
        metalness: 0.1,
        roughness: 0.8,
        wireframe: false,
        side: THREE.DoubleSide
    },
    tireRearTread: {
        color: 0xf0d805,
        metalness: 0.1,
        roughness: 0.9,
        wireframe: false,
        side: THREE.DoubleSide
    },
    tireRearConnector: {
        color: 0xf0d805,
        metalness: 0.1,
        roughness: 0.8,
        wireframe: false,
        side: THREE.DoubleSide
    },
    // Grip components (color-controlled)
    gripPlain: {
        color: 0x004fd6,
        metalness: 0.1,
        roughness: 0.9,
        wireframe: false,
        side: THREE.DoubleSide
    },
    gripTextured: {
        color: 0x004fd6,
        metalness: 0.1,
        roughness: 0.9,
        wireframe: false,
        side: THREE.DoubleSide
    }
};

// Create material for a specific component
export function createComponentMaterial(componentName, overrides = {}) {
    const config = ComponentMaterials[componentName];
    
    if (!config) {
        console.warn(`No material config for component: ${componentName}`);
        // Use headTube as fallback
        return createComponentMaterial('headTube', overrides);
    }

    return new THREE.MeshStandardMaterial({
        color: overrides.color !== undefined ? overrides.color : config.color,
        roughness: overrides.roughness !== undefined ? overrides.roughness : config.roughness,
        metalness: overrides.metalness !== undefined ? overrides.metalness : config.metalness,
        wireframe: overrides.wireframe !== undefined ? overrides.wireframe : config.wireframe,
        side: overrides.side !== undefined ? overrides.side : config.side,
        envMapIntensity: overrides.envMapIntensity !== undefined ? overrides.envMapIntensity : config.envMapIntensity
    });
}

// Create tire material arrays for multi-material meshes
export function createTireMaterials(tireType, tireColor, normalMap = null) {
    const baseMaterial = createComponentMaterial(`${tireType}Base`, { color: tireColor });
    
    const treadMaterial = createComponentMaterial(`${tireType}Tread`, { color: tireColor });
    if (normalMap) {
        treadMaterial.normalMap = normalMap;
        treadMaterial.normalScale = new THREE.Vector2(1.5, 1.5);
    }
    
    const connectorMaterial = createComponentMaterial(`${tireType}Connector`, { color: tireColor });

    return [baseMaterial, treadMaterial, connectorMaterial];
}

// Create grip material pair for plain and textured sections
export function createGripMaterials(gripColor, normalMap = null) {
    const plainMaterial = createComponentMaterial('gripPlain', { color: gripColor });
    
    const texturedMaterial = createComponentMaterial('gripTextured', { color: gripColor });
    if (normalMap) {
        texturedMaterial.normalMap = normalMap;
        texturedMaterial.normalScale = new THREE.Vector2(1.5, 1.5);
    }
    
    return { plainMaterial, texturedMaterial };
}