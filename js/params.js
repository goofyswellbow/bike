import BikeGUIController from './gui.js';

export function degreesToRadians(deg) {
    return deg * (Math.PI / 180);
}

// Helper function to convert GUI colors to Three.js format
function convertColor(color) {
    // Convert CSS hex string to number for Three.js
    if (typeof color === 'string' && color.startsWith('#')) {
        return parseInt(color.substring(1), 16);
    }
    // Convert decimal to hex if needed (GUI sometimes converts hex to decimal)
    return typeof color === 'number' ? color : parseInt(color, 16);
}

export function getParams() {
    const gui = getGUIController();
    const params = gui.getParameters();
    
    // Map and convert all parameters from GUI structure to flat structure
    return {

        // Frame Geometry
        A_length: params.frameGeometry.A_length,
        B_length: params.frameGeometry.B_length,
        B_angle: degreesToRadians(params.frameGeometry.B_angle),
        B_drop: params.frameGeometry.B_drop,
        H_length: params.frameGeometry.H_length,
        D_angle: degreesToRadians(params.frameGeometry.D_angle),
        Z_length: params.frameGeometry.Z_length,
        Z_angle: params.frameGeometry.Z_angle,
        frameColor: convertColor(params.frameGeometry.frameColor),
        seatColor: convertColor(params.frameGeometry.seatColor),
        seatPostColor: convertColor(params.frameGeometry.seatPostColor),
        seatClampColor: convertColor(params.frameGeometry.seatClampColor),

        // Fork
        T_length: params.fork.T_length,
        F_length: params.fork.F_length,
        F_mode: params.fork.F_mode,
        F_const: params.fork.F_const,
        forkColor: convertColor(params.fork.forkColor),

        // Chainstay
        S_length: params.chainstay.S_length,
        S_mode: params.chainstay.S_mode,
        S_const: params.chainstay.S_const,

        // Wheels
        R1_size: params.wheels.R1_size,
        T1_size: params.wheels.T1_size,
        R2_size: params.wheels.R2_size,
        T2_size: params.wheels.T2_size,

        hubGuardEnabled_L: params.wheels.hubGuardEnabled_L,
        hubGuardEnabled_R: params.wheels.hubGuardEnabled_R,

        rearHubGuardEnabled_L: params.wheels.rearHubGuardEnabled_L,
        rearHubGuardEnabled_R: params.wheels.rearHubGuardEnabled_R,

        frontPegEnabled_L: params.wheels.frontPegEnabled_L,
        frontPegEnabled_R: params.wheels.frontPegEnabled_R,
        rearPegEnabled_L: params.wheels.rearPegEnabled_L,
        rearPegEnabled_R: params.wheels.rearPegEnabled_R,
        sprocketGuardEnabled: params.wheels.sprocketGuardEnabled,
        rearHubColor: convertColor(params.wheels.rearHubColor),
        frontHubColor: convertColor(params.wheels.frontHubColor),
        nippleColor: convertColor(params.wheels.nippleColor),
        frontSpokeAColor: convertColor(params.wheels.frontSpokeAColor),
        frontSpokeBColor: convertColor(params.wheels.frontSpokeBColor),
        rearSpokeAColor: convertColor(params.wheels.rearSpokeAColor),
        rearSpokeBColor: convertColor(params.wheels.rearSpokeBColor),
        frontRimColor: convertColor(params.wheels.frontRimColor),
        rearRimColor: convertColor(params.wheels.rearRimColor),
        tireFrontColor: convertColor(params.wheels.tireFrontColor),
        tireRearColor: convertColor(params.wheels.tireRearColor),

        

        // Drivetrain
        BB_BaseHeight: params.drivetrain.BB_BaseHeight,
        BB_SpacerWidth: params.drivetrain.BB_SpacerWidth,
        BB_SpacerCount: params.drivetrain.BB_SpacerCount,
        // Non-drive side parameters
        BB_BaseHeight_NonD: params.drivetrain.BB_BaseHeight_NonD,
        BB_SpacerWidth_NonD: params.drivetrain.BB_SpacerWidth_NonD,
        BB_SpacerCount_NonD: params.drivetrain.BB_SpacerCount_NonD,
        bbCoverColor: convertColor(params.drivetrain.bbCoverColor),
        bbSpacerColor: convertColor(params.drivetrain.bbSpacerColor),

        CrankLength: params.drivetrain.CrankLength,
        crankColor: convertColor(params.drivetrain.crankColor),
        pedalColor: convertColor(params.drivetrain.pedalColor),
        D2_count: params.drivetrain.D2_count,
        D1_count: params.drivetrain.D1_count,
        sprocketColor: convertColor(params.drivetrain.sprocketColor),
        chainColor: convertColor(params.drivetrain.chainColor),
        chainFullEnabled: params.drivetrain.chainFullEnabled,
        leftFootForward: params.drivetrain.leftFootForward,
        isRHD: params.drivetrain.isRHD,
        

        // Stem/Headset
        HS_BaseHeight: params.stemHeadset.HS_BaseHeight,
        HS_SpacerWidth: params.stemHeadset.HS_SpacerWidth,
        HS_SpacerCount: params.stemHeadset.HS_SpacerCount,
        headsetCoverColor: convertColor(params.stemHeadset.headsetCoverColor),
        headsetSpacerColor: convertColor(params.stemHeadset.headsetSpacerColor),
        stemColor: convertColor(params.stemHeadset.stemColor),
        L_length: params.stemHeadset.L_length,
        R_length: params.stemHeadset.R_length,

        // Handlebar
        B_height: params.handlebar.B_height,
        B_width: params.handlebar.B_width,
        Bg_width: params.handlebar.Bg_width,
        upsweep: params.handlebar.upsweep,
        backsweep: params.handlebar.backsweep,
        B_rotation: params.handlebar.B_rotation,
        isFourPiece: params.handlebar.isFourPiece,
        hasGripFlange: params.handlebar.hasGripFlange,
        barEndEnabled: params.handlebar.barEndEnabled,
        barEndColor: convertColor(params.handlebar.barEndColor),
        handlebarColor: convertColor(params.handlebar.handlebarColor),
        gripColor: convertColor(params.handlebar.gripColor),

        // Development Parameters

        // Front wheel spoke parameters
        hub_radius_F: params.development.hub_radius_F,
        hub_offset_F: params.development.hub_offset_F,
        rim_offset_F: params.development.rim_offset_F,
        hub_red_offset_F: params.development.hub_red_offset_F,
        hub_yellow_offset_F: params.development.hub_yellow_offset_F,
        
        // Rear wheel spoke parameters
        hub_radius_R: params.development.hub_radius_R,
        hub_offset_R: params.development.hub_offset_R,
        rim_offset_R: params.development.rim_offset_R,
        hub_red_offset_R: params.development.hub_red_offset_R,
        hub_yellow_offset_R: params.development.hub_yellow_offset_R,



        frontAxel_Z: params.development.frontAxel_Z,
        midAxel_Z: params.development.midAxel_Z,
        rearAxel_Z: params.development.rearAxel_Z,
        D_width: params.development.D_width,
        SpktAttachDistance: params.development.SpktAttachDistance,
        CrankAttachDistance: params.development.CrankAttachDistance,
        CrankAttachDistance_NonD: params.development.CrankAttachDistance_NonD,
        CrankOffset: params.development.CrankOffset,
        DrvAttachDistance: params.development.DrvAttachDistance,
        P_length: params.development.P_length,
        HS_StemCenter: params.development.HS_StemCenter,

        // Development Fork
        moveD_end: params.developmentFork.moveD_end,
        forkElbowPosition: params.developmentFork.forkElbowPosition,
        forkBase_distance: params.developmentFork.forkBase_distance,
        forkElbow_offset: params.developmentFork.forkElbow_offset,

        // Development Chainstay
        chainstayElbowPosition: params.developmentChainstay.chainstayElbowPosition,
        chainstayEndInset: params.developmentChainstay.chainstayEndInset,
        chainstayEndOffset: params.developmentChainstay.chainstayEndOffset,
        chainstayElbow_offset: params.developmentChainstay.chainstayElbow_offset,
        B_startOffset: params.developmentChainstay.B_startOffset,
        chainstayNeckPos: params.developmentChainstay.chainstayNeckPos,
        chainstayNeckOffset: params.developmentChainstay.chainstayNeckOffset,
        chainstayPitchOffset: params.developmentChainstay.chainstayPitchOffset,
        // Top
        chainstayElbowPosition_T: params.developmentChainstay.chainstayElbowPosition_T,
        chainstayEndInset_T: params.developmentChainstay.chainstayEndInset_T,
        chainstayEndOffset_T: params.developmentChainstay.chainstayEndOffset_T,
        chainstayElbow_offset_T: params.developmentChainstay.chainstayElbow_offset_T,
        B_startOffset_T: params.developmentChainstay.B_startOffset_T,
        chainstayNeckPos_T: params.developmentChainstay.chainstayNeckPos_T,
        chainstayNeckOffset_T: params.developmentChainstay.chainstayNeckOffset_T,

        // Guides
        showGuides: params.guides.showGuides,
        showPointNames: params.guides.showPointNames,
        hideBike: params.guides.hideBike
    };
}

// Create a singleton instance of the GUI controller
let guiController = null;

export function initGUI() {
    if (!guiController) {
        guiController = new BikeGUIController();
    }
    return guiController;
}

export function getGUIController() {
    return guiController || initGUI();
}