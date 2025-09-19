// BikeAPI - Simple frontend interface for bike system
import { registerParamChange } from './updateManager.js';

export class BikeAPI {
    constructor(getGUIController, updateBike) {
        this.getGUIController = getGUIController;
        this.updateBike = updateBike;
        
        // Color group mappings
        this.colorGroups = {
            frame: {
                paramName: 'frameColor',
                group: 'frameGeometry'
            },
            fork: {
                paramName: 'forkColor',
                group: 'fork'
            },
            handlebars: {
                paramName: 'handlebarColor',
                group: 'handlebar'
            },
            seat: {
                paramName: 'seatColor',
                group: 'frameGeometry'
            },
            seatPost: {
                paramName: 'seatPostColor',
                group: 'frameGeometry'
            },
            seatClamp: {
                paramName: 'seatClampColor',
                group: 'frameGeometry'
            },
            headsetCover: {
                paramName: 'headsetCoverColor',
                group: 'stemHeadset'
            },
            headsetSpacer: {
                paramName: 'headsetSpacerColor',
                group: 'stemHeadset'
            },
            stem: {
                paramName: 'stemColor',
                group: 'stemHeadset'
            },
            barEnd: {
                paramName: 'barEndColor',
                group: 'handlebar'
            },
            pedals: {
                paramName: 'pedalColor',
                group: 'drivetrain'
            },
            cranks: {
                paramName: 'crankColor',
                group: 'drivetrain'
            },
            bbCover: {
                paramName: 'bbCoverColor',
                group: 'drivetrain'
            },
            bbSpacer: {
                paramName: 'bbSpacerColor',
                group: 'drivetrain'
            },
            sprocket: {
                paramName: 'sprocketColor',
                group: 'drivetrain'
            },
            chain: {
                paramName: 'chainColor',
                group: 'drivetrain'
            },
            rearHub: {
                paramName: 'rearHubColor',
                group: 'wheels'
            },
            frontHub: {
                paramName: 'frontHubColor',
                group: 'wheels'
            },
            nipples: {
                paramName: 'nippleColor',
                group: 'wheels'
            },
            frontSpokeA: {
                paramName: 'frontSpokeAColor',
                group: 'wheels'
            },
            frontSpokeB: {
                paramName: 'frontSpokeBColor',
                group: 'wheels'
            },
            rearSpokeA: {
                paramName: 'rearSpokeAColor',
                group: 'wheels'
            },
            rearSpokeB: {
                paramName: 'rearSpokeBColor',
                group: 'wheels'
            },
            frontRim: {
                paramName: 'frontRimColor',
                group: 'wheels'
            },
            rearRim: {
                paramName: 'rearRimColor',
                group: 'wheels'
            },
            frontTire: {
                paramName: 'tireFrontColor',
                group: 'wheels'
            },
            rearTire: {
                paramName: 'tireRearColor',
                group: 'wheels'
            },
            grips: {
                paramName: 'gripColor',
                group: 'handlebar'
            }
        };
    }

    // Set color for a group
    setColor(group, color) {
        const colorGroup = this.colorGroups[group];
        if (!colorGroup) return;
        
        console.log(`BikeAPI: Setting ${group} color to ${color}`);
        
        const gui = this.getGUIController();
        gui.updateParameter(colorGroup.group, colorGroup.paramName, color);
        
        registerParamChange(colorGroup.paramName);
        this.updateBike();
    }

    // Get current color for a group
    getColor(group) {
        const colorGroup = this.colorGroups[group];
        if (!colorGroup) return null;
        
        const gui = this.getGUIController();
        const params = gui.getParameters();
        return params[colorGroup.group]?.[colorGroup.paramName];
    }

    // Get available color groups
    getColorableGroups() {
        return Object.keys(this.colorGroups);
    }

    // Set parameter value
    setParam(paramName, value) {
        // Find which group contains this parameter
        const gui = this.getGUIController();
        const params = gui.parameters;
        
        let foundGroup = null;
        let foundParam = null;
        
        // Search through all parameter groups
        for (const [groupName, group] of Object.entries(params)) {
            for (const [key, param] of Object.entries(group)) {
                if (key === paramName) {
                    foundGroup = groupName;
                    foundParam = param;
                    break;
                }
            }
            if (foundGroup) break;
        }
        
        if (!foundGroup) {
            console.warn(`BikeAPI: Parameter '${paramName}' not found`);
            return false;
        }
        
        console.log(`BikeAPI: Setting ${paramName} to ${value}`);
        
        // Handle unit conversion if parameter has units
        let convertedValue = value;
        if (foundParam.unit && foundParam.unit !== 'degree') {
            // Convert from display units to internal units (cm)
            const UnitSystem = {
                CONVERSIONS: {
                    cm: 1,
                    mm: 10,
                    inch: 0.393701
                },
                fromDisplayUnits(displayValue, displayUnit) {
                    return displayValue / this.CONVERSIONS[displayUnit];
                }
            };
            convertedValue = UnitSystem.fromDisplayUnits(value, foundParam.unit);
        }
        
        gui.updateParameter(foundGroup, paramName, convertedValue);
        registerParamChange(paramName);
        this.updateBike();
        
        return true;
    }

    // Get parameter value
    getParam(paramName) {
        const gui = this.getGUIController();
        const params = gui.parameters;
        
        // Search through all parameter groups
        for (const [groupName, group] of Object.entries(params)) {
            if (paramName in group) {
                const param = group[paramName];
                let value = param.value;
                
                // Convert to display units if parameter has units
                if (param.unit && param.unit !== 'degree') {
                    const UnitSystem = {
                        CONVERSIONS: {
                            cm: 1,
                            mm: 10,
                            inch: 0.393701
                        },
                        toDisplayUnits(value, displayUnit) {
                            return value * this.CONVERSIONS[displayUnit];
                        }
                    };
                    value = UnitSystem.toDisplayUnits(value, param.unit);
                }
                
                return value;
            }
        }
        
        return null;
    }

    // Get all parameters
    getAllParams() {
        const gui = this.getGUIController();
        const allParams = {};
        
        // Flatten all parameter groups
        for (const [groupName, group] of Object.entries(gui.parameters)) {
            for (const [paramName, param] of Object.entries(group)) {
                allParams[paramName] = {
                    value: this.getParam(paramName),
                    group: groupName,
                    ...param
                };
            }
        }
        
        return allParams;
    }

    // Get parameter metadata
    getParamMetadata(paramName) {
        const gui = this.getGUIController();
        const params = gui.parameters;
        
        // Search through all parameter groups
        for (const [groupName, group] of Object.entries(params)) {
            if (paramName in group) {
                const param = group[paramName];
                return {
                    group: groupName,
                    label: param.label || paramName,
                    unit: param.unit,
                    min: param.min,
                    max: param.max,
                    step: param.step,
                    type: param.type,
                    readOnly: param.readOnly || false,
                    value: this.getParam(paramName)
                };
            }
        }
        
        return null;
    }
}

// Create BikeAPI instance
export function createBikeAPI(getGUIController, updateBike) {
    return new BikeAPI(getGUIController, updateBike);
}