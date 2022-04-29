"use strict";

// WebGL Components
var canvas;
var gl;
var program;

// Perspective Projection Components
var near = 0.1;
var far = 5.0;
var  fovy = 30.0;
var  aspect = 1.0;

// Vertex Attribute Buffer Components
var pointsArray = [];
var colorsArray = [];
var texCoordsArray = [];

// List For Both Textures
var texture = new Array(2);

// Texture Mapping
var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)
];

// Define the homogenous bounds for the two rendered textures
var vertices = [
    // US or World Map (STATIC)
    vec4( -0.5,  0.25,  0.0, 1.0 ),
    vec4( -0.5, -0.25,  0.0, 1.0 ),
    vec4( 0.5, -0.25,  0.0, 1.0 ),
    vec4( 0.5,  0.25,  0.0, 1.0 ),

    // Airplane Icon (DYNAMIC)
    vec4( -0.01,  0.01,  0.2, 1.0 ),
    vec4( -0.01, -0.01,  0.2, 1.0 ),
    vec4( 0.01, -0.01,  0.2, 1.0 ),
    vec4( 0.01,  0.01,  0.2, 1.0 ),
];

// Set the initial departure city and initialize the null representations for our arrival
// city and flight path line. 
// CHANGE DEPARTURE CITY USING INDICES BELOW START SOMEWHERE ELSE
var departureCity = 2;  // DENVER
var arrivalCity = -1;
var renderLine = -1;

// Define all city coordinates. 
// ADD ANY NUMBER OF CITIES TO THIS LIST AND CITYNAMES
var cities = [
    vec4( -0.408,  -0.07,  0.0, 1.0 ),  // SAN DIEGO, CA (KSAN)
    vec4( 0.378,  0.027,  0.0, 1.0 ),   // WASHINGTON, DC (KDCA)
    vec4( -0.140,  0.028,  0.0, 1.0 ),  // DENVER, CO (KDEN)
    vec4( 0.038,  -0.1625,  0.0, 1.0 ), // HOUSTON, TX (KIAH)
    vec4( 0.262,  -0.083,  0.0, 1.0 ),  // ATLANTA, GA (KATL)
    vec4( 0.164,  0.07,  0.0, 1.0 )      // CHICAGO, IL (KORD)
];

// Define all city names.
// ENSURE INDICES IN CITYNAMES AND CITIES MATCH
var cityNames = [
    "SAN DIEGO, CA",
    "WASHINGTON, DC",
    "DENVER, CO",
    "HOUSTON, TX",
    "ATLANTA, GA",
    "CHICAGO, IL"
];

// Viewing Components
var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var eye = vec3(0.0, 0.0, 1.65);
var at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

// For cube background coloring
var white = vec4( 1.0, 1.0, 1.0, 1.0 );

// Plane icon initially facing due north. 
var theta = [0.0, 0.0, 0.0];
var thetaLoc;

// Angle and movement-per-frame calculations of the plane icon
var pathAngle = 90.0;
var xChng = 0.0;
var yChng = 0.0;
var disLeft = 0.0;

// Initial translation to put plane at departure city
var xLoc = cities[departureCity][0];
var yLoc = cities[departureCity][1];
var zLoc = 0;

// Set to false when plane should not move, true when time to fly
var fly = false;

/******************************************* 
* configureTexture()
*   Create textures for US map and plane
********************************************/
function configureTexture( image, image2 ) {
    
    // US Map Texture
    texture[0] = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture[0] );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA,
         gl.RGBA, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
                      gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );

    // Plane Icon Texture
    texture[1] = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture[1] );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA,
         gl.RGBA, gl.UNSIGNED_BYTE, image2 );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
                      gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
}

/******************************************* 
* quad()
*   Helper function to push all vertex
*   components to the buffer lists
********************************************/
function quad(a, b, c, d) {

    pointsArray.push(vertices[a]);
    colorsArray.push(white);
    texCoordsArray.push(texCoord[0]);

    pointsArray.push(vertices[b]);
    colorsArray.push(white);
    texCoordsArray.push(texCoord[1]);

    pointsArray.push(vertices[c]);
    colorsArray.push(white);
    texCoordsArray.push(texCoord[2]);

    pointsArray.push(vertices[a]);
    colorsArray.push(white);
    texCoordsArray.push(texCoord[0]);

    pointsArray.push(vertices[c]);
    colorsArray.push(white);
    texCoordsArray.push(texCoord[2]);

    pointsArray.push(vertices[d]);
    colorsArray.push(white);
    texCoordsArray.push(texCoord[3]);

}

/******************************************* 
* textureSquares()
*   Overarching function for texturing
*   squares and building all flight path
*   permutations
********************************************/
function textureSquares()
{   
    // US or World Map
    quad( 1, 0, 3, 2 );
    
    // Airplane Icon
    quad( 5, 4, 7, 6 );

    // Establish All Possible Connections
    // Algorithm To Find Correct City Starting Index:
    //   starting_index = ((2*departureCity) * cities.length) + (2*arrivalCity) + 12
    for (var i = 0; i < cities.length; i++) {
        for (var j = 0; j < cities.length; j++) {
            pointsArray.push(cities[i]);
            colorsArray.push(white);
            texCoordsArray.push(texCoord[0]);

            pointsArray.push(cities[j]);
            colorsArray.push(white);
            texCoordsArray.push(texCoord[0]);
        }
    }
}

/******************************************* 
* init()
*   Setup for WebGL shaders, buffers, 
*   viewing, and buttons
********************************************/
window.onload = function init() {
    
    // Setup Canvas
    canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // Setup Viewport
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    // Allow depth and blending (allows transparency)
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    //  Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Fill attribute buffer lists
    textureSquares();

    // Color buffer
    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    // Position buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    // Texture buffer
    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );

    var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );

    // Load images for texture mapping
    var image = document.getElementById("texImage");
    var image2 = document.getElementById("texImage2");

    // Set initial departure values in html element
    document.getElementById("depart").innerHTML = cityNames[departureCity];
    document.getElementById("arrive").innerHTML = "----";

    configureTexture( image, image2 );

    // Get uniform locations
    thetaLoc = gl.getUniformLocation(program, "theta");
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

    // Establish button readers

    // SAN DIEGO, CA
    document.getElementById( "KSAN" ).onclick = function () {
        if ((!fly) && (departureCity != 0)) {
            arrivalCity = 0;
            beginFlight();
        }
    };
    
    // WASHINGTON, DC 
    document.getElementById( "KDCA" ).onclick = function () {
        if ((!fly) && (departureCity != 1)) {
            arrivalCity = 1;
            beginFlight();
        }
    };

    // DENVER, CO
    document.getElementById( "KDEN" ).onclick = function () {
        if ((!fly) && (departureCity != 2)) {
            arrivalCity = 2;
            beginFlight();
        }
    };

    // HOUSTON, TX
    document.getElementById( "KIAH" ).onclick = function () {
        if ((!fly) && (departureCity != 3)) {
            arrivalCity = 3;
            beginFlight();
        }
    };

    // ATLANTA, GA
    document.getElementById( "KATL" ).onclick = function () {
        if ((!fly) && (departureCity != 4)) {
            arrivalCity = 4;
            beginFlight();
        }
    };

    // CHICAGO, IL
    document.getElementById( "KORD" ).onclick = function () {
        if ((!fly) && (departureCity != 5)) {
            arrivalCity = 5;
            beginFlight();
        }
    };

    render();
}

/******************************************* 
* beginFlight()
*   Overarching function for activation of
*   a flight. Called after a button is 
*   pressed.
********************************************/
function beginFlight () {
    
    // Set arrival city in HTML
    document.getElementById("arrive").innerHTML = cityNames[arrivalCity];

    // Get index to render flight path between departure city -> arrival city
    renderLine = ((2*departureCity) * cities.length) + (2*arrivalCity) + 12;
    
    // Compute distance of flight
    disLeft = distanceLeft(cities[arrivalCity][0], cities[arrivalCity][1], xLoc, yLoc);
    
    // Call helper functions
    computeAngle();
    computeMoveIncrements();

    // Begin flight
    fly = true;
}

/******************************************* 
* computeAngle()
*   Determines the angle at which the plane
*   must be rotated (from due north) to
*   match the intended flight path
********************************************/
function computeAngle() {

    // Get the x and y distance
    var x_dist = Math.abs(cities[arrivalCity][0] - xLoc);
    var y_dist = Math.abs(cities[arrivalCity][1] - yLoc);

    var angle;

    // Assuming eastbound flight:
    // Compute the angle of rotation using inverse tangent.
    // If the arrival city is located south of our departure
    // compute the angle of rotation and add 90 degrees
    if (cities[arrivalCity][1] > yLoc) {
        angle = Math.atan(x_dist / y_dist);
        angle = angle * (180/Math.PI);
    }
    else {
        angle = Math.atan(y_dist / x_dist);
        angle = angle * (180/Math.PI);
        angle += 90.0;
    }

    // If the flight is westerly, simply negate the angle
    if (cities[arrivalCity][0] < xLoc) {
        angle = -angle;
    }
    
    // Set the newfound angle as the pathAngle
    pathAngle = angle;
}

/******************************************* 
* computeMoveIncrements()
*   Compute the vertical and horizontal 
*   distance which much be traveled per 
*   frame. Will use a euclidean distance
*   of 0.005 to produce a reasonable speed.
********************************************/
function computeMoveIncrements() {

    // Calculate the angular displacement from the nearest axis 
    var displacement = (Math.abs(pathAngle) % 90) * (Math.PI/180);

    // Assuming the origin is at the current location of the plane:
    // If the arrival city is in Quadrant 1
    if ((pathAngle >= 0.0) && (pathAngle <= 90.0)) {
        xChng = 0.0005 * Math.sin(displacement);
        yChng = 0.0005 * Math.cos(displacement);
    }
    // If the arrival city is in quadrant 4
    else if (pathAngle > 90.0) {
        xChng = 0.0005 * Math.cos(displacement);
        yChng = -0.0005 * Math.sin(displacement);
    }
    // If the arrival city city is in quadrant 2
    else if ((pathAngle < 0.0) && (pathAngle >= -90.0)) {
        xChng = -0.0005 * Math.sin(displacement);
        yChng = 0.0005 * Math.cos(displacement);
    }
    // If the arrival city is in quadrant 3
    else if (pathAngle < -90.0) {
        xChng = -0.0005 * Math.cos(displacement);
        yChng = -0.0005 * Math.sin(displacement);
    }
}

/******************************************* 
* distanceLeft()
*   Simple helper function to compute the
*   remaining distance to the arrival city
********************************************/
function distanceLeft( x1, y1, x2, y2 ) {

    // Distance Formula
    var x_sec = (x1 - x2) * (x1 - x2);
    var y_sec = (y1 - y2) * (y1 - y2);
    return Math.sqrt(x_sec + y_sec);

}

/******************************************* 
* flyPath()
*   Function to handle airplane movement
*   throughout the flight. Adjusts x,y,z
*   coordinates to account for climb,
*   cruise, and descent.
********************************************/
function flyPath() {
    // Check that fligt mode is activated
    if (fly) {
        // Update x and y positions based on our calculated per-frame changes
        xLoc += xChng;
        yLoc += yChng;

        // Determine the distance remaining in the flight
        var currDistance = distanceLeft(cities[arrivalCity][0], cities[arrivalCity][1], xLoc, yLoc);
        
        // If we are within 0.025 of our destination or at 0.0, descend
        if ((currDistance <= (0.025)) && (zLoc >= 0.0)) {
            zLoc -= 0.005;
        }
        // Othrwise if we are beneath 0.2, we must climb
        else if (zLoc < 0.2) {
            zLoc += 0.005;
        }

        // If our previous distance was closer than our currently calculated distance, that means we
        // have arrived (technically slightly past) our destination. Fix the location to be exactly on
        // the arrival city (virtually indistinguishable change), reset values, and exit fly-mode
        if (currDistance > disLeft) {
            fly = false;
            xLoc = cities[arrivalCity][0];
            yLoc = cities[arrivalCity][1];
            zLoc = 0.0;
            xChng = 0.0;
            yChng = 0.0;
            disLeft = 0.0;
            renderLine = -1;
            departureCity = arrivalCity;
            arrivalCity = -1;
            document.getElementById("arrive").innerHTML = "----";
            document.getElementById("depart").innerHTML = cityNames[departureCity];
        }
        // If the distance is lower than before, we have not yet reached the city.
        else {
            disLeft = currDistance;
        }
    }
}

/******************************************* 
* render()
*   Recursive rendering function
********************************************/
var render = function(){
    
    // Clear depth buffer
    gl.clear( gl.DEPTH_BUFFER_BIT);

    // While we set the US map, ensure that theta is 0
    gl.uniform3fv(thetaLoc, flatten([0,0,0]));

    // Set the camera to look directly overtop the plane
    var eye = vec3(xLoc,yLoc, 0.8);
    var at = vec3(xLoc, yLoc, zLoc);

    // Compute the model view and projection matrices
    modelViewMatrix = lookAt(eye, at , up);
    projectionMatrix = perspective(fovy, aspect, near, far);

    // Send the matrices to the GPU
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );

    // Switch the shader to non-texture mode
    gl.uniform1i(gl.getUniformLocation(program, "isTexture"), false);    
    
    // If the renderline is not -1, activate the line at the specified index
    if (renderLine != -1) {
        gl.drawArrays (gl.LINES, renderLine, 2);
    }

    // Switch back to texture mode
    gl.bindTexture( gl.TEXTURE_2D, texture[0] );
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "isTexture"), true);
    gl.drawArrays( gl.TRIANGLES, 0, 6 );

    // Compute new flight path and update the model view matrix
    flyPath();
    modelViewMatrix = mult(modelViewMatrix, translate(xLoc, yLoc, zLoc));
    
    // Set the plane's correct angle and pass to the vertex shader
    theta[2] = pathAngle;
    gl.uniform3fv(thetaLoc, flatten(theta));

    // Bind the texture and draw the airplane
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.bindTexture( gl.TEXTURE_2D, texture[1] );
    gl.drawArrays( gl.TRIANGLES, 6, 6 );

    requestAnimFrame(render);
}
