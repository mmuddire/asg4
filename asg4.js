// Vertex shader program
var VS = `
    precision mediump float;
    attribute vec4 a_Position;
    attribute vec3 a_Normal;
    
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjectMatrix;
    uniform mat4 u_NormalMatrix;

    varying vec3 n;
    varying vec4 worldPos;

    void main(){
        worldPos = u_ModelMatrix * a_Position;
        //gl_Position = u_ProjectMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
        
        n = normalize(u_NormalMatrix * vec4(a_Normal, 0.0)).xyz;
        
        gl_Position = u_ProjectMatrix * u_ViewMatrix * worldPos;
        
    }`;

// Fragment shader program
var FS = `
    precision mediump float;
    uniform vec3 u_Color;

    uniform vec3 u_ambientColor;
    uniform vec3 u_diffuseColor;
    uniform vec3 u_specularColor;
    
    uniform vec3 u_lightDirection;
    uniform vec3 u_eyePosition;
    uniform vec3 u_lightLocation;
    uniform bool u_normalOn;
    uniform bool u_lightingOn;
    uniform vec3 u_lightColor;

    varying vec3 n;
    varying vec4 worldPos;

    uniform bool u_dirLightOn;
    uniform bool u_pointLightOn;
    uniform bool u_spotLightOn;
    uniform vec3 u_spotLightPosition;
    uniform vec3 u_spotLightDirection;
    uniform float u_spotLightCutoff;
    uniform float u_spotLightExponent;

    vec3 calcAmbient(){
        return u_ambientColor * u_Color;
    }

    vec3 calcDiffuse(vec3 l, vec3 n, vec3 dColor){
        float nDotl = max(dot(l,n), 0.0);
        return dColor * u_Color * nDotl * u_lightColor;
    }

    vec3 calcSpecular(vec3 r, vec3 v){
        float rDotV = max(dot(r, v), 0.0);
        float rDotVPowS = pow(rDotV, 32.0);
        return u_specularColor * u_Color * rDotVPowS * u_lightColor;
    }
    
    void main(){
        if(u_normalOn) {
            if(!u_lightingOn) {
                gl_FragColor = vec4((n + 1.0)/2.0, 1.0);
                return; 
            }
            // Calculate light effect even in normal mode
            vec3 l = normalize(u_lightLocation - worldPos.xyz);
            float lightEffect = max(dot(n, l), 0.2); // Minimum 20% brightness
            
            vec3 normalColor = (n + 1.0)/2.0 * lightEffect;
            
            
            gl_FragColor = vec4(normalColor, 1.0);
            return;
        }

        if(!u_lightingOn) {
            gl_FragColor = vec4(u_Color, 1.0);
            return;
        }
        vec3 l1 = normalize(u_lightDirection); // Light direction 1
        vec3 l2 = normalize(u_lightLocation - worldPos.xyz); // Light direction 2

        vec3 v = normalize(u_eyePosition - worldPos.xyz);   // View direction

        vec3 r1 = reflect(l1, n); // Reflected light direction 1
        vec3 r2 = reflect(l2, n); // Reflected light direction 2

        // Smooth shading (Goraud)
        vec3 ambient = calcAmbient();

        vec3 diffuse1 = calcDiffuse(l1, n, u_diffuseColor);

        vec3 specular1 = calcSpecular(r1, -v);

        vec3 diffuse2 = calcDiffuse(l2, n, u_diffuseColor);

        vec3 specular2 = calcSpecular(r2, -v);

        vec3 v_Color = ambient + (diffuse1 + diffuse2) + (specular1 + specular2);
        gl_FragColor = vec4(v_Color, 1.0);                   //use color
                    
    }`;


// Global vars
let canvas;
let gl;
let a_Position;
let a_Normal;
///////////////////
let modelMatrix = new Matrix4();
let normalMatrix = new Matrix4();
let models = [];

let lightDirection = new Vector3([1.0, 1.0, 1.0]);
let lightLocation = new Vector3([0, 0.2, 1.0]);
let lightRotation = new Matrix4().setRotate(1, 0, 1, 0);

let u_ModelMatrix;
let u_ProjectMatrix;
let u_ViewMatrix;
let u_NormalMatrix;

let u_Color = null;
let u_ambientColor = null;
let u_diffuseColor = null;
let u_specularColor = null;

let u_lightDirection = null;
let u_eyePosition = null;
let u_lightLocation = null;

let u_lightColor = null;
let lightColor = [1.0, 1.0, 1.0];

//set up
function setUpWegGL(){
    canvas = document.getElementById('webgl');
  
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});

    if (!gl) {
      console.log('Failed to get the rendering context for WebGL');
      return;
    }
    gl.enable(gl.DEPTH_TEST);
}

//connect global vars
function connectVariablesToGLSL(){
    if(!initShaders(gl, VS, FS)){
        console.log("Failed to load/compile shaders");
        return;
        }
    
    a_Position = gl.getAttribLocation(gl.program, "a_Position");
    if(a_Position < 0){
        console.log("Failed to get the storage location of a_Position");
        return;
    }

    a_Normal = gl.getAttribLocation(gl.program, "a_Normal");
    if(a_Normal < 0){
        console.log("Failed to get the storage location of a_Normal");
        return;
    }

    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if(!u_ModelMatrix){
        console.log("Failed to get the storage location of u_ModelMatrix");
        return;
    }

    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    if(!u_ViewMatrix){
        console.log("Failed to get the storage location of u_ViewMatrix");
        return;
    }

    u_ProjectMatrix = gl.getUniformLocation(gl.program, 'u_ProjectMatrix');
    if(!u_ProjectMatrix){
        console.log("Failed to get the storage location of u_ProjectMatrix");
        return;
    }

    u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    if(!u_NormalMatrix){
        console.log("Failed to get the storage location of u_NormalMatrix");
        return;
    }

    u_Color = gl.getUniformLocation(gl.program, 'u_Color');
    if (!u_Color) {
        console.log("Failed to get the storage location of u_Color");
        return;
    }

    u_ambientColor = gl.getUniformLocation(gl.program, 'u_ambientColor');
    if (!u_ambientColor) {
        console.log("Failed to get the storage location of u_ambientColor");
        return;
    }

    u_diffuseColor = gl.getUniformLocation(gl.program, 'u_diffuseColor');
    if (!u_diffuseColor) {
        console.log("Failed to get the storage location of u_diffuseColor");
        return;
    }

    u_specularColor = gl.getUniformLocation(gl.program, 'u_specularColor');
    if (!u_specularColor) {
        console.log("Failed to get the storage location of u_specularColor");
        return;
    }

    u_lightDirection = gl.getUniformLocation(gl.program, 'u_lightDirection');
    if (!u_lightDirection) {
        console.log("Failed to get the storage location of u_lightDirection");
        return;
    }

    u_lightLocation = gl.getUniformLocation(gl.program, 'u_lightLocation');
    if (!u_lightLocation) {
        console.log("Failed to get the storage location of u_lightLocation");
        return;
    }

    u_eyePosition = gl.getUniformLocation(gl.program, 'u_eyePosition');
    if (!u_eyePosition) {
        console.log("Failed to get the storage location of u_eyePosition");
        return;
    }

    u_lightColor = gl.getUniformLocation(gl.program, 'u_lightColor');
    if (!u_lightColor) {
        console.log("Failed to get the storage location of u_lightColor");
        return;
    }

    
}

//button and slider vars
let g_globalCamAngle = 0;
let g_globalAngleY = 0; 
let g_globalAngleX = 0; 
let g_camera;

let g_normalOn = false;
let g_mouseR = true;
let isDragging = false;
let g_lightingOn = true;
let g_lastTime = 0;
let lightAngle = 0;
const BASE_Y = -0.75; // Floor level
const MAP_CENTER = 16; // Center offset for 32x32 grid

//connect html to actions
function addActionsForHtmlUI(){
    document.getElementById('normalOff').onclick = function(){g_normalOn=false;};
    document.getElementById('normalOn').onclick = function(){g_normalOn=true;};

    document.getElementById('lightingOff').onclick = () => { g_lightingOn = false; };
    document.getElementById('lightingOn').onclick = () => { g_lightingOn = true; };

    document.getElementById('lightX').addEventListener('input', updateLightPosition);
    document.getElementById('lightY').addEventListener('input', updateLightPosition);
    document.getElementById('lightZ').addEventListener('input', updateLightPosition);

    document.getElementById('lightR').addEventListener('input', updateLightColor);
    document.getElementById('lightG').addEventListener('input', updateLightColor);
    document.getElementById('lightB').addEventListener('input', updateLightColor);
}

function updateLightPosition() {
    lightLocation.elements[0] = parseFloat(document.getElementById('lightX').value);
    lightLocation.elements[1] = parseFloat(document.getElementById('lightY').value);
    lightLocation.elements[2] = parseFloat(document.getElementById('lightZ').value);
    draw();
}

function updateLightColor() {
    lightColor[0] = parseFloat(document.getElementById('lightR').value);
    lightColor[1] = parseFloat(document.getElementById('lightG').value);
    lightColor[2] = parseFloat(document.getElementById('lightB').value);
    draw();
}

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;
// Modify the tick function to handle animation frame timing correctly
function tick(currentTime) { // Add parameter
    if (!g_lastTime) g_lastTime = currentTime;
    const deltaTime = (currentTime - g_lastTime)/1000;
    g_lastTime = currentTime;

    // Update light rotation (30 degrees per second)
    lightAngle = 30;
    lightRotation.setRotate(lightAngle, 0, 1, 0);
    
    // Calculate light position from initial position
    const initialPos = new Vector3([0, 0.2, 1.0]);
    const animatedLightPos = lightRotation.multiplyVector3(initialPos);
    
    // Only update if not manually controlling via sliders
    if(!document.getElementById('lightX').matches(':active') &&
       !document.getElementById('lightY').matches(':active') &&
       !document.getElementById('lightZ').matches(':active')) {
        lightLocation.elements = animatedLightPos.elements;
    }
    
    requestAnimationFrame(tick);
    draw();
}

function keydown(ev){
    const speed = 0.5
    const degrees = 1;

    if (ev.keyCode == 87){ //w
        g_camera.moveForward(speed);
    } else if (ev.keyCode == 83) {
        g_camera.moveBackwards(speed);
    } else if (ev.keyCode == 65) {
        g_camera.moveLeft(speed);
    } else if (ev.keyCode == 68) {
        g_camera.moveRight(speed);
    } else if (ev.keyCode == 81) {
        g_camera.panLeft(degrees);
    } else if (ev.keyCode == 69) {
        g_camera.panRight(degrees);
    }

    //renderAllShapes();
    console.log(ev.keyCode);
}

function drawModel(model){
    modelMatrix.setIdentity();
    
    modelMatrix.translate(model.translate[0], model.translate[1], model.translate[2] );

    modelMatrix.rotate(model.rotate[0], 1, 0, 0);
    modelMatrix.rotate(model.rotate[1], 0, 1, 0);
    modelMatrix.rotate(model.rotate[2], 0, 0, 1);

    modelMatrix.scale(model.scale[0], model.scale[1], model.scale[2]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    gl.uniform3fv(u_Color, model.color);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices, gl.STATIC_DRAW);

    gl.drawElements(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_SHORT, 0);
}

function initBuffer(attributeName, n){
    let shaderBuffer = gl.createBuffer();
    if(!shaderBuffer){
        console.log("can't create buffer");
        return -1;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, shaderBuffer);
    let shaderAttribute = gl.getAttribLocation(gl.program, attributeName);
    gl.vertexAttribPointer(shaderAttribute, n, gl.FLOAT, false, 0,0);
    gl.enableVertexAttribArray(shaderAttribute);

    return shaderBuffer;
}

function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniform1i(gl.getUniformLocation(gl.program, 'u_normalOn'), g_normalOn);
    gl.uniform1i(gl.getUniformLocation(gl.program, 'u_lightingOn'), g_lightingOn);
    gl.uniform3fv(u_lightColor, lightColor);

    lightLocation = lightRotation.multiplyVector3(lightLocation);
    gl.uniform3fv(u_lightLocation, lightLocation.elements);
    pointLightSphere.setTranslate(lightLocation.elements[0], lightLocation.elements[1], lightLocation.elements[2]);
    
    // Update camera matrices
    gl.uniform3fv(u_eyePosition, g_camera.eye.elements);
    gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
    gl.uniformMatrix4fv(u_ProjectMatrix, false, g_camera.projectionMatrix.elements);

    for(let m of models){
        drawModel(m);
    }

    requestAnimationFrame(draw);
}

function addModel(color, shapeType) {
    let model = null;
    switch (shapeType) {
        case "cube":
            model = new Cube(color);
            break;
        case "sphere":
            model = new Sphere(color);
            break;
    }

    if(model){
        models.push(model);
    }

    return model;
}

function main() {
    setUpWegGL();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    connectVariablesToGLSL();
    addActionsForHtmlUI();

    // Add key listener
    document.onkeydown = keydown;

    let n = 3;
    for (let i = -n/2; i < n/2; i++){
      let r = Math.random();
      let g = Math.random();
      let b = Math.random();

      let cube = addModel([r, g, b], "cube");
      cube.setScale(0.5, 0.5, 0.5);
      cube.setTranslate(2*i + 1.0, -0.5, 0.0);

      let sphere = addModel([r, g, b], "sphere");
      sphere.setScale(0.5, 0.5, 0.5);
      sphere.setTranslate(2*i + 1.0, 0.5, 0.0);
    }

    pointLightSphere = new Sphere([1, 1, 1]);
    pointLightSphere.setScale(0.1, 0.1, 0.1);
    pointLightSphere.setTranslate(lightLocation);

    models.push(pointLightSphere);

    vertexBuffer = initBuffer("a_Position", 3);
    normalBuffer = initBuffer("a_Normal", 3);
    
    indexBuffer = gl.createBuffer();
    if(!indexBuffer){
        console.log("can't create buffer");
        return -1;
    }

    gl.uniform3f(u_ambientColor, 0.2, 0.2, 0.2);
    gl.uniform3f(u_diffuseColor, 0.8, 0.8, 0.8);
    gl.uniform3f(u_specularColor, 1.0, 1.0, 1.0);

    gl.uniform3fv(u_lightDirection, lightDirection.elements);

    g_camera = new Camera();
    g_camera.updateProjectionMatrix(canvas.width/canvas.height);

    draw();
}



