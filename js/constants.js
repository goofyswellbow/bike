// All MEMBERS configurations
console.log('Loading constants.js...');

//
export const FRAME_MEMBERS = {
    topTube: {
        name: 'topTube',
        type: 'tube',
        pointRefs: {
            start: 'B_end',
            end: 'A_end'
        },
        params: {
            diameter: 3.1  // We can update this with actual params later
        }
    },
    downTube: {
      name: 'downTube',
      type: 'tube',
      pointRefs: {
          start: 'B_start',
          end: 'F_end'
      },
      params: {
          diameter: 3.5,
          offset: 3.5  // How far to offset from F_end
      }
  },
  seatTube: {
      name: 'seatTube',
      type: 'tube',
      pointRefs: {
          start: 'B_start',
          end: 'B_end'
      },
      params: {
          diameter: 2.8,
          extension: 2  // How far to extend beyond B_end
      }
  },
    headTube: {
      name: 'headTube',
      type: 'tube',
      pointRefs: {
          start: 'F_end',
          end: 'P_end'
      },
      params: {
          diameter: 1.45,
          extension: 5.5
      }
  },
  bottomBracket: {
      name: 'bottomBracket',
      type: 'tube',
      pointRefs: {
          start: 'B_start',
          end: 'midAxel'
      },
      params: {
          diameter: 1.8  // Adjust this value as needed
      }
  }
};
  
export const FORK_MEMBERS = {
    leftFork: {
        name: 'leftFork',
        type: 'fork',
        params: {
            baseRadius: 1.6,         // Starting (maximum) radius of the fork
            startTaper: 0.3,         // Position where first taper begins (0-1)
            endTaper: 0.9,          // Position where final taper begins (0-1)
            endRadius: 1.2,        // Final radius at the tip
            taperCurve: 0.1,         // Controls how pronounced the tapers are
            bevelDistance: 2.8,
            bevelDivisions: 8
        }
    },
    steerTube: {
        name: 'steerTube',
        type: 'tube',
        params: {
            radius: 1.6,         // Radius of the steertube
            extension: 2.7,        // How much to extend beyond moveD_end
            segments: 32         // Number of radial segments
        }
    }
    // Add additional fork members here if needed
};

export const BAR_MEMBERS = {
    barTube: {
        name: 'barTube',
        type: 'tube',
        params: {
            baseRadius: 1,         // Base radius of the handlebar tube
            segments: 32,            // Tube segments
            radialSegments: 16,      // Radial segments
            cornerBevel: {
                distance: 3,       // How far from B_corner to start/end bevel
                divisions: 16         // How smooth the B_corner bevel is
            },
            gripBevel: {
                distance: 3,       // How far from Bg_end to start/end bevel
                divisions: 16         // How smooth the Bg_end bevel is
            }
        }
    },
    crossbarTube: {
        name: 'crossbarTube',
        type: 'tube',
        params: {
            baseRadius: 0.8,         // Thinner radius for crossbar
            segments: 32,            // Tube segments
            radialSegments: 16       // Radial segments
        }
    }
};

export const CHAINSTAY_MEMBERS = {
    bottomStay: {
        name: 'bottomStay',
        type: 'tube',
        params: {
            baseRadius: 0.9,         // Base radius of the chainstay tube
            segments: 32,             // Tube segments
            radialSegments: 16,       // Radial segments
            neckBevel: {
                distance: 1.2,        // How far from chainstayNeck to start/end bevel
                divisions: 8          // How smooth the neck bevel is
            },
            elbowBevel: {
                distance: 1.5,        // How far from chainstayElbow to start/end bevel
                divisions: 8          // How smooth the elbow bevel is
            }
        }
    },
    topStay: {
        name: 'topStay',
        type: 'tube',
        params: {
            baseRadius: 0.85,         // Base radius of the chainstay tube
            segments: 32,             // Tube segments
            radialSegments: 16,       // Radial segments
            elbowBevel: {
                distance: 1.5,        // How far from chainstayElbow to start/end bevel
                divisions: 8          // How smooth the elbow bevel is
            }
        }
    }
};

export const STEM_MEMBERS = {
    stemProfile: {
        name: 'stemProfile',
        type: 'stem',
        params: {
            fixedROffset: 0.4,     
            fixedCenterOffset: 0.7,
            depth: 0.6,  // Base extrusion depth
            leftOffset: 0.2  // New parameter for additional left face offset
        }
    }
};

console.log('Constants loaded:', {
    FRAME_MEMBERS,
    FORK_MEMBERS,
    BAR_MEMBERS,
    CHAINSTAY_MEMBERS,
    STEM_MEMBERS
});
//

