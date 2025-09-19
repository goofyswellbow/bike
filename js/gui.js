import * as dat from 'dat.gui';
import { registerParamChange } from './updateManager.js';


// Unit conversion system
const UnitSystem = {
  // Base unit definition (what 1 ThreeJS unit equals)
  BASE_UNIT: 'cm',
  
  // Conversion factors relative to base unit
  CONVERSIONS: {
    cm: 1,           // 1 cm = 1 ThreeJS unit (our base)
    mm: 10,          // 10 mm = 1 cm
    inch: 0.393701,  // 0.393701 inches = 1 cm
    degree: 1        // For angles (already in degrees)
  },
  
  // Convert from ThreeJS units (cm) to display units
  toDisplayUnits(value, displayUnit) {
    if (!displayUnit) return value;
    return value * this.CONVERSIONS[displayUnit];
  },
  
  // Convert from display units back to ThreeJS units (cm)
  fromDisplayUnits(displayValue, displayUnit) {
    if (!displayUnit) return displayValue;
    return displayValue / this.CONVERSIONS[displayUnit];
  },
  
  // Round a display value to fixed precision (to avoid floating point issues)
  roundDisplayValue(value, precision = 2) {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }
};

class BikeGUIController {
    constructor() {
        this.leftGui = new dat.GUI({ autoPlace: false });
        this.rightGui = new dat.GUI({ autoPlace: false });

        this.leftGui.domElement.style.position = 'absolute';
        this.leftGui.domElement.style.left = '10px';
        this.leftGui.domElement.style.top = '10px';
        this.rightGui.domElement.style.position = 'absolute';
        this.rightGui.domElement.style.right = '10px';
        this.rightGui.domElement.style.top = '10px';

        this.leftGui.width = 450;
        this.rightGui.width = 350;

        document.body.appendChild(this.leftGui.domElement);
        document.body.appendChild(this.rightGui.domElement);

        this.parameters = {
            // Left Panel Parameters
            frameGeometry: {
                // All frame geometry parameters have units and labels
                // value is the internal value in cm
                // min/max/step are all in converted display units

                
                A_length: { value: 53.34, min: 5, max: 22, step: 0.25, unit: 'inch', label: 'Top Tube Length' },
                B_length: { value: 22.86, min: 2, max: 10, step: 0.25, unit: 'inch', label: 'Seat Tube Length' },
                B_angle: { value: 15, min: -90, max: 90, step: 1, unit: 'degree', label: 'Seat Tube Angle' },
                B_drop: { value: 4, min: -4, max: 4, step: 0.125, unit: 'inch', label: 'Bottom Bracket Drop' },
                bbHeight: { value: 0.00, unit: 'inch', label: 'BB Height (from ground)', readOnly: true, precision: 4 },
                H_length: { value: 9.017, min: 0.5, max: 6, step: 0.125, unit: 'inch', label: 'Head Tube Length' },
                D_angle: { value: -15, min: -45, max: 0, step: 1, unit: 'degree', label: 'Head Tube Angle' },
                Z_length: { value: 5.125, min: 0.5, max: 4, step: 0.125, unit: 'inch', label: 'Seat Post Length' },
                Z_angle: { value: 0, min: -90, max: 90, step: 1, unit: 'degree', label: 'Seat Angle' },
                frameColor: { value: '#800080', type: 'color', label: 'Frame Color' },
                seatColor: { value: '#0f2b87', type: 'color', label: 'Seat Color' },
                seatPostColor: { value: '#404040', type: 'color', label: 'Seat Post Color' },
                seatClampColor: { value: '#303030', type: 'color', label: 'Seat Clamp Color' },
            },
            fork: {
                T_length: { value: 2, min: 0, max: 32, step: 0.1, unit: "mm", label: "Dropout Length" },
                F_length: { value: 12, min: 5, max: 20, step: 0.1 },
                forkColor: { value: '#800080', type: 'color', label: 'Fork Color' },
                F_mode: { value: true },
                F_const: { value: 5, min: 0, max: 10, step: 0.1 },
            },
            chainstay: {
                S_length: { value: 33.02, min: 12, max: 20, step: 0.1, unit: 'inch', label:'Chainstay Length' },
                S_mode: { value: true },
                S_const: { value: 5.5, min: 0, max: 10, step: 0.1 },
            },
            wheels: {
                R1_size: { value: 20.32, min: 4, max: 20, step: 0.1, unit: 'inch', label: 'Front Rim Radius'},
                T1_size: { value: 5.08, min: 0, max: 6, step: 0.1, unit: 'inch', label: 'Front Tire Depth'},
                R2_size: { value: 20.32, min: 4, max: 20, step: 0.1, unit: 'inch', label: 'Rear Rim Radius'},
                T2_size: { value: 5.08, min: 0, max: 6, step: 0.1, unit: 'inch', label: 'Rear Tire Depth'},
                hubGuardEnabled_L: { value: false, label:"Front Hub Gaurd Left" },
                hubGuardEnabled_R: { value: false, label:"Front Hub Gaurd Right" },
                rearHubGuardEnabled_L: { value: false, label:"Rear Hub Gaurd Left" },
                rearHubGuardEnabled_R: { value: false, label:"Rear Hub Gaurd Right" },
                frontPegEnabled_L: { value: false, label:"Front Peg Left" },
                frontPegEnabled_R: { value: false, label:"Front Peg Right" },
                rearPegEnabled_L: { value: false, label:"Rear Peg Left" },
                rearPegEnabled_R: { value: false, label:"Rear Peg Right" },
                sprocketGuardEnabled: { value: false, label:"Sprocket Guard" },
                rearHubColor: { value: '#808080', type: 'color', label: 'Rear Hub Color' },
                frontHubColor: { value: '#808080', type: 'color', label: 'Front Hub Color' },
                nippleColor: { value: '#c0c0c0', type: 'color', label: 'Nipple Color' },
                frontSpokeAColor: { value: '#ff4444', type: 'color', label: 'Front Spoke Set A' },
                frontSpokeBColor: { value: '#44ff44', type: 'color', label: 'Front Spoke Set B' },
                rearSpokeAColor: { value: '#4444ff', type: 'color', label: 'Rear Spoke Set A' },
                rearSpokeBColor: { value: '#ff44ff', type: 'color', label: 'Rear Spoke Set B' },
                frontRimColor: { value: '#888888', type: 'color', label: 'Front Rim Color' },
                rearRimColor: { value: '#888888', type: 'color', label: 'Rear Rim Color' },
                tireFrontColor: { value: '#f0d805', type: 'color', label: 'Front Tire Color' },
                tireRearColor: { value: '#f0d805', type: 'color', label: 'Rear Tire Color' },
            },
            drivetrain: {
                BB_BaseHeight: { value: 1, min: 3, max: 10, step: 0.1, unit: "mm", label: "BB Cover Length" },
                BB_SpacerWidth: { value: 0.2, min: 1, max: 10, step: 0.1, unit: "mm", label: "BB Spacer Length" },
                BB_SpacerCount: { value: 2, min: 0, max: 10, step: 1, label: "BB Spacer Count" },
                BB_BaseHeight_NonD: { value: 1, min: 3, max: 10, step: 0.1, unit: "mm", label: "BB Cover Length (NonDrive)" },
                BB_SpacerWidth_NonD: { value: 0.2, min: 1, max: 10, step: 0.1, unit: "mm", label: "BB Spacer Length (NonDrive)" },
                BB_SpacerCount_NonD: { value: 2, min: 0, max: 10, step: 1, label: "BB Spacer Count (NonDrive)" },
                bbCoverColor: { value: '#404040', type: 'color', label: 'BB Cover Color' },
                bbSpacerColor: { value: '#404040', type: 'color', label: 'BB Spacer Color' },
                CrankLength: { value: 17, min: 85, max: 185, step: 0.1, unit: "mm", label: "Crank Length" },
                crankColor: { value: '#404040', type: 'color', label: 'Crank Color' },
                pedalColor: { value: '#2f3588', type: 'color', label: 'Pedal Color' },
                D2_count: { value: 25, min: 7, max: 45, step: 1 },
                D1_count: { value: 9, min: 7, max: 45, step: 1 },
                sprocketColor: { value: '#ffffff', type: 'color', label: 'Sprocket Color' },
                chainColor: { value: '#888888', type: 'color', label: 'Chain Color' },
                chainFullEnabled: { value: false, label: "Full Link Chain" },
                leftFootForward: { value: true, label: "Left Foot Forward" },
                isRHD: { value: false, label: "Right Hand Drive" },

                
            },
            stemHeadset: {
                HS_BaseHeight: { value: 1, min: 3, max: 18, step: 0.1, unit: "mm", label: "Headset Length" },
                HS_SpacerWidth: { value: 0.3, min: 1, max: 10, step: 0.1, unit: "mm", label: "Headset Spacer Length" },
                HS_SpacerCount: { value: 1, min: 0, max: 10, step: 1, label: "Headset Spacer Count" },
                headsetCoverColor: { value: '#404040', type: 'color', label: 'Headset Cover Color' },
                headsetSpacerColor: { value: '#404040', type: 'color', label: 'Headset Spacer Color' },
                stemColor: { value: '#ffffff', type: 'color', label: 'Stem Color' },
                L_length: { value: 4.3, min: 30, max: 50, step: 0.01, unit: "mm", label: "Stem Reach" },
                R_length: { value: 2.5, min: 5.25, max: 35, step: 0.01, unit: "mm", label: "Stem Rise" },
            },
            handlebar: {
                B_height: { value: 22.86, min: 3, max: 10, step: 0.1, unit: 'inch', label: "Bar Height" },
                B_width: { value: 35.56, min: 3, max: 32, step: 0.1, unit: 'inch', label: "Bar Width" },
                handlebarColor: { value: '#800080', type: 'color', label: 'Handlebar Color' },
                gripColor: { value: '#004fd6', type: 'color', label: 'Grip Color' },
                Bg_width: { value: 19.05, min: 1, max: 8, step: 0.1, unit: 'inch', label: "Bar Grip Width" },
                upsweep: { value: 1, min: 0, max: 20, step: 0.1, unit: 'degree', label: "Upsweep" },
                backsweep: { value: 12, min: 0, max: 20, step: 0.1, unit: 'degree', label: "Backsweep" },
                B_rotation: { value: 0, min: -45, max: 45, step: 0.1, unit: 'degree', label: "Bar Rotation" },
                isFourPiece: { value: false, label: "4 Piece" },
                hasGripFlange: { value: false, label: "Grip Flange" },
                barEndEnabled: { value: true, label: "Bar Ends" },
                barEndColor: { value: '#ffffff', type: 'color', label: 'Bar End Color' },
            },

            // Right Panel Parameters
            development: {
                hub_radius_F: { value: 2.2, min: 0, max: 10, step: 0.1 },
                hub_offset_F: { value: 4.8, min: 0, max: 10, step: 0.1 },
                rim_offset_F: { value: 0, min: 0, max: 10, step: 0.1 },
                hub_red_offset_F: { value: 0, min: 0, max: 10, step: 0.1 },
                hub_yellow_offset_F: { value: 0.3, min: 0, max: 10, step: 0.1 },
                
                hub_radius_R: { value: 2.5, min: 0, max: 10, step: 0.1 },
                hub_offset_R: { value: 5.1, min: 0, max: 10, step: 0.1 },
                rim_offset_R: { value: 0, min: 0, max: 10, step: 0.1 },
                hub_red_offset_R: { value: 0, min: 0, max: 10, step: 0.1 },
                hub_yellow_offset_R: { value: 0.6, min: 0, max: 10, step: 0.1 },

                frontAxel_Z: { value: 5.6, min: 0, max: 10, step: 0.1 },
                midAxel_Z: { value: 3.81, min: 0, max: 10, step: 0.01 },
                rearAxel_Z: { value: 5.7, min: 0, max: 10, step: 0.1 },

                D_width: { value: 1.3, min: 0, max: 2, step: 0.01 },
                SpktAttachDistance: { value: 0.3, min: 0, max: 10, step: 0.1 },
                CrankAttachDistance: { value: 1.7, min: 0, max: 10, step: 0.1 },
                CrankAttachDistance_NonD: { value: 1.4, min: 0, max: 10, step: 0.1 },
                CrankOffset: { value: 0.8, min: 0, max: 10, step: 0.1 },
                DrvAttachDistance: { value: -1.5, min: -3, max: 10, step: 0.1 },

                P_length: { value: 3.5, min: 0, max: 10, step: 0.1 },
                HS_StemCenter: { value: 0.001, min: 0, max: 10, step: 0.001 },
            },

            developmentFork: {
                moveD_end: { value: 1.7, min: 0, max: 10, step: 0.1 },
                forkElbowPosition: { value: 3.2, min: 0, max: 10, step: 0.1 },
                forkBase_distance: { value: 1.7, min: 0, max: 10, step: 0.1 },
                forkElbow_offset: { value: 0.0, min: 0, max: 10, step: 0.1 },
            },
            developmentChainstay: {
                chainstayElbowPosition: { value: 7, min: 0, max: 10, step: 0.1 },
                chainstayEndInset: { value: 4.2, min: 0, max: 10, step: 0.1 },
                chainstayEndOffset: { value: 0.9, min: 0, max: 10, step: 0.1 },
                chainstayElbow_offset: { value: -0.8, min: -10, max: 10, step: 0.1 },
                B_startOffset: { value: 0.8, min: 0, max: 10, step: 0.1 },
                chainstayNeckPos: { value: 2.7, min: 0, max: 10, step: 0.1 },
                chainstayNeckOffset: { value: 1, min: 0, max: 10, step: 0.1 },
                chainstayPitchOffset: { value: 1, min: -45, max: 45, step: 1 }, 
                
                chainstayElbowPosition_T: { value: 9.3, min: 0, max: 10, step: 0.1 },
                chainstayEndInset_T: { value: 4.1, min: 0, max: 10, step: 0.1 },
                chainstayEndOffset_T: { value: 1.0, min: 0, max: 10, step: 0.1 },
                chainstayElbow_offset_T: { value: -0.9, min: -10, max: 10, step: 0.1 },
                B_startOffset_T: { value: 0.9, min: 0, max: 10, step: 0.1 },
                chainstayNeckPos_T: { value: 0.3, min: 0, max: 10, step: 0.1 },
                chainstayNeckOffset_T: { value: 0.3, min: 0, max: 10, step: 0.1 },
            },
            guides: {
                showGuides: { value: false, label: "Show Guides" },
                showPointNames: { value: false, label: "Show Point Names" },
                hideBike: { value: false, label: "Hide Bike" },
            },
        };

        this.setupGUI();
    }

    setupGUI() {
        // Left Panel Folders
        const frameFolder = this.leftGui.addFolder('Frame Geometry');
        this.addControllers(frameFolder, this.parameters.frameGeometry);

        const forkFolder = this.leftGui.addFolder('Fork');
        this.addControllers(forkFolder, this.parameters.fork);

        const chainstayFolder = this.leftGui.addFolder('Chainstay');
        this.addControllers(chainstayFolder, this.parameters.chainstay);

        const wheelsFolder = this.leftGui.addFolder('Wheels');
        this.addControllers(wheelsFolder, this.parameters.wheels);

        const drivetrainFolder = this.leftGui.addFolder('Drivetrain');
        this.addControllers(drivetrainFolder, this.parameters.drivetrain);

        const stemHeadsetFolder = this.leftGui.addFolder('Stem/Headset');
        this.addControllers(stemHeadsetFolder, this.parameters.stemHeadset);

        const handlebarFolder = this.leftGui.addFolder('Handlebar');
        this.addControllers(handlebarFolder, this.parameters.handlebar);

        // Right Panel Folders
        const devFolder = this.rightGui.addFolder('Development');
        this.addControllers(devFolder, this.parameters.development);

        const developmentForkFolder = this.rightGui.addFolder('Development Fork');
        this.addControllers(developmentForkFolder, this.parameters.developmentFork);

        const developmentChainstayFolder = this.rightGui.addFolder('Development Chainstay');
        this.addControllers(developmentChainstayFolder, this.parameters.developmentChainstay);

        const guidesFolder = this.rightGui.addFolder('Guides');
        this.addControllers(guidesFolder, this.parameters.guides);

        // Open all folders by default
        this.leftGui.open();
        this.rightGui.open();
    }

    addControllers(folder, params) {
        Object.entries(params).forEach(([key, param]) => {
            // Check if the parameter is a boolean
            if (typeof param.value === 'boolean') {
                const controller = folder.add(param, 'value')
                    .name(param.label || key)
                    .onChange(() => {
                        registerParamChange(key);
                        if (this.onParameterChange) {
                            this.onParameterChange();
                        }
                    });
                
                const nameElement = controller.domElement.querySelector('.property-name');
                if (nameElement) {
                    nameElement.style.width = '180px';
                }
            } else if (param.type === 'color') {
                // Handle color picker controls
                const controller = folder.addColor(param, 'value')
                    .name(param.label || key)
                    .onChange(() => {
                        registerParamChange(key);
                        if (this.onParameterChange) {
                            this.onParameterChange();
                        }
                    });
                
                const nameElement = controller.domElement.querySelector('.property-name');
                if (nameElement) {
                    nameElement.style.width = '180px';
                }
            } else if (param.options) {
                // Handle dropdown/select controls with options
                const controller = folder.add(param, 'value', param.options)
                    .name(param.label || key)
                    .onChange(() => {
                        registerParamChange(key);
                        if (this.onParameterChange) {
                            this.onParameterChange();
                        }
                    });
                
                const nameElement = controller.domElement.querySelector('.property-name');
                if (nameElement) {
                    nameElement.style.width = '180px';
                }
            } else if (param.readOnly) {
                // Handle read-only parameters (like BB Height)
                // Create a wrapper that only handles the display conversion
                const readOnlyWrapper = {
                    get value() {
                        // Use more decimal places for read-only values (4 instead of default 2)
                        const displayValue = UnitSystem.toDisplayUnits(param.value, param.unit);
                        return param.precision ? 
                            displayValue.toFixed(param.precision) : 
                            UnitSystem.roundDisplayValue(displayValue);
                    }
                };
                
                // Create a controller that doesn't have min/max/step (it's just for display)
                const controller = folder.add(readOnlyWrapper, 'value')
                    .name(`${param.label || key} (${param.unit})`)
                    .listen();  // Make it update when value changes
                
                // Style it to look read-only
                controller.domElement.style.pointerEvents = 'none';
                controller.domElement.style.opacity = '0.7';
                
                const nameElement = controller.domElement.querySelector('.property-name');
                if (nameElement) {
                    nameElement.style.width = '180px';
                }
            } else {
                // For parameters with units
                if (param.unit) {
                    // Create a wrapper object for the GUI that will handle the unit conversion
                    const displayWrapper = {
                        get value() {
                            // Convert internal value to display units and round to avoid floating point issues
                            return UnitSystem.roundDisplayValue(
                                UnitSystem.toDisplayUnits(param.value, param.unit)
                            );
                        },
                        set value(displayValue) {
                            // Convert display units back to internal units (cm)
                            param.value = UnitSystem.fromDisplayUnits(displayValue, param.unit);
                        }
                    };
                    
                    // Create GUI controller with min/max/step already in display units
                    const controller = folder.add(displayWrapper, 'value', param.min, param.max)
                        .name(`${param.label || key} (${param.unit})`)
                        .step(param.step)
                        .onChange(() => {
                            registerParamChange(key);
                            if (this.onParameterChange) {
                                this.onParameterChange();
                            }
                        });
                    
                    const nameElement = controller.domElement.querySelector('.property-name');
                    if (nameElement) {
                        nameElement.style.width = '180px';
                    }

                    // For number input, set the precision
                    if (controller.__input) {
                        const precision = param.precision || 2; // Use parameter's precision or default to 2
                        controller.__input.value = displayWrapper.value.toFixed(precision);
                    }
                } else {
                    // Use normal controller for parameters without units
                    const controller = folder.add(param, 'value', param.min, param.max)
                        .name(key)
                        .step(param.step)
                        .onChange(() => {
                            registerParamChange(key);
                            if (this.onParameterChange) {
                                this.onParameterChange();
                            }
                        });
                    
                    const nameElement = controller.domElement.querySelector('.property-name');
                    if (nameElement) {
                        nameElement.style.width = '180px';
                    }
                }
            }
        });
    }

    setOnChange(callback) {
        this.onParameterChange = callback;
    }

    getParameters() {
        // Return the internal values (in ThreeJS units/cm) directly
        const simpleParams = {};
        Object.entries(this.parameters).forEach(([groupKey, group]) => {
            simpleParams[groupKey] = {};
            Object.entries(group).forEach(([paramKey, param]) => {
                simpleParams[groupKey][paramKey] = param.value;
            });
        });
        return simpleParams;
    }

    getParameterGroup(groupName) {
        // Convert the parameter group back to simple values
        const simpleGroup = {};
        Object.entries(this.parameters[groupName] || {}).forEach(([key, param]) => {
            simpleGroup[key] = param.value;
        });
        return simpleGroup;
    }

    updateParameter(group, paramName, value) {
        if (this.parameters[group] && paramName in this.parameters[group]) {
            // Save internal value directly (assumes value is already in ThreeJS units/cm)
            this.parameters[group][paramName].value = value;
            
            // Update GUI display
            [this.leftGui, this.rightGui].forEach(gui => {
                const folder = gui.__folders[group];
                if (folder) {
                    folder.__controllers.forEach(controller => {
                        const param = this.parameters[group][paramName];
                        const displayName = param.label || paramName;
                        const nameWithUnit = param.unit ? `${displayName} (${param.unit})` : displayName;
                        
                        if (controller.property === 'value' && 
                            (controller._name === paramName || controller._name === nameWithUnit)) {
                            controller.updateDisplay();
                        }
                    });
                }
            });
        }
    }

    destroy() {
        this.leftGui.destroy();
        this.rightGui.destroy();
    }
}

export default BikeGUIController;