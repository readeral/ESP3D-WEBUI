// Display the XY-plane projection of a GCode toolpath on a 2D canvas

var root = window;

var canvas = id("small-toolpath");
var tp = canvas.getContext("2d");
var tpRect;

tp.lineWidth = 0.1;
tp.lineCap = 'round';
tp.strokeStyle = 'blue';

var tpUnits = 'G21';

var tpBbox = {
    min: {
        x: Infinity,
        y: Infinity
    },
    max: {
        x: -Infinity,
        y: -Infinity
    }
};
var bboxIsSet = false;

var resetBbox = function() {
    tpBbox.min.x = Infinity;
    tpBbox.min.y = Infinity;
    tpBbox.max.x = -Infinity;
    tpBbox.max.y = -Infinity;
    tpBboxIsSet = false;

}

// Project the 3D toolpath onto the 2D Canvas
// The coefficients determine the type of projection
// Matrix multiplication written out
var xx = 0.707;
var xy = 0.707;
var xz = 0.0;
var yx = -0.707/2;
var yy = 0.707/2;
var yz = 1.0;
var isoView = function() {
    xx = 0.707;
    xy = 0.707;
    xz = 0.0;
    yx = -0.707;
    yy = 0.707;
    yz = 1.0;
}
var topView = function() {
    xx = 1.0;
    xy = 0.0;
    xz = 0.0;
    yx = 0.0;
    yy = 1.0;
    yz = 0.0;
}
var projection = function(inpoint) {
    outpoint = {}
    outpoint.x = inpoint.x * xx + inpoint.y * xy + inpoint.z * xz;
    outpoint.y = inpoint.x * yx + inpoint.y * yy + inpoint.z * yz;
    return outpoint;
}

var formatLimit = function(mm) {
    return (tpUnits == 'G20') ? (mm/25.4).toFixed(3)+'"' : mm.toFixed(2)+'mm';
}

var toolX = null;
var toolY = null;
var toolSave = null;
var toolRadius = 6;
var toolRectWH = toolRadius*2 + 4;  // Slop to encompass the entire image area

var drawTool = function(pos) {
    pp = projection(pos)
    toolX = xToPixel(pp.x)-toolRadius-2;
    toolY = yToPixel(pp.y)-toolRadius-2;
    toolSave = tp.getImageData(toolX, toolY, toolRectWH, toolRectWH);

    tp.beginPath();
    tp.strokeStyle = 'magenta';
    tp.fillStyle = 'magenta';
    tp.arc(pp.x, pp.y, toolRadius/scaler, 0, Math.PI*2, true);
    tp.fill();
    tp.stroke();
}

var drawOrigin = function(radius) {
    po = projection({x: 0.0, y:0.0, z:0.0})
    tp.beginPath();
    tp.strokeStyle = 'red';
    tp.arc(po.x, po.y, radius, 0, Math.PI*2, false);
    tp.moveTo(-radius*1.5, 0);
    tp.lineTo(radius*1.5, 0);
    tp.moveTo(0,-radius*1.5);
    tp.lineTo(0, radius*1.5);
    tp.stroke();
}

var xOffset = 0;
var yOffset = 0;
var scaler = 1;
var xToPixel = function(x) { return scaler * x + xOffset; }
var yToPixel = function(y) { return -scaler * y + yOffset; }

var transformCanvas = function() {
    toolSave = null;
    if (tpRect == undefined) {
        tpRect = canvas.parentNode.getBoundingClientRect();
        canvas.width = tpRect.width;
        canvas.height = tpRect.height;
    }

    // Reset the transform and clear the canvas
    tp.setTransform(1,0,0,1,0,0);
    tp.fillStyle = "white";
    tp.fillRect(0, 0, canvas.width, canvas.height);

    var imageWidth;
    var imageHeight;
    var inset;
    if (!bboxIsSet) {
        imageWidth = canvas.width;
        imageHeight = canvas.height;
        inset = 0;
        scaler = 1;
        xOffset = 0;
        yOffset = 0;
        return;
    }

    var imageWidth = tpBbox.max.x - tpBbox.min.x;
    var imageHeight = tpBbox.max.y - tpBbox.min.y;
    if (imageWidth == 0) {
        imageWidth = 1;
    }
    if (imageHeight == 0) {
        imageHeight = 1;
    }
    var shrink = 0.90;
    inset = 5;
    var scaleX = (canvas.width - inset*2) / imageWidth;
    var scaleY = (canvas.height - inset*2) / imageHeight;
    var minScale = Math.min(scaleX, scaleY);

    scaler = minScale * shrink;
    if (scaler < 0) {
        scaler = -scaler;
    }
    xOffset = inset - tpBbox.min.x * scaler;
    yOffset = (canvas.height-inset) - tpBbox.min.y * (-scaler);

    // Canvas coordinates of image bounding box top and right
    var imageTop = scaler * imageHeight;
    var imageRight = scaler * imageWidth;

    // Show the X and Y limit coordinates of the GCode program.
    // We do this before scaling because after we invert the Y coordinate,
    // text would be displayed upside-down.
    tp.fillStyle = "black";
    tp.font = "14px Ariel";
    tp.textAlign = "center";
    tp.textBaseline = "bottom";
    tp.fillText(formatLimit(tpBbox.min.y), imageRight/2, canvas.height-inset);
    tp.textBaseline = "top";
    tp.fillText(formatLimit(tpBbox.max.y), imageRight/2, canvas.height-inset - imageTop);
    tp.textAlign = "left";
    tp.textBaseline = "center";
    tp.fillText(formatLimit(tpBbox.min.x), inset, canvas.height-inset - imageTop/2);
    tp.textAlign = "right";
    tp.textBaseline = "center";
    tp.fillText(formatLimit(tpBbox.max.x), inset+imageRight, canvas.height-inset - imageTop/2);
    // Transform the path coordinate system so the image fills the canvas
    // with a small inset, and +Y goes upward.
    // The net transform from image space (x,y) to pixel space (x',y') is:
    //   x' =  scaler*x + xOffset
    //   y' = -scaler*y + yOffset
    // We use setTransform() instead of a sequence of scale() and translate() calls
    // because we need to perform the transform manually for getImageData(), which
    // uses pixel coordinates, and there is no standard way to read back the current
    // transform matrix.

    tp.setTransform(scaler, 0, 0, -scaler, xOffset, yOffset);

    tp.lineWidth = 0.5 / scaler;

    drawOrigin(imageWidth * 0.04);
}
var wrappedDegrees = function(radians) {
    var degrees = radians * 180 / Math.PI;
    return degrees >= 0 ? degrees : degrees + 360;
}

var bboxHandlers = {
    addLine: function(modal, start, end) {
	// Update tpUnits in case it changed in a previous line
        tpUnits = modal.units;

        ps = projection(start);
        pe = projection(end);

        tpBbox.min.x = Math.min(tpBbox.min.x, ps.x, pe.x);
        tpBbox.min.y = Math.min(tpBbox.min.y, ps.y, pe.y);
        tpBbox.max.x = Math.max(tpBbox.max.x, ps.x, pe.x);
        tpBbox.max.y = Math.max(tpBbox.max.y, ps.y, pe.y);
        bboxIsSet = true;
    },
    addArcCurve: function(modal, start, end, center) {
        // To determine the precise bounding box of a circular arc we
	// must account for the possibility that the arc crosses one or
	// more axes.  If so, the bounding box includes the "bulges" of
	// the arc across those axes.

	// Update units in case it changed in a previous line
        tpUnits = modal.units;

        if (modal.motion == 'G2') {  // clockwise
            var tmp = start;
            start = end;
            end = tmp;
        }

        ps = projection(start);
        pc = projection(center);
        pe = projection(end);

	// Coordinates relative to the center of the arc
	var sx = ps.x - pc.x;
	var sy = ps.y - pc.y;
	var ex = pe.x - pc.x;
	var ey = pe.y - pc.y;

        var radius = Math.hypot(sx, sy);

	// Axis crossings - plus and minus x and y
	var px = false;
	var py = false;
	var mx = false;
	var my = false;

	// There are ways to express this decision tree in fewer lines
	// of code by converting to alternate representations like angles,
	// but this way is probably the most computationally efficient.
	// It avoids any use of transcendental functions.  Every path
	// through this decision tree is either 4 or 5 simple comparisons.
	if (ey >= 0) {              // End in upper half plane
	    if (ex > 0) {             // End in quadrant 0 - X+ Y+
		if (sy >= 0) {          // Start in upper half plane
		    if (sx > 0) {         // Start in quadrant 0 - X+ Y+
			if (sx <= ex) {     // wraparound
			    px = py = mx = my = true;
			}
		    } else {              // Start in quadrant 1 - X- Y+
			mx = my = px = true;
		    }
		} else {                // Start in lower half plane
		    if (sx > 0) {         // Start in quadrant 3 - X+ Y-
			px = true;
		    } else {              // Start in quadrant 2 - X- Y-
			my = px = true;
		    }
		}
	    } else {                  // End in quadrant 1 - X- Y+
		if (sy >= 0) {          // Start in upper half plane
		    if (sx > 0) {         // Start in quadrant 0 - X+ Y+
			py = true;
		    } else {              // Start in quadrant 1 - X- Y+
			if (sx <= ex) {     // wraparound
			    px = py = mx = my = true;
			}
		    }
		} else {                // Start in lower half plane
		    if (sx > 0) {         // Start in quadrant 3 - X+ Y-
			px = py = true;
		    } else {              // Start in quadrant 2 - X- Y-
			my = px = py = true;
		    }
		}
	    }
	} else {                    // ey < 0 - end in lower half plane
	    if (ex > 0) {             // End in quadrant 3 - X+ Y+
		if (sy >= 0) {          // Start in upper half plane
		    if (sx > 0) {         // Start in quadrant 0 - X+ Y+
			py = mx = my = true;
		    } else {              // Start in quadrant 1 - X- Y+
			mx = my = true;
		    }
		} else {                // Start in lower half plane
		    if (sx > 0) {         // Start in quadrant 3 - X+ Y-
			if (sx >= ex) {      // wraparound
			    px = py = mx = my = true;
			}
		    } else {              // Start in quadrant 2 - X- Y-
			my = true;
		    }
		}
	    } else {                  // End in quadrant 2 - X- Y+
		if (sy >= 0) {          // Start in upper half plane
		    if (sx > 0) {         // Start in quadrant 0 - X+ Y+
			py = mx = true;
		    } else {              // Start in quadrant 1 - X- Y+
			mx = true;
		    }
		} else {                // Start in lower half plane
		    if (sx > 0) {         // Start in quadrant 3 - X+ Y-
			px = py = mx = true;
		    } else {              // Start in quadrant 2 - X- Y-
			if (sx >= ex) {      // wraparound
			    px = py = mx = my = true;
			}
		    }
		}
	    }
	}
	var maxX = px ? pc.x + radius : Math.max(ps.x, pe.x);
	var maxY = py ? pc.y + radius : Math.max(ps.y, pe.y);
	var minX = mx ? pc.x - radius : Math.min(ps.x, pe.x);
	var minY = my ? pc.y - radius : Math.min(ps.y, pe.y);

	tpBbox.min.x = Math.min(tpBbox.min.x, minX);
	tpBbox.min.y = Math.min(tpBbox.min.y, minY);
	tpBbox.max.x = Math.max(tpBbox.max.x, maxX);
	tpBbox.max.y = Math.max(tpBbox.max.y, maxY);
        bboxIsSet = true;
    }
};
var initialMoves = true;
var displayHandlers = {
    addLine: function(modal, start, end) {
        var motion = modal.motion;
        if (motion == 'G0') {
            tp.strokeStyle = initialMoves ? 'red' : 'green';
        } else {
            tp.strokeStyle = 'blue';
            // Don't cancel initialMoves on no-motion G1 (e.g. G1 F30)
            // or on Z-only moves
            if (start.x != end.x || start.y != end.y) {
                initialMoves = false;
            }
        }

        ps = projection(start);
        pe = projection(end);
        tp.beginPath();
        // tp.moveTo(start.x, start.y);
        // tp.lineTo(end.x, end.y);
        tp.moveTo(ps.x, ps.y);
        tp.lineTo(pe.x, pe.y);
        tp.stroke();
    },
    addArcCurve: function(modal, start, end, center) {
        var motion = modal.motion;

        var deltaX1 = start.x - center.x;
        var deltaY1 = start.y - center.y;
        var radius = Math.hypot(deltaX1, deltaY1);
        var deltaX2 = end.x - center.x;
        var deltaY2 = end.y - center.y;
        var theta1 = Math.atan2(deltaY1, deltaX1);
        var theta2 = Math.atan2(deltaY2, deltaX2);
        var cw = modal.motion == "G2";
        if (!cw && theta2 < theta1) {
            theta2 += Math.PI * 2;
        } else if (cw && theta2 > theta1) {
            theta2 -= Math.PI * 2;
        }
	if (theta1 == theta2) {
	    theta2 += Math.PI * ((cw) ? -2 : 2);
	}

        initialMoves = false;

        tp.beginPath();
        tp.strokeStyle = 'blue';
        deltaTheta = theta2 - theta1;
        n = (Math.abs(deltaTheta) > Math.PI) ? 20 : 10;
        dt = (deltaTheta) / n;
        ps = projection(start);
        tp.moveTo(ps.x, ps.y);
        next = {};
        // XXX we could do spirals by interpolating Z
        theta = theta1;
        for (i = 0; i < n; i++) {
            theta += dt;
            next.x = center.x + radius * Math.cos(theta);
            next.y = center.y + radius * Math.sin(theta);
            next.z = start.z;
            pe = projection(next)
            tp.lineTo(pe.x, pe.y);
        }
        tp.stroke();
    },
};

var ToolpathDisplayer = function() {
};

var offset;

ToolpathDisplayer.prototype.showToolpath = function(gcode, wpos, mpos) {
    inInches = id('units').innerText != 'mm';

    // Assume WPOS in mm
    // var factor = inInches ? 25.4 : 1.0;
    factor = 1;

    var initialPosition = {
        x: wpos[0] * factor,
        y: wpos[1] * factor,
        z: wpos[2] * factor
    };

    var mposmm = {
        x: mpos[0] * factor,
        y: mpos[1] * factor,
        z: mpos[2] * factor
    };

    offset = {
        x: initialPosition.x - mposmm.x,
        y: initialPosition.y - mposmm.y,
        z: initialPosition.z - mposmm.z
    };

    resetBbox();
    bboxHandlers.position = initialPosition;

    var gcodeLines = gcode.split('\n');
    new Toolpath(bboxHandlers).loadFromLinesSync(gcodeLines);
    transformCanvas();
    if (!bboxIsSet) {
        return;
    }
    initialMoves = true;
    displayHandlers.position = initialPosition;
    new Toolpath(displayHandlers).loadFromLinesSync(gcodeLines);

    drawTool(initialPosition);
};

ToolpathDisplayer.prototype.reDrawTool = function(modal, mpos) {
    if (toolSave != null) {
        tp.putImageData(toolSave, toolX, toolY);
        var factor = 1;
        // var factor = modal.units === 'G20' ? 25.4 : 1.0;

        var dpos = {
            x: mpos[0] * factor + offset.x,
            y: mpos[1] * factor + offset.y,
            z: mpos[2] * factor + offset.z
        };
        drawTool(dpos);
    }
}

export default ToolpathDisplayer;