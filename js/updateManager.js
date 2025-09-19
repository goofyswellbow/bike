// updateManager.js - Enhanced parameter-to-component dependency mapping

// Complete list of all components for exclusion logic
const ALL_COMPONENTS = [
    // Frame
    'topTube', 'downTube', 'seatTube', 'headTube', 'bottomBracket',
    
    // Chainstay
    'chainstayBottomAssembly', 'chainstayTopAssembly', 'chainstayEndAssemblyBottom', 
    'chainstayEndAssemblyTop', 'chainstayDropoutAssembly',
    
    // Fork
    'forkAssembly', 'steerTube', 'forkDropoutAssembly',
    
    // Handlebars & Stem
    'handlebarAssembly', 'handlebarCrossbarAssembly', 'gripAssembly', 'barEndAssembly',
    'stemCoreAssembly', 'stemBase', 'stemClamp', 'headsetAssembly',
    
    // Drivetrain
    'crankDrive', 'crankNonDrive', 'crankBoltDrive', 'crankBoltNonDrive',
    'pedalGroupDrive', 'pedalGroupNonDrive', 'bbDrive', 'bbNonDrive',
    'sprocketAssembly', 'sprocketBolt', 'chain', 'driverAssembly',
    
    // Wheels & Hubs
    'rimFront', 'rimRear', 'tireFront', 'tireRear', 'frontSpokes', 'rearSpokes',
    'spokeNipples', 'airNozzleFront', 'airNozzleRear',
    'hubFlangeAssemblyRear','hubFlangeAssembly', 'hubCoreFront', 'hubCoreRear', 
    'hubBoltAssemblyFront', 'hubBoltAssemblyRear',
    'hubEndAssemblyFront', 'hubEndAssemblyRear', 'hubEndAssemblyDrive',
    'pegAssemblyFront', 'pegAssemblyRear',
    
    // Seat
    'seat', 'seatPost', 'seatClamp'
];

// Parameters that require component redrawing (geometry changes)
const dependencies = {
    redraw: {
        // DRIVETRAIN
        'CrankLength': ['crankDrive', 'crankNonDrive'],
        'D2_count': ['sprocketAssembly', 'chain'],
        'D1_count': ['driverAssembly', 'chain'],
        'chainFullEnabled': ['chain'],
        'sprocketGuardEnabled': ['sprocketAssembly'],
        // TEMPORARY: Adding isRHD to redraw for debugging (leftFootForward removed - testing reposition-only)
        'isRHD': ['pedalGroupDrive', 'pedalGroupNonDrive', 'driverAssembly', 'hubEndAssemblyRear', 'hubEndAssemblyDrive', 'sprocketAssembly', 'sprocketBolt', 'bbDrive', 'bbNonDrive',  'chain','crankBoltDrive', 'crankBoltNonDrive','hubCoreRear','crankDrive', 'crankNonDrive', ],

        // HANDLEBAR
        'B_height': ['handlebarAssembly', 'handlebarCrossbarAssembly', 'gripAssembly'],
        'B_width': ['handlebarAssembly', 'handlebarCrossbarAssembly', 'gripAssembly'],
        'Bg_width': ['gripAssembly', 'handlebarAssembly', 'handlebarCrossbarAssembly'],
        'upsweep': ['handlebarAssembly', 'gripAssembly'],
        'backsweep': ['handlebarAssembly', 'gripAssembly'],
        'isFourPiece': ['handlebarAssembly', 'gripAssembly'],
        'hasGripFlange': ['gripAssembly'],
        'barEndEnabled': ['barEndAssembly', 'gripAssembly'],
        'B_rotation': ['gripAssembly'],

        // STEM
        'L_length': ['gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp'],
        'R_length': ['gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp'],

        // HEADSET
        'HS_BaseHeight': ['headsetAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'gripAssembly'],
        'HS_SpacerWidth': ['headsetAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'gripAssembly'],
        'HS_SpacerCount': ['headsetAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'gripAssembly'],

        // BOTTOM BRACKET
        'BB_BaseHeight': ['bbDrive', 'chain'],
        'BB_SpacerWidth': ['bbDrive', 'chain'],
        'BB_SpacerCount': ['bbDrive', 'chain'],
        'BB_BaseHeight_NonD': ['bbNonDrive'],
        'BB_SpacerWidth_NonD': ['bbNonDrive'],
        'BB_SpacerCount_NonD': ['bbNonDrive'],

        // TOGGLES (Component Existence)
        'frontPegEnabled_L': ['pegAssemblyFront'],
        'frontPegEnabled_R': ['pegAssemblyFront'],
        'rearPegEnabled_L': ['pegAssemblyRear'],
        'rearPegEnabled_R': ['pegAssemblyRear'],
        'hubGuardEnabled_L': ['hubEndAssemblyFront'],
        'hubGuardEnabled_R': ['hubEndAssemblyFront'],
        'rearHubGuardEnabled_L': ['hubEndAssemblyDrive'],
        'rearHubGuardEnabled_R': ['hubEndAssemblyRear'],

        // FRAME GEOMETRY
        'A_length': ['topTube', 'downTube', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp'],
        'B_length': ['downTube', 'seatTube', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly'],
        'B_angle': ['downTube', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly'],
        'B_drop': ['downTube', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly'],
        'H_length': ['headTube', 'downTube', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly'],
        'D_angle': ['downTube', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly'],
        'T_length': ['gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly'],

        // FORK
        'F_length': ['downTube', 'forkAssembly', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly'],
        'F_const': ['downTube', 'forkAssembly', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly'],
        'F_mode': ['downTube', 'forkAssembly', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly'],

        // CHAINSTAY
        'S_length': ['downTube', 'chainstayBottomAssembly', 'chainstayTopAssembly', 'chain', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly'],
        'S_const': ['downTube', 'chainstayBottomAssembly', 'chainstayTopAssembly', 'chain', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly'],
        'S_mode': ['downTube', 'chainstayBottomAssembly', 'chainstayTopAssembly', 'chain', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly'],

        // WHEELS
        'R1_size': ['downTube', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly', 'forkAssembly', 'rimFront', 'tireFront', 'frontSpokes'],
        'R2_size': ['downTube', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly', 'chainstayBottomAssembly', 'chainstayTopAssembly', 'rimRear', 'tireRear', 'rearSpokes'],
        'T1_size': ['downTube', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly', 'forkAssembly', 'tireFront', 'frontSpokes'],
        'T2_size': ['downTube', 'gripAssembly', 'stemCoreAssembly', 'stemBase', 'stemClamp', 'forkDropoutAssembly', 'chainstayBottomAssembly', 'chainstayTopAssembly', 'tireRear', 'rearSpokes'],
    },

    reposition: {
        // SEAT (Simple - only affects few components)
        'Z_angle': ['seat'],
        'Z_length': ['seat', 'seatPost'],

        // DRIVETRAIN (Simple repositioning)
        'CrankLength': ['pedalGroupDrive', 'pedalGroupNonDrive'],
        'leftFootForward': ['crankDrive', 'crankNonDrive', 'pedalGroupDrive', 'pedalGroupNonDrive', 'sprocketAssembly', 'sprocketBolt'],
        'isRHD': ['crankDrive', 'crankNonDrive', 'pedalGroupDrive', 'pedalGroupNonDrive', 'sprocketAssembly', 'sprocketBolt', 'bbDrive', 'bbNonDrive', 'driverAssembly', 'chain','crankBoltDrive', 'crankBoltNonDrive','hubCoreRear','hubEndAssemblyRear', 'hubEndAssemblyDrive'],

        // HANDLEBAR (Simple repositioning)
        'B_height': ['barEndAssembly'],
        'B_width': ['barEndAssembly'],
        'Bg_width': ['barEndAssembly'],
        'upsweep': ['barEndAssembly'],
        'backsweep': ['barEndAssembly'],
        'B_rotation': ['handlebarAssembly', 'handlebarCrossbarAssembly', 'barEndAssembly'],

        // STEM (Simple repositioning)
        'L_length': ['handlebarAssembly', 'handlebarCrossbarAssembly', 'barEndAssembly'],
        'R_length': ['handlebarAssembly', 'handlebarCrossbarAssembly', 'barEndAssembly'],

        // HEADSET (Simple repositioning)
        'HS_BaseHeight': ['handlebarAssembly', 'handlebarCrossbarAssembly', 'barEndAssembly'],
        'HS_SpacerWidth': ['handlebarAssembly', 'handlebarCrossbarAssembly', 'barEndAssembly'],
        'HS_SpacerCount': ['handlebarAssembly', 'handlebarCrossbarAssembly', 'barEndAssembly'],

        // BOTTOM BRACKET (Specific positioning effects)
        'BB_BaseHeight': ['crankDrive', 'crankBoltDrive', 'pedalGroupDrive', 'sprocketAssembly', 'sprocketBolt'],
        'BB_SpacerWidth': ['crankDrive', 'crankBoltDrive', 'pedalGroupDrive', 'sprocketAssembly', 'sprocketBolt'],
        'BB_SpacerCount': ['crankDrive', 'crankBoltDrive', 'pedalGroupDrive', 'sprocketAssembly', 'sprocketBolt'],
        'BB_BaseHeight_NonD': ['crankNonDrive', 'crankBoltNonDrive', 'pedalGroupNonDrive'],
        'BB_SpacerWidth_NonD': ['crankNonDrive', 'crankBoltNonDrive', 'pedalGroupNonDrive'],
        'BB_SpacerCount_NonD': ['crankNonDrive', 'crankBoltNonDrive', 'pedalGroupNonDrive'],

        // FRAME GEOMETRY (Major repositioning - affects almost everything)
        'A_length': { all: true, except: ['topTube', 'downTube'] },
        'B_length': { all: true, except: ['downTube', 'seatTube'] },
        'B_angle': { all: true, except: ['downTube'] },
        'B_drop': { all: true, except: ['downTube'] },
        'H_length': { all: true, except: ['headTube', 'downTube'] },
        'D_angle': { all: true, except: ['downTube'] },
        'T_length': { all: true, except: [] },

        // FORK (Major repositioning)
        'F_length': { all: true, except: ['downTube', 'forkAssembly'] },
        'F_const': { all: true, except: ['downTube', 'forkAssembly'] },
        'F_mode': { all: true, except: ['downTube', 'forkAssembly'] },

        // CHAINSTAY (Major repositioning)
        'S_length': { all: true, except: ['downTube', 'chainstayBottomAssembly', 'chainstayTopAssembly', 'chain'] },
        'S_const': { all: true, except: ['downTube', 'chainstayBottomAssembly', 'chainstayTopAssembly', 'chain'] },
        'S_mode': { all: true, except: ['downTube', 'chainstayBottomAssembly', 'chainstayTopAssembly', 'chain'] },

        // WHEELS (Major repositioning)
        'R1_size': { all: true, except: ['rimFront', 'tireFront', 'frontSpokes'] },
        'R2_size': { all: true, except: ['rimRear', 'tireRear', 'rearSpokes'] },
        'T1_size': { all: true, except: ['tireFront', 'frontSpokes'] },
        'T2_size': { all: true, except: ['tireRear', 'rearSpokes'] },
    },

    repaint: {
        // FRAME COLOR
        'frameColor': ['headTube', 'bottomBracket', 'topTube', 'seatTube', 'downTube', 
                      'chainstayBottomAssembly', 'chainstayTopAssembly', 'chainstayDropoutAssembly',
                      'chainstayEndAssemblyBottom', 'chainstayEndAssemblyTop'],
        
        // FORK COLOR
        'forkColor': ['forkAssembly', 'steerTube', 'forkDropoutAssembly'],
        
        // HANDLEBAR COLOR
        'handlebarColor': ['handlebarAssembly', 'handlebarCrossbarAssembly'],
        
        // SEAT COLOR
        'seatColor': ['seat'],
        
        // SPROCKET COLOR (core + guard + instanced teeth)
        'sprocketColor': ['sprocketAssembly'],
        
        // CHAIN COLOR (all 3 instanced chain meshes)
        'chainColor': ['chain'],
        
        // SEAT POST COLOR
        'seatPostColor': ['seatPost'],
        
        // SEAT CLAMP COLOR
        'seatClampColor': ['seatClamp'],
        
        // HEADSET COLORS
        'headsetCoverColor': ['headsetAssembly'],
        'headsetSpacerColor': ['headsetAssembly'],
        
        // STEM COLOR
        'stemColor': ['stemCoreAssembly', 'stemBase', 'stemClamp'],
        
        // PEDAL COLOR
        'pedalColor': ['pedalGroupDrive', 'pedalGroupNonDrive'],
        
        // CRANK COLOR
        'crankColor': ['crankDrive', 'crankNonDrive'],
        
        // BOTTOM BRACKET COLORS
        'bbCoverColor': ['bbDrive', 'bbNonDrive'],
        'bbSpacerColor': ['bbDrive', 'bbNonDrive'],
        
        // BAR END COLOR
        'barEndColor': ['barEndAssembly'],
        
        // REAR HUB COLOR (unified color for core + flanges)
        'rearHubColor': ['hubCoreRear', 'hubFlangeAssemblyRear'],
        
        // FRONT HUB COLOR (unified color for core + flanges)
        'frontHubColor': ['hubCoreFront', 'hubFlangeAssembly'],
        
        // NIPPLE COLOR
        'nippleColor': ['spokeNipples'],
        
        // SPOKE COLORS (multiple colors per component)
        'frontSpokeAColor': ['frontSpokes'],
        'frontSpokeBColor': ['frontSpokes'],
        'rearSpokeAColor': ['rearSpokes'],
        'rearSpokeBColor': ['rearSpokes'],
        
        // RIM COLORS
        'frontRimColor': ['rimFront'],
        'rearRimColor': ['rimRear'],
        
        // TIRE COLORS
        'tireFrontColor': ['tireFront'],
        'tireRearColor': ['tireRear'],
        
        // GRIP COLOR
        'gripColor': ['gripAssembly'],
    }
};

// Track which parameters have changed
let changedParams = new Set();

// Helper function to resolve component lists (handles exclusion syntax)
function resolveComponentList(rule) {
    if (Array.isArray(rule)) {
        return rule; // Simple array
    } else if (rule?.all === true) {
        return ALL_COMPONENTS.filter(comp => !rule.except.includes(comp));
    }
    return [];
}

// Register a parameter change
export function registerParamChange(paramName) {
    changedParams.add(paramName);
}

// Clear change tracking
export function clearChanges() {
    changedParams.clear();
}

// Get components that need redrawing
export function getComponentsToRedraw() {
    const componentsToRedraw = new Set();
    
    changedParams.forEach(param => {
        if (dependencies.redraw[param]) {
            const components = resolveComponentList(dependencies.redraw[param]);
            components.forEach(componentId => {
                componentsToRedraw.add(componentId);
            });
        }
    });
    
    return Array.from(componentsToRedraw);
}

// Get components that only need repositioning
export function getComponentsToReposition() {
    const componentsToReposition = new Set();
    
    changedParams.forEach(param => {
        if (dependencies.reposition[param]) {
            const components = resolveComponentList(dependencies.reposition[param]);
            components.forEach(componentId => {
                componentsToReposition.add(componentId);
            });
        }
    });
    
    return Array.from(componentsToReposition);
}

// Get components that only need repainting (material updates)
export function getComponentsToRepaint() {
    const componentsToRepaint = new Set();
    
    changedParams.forEach(param => {
        if (dependencies.repaint[param]) {
            const components = resolveComponentList(dependencies.repaint[param]);
            components.forEach(componentId => {
                componentsToRepaint.add(componentId);
            });
        }
    });
    
    return Array.from(componentsToRepaint);
}

// For compatibility with existing code
export function getComponentsToUpdate() {
    const componentsToUpdate = new Set([
        ...getComponentsToRedraw(),
        ...getComponentsToReposition()
    ]);
    
    return Array.from(componentsToUpdate);
}

// Check if any changed parameters affect leveling
export function needsLeveling() {
    // Define which parameters affect bike leveling if needed
    const levelingParams = [];
    return Array.from(changedParams).some(param => levelingParams.includes(param));
}

// Check if any changed parameters require skeleton update
export function needsSkeletonUpdate() {
    // Define which parameters affect the bike skeleton if needed
    const skeletonParams = [];
    return Array.from(changedParams).some(param => skeletonParams.includes(param));
}

// Export dependencies object for use by material update function
export { dependencies };

