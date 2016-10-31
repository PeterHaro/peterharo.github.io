//2D port of the 3d animation
var animator = function () {
    "use strict";

    var MAX_TASK_TIME = 150;                  // amount of time before a task yields control (millis)
    var MIN_SLEEP_TIME = 10;                  // amount of time a task waits before resuming (millis)
    var MIN_MOVE = 6;                         // slack before a drag operation beings (pixels)
    var MOVE_END_WAIT = 750;                  // time to wait for a move operation to be considered done (millis)

    var INTENSITY_SCALE_STEP = 10;            // step size of particle intensity color scale
    var PARTICLE_LINE_WIDTH = µ.isFF() ? 1.4 : 1; // line width of a drawn particle
    var PARTICLE_MULTIPLIER = 7;              // particle count scalar (completely arbitrary--this values looks nice)
    var PARTICLE_REDUCTION = 0.75;            // reduce particle count to this much of normal for mobile devices
    var FRAME_RATE = 40;                      // desired milliseconds per frame

    var REMAINING = "▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫";   // glyphs for remaining progress bar
    var COMPLETED = "▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪";   // glyphs for completed progress bar

    var NULL_WIND_VECTOR = [NaN, NaN, NaN];   // undefined location outside the vector field [u, v, m]
    var HOLE_VECTOR = [NaN, NaN, 0];          // signifies a hole in the vector field
    var TRANSPARENT_BLACK = [0, 0, 0, 0];     // singleton 0 rgba

    var isMapConstructed = false;
    var isAnimationPlaying = false;



}();
