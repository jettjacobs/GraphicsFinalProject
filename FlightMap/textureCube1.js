"use strict";

var canvas;
var gl;
var program;

// Perspective Projection Components
var near = 0.1;
var far = 5.0;
var  fovy = 30.0;
var  aspect = 1.0;

var pointsArray = [];
var colorsArray = [];
var texCoordsArray = [];

var texture = new Array(2);

var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)
];

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

var cities = [
    vec4( -0.33,  -0.08,  0.0, 1.0 ),   // SAN DIEGO, CA (KSAN)
    vec4( 0.32,  0.02,  0.0, 1.0 ),     // WASHINGTON, DC (KDCA)
    vec4( -0.12,  0.01,  0.0, 1.0 ),    // DENVER, CO (KDEN)
    vec4( 0.03,  -0.17,  0.0, 1.0 ),    // HOUSTON, TX (KIAH)
    vec4( 0.22,  -0.10,  0.0, 1.0 ),    // ATLANTA, GA (KATL)
    vec4( 0.14,  0.05,  0.0, 1.0 )      // CHICAGO, IL (KORD)
];

var cityNames = [
    "SAN DIEGO, CA",
    "WASHINGTON, DC",
    "DENVER, CO",
    "HOUSTON, TX",
    "ATLANTA, GA",
    "CHICAGO, IL"
];

var departureCity = 0;
var arrivalCity = -1;
var renderLine = -1;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var eye = vec3(0.0, 0.0, 1.65);
var at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

// For cube background coloring
var white = vec4( 1.0, 1.0, 1.0, 1.0 );

var theta = [0.0, 0.0, 0.0];
var thetaLoc;

var pathAngle = 90.0;
var xChng = 0.0;
var yChng = 0.0;
var disLeft = 0.0;

let xLoc = cities[departureCity][0];
let yLoc = cities[departureCity][1];
let zLoc = 0;

let fly = false;

function configureTexture( image, image2 ) {
    texture[0] = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture[0] );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA,
         gl.RGBA, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
                      gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );

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

function textureCubes()
{   
    pointsArray = []
    colorsArray = []
    texCoordsArray = []
    // US or World Map
    quad( 1, 0, 3, 2 );
    
    // Airplane Icon
    quad( 5, 4, 7, 6 );

    // Establish City's For Rendering Points
    for (var i = 0; i < cities.length; i++) {
        pointsArray.push(cities[i]);
        colorsArray.push(white);
        texCoordsArray.push(texCoord[0]);
    }

    // Establish All Possible Connections
    // Algorithm To Find Correct City Starting Index:
    //      ((2*departureCity) * cities.length) + (2*arrivalCity) + 12 + cities.length;
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


window.onload = function init() {
    
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    //  Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    textureCubes();

    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );

    var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );

    var image = document.getElementById("texImage");
    var image2 = document.getElementById("texImage2");

    document.getElementById("depart").innerHTML = cityNames[departureCity];
    document.getElementById("arrive").innerHTML = "----";

    configureTexture( image, image2 );

    thetaLoc = gl.getUniformLocation(program, "theta");

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

    document.getElementById( "KSAN" ).onclick = function () {
        if ((!fly) && (departureCity != 0)) {
            arrivalCity = 0;
            beginFlight();
        }
    };
    
    document.getElementById( "KDCA" ).onclick = function () {
        if ((!fly) && (departureCity != 1)) {
            arrivalCity = 1;
            beginFlight();
        }
    };

    document.getElementById( "KDEN" ).onclick = function () {
        if ((!fly) && (departureCity != 2)) {
            arrivalCity = 2;
            beginFlight();
        }
    };

    document.getElementById( "KIAH" ).onclick = function () {
        if ((!fly) && (departureCity != 3)) {
            arrivalCity = 3;
            beginFlight();
        }
    };

    document.getElementById( "KATL" ).onclick = function () {
        if ((!fly) && (departureCity != 4)) {
            arrivalCity = 4;
            beginFlight();
        }
    };

    document.getElementById( "KORD" ).onclick = function () {
        if ((!fly) && (departureCity != 5)) {
            arrivalCity = 5;
            beginFlight();
        }
    };


    render();
}

function beginFlight () {
    document.getElementById("arrive").innerHTML = cityNames[arrivalCity];
    renderLine = ((2*departureCity) * cities.length) + (2*arrivalCity) + 12 + cities.length;
    disLeft = distanceLeft(cities[arrivalCity][0], cities[arrivalCity][1], xLoc, yLoc);
    computeAngle();
    computeMoveIncrements();

    fly = true;
}

function computeAngle() {
    var x_dist = Math.abs(cities[arrivalCity][0] - xLoc);
    var y_dist = Math.abs(cities[arrivalCity][1] - yLoc);

    var angle;
    if (cities[arrivalCity][1] > yLoc) {
        angle = Math.atan(x_dist / y_dist);
        angle = angle * (180/Math.PI);
    }
    else {
        angle = Math.atan(y_dist / x_dist);
        angle = angle * (180/Math.PI);
        angle += 90.0;
    }

    if (cities[arrivalCity][0] < xLoc) {
        angle = -angle;
    }
    
    pathAngle = angle;
}

function computeMoveIncrements() {

    var dis = (Math.abs(pathAngle) % 90) * (Math.PI/180);

    if ((pathAngle >= 0.0) && (pathAngle <= 90.0)) {
        xChng = 0.0005 * Math.sin(dis);
        yChng = 0.0005 * Math.cos(dis);
    }
    else if (pathAngle > 90.0) {
        xChng = 0.0005 * Math.cos(dis);
        yChng = -0.0005 * Math.sin(dis);
    }
    else if ((pathAngle < 0.0) && (pathAngle >= -90.0)) {
        xChng = -0.0005 * Math.sin(dis);
        yChng = 0.0005 * Math.cos(dis);
    }
    else if (pathAngle < -90.0) {
        xChng = -0.0005 * Math.cos(dis);
        yChng = -0.0005 * Math.sin(dis);
    }


}

function distanceLeft( x1, y1, x2, y2 ) {

    var x_sec = (x1 - x2) * (x1 - x2);
    var y_sec = (y1 - y2) * (y1 - y2);
    return Math.sqrt(x_sec + y_sec);

}

function flyPath() {
    if (fly) {
        xLoc += xChng;
        yLoc += yChng;

        var currDistance = distanceLeft(cities[arrivalCity][0], cities[arrivalCity][1], xLoc, yLoc);
        
        if ((currDistance <= (0.005*5)) && (zLoc >= 0.0)) {
            zLoc -= 0.005;
        }
        else if (zLoc < 0.2) {
            zLoc += 0.005;
        }

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
        else {
            disLeft = currDistance;
        }
    }
}

var render = function(){
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniform3fv(thetaLoc, flatten([0,0,0]));

    var eye = vec3(xLoc,yLoc, 0.8);
    var at = vec3(xLoc, yLoc, zLoc);

    modelViewMatrix = lookAt(eye, at , up);
    projectionMatrix = perspective(fovy, aspect, near, far);

    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );

    gl.uniform1i(gl.getUniformLocation(program, "isTexture"), false);
    gl.drawArrays (gl.POINTS, 12, cities.length);
    
    if (renderLine != -1) {
        gl.drawArrays (gl.LINES, renderLine, 2);
    }

    gl.bindTexture( gl.TEXTURE_2D, texture[0] );
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "isTexture"), true);
    gl.drawArrays( gl.TRIANGLES, 0, 6 );

    flyPath();
    modelViewMatrix = mult(modelViewMatrix, translate(xLoc, yLoc, zLoc));
    
    theta[2] = pathAngle;
    gl.uniform3fv(thetaLoc, flatten(theta));

    gl.uniform1i(gl.getUniformLocation(program, "isTexture"), true);
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.bindTexture( gl.TEXTURE_2D, texture[1] );
    gl.drawArrays( gl.TRIANGLES, 6, 6 );

    requestAnimFrame(render);
}
