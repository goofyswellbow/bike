// registry.js

export const componentRegistry = {


    // DRIVETRAIN
    chain: null,
    sprocketAssembly: null,
    driverAssembly: null,
    sprocketBolt: null,
    crankDrive: null,
    crankBoltDrive: null,
    crankBoltNonDrive: null,
    crankNonDrive: null,
    bbDrive: null,
    bbNonDrive: null,
    pedalGroupDrive: null,    
    pedalGroupNonDrive: null, 
    // SEAT
    seat: null,
    seatPost: null,
    seatClamp: null,
    // FRONT HUB
    hubFlangeAssembly: null,
    hubCoreFront: null,
    hubEndAssemblyFront: null,
    hubBoltAssemblyFront: null,
    pegAssemblyFront: null,
    // REAR HUB
    hubFlangeAssemblyRear: null,
    hubCoreRear: null,
    hubEndAssemblyRear: null,
    hubEndAssemblyDrive: null,
    hubBoltAssemblyRear: null,
    pegAssemblyRear: null,
    // SPOKES ETC
    rearSpokes: null,
    frontSpokes: null,
    spokeNipples: null,
    airNozzleFront: null,
    airNozzleRear: null,
    // RIMS
    rimFront: null,
    rimRear: null,
    // TIRES
    tireFront: null,
    tireRear: null,
    // FORK
    forkAssembly: null,
    steerTube: null,
    forkDropoutAssembly: null,
    // FRAME
    headTube: null,
    bottomBracket: null,
    topTube: null,
    seatTube: null,
    downTube: null,
    chainstayBottomAssembly: null,
    chainstayTopAssembly: null,
    chainstayDropoutAssembly: null,
    chainstayEndAssemblyBottom: null,
    chainstayEndAssemblyTop: null,
    // HEADSET
    headsetAssembly: null,

    // STEM
    stemCoreAssembly: null,  
    stemBase: null,   
    stemClamp: null,      
    
    // BARS
    handlebarAssembly: null,
    handlebarCrossbarAssembly: null,
    barEndAssembly: null,
    gripAssembly: null, // refactor



    // Clear all references
    clear() {
        // DRIVETRAIN
        this.chain = null;
        this.sprocketAssembly = null;
        this.driverAssembly = null;
        this.sprocketBolt = null;
        this.crankDrive = null;
        this.crankNonDrive = null;
        this.crankBoltDrive = null,
        this.crankBoltNonDrive = null,
        this.bbDrive = null,
        this.bbNonDrive = null,
        this.pedalGroupDrive = null;
        this.pedalGroupNonDrive = null;
        // SEAT
        this.seat = null;
        this.seatPost = null;
        this.seatClamp = null;
        // FRONT HUB
        this.hubFlangeAssembly = null;
        this.hubCoreFront = null;
        this.hubEndAssemblyFront = null;
        this.hubBoltAssemblyFront = null;
        this.pegAssemblyFront = null;
        // REAR HUB
        this.hubFlangeAssemblyRear = null;
        this.hubCoreRear = null;
        this.hubEndAssemblyRear = null;
        this.hubEndAssemblyDrive = null;
        this.hubBoltAssemblyRear = null;
        this.pegAssemblyRear = null;
        // SPOKES ETC
        this.rearSpokes = null;
        this.frontSpokes = null;
        this.spokeNipples = null;
        this.airNozzleFront = null;
        this.airNozzleRear = null;
        // RIMS
        this.rimFront = null;
        this.rimRear = null;
        // RIMS
        this.tireFront = null;
        this.tireRear = null;
        // FORK
        this.forkAssembly = null;
        this.steerTube = null;
        this.forkDropoutAssembly = null;
        // FRAME
        this.headTube = null;
        this.bottomBracket = null;
        this.topTube = null;
        this.seatTube = null;
        this.downTube = null;
        this.chainstayBottomAssembly = null;
        this.chainstayTopAssembly = null;
        this.chainstayDropoutAssembly = null;
        this.chainstayEndAssemblyBottom = null;
        this.chainstayEndAssemblyTop = null;
        //BARS
        this.handlebarAssembly = null;
        this.handlebarCrossbarAssembly = null;
        this.barEndAssembly = null;
        this.gripAssembly = null;
        // HEADSET
        this.headsetAssembly = null;
        // STEM
        this.stemCoreAssembly = null;
        this.stemBase = null;
        this.stemClamp = null;
    }
};