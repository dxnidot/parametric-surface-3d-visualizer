/***********************************************************************
 * 1. PRESETS DE SUPERFICIES PARAMÉTRICAS
 ***********************************************************************/
const PRESETS = {
    profesor: {
        name: "Hoja del Profesor",
        x: "5*u^2 - 3*v^3 + 2*u - v",
        y: "u^3 - 2*v^2 + u - 2",
        z: "5*u^2 - 3*v^2 + 5",
        uMin: -1.5, uMax: 1.5,
        vMin: -1.5, vMax: 1.5
    },
    propuesta1: {
        name: "Propuesta 1: Polinomio Suave",
        x: "2*u^2 - v^2 + u",
        y: "u*v + 2*v - 1",
        z: "u^3 - 2*v^2 + 3",
        uMin: -1.5, uMax: 1.5,
        vMin: -1.5, vMax: 1.5
    },
    propuesta2: {
        name: "Propuesta 2: Silla de Montar",
        x: "u^2 + v",
        y: "u - v^2",
        z: "u^2 - v^2 + 2",
        uMin: -1.5, uMax: 1.5,
        vMin: -1.5, vMax: 1.5
    },
    propuesta3: {
        name: "Propuesta 3: Cúbica Cruzada",
        x: "u^3 - 3*u*v^2",
        y: "3*u^2*v - v^3",
        z: "u^2 + v^2",
        uMin: -1.5, uMax: 1.5,
        vMin: -1.5, vMax: 1.5
    },
    ondulada: {
        name: "Superficie Trigonométrica",
        x: "u",
        y: "v",
        z: "sin(u) * cos(v)",
        uMin: -2.5, uMax: 2.5,
        vMin: -2.5, vMax: 2.5
    },
    enneper: {
        name: "Superficie de Enneper",
        x: "u - (u^3)/3 + u*v^2",
        y: "v - (v^3)/3 + v*u^2",
        z: "u^2 - v^2",
        uMin: -1.5, uMax: 1.5,
        vMin: -1.5, vMax: 1.5
    }
};

/***********************************************************************
 * 2. ESTADO GLOBAL DE LA APLICACIÓN (INICIA TOTALMENTE ESTÁTICO)
 ***********************************************************************/
const state = {
    exprX: PRESETS.profesor.x,
    exprY: PRESETS.profesor.y,
    exprZ: PRESETS.profesor.z,
    compiled: {
        x: null, y: null, z: null,
        xu: null, yu: null, zu: null,
        xv: null, yv: null, zv: null
    },
    symbolicStrings: {
        xu: "", yu: "", zu: "",
        xv: "", yv: "", zv: "",
        nx: "", ny: "", nz: ""
    },
    uMin: -1.5,
    uMax: 1.5,
    vMin: -1.5,
    vMax: 1.5,
    u0: 0.5,
    v0: 0.5,
    // Inicia en falso para que todo comience quieto en (u0, v0) y con cámara manual
    isPlaying: false,
    autoRotateCam: false,
    animMode: 'circle',
    animSpeed: 0.8,
    animTime: 0.0,
    animAnchor: {
        theta0: Math.PI / 4,
        radius: 0.7071,
        phiU0: 0,
        phiV0: 0,
        fixedU: 0.5,
        fixedV: 0.5
    },
    vecSizeScale: 1.0,
    surfaceScaleFactor: 1.0,
    showVecR: true,
    showTangents: true,
    showNormal: true,
    showTangentPlane: true,
    showCurves: true,
    showLabels: true,
    cleanMode: false
};

// Sincroniza la fase de animación con el punto (u0, v0) actual para que al dar Play continúe sin saltos
function syncAnimationPhaseFromCurrentUV() {
    state.animTime = 0;
    const uMid = 0.5 * (state.uMin + state.uMax);
    const vMid = 0.5 * (state.vMin + state.vMax);
    const uAmp = Math.max(0.1, 0.42 * (state.uMax - state.uMin));
    const vAmp = Math.max(0.1, 0.42 * (state.vMax - state.vMin));

    const du = state.u0 - uMid;
    const dv = state.v0 - vMid;
    let r = Math.sqrt(du * du + dv * dv);
    const maxR = Math.min(uAmp, vAmp);

    if (r < 1e-4) {
        r = 0.65 * maxR;
        state.animAnchor.theta0 = 0;
    } else {
        state.animAnchor.theta0 = Math.atan2(dv, du);
    }
    state.animAnchor.radius = Math.min(r, maxR * 1.1);

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
    state.animAnchor.phiU0 = Math.asin(clamp(du / uAmp, -1, 1));
    state.animAnchor.phiV0 = Math.asin(clamp(dv / vAmp, -1, 1));
    state.animAnchor.fixedU = state.u0;
    state.animAnchor.fixedV = state.v0;
}

/***********************************************************************
 * 3. MOTOR SIMBÓLICO Y COMPILACIÓN CON MATH.JS
 ***********************************************************************/
function compileCurrentExpressions() {
    const errBox = document.getElementById('eq-error-msg');
    try {
        const sx = document.getElementById('inp-x').value.trim();
        const sy = document.getElementById('inp-y').value.trim();
        const sz = document.getElementById('inp-z').value.trim();

        let uMin = parseFloat(document.getElementById('inp-umin').value);
        let uMax = parseFloat(document.getElementById('inp-umax').value);
        let vMin = parseFloat(document.getElementById('inp-vmin').value);
        let vMax = parseFloat(document.getElementById('inp-vmax').value);

        if (isNaN(uMin)) uMin = -1.5;
        if (isNaN(uMax) || uMax <= uMin) uMax = uMin + 3.0;
        if (isNaN(vMin)) vMin = -1.5;
        if (isNaN(vMax) || vMax <= vMin) vMax = vMin + 3.0;

        // Parse and compute symbolic derivatives with respect to u and v
        const nodeX = math.parse(sx);
        const nodeY = math.parse(sy);
        const nodeZ = math.parse(sz);

        const dXu = math.derivative(nodeX, 'u');
        const dYu = math.derivative(nodeY, 'u');
        const dZu = math.derivative(nodeZ, 'u');

        const dXv = math.derivative(nodeX, 'v');
        const dYv = math.derivative(nodeY, 'v');
        const dZv = math.derivative(nodeZ, 'v');

        // Test evaluation at (0.5, 0.5)
        const testScope = { u: 0.5, v: 0.5 };
        nodeX.evaluate(testScope);
        nodeY.evaluate(testScope);
        nodeZ.evaluate(testScope);

        // Save compiled functions
        state.exprX = sx;
        state.exprY = sy;
        state.exprZ = sz;
        state.uMin = uMin;
        state.uMax = uMax;
        state.vMin = vMin;
        state.vMax = vMax;

        state.compiled.x = nodeX.compile();
        state.compiled.y = nodeY.compile();
        state.compiled.z = nodeZ.compile();

        state.compiled.xu = dXu.compile();
        state.compiled.yu = dYu.compile();
        state.compiled.zu = dZu.compile();

        state.compiled.xv = dXv.compile();
        state.compiled.yv = dYv.compile();
        state.compiled.zv = dZv.compile();

        // Save symbolic strings
        const xuStr = dXu.toString();
        const yuStr = dYu.toString();
        const zuStr = dZu.toString();
        const xvStr = dXv.toString();
        const yvStr = dYv.toString();
        const zvStr = dZv.toString();

        state.symbolicStrings = {
            xu: xuStr, yu: yuStr, zu: zuStr,
            xv: xvStr, yv: yvStr, zv: zvStr,
            nx: `(${yuStr})*(${zvStr}) - (${zuStr})*(${yvStr})`,
            ny: `(${zuStr})*(${xvStr}) - (${xuStr})*(${zvStr})`,
            nz: `(${xuStr})*(${yvStr}) - (${yuStr})*(${xvStr})`
        };

        // Update sliders min/max
        const slU = document.getElementById('slider-u');
        const slV = document.getElementById('slider-v');
        slU.min = state.uMin; slU.max = state.uMax;
        slV.min = state.vMin; slV.max = state.vMax;

        // Keep u0, v0 within domain bounds
        state.u0 = Math.max(state.uMin, Math.min(state.uMax, state.u0));
        state.v0 = Math.max(state.vMin, Math.min(state.vMax, state.v0));
        slU.value = state.u0;
        slV.value = state.v0;
        document.getElementById('num-inp-u').value = state.u0.toFixed(2);
        document.getElementById('num-inp-v').value = state.v0.toFixed(2);

        syncAnimationPhaseFromCurrentUV();
        errBox.classList.add('hidden');
        updateAnalyticalTabUI();
        updateExportCodes();
        return true;
    } catch (err) {
        errBox.textContent = "Error de sintaxis: revisa tu expresión en términos de u y v (ej. 5*u^2 - 3*v^3).";
        errBox.classList.remove('hidden');
        return false;
    }
}
function updateExportCodes() {
    const s = state.symbolicStrings;
    const ggb = [
        `# 1. Crear deslizadores en GeoGebra 3D:`,
        `u0 = Deslizador(${state.uMin}, ${state.uMax}, 0.05)`,
        `v0 = Deslizador(${state.vMin}, ${state.vMax}, 0.05)`,
        ``,
        `# 2. Graficar la Superficie Paramétrica r(u,v):`,
        `a = Superficie(${state.exprX}, ${state.exprY}, ${state.exprZ}, u, ${state.uMin}, ${state.uMax}, v, ${state.vMin}, ${state.vMax})`,
        ``,
        `# 3. Punto móvil P sobre la superficie y Vector Posición r:`,
        `P = a(u0, v0)`,
        `r = Vector((0, 0, 0), P)`,
        ``,
        `# 4. Curvas paramétricas u y v que pasan por P:`,
        `CurvaU = Curva(a(t, v0), t, ${state.uMin}, ${state.uMax})`,
        `CurvaV = Curva(a(u0, t), t, ${state.vMin}, ${state.vMax})`,
        ``,
        `# 5. Vectores Tangentes r_u, r_v y Vector Normal n = r_u x r_v:`,
        `ru = Vector(P, P + (${s.xu.replace(/u/g,'u0').replace(/v/g,'v0')}, ${s.yu.replace(/u/g,'u0').replace(/v/g,'v0')}, ${s.zu.replace(/u/g,'u0').replace(/v/g,'v0')}))`,
        `rv = Vector(P, P + (${s.xv.replace(/u/g,'u0').replace(/v/g,'v0')}, ${s.yv.replace(/u/g,'u0').replace(/v/g,'v0')}, ${s.zv.replace(/u/g,'u0').replace(/v/g,'v0')}))`,
        `n = Vector(P, P + ((ru) ⊗ (rv)))`
    ].join('\n');
    document.getElementById('code-geogebra').textContent = ggb;

    const toPy = (str) => str.replace(/\^/g, '**');
    const py = [
        `import numpy as np`,
        `import matplotlib.pyplot as plt`,
        ``,
        `# 1. Definir la superficie paramétrica r(u,v) y derivadas parciales`,
        `def r_vec(u, v):`,
        `    x = ${toPy(state.exprX)}`,
        `    y = ${toPy(state.exprY)}`,
        `    z = ${toPy(state.exprZ)}`,
        `    return np.array([x, y, z])`,
        ``,
        `def r_u(u, v):`,
        `    return np.array([${toPy(s.xu)}, ${toPy(s.yu)}, ${toPy(s.zu)}], dtype=float)`,
        ``,
        `def r_v(u, v):`,
        `    return np.array([${toPy(s.xv)}, ${toPy(s.yv)}, ${toPy(s.zv)}], dtype=float)`,
        ``,
        `# 2. Malla de parámetros (u, v)`,
        `U, V = np.meshgrid(np.linspace(${state.uMin}, ${state.uMax}, 45), np.linspace(${state.vMin}, ${state.vMax}, 45))`,
        `X, Y, Z = r_vec(U, V)`,
        ``,
        `# 3. Evaluar en el punto estático (u0, v0) = (${state.u0.toFixed(2)}, ${state.v0.toFixed(2)})`,
        `u0, v0 = ${state.u0.toFixed(2)}, ${state.v0.toFixed(2)}`,
        `P = r_vec(u0, v0)`,
        `ru_val = r_u(u0, v0)`,
        `rv_val = r_v(u0, v0)`,
        `n_val = np.cross(ru_val, rv_val)`,
        ``,
        `fig = plt.figure(figsize=(10, 8))`,
        `ax = fig.add_subplot(111, projection='3d')`,
        `ax.plot_surface(X, Y, Z, cmap='plasma', alpha=0.65, edgecolor='none')`,
        `ax.scatter(*P, color='black', s=60, label=f'P({u0}, {v0})')`,
        `ax.quiver(*P, *ru_val, color='red', length=1.0, normalize=True, label='r_u (Tangente u)')`,
        `ax.quiver(*P, *rv_val, color='cyan', length=1.0, normalize=True, label='r_v (Tangente v)')`,
        `ax.quiver(*P, *n_val, color='green', length=1.2, normalize=True, label='n = r_u x r_v (Normal)')`,
        `ax.legend()`,
        `plt.show()`
    ].join('\n');
    document.getElementById('code-python').textContent = py;
}

function evalR(u, v) {
    const scope = { u, v };
    return new THREE.Vector3(
        Number(state.compiled.x.evaluate(scope)) || 0,
        Number(state.compiled.y.evaluate(scope)) || 0,
        Number(state.compiled.z.evaluate(scope)) || 0
    );
}

function evalRu(u, v) {
    const scope = { u, v };
    return new THREE.Vector3(
        Number(state.compiled.xu.evaluate(scope)) || 0,
        Number(state.compiled.yu.evaluate(scope)) || 0,
        Number(state.compiled.zu.evaluate(scope)) || 0
    );
}

function evalRv(u, v) {
    const scope = { u, v };
    return new THREE.Vector3(
        Number(state.compiled.xv.evaluate(scope)) || 0,
        Number(state.compiled.yv.evaluate(scope)) || 0,
        Number(state.compiled.zv.evaluate(scope)) || 0
    );
}

function updateAnalyticalTabUI() {
    const s = state.symbolicStrings;
    document.getElementById('sym-r').innerHTML =
        `r(u,v) = [ <span class="text-amber-300">${state.exprX}</span> , <span class="text-amber-300">${state.exprY}</span> , <span class="text-amber-300">${state.exprZ}</span> ]`;

    document.getElementById('sym-ru').innerHTML =
        `r_u(u,v) = [ <span class="text-rose-300">${s.xu}</span> , <span class="text-rose-300">${s.yu}</span> , <span class="text-rose-300">${s.zu}</span> ]`;

    document.getElementById('sym-rv').innerHTML =
        `r_v(u,v) = [ <span class="text-cyan-300">${s.xv}</span> , <span class="text-cyan-300">${s.yv}</span> , <span class="text-cyan-300">${s.zv}</span> ]`;

    document.getElementById('sym-det').innerHTML = `
        <table class="w-full text-center border-collapse">
            <tr class="border-b border-slate-800 text-indigo-300 font-bold">
                <td class="py-1 px-2">î</td>
                <td class="py-1 px-2">ĵ</td>
                <td class="py-1 px-2">k̂</td>
            </tr>
            <tr class="text-rose-300">
                <td class="py-1 px-2">${s.xu}</td>
                <td class="py-1 px-2">${s.yu}</td>
                <td class="py-1 px-2">${s.zu}</td>
            </tr>
            <tr class="text-cyan-300">
                <td class="py-1 px-2">${s.xv}</td>
                <td class="py-1 px-2">${s.yv}</td>
                <td class="py-1 px-2">${s.zv}</td>
            </tr>
        </table>
    `;

    document.getElementById('sym-n').innerHTML = `
        <div><span class="text-emerald-400 font-bold">n_x =</span> ${s.nx}</div>
        <div><span class="text-emerald-400 font-bold">n_y =</span> ${s.ny}</div>
        <div><span class="text-emerald-400 font-bold">n_z =</span> ${s.nz}</div>
    `;
}

/***********************************************************************
 * 4. ESCENA THREE.JS (CON EJE Z VERTICAL COMO EN CÁLCULO VECTORIAL)
 ***********************************************************************/
let scene, camera, renderer, controls;
let surfaceGroup, dynamicGroup;
let pointMesh, tangentPlaneMesh, curveULine, curveVLine;
let arrowR, arrowRu, arrowRv, arrowN;

// Positions in 3D scene for HTML floating labels
const labelWorldPositions = {
    p: new THREE.Vector3(),
    r: new THREE.Vector3(),
    ru: new THREE.Vector3(),
    rv: new THREE.Vector3(),
    n: new THREE.Vector3()
};

function initThreeScene() {
    const container = document.getElementById('canvas-container');

    // Make Z-axis the vertical axis (standard in Calculus 3 & GeoGebra 3D)
    THREE.Object3D.DefaultUp.set(0, 0, 1);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a12);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.up.set(0, 0, 1);
    camera.position.set(15, -15, 11);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = state.autoRotateCam;
    controls.autoRotateSpeed = 1.2;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(20, -20, 30);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 0.45);
    dirLight2.position.set(-20, 20, -15);
    scene.add(dirLight2);

    // Reference Grid on XY Plane (Z=0) and Coordinate Axes
    buildAxesAndGrid();

    surfaceGroup = new THREE.Group();
    scene.add(surfaceGroup);

    dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    initDynamicObjects();
    rebuildSurfaceGeometry();
    updateDynamicVectors();

    window.addEventListener('resize', onWindowResize);
}

function buildAxesAndGrid() {
    const grid = new THREE.GridHelper(16, 16, 0x334155, 0x1e293b);
    grid.rotation.x = Math.PI / 2; // Align grid to XY plane
    scene.add(grid);

    // X (Red-ish), Y (Green-ish), Z (Blue-ish) Reference Axes
    const axesLen = 8.5;
    const matX = new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.55 });
    const matY = new THREE.LineBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.55 });
    const matZ = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.65 });

    const geomX = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-axesLen,0,0), new THREE.Vector3(axesLen,0,0)]);
    const geomY = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-axesLen,0), new THREE.Vector3(0,axesLen,0)]);
    const geomZ = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,-axesLen), new THREE.Vector3(0,0,axesLen)]);

    scene.add(new THREE.Line(geomX, matX));
    scene.add(new THREE.Line(geomY, matY));
    scene.add(new THREE.Line(geomZ, matZ));
}

/***********************************************************************
 * 5. CONSTRUCCIÓN DE LA MALLA DE LA SUPERFICIE PARAMÉTRICA
 ***********************************************************************/
function rebuildSurfaceGeometry() {
    // Clear existing surface mesh
    while (surfaceGroup.children.length > 0) {
        const obj = surfaceGroup.children[0];
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        surfaceGroup.remove(obj);
    }

    const segs = 56;
    const uMin = state.uMin, uMax = state.uMax;
    const vMin = state.vMin, vMax = state.vMax;

    // First pass: sample points to determine bounding box so any polynomial fits nicely inside a radius ~6 box
    let maxCoord = 0.001;
    const rawPoints = [];
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i <= segs; i++) {
        const u = uMin + ((uMax - uMin) * i) / segs;
        for (let j = 0; j <= segs; j++) {
            const v = vMin + ((vMax - vMin) * j) / segs;
            const pt = evalR(u, v);
            rawPoints.push(pt);
            maxCoord = Math.max(maxCoord, Math.abs(pt.x), Math.abs(pt.y), Math.abs(pt.z));
            if (pt.z < minZ) minZ = pt.z;
            if (pt.z > maxZ) maxZ = pt.z;
        }
    }

    // Target visual radius around 5.5 units so camera always has a great view
    state.surfaceScaleFactor = 5.5 / maxCoord;
    const scale = state.surfaceScaleFactor;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(rawPoints.length * 3);
    const colors = new Float32Array(rawPoints.length * 3);
    const indices = [];

    const colorLow = new THREE.Color(0x3b82f6);  // Deep Blue
    const colorMid = new THREE.Color(0x8b5cf6);  // Violet/Purple
    const colorHigh = new THREE.Color(0xec4899); // Pink/Magenta
    const tempColor = new THREE.Color();
    const zSpan = (maxZ - minZ) || 1;

    for (let idx = 0; idx < rawPoints.length; idx++) {
        const pt = rawPoints[idx];
        positions[idx * 3]     = pt.x * scale;
        positions[idx * 3 + 1] = pt.y * scale;
        positions[idx * 3 + 2] = pt.z * scale;

        const t = (pt.z - minZ) / zSpan;
        if (t < 0.5) {
            tempColor.lerpColors(colorLow, colorMid, t * 2);
        } else {
            tempColor.lerpColors(colorMid, colorHigh, (t - 0.5) * 2);
        }
        colors[idx * 3]     = tempColor.r;
        colors[idx * 3 + 1] = tempColor.g;
        colors[idx * 3 + 2] = tempColor.b;
    }

    for (let i = 0; i < segs; i++) {
        for (let j = 0; j < segs; j++) {
            const a = i * (segs + 1) + j;
            const b = (i + 1) * (segs + 1) + j;
            const c = (i + 1) * (segs + 1) + (j + 1);
            const d = i * (segs + 1) + (j + 1);
            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const surfaceMat = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
        shininess: 65,
        specular: 0x334155
    });

    const mesh = new THREE.Mesh(geometry, surfaceMat);
    surfaceGroup.add(mesh);

    // Subtle wireframe grid lines on surface
    const wireMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.08
    });
    const wireMesh = new THREE.Mesh(geometry, wireMat);
    surfaceGroup.add(wireMesh);
}

/***********************************************************************
 * 6. OBJETOS DINÁMICOS: PUNTO P, CURVAS u0/v0, PLANO TANGENTE Y FLECHAS 3D
 ***********************************************************************/
function createCustomArrow(hexColor) {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({
        color: hexColor,
        emissive: hexColor,
        emissiveIntensity: 0.28,
        shininess: 80
    });

    // Shaft cylinder along +Y initially, rotated to +Z
    const shaftGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 16);
    shaftGeo.translate(0, 0.5, 0);
    shaftGeo.rotateX(Math.PI / 2); // Now along +Z
    const shaft = new THREE.Mesh(shaftGeo, mat);

    const headGeo = new THREE.ConeGeometry(0.16, 0.42, 20);
    headGeo.translate(0, 0.21, 0);
    headGeo.rotateX(Math.PI / 2); // Pointing along +Z
    const head = new THREE.Mesh(headGeo, mat);

    group.add(shaft);
    group.add(head);
    group.userData = { shaft, head };
    return group;
}

function setCustomArrow(arrowGroup, origin, dirVector, length) {
    if (length < 0.001 || dirVector.lengthSq() < 1e-10) {
        arrowGroup.visible = false;
        return;
    }
    arrowGroup.position.copy(origin);
    const normDir = dirVector.clone().normalize();
    const target = origin.clone().add(normDir);
    arrowGroup.lookAt(target);

    const headLen = Math.min(0.42, length * 0.35);
    const shaftLen = Math.max(0.01, length - headLen);
    arrowGroup.userData.shaft.scale.set(1, 1, shaftLen);
    arrowGroup.userData.head.position.set(0, 0, shaftLen);
}

function initDynamicObjects() {
    // Evaluation point P(u0, v0)
    const ptGeo = new THREE.SphereGeometry(0.16, 24, 24);
    const ptMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    pointMesh = new THREE.Mesh(ptGeo, ptMat);
    dynamicGroup.add(pointMesh);

    // Tangent Plane Patch
    const planeGeo = new THREE.PlaneGeometry(2.6, 2.6, 4, 4);
    const planeMat = new THREE.MeshPhongMaterial({
        color: 0x6366f1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.26,
        depthWrite: false
    });
    tangentPlaneMesh = new THREE.Mesh(planeGeo, planeMat);
    const planeBorder = new THREE.LineSegments(
        new THREE.EdgesGeometry(planeGeo),
        new THREE.LineBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.65 })
    );
    tangentPlaneMesh.add(planeBorder);
    dynamicGroup.add(tangentPlaneMesh);

    // Parameter Curves u-varying (Red/Rose) & v-varying (Cyan)
    curveULine = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    curveVLine = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    dynamicGroup.add(curveULine);
    dynamicGroup.add(curveVLine);

    // 4 Vector Arrows: Position r (Amber), Tangent r_u (Rose), Tangent r_v (Cyan), Normal n (Emerald)
    arrowR  = createCustomArrow(0xfbbf24);
    arrowRu = createCustomArrow(0xf43f5e);
    arrowRv = createCustomArrow(0x22d3ee);
    arrowN  = createCustomArrow(0x10b981);

    dynamicGroup.add(arrowR);
    dynamicGroup.add(arrowRu);
    dynamicGroup.add(arrowRv);
    dynamicGroup.add(arrowN);
}

function updateParameterCurves(u0, v0, scale) {
    const uMin = state.uMin, uMax = state.uMax;
    const vMin = state.vMin, vMax = state.vMax;
    const steps = 60;

    // Curve U: v fixed at v0, u varies in [uMin, uMax]
    const ptsU = [];
    for (let i = 0; i <= steps; i++) {
        const u = uMin + ((uMax - uMin) * i) / steps;
        ptsU.push(evalR(u, v0).multiplyScalar(scale));
    }
    const pathU = new THREE.CatmullRomCurve3(ptsU);
    if (curveULine.geometry) curveULine.geometry.dispose();
    curveULine.geometry = new THREE.TubeGeometry(pathU, 50, 0.038, 8, false);
    curveULine.visible = state.showCurves;

    // Curve V: u fixed at u0, v varies in [vMin, vMax]
    const ptsV = [];
    for (let i = 0; i <= steps; i++) {
        const v = vMin + ((vMax - vMin) * i) / steps;
        ptsV.push(evalR(u0, v).multiplyScalar(scale));
    }
    const pathV = new THREE.CatmullRomCurve3(ptsV);
    if (curveVLine.geometry) curveVLine.geometry.dispose();
    curveVLine.geometry = new THREE.TubeGeometry(pathV, 50, 0.038, 8, false);
    curveVLine.visible = state.showCurves;
}

function updateDynamicVectors() {
    const u0 = state.u0;
    const v0 = state.v0;
    const scale = state.surfaceScaleFactor;

    // 1. Exact Mathematical Evaluations
    const rExact  = evalR(u0, v0);
    const ruExact = evalRu(u0, v0);
    const rvExact = evalRv(u0, v0);
    const nExact  = new THREE.Vector3().crossVectors(ruExact, rvExact);

    // 2. Visual 3D Scene Positions
    const P = rExact.clone().multiplyScalar(scale);
    pointMesh.position.copy(P);

    // Update curves passing through P
    updateParameterCurves(u0, v0, scale);

    // Visual lengths for vectors so they are always clear and well-proportioned
    const baseVecLen = 2.4 * state.vecSizeScale;

    // Position vector r(u0, v0) from Origin (0,0,0) to P
    arrowR.visible = state.showVecR;
    if (state.showVecR) {
        setCustomArrow(arrowR, new THREE.Vector3(0, 0, 0), P, P.length());
    }

    // Tangent vector r_u
    arrowRu.visible = state.showTangents;
    if (state.showTangents) {
        setCustomArrow(arrowRu, P, ruExact, baseVecLen);
    }

    // Tangent vector r_v
    arrowRv.visible = state.showTangents;
    if (state.showTangents) {
        setCustomArrow(arrowRv, P, rvExact, baseVecLen);
    }

    // Normal vector n = r_u x r_v
    arrowN.visible = state.showNormal;
    if (state.showNormal) {
        setCustomArrow(arrowN, P, nExact, baseVecLen * 1.15);
    }

    // Tangent Plane oriented perpendicular to Normal vector n
    tangentPlaneMesh.visible = state.showTangentPlane && nExact.lengthSq() > 1e-8;
    if (tangentPlaneMesh.visible) {
        tangentPlaneMesh.position.copy(P);
        const lookTarget = P.clone().add(nExact.clone().normalize());
        tangentPlaneMesh.lookAt(lookTarget);
    }

    // Save 3D anchor points for floating HTML labels
    labelWorldPositions.p.copy(P).add(new THREE.Vector3(0, 0, 0.35));
    labelWorldPositions.r.copy(P).multiplyScalar(0.5);
    labelWorldPositions.ru.copy(P).add(ruExact.clone().normalize().multiplyScalar(baseVecLen + 0.35));
    labelWorldPositions.rv.copy(P).add(rvExact.clone().normalize().multiplyScalar(baseVecLen + 0.35));
    labelWorldPositions.n.copy(P).add(nExact.clone().normalize().multiplyScalar(baseVecLen * 1.15 + 0.35));

    // Update floating label text with real-time numeric coordinates
    const fmtNum = (v) => `[${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}]`;
    document.getElementById('lbl-p').textContent = `P(${u0.toFixed(2)}, ${v0.toFixed(2)})`;
    document.getElementById('lbl-r').textContent = `r: ${fmtNum(rExact)}`;
    document.getElementById('lbl-ru').textContent = `r_u: ${fmtNum(ruExact)}`;
    document.getElementById('lbl-rv').textContent = `r_v: ${fmtNum(rvExact)}`;
    document.getElementById('lbl-n').textContent = `n = r_u × r_v: ${fmtNum(nExact)}`;

    // Update Numerical Readout in Sidebar
    const fmt = (v) => `[${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}]`;
    document.getElementById('num-inp-u').value = u0.toFixed(2);
    document.getElementById('num-inp-v').value = v0.toFixed(2);
    document.getElementById('live-uv-badge').textContent = `(u=${u0.toFixed(2)}, v=${v0.toFixed(2)})`;
    document.getElementById('num-r').textContent  = fmt(rExact);
    document.getElementById('num-ru').textContent = fmt(ruExact);
    document.getElementById('num-rv').textContent = fmt(rvExact);
    document.getElementById('num-n').textContent  = fmt(nExact);
}

function updateFloatingLabels() {
    const container = document.getElementById('canvas-container');
    const w = container.clientWidth;
    const h = container.clientHeight;

    const map = [
        { id: 'lbl-p',  pos: labelWorldPositions.p,  show: state.showLabels },
        { id: 'lbl-r',  pos: labelWorldPositions.r,  show: state.showLabels && state.showVecR },
        { id: 'lbl-ru', pos: labelWorldPositions.ru, show: state.showLabels && state.showTangents },
        { id: 'lbl-rv', pos: labelWorldPositions.rv, show: state.showLabels && state.showTangents },
        { id: 'lbl-n',  pos: labelWorldPositions.n,  show: state.showLabels && state.showNormal }
    ];

    map.forEach(item => {
        const el = document.getElementById(item.id);
        if (!item.show) {
            el.style.opacity = '0';
            return;
        }
        const proj = item.pos.clone().project(camera);
        if (proj.z > 1) {
            el.style.opacity = '0';
            return;
        }
        const x = (proj.x * 0.5 + 0.5) * w;
        const y = (-proj.y * 0.5 + 0.5) * h;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.opacity = '1';
    });
}

/***********************************************************************
 * 7. BUCLE DE ANIMACIÓN Y EVENTOS DE INTERFAZ
 ***********************************************************************/
let lastFrameTime = performance.now();

function animate(now) {
    requestAnimationFrame(animate);

    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    if (state.isPlaying) {
        state.animTime += dt * state.animSpeed;
        const uMid = 0.5 * (state.uMin + state.uMax);
        const vMid = 0.5 * (state.vMin + state.vMax);
        const uAmp = Math.max(0.1, 0.42 * (state.uMax - state.uMin));
        const vAmp = Math.max(0.1, 0.42 * (state.vMax - state.vMin));
        const t = state.animTime;

        if (state.animMode === 'circle') {
            const R = state.animAnchor.radius;
            const th = state.animAnchor.theta0 + t;
            state.u0 = Math.max(state.uMin, Math.min(state.uMax, uMid + R * Math.cos(th)));
            state.v0 = Math.max(state.vMin, Math.min(state.vMax, vMid + R * Math.sin(th)));
        } else if (state.animMode === 'sweep-u') {
            state.u0 = uMid + uAmp * Math.sin(state.animAnchor.phiU0 + t * 1.2);
            state.v0 = state.animAnchor.fixedV;
        } else if (state.animMode === 'sweep-v') {
            state.u0 = state.animAnchor.fixedU;
            state.v0 = vMid + vAmp * Math.sin(state.animAnchor.phiV0 + t * 1.2);
        } else if (state.animMode === 'lissajous') {
            state.u0 = uMid + uAmp * Math.sin(state.animAnchor.phiU0 + t * 1.1);
            state.v0 = vMid + vAmp * Math.sin(state.animAnchor.phiV0 + t * 0.75);
        }

        document.getElementById('slider-u').value = state.u0;
        document.getElementById('slider-v').value = state.v0;
        updateDynamicVectors();
    }

    controls.update();
    renderer.render(scene, camera);
    updateFloatingLabels();
}

function setCameraPresetView(viewType) {
    // Stop auto-rotation when user picks a specific view so they have manual control
    state.autoRotateCam = false;
    controls.autoRotate = false;
    updateAutoRotateButtonUI();

    controls.target.set(0, 0, 0);
    if (viewType === 'iso') {
        camera.position.set(15, -15, 11);
    } else if (viewType === 'xy') {
        camera.position.set(0, -0.01, 22);
    } else if (viewType === 'xz') {
        camera.position.set(0, -22, 0);
    } else if (viewType === 'yz') {
        camera.position.set(22, 0, 0);
    }
    controls.update();
}

function updateAutoRotateButtonUI() {
    const btnRot = document.getElementById('btn-auto-rotate');
    const iconRot = document.getElementById('icon-auto-rotate');
    const txtRot = document.getElementById('txt-auto-rotate');

    if (state.autoRotateCam) {
        btnRot.className = "px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/30 text-indigo-200 border border-indigo-500/50 hover:bg-indigo-600/50 transition flex items-center gap-1.5";
        iconRot.className = "fa-solid fa-arrows-rotate fa-spin text-indigo-300";
        txtRot.textContent = "Giro Cámara: ON (Auto)";
    } else {
        btnRot.className = "px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition flex items-center gap-1.5";
        iconRot.className = "fa-solid fa-hand-pointer text-amber-400";
        txtRot.textContent = "Giro Cámara: OFF (Manual)";
    }
}

function updatePlayButtonUI() {
    const btnPlay = document.getElementById('btn-play-anim');
    const icon = document.getElementById('icon-play');
    const txt = document.getElementById('txt-play');
    const badge = document.getElementById('status-anim-badge');

    const hudBtn = document.getElementById('btn-hud-play');
    const hudIcon = document.getElementById('icon-hud-play');
    const hudTxt = document.getElementById('txt-hud-play');

    if (state.isPlaying) {
        icon.className = "fa-solid fa-pause";
        txt.textContent = "⏸ Pausar Animación en el punto actual";
        btnPlay.className = "w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg";
        badge.textContent = "ANIMANDO (u, v)";
        badge.className = "text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";

        hudIcon.className = "fa-solid fa-pause";
        hudTxt.textContent = "Pausar (u,v)";
        hudBtn.className = "px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5";
    } else {
        icon.className = "fa-solid fa-play";
        txt.textContent = "▶ Reproducir Animación desde este punto (u₀, v₀)";
        btnPlay.className = "w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg";
        badge.textContent = "MODO ESTÁTICO";
        badge.className = "text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30";

        hudIcon.className = "fa-solid fa-play";
        hudTxt.textContent = "Animar (u,v)";
        hudBtn.className = "px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-slate-950 transition flex items-center gap-1.5";
    }
}

function toggleParameterAnimation() {
    if (!state.isPlaying) {
        // Synchronize starting phase with current static (u0, v0) so it continues smoothly without jumping
        syncAnimationPhaseFromCurrentUV();
        state.isPlaying = true;
    } else {
        state.isPlaying = false;
        updateExportCodes();
    }
    updatePlayButtonUI();
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function setupUIEvents() {
    // Preset Selector
    document.getElementById('preset-select').addEventListener('change', (e) => {
        const p = PRESETS[e.target.value];
        if (!p) return;
        document.getElementById('inp-x').value = p.x;
        document.getElementById('inp-y').value = p.y;
        document.getElementById('inp-z').value = p.z;
        document.getElementById('inp-umin').value = p.uMin;
        document.getElementById('inp-umax').value = p.uMax;
        document.getElementById('inp-vmin').value = p.vMin;
        document.getElementById('inp-vmax').value = p.vMax;
        document.getElementById('active-preset-badge').textContent = p.name;

        if (compileCurrentExpressions()) {
            rebuildSurfaceGeometry();
            updateDynamicVectors();
        }
    });

    // Apply Custom Equations Button
    document.getElementById('btn-apply-eq').addEventListener('click', () => {
        document.getElementById('active-preset-badge').textContent = "Función Personalizada";
        if (compileCurrentExpressions()) {
            rebuildSurfaceGeometry();
            updateDynamicVectors();
        }
    });

    // Play / Pause Animation Buttons (Sidebar + HUD)
    document.getElementById('btn-play-anim').addEventListener('click', toggleParameterAnimation);
    document.getElementById('btn-hud-play').addEventListener('click', toggleParameterAnimation);

    // Sliders u0 and v0
    document.getElementById('slider-u').addEventListener('input', (e) => {
        state.isPlaying = false;
        updatePlayButtonUI();
        state.u0 = parseFloat(e.target.value) || 0;
        syncAnimationPhaseFromCurrentUV();
        updateDynamicVectors();
        updateExportCodes();
    });

    document.getElementById('slider-v').addEventListener('input', (e) => {
        state.isPlaying = false;
        updatePlayButtonUI();
        state.v0 = parseFloat(e.target.value) || 0;
        syncAnimationPhaseFromCurrentUV();
        updateDynamicVectors();
        updateExportCodes();
    });

    // Direct Numeric Inputs for u0 and v0
    document.getElementById('num-inp-u').addEventListener('change', (e) => {
        state.isPlaying = false;
        updatePlayButtonUI();
        let val = parseFloat(e.target.value);
        if (isNaN(val)) val = 0.5;
        state.u0 = Math.max(state.uMin, Math.min(state.uMax, val));
        document.getElementById('slider-u').value = state.u0;
        syncAnimationPhaseFromCurrentUV();
        updateDynamicVectors();
        updateExportCodes();
    });

    document.getElementById('num-inp-v').addEventListener('change', (e) => {
        state.isPlaying = false;
        updatePlayButtonUI();
        let val = parseFloat(e.target.value);
        if (isNaN(val)) val = 0.5;
        state.v0 = Math.max(state.vMin, Math.min(state.vMax, val));
        document.getElementById('slider-v').value = state.v0;
        syncAnimationPhaseFromCurrentUV();
        updateDynamicVectors();
        updateExportCodes();
    });

    // Animation Mode & Speed
    document.getElementById('anim-mode').addEventListener('change', (e) => {
        syncAnimationPhaseFromCurrentUV();
        state.animMode = e.target.value;
    });
    document.getElementById('slider-speed').addEventListener('input', (e) => {
        state.animSpeed = parseFloat(e.target.value);
        document.getElementById('lbl-speed').textContent = `${state.animSpeed.toFixed(1)}x`;
    });

    // Checkboxes for visibility
    document.getElementById('chk-vec-r').addEventListener('change', (e) => {
        state.showVecR = e.target.checked;
        updateDynamicVectors();
    });
    document.getElementById('chk-vec-tangents').addEventListener('change', (e) => {
        state.showTangents = e.target.checked;
        updateDynamicVectors();
    });
    document.getElementById('chk-vec-normal').addEventListener('change', (e) => {
        state.showNormal = e.target.checked;
        updateDynamicVectors();
    });
    document.getElementById('chk-tangent-plane').addEventListener('change', (e) => {
        state.showTangentPlane = e.target.checked;
        updateDynamicVectors();
    });
    document.getElementById('chk-curves').addEventListener('change', (e) => {
        state.showCurves = e.target.checked;
        updateDynamicVectors();
    });
    document.getElementById('chk-labels').addEventListener('change', (e) => {
        state.showLabels = e.target.checked;
    });
    document.getElementById('slider-vec-size').addEventListener('input', (e) => {
        state.vecSizeScale = parseFloat(e.target.value);
        updateDynamicVectors();
    });

    // Camera Auto Rotate Toggle
    document.getElementById('btn-auto-rotate').addEventListener('click', () => {
        state.autoRotateCam = !state.autoRotateCam;
        controls.autoRotate = state.autoRotateCam;
        updateAutoRotateButtonUI();
    });

    // Quick Camera Preset Views (3D Iso, XY, XZ, YZ)
    document.querySelectorAll('.cam-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setCameraPresetView(btn.getAttribute('data-cam'));
        });
    });

    // Clean Mode / Reel Mode
    document.getElementById('btn-clean-ui').addEventListener('click', () => {
        state.cleanMode = !state.cleanMode;
        const sidebar = document.getElementById('sidebar-panel');
        sidebar.classList.toggle('hidden', state.cleanMode);
        setTimeout(onWindowResize, 50);
    });

    // Sidebar Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            document.getElementById('tab-controls').classList.toggle('hidden', target !== 'tab-controls');
            document.getElementById('tab-math').classList.toggle('hidden', target !== 'tab-math');

            tabBtns.forEach(b => {
                const active = b === btn;
                b.setAttribute('aria-selected', active);
                b.className = active
                    ? "tab-btn flex-1 py-2 px-3 text-xs font-semibold rounded-t-lg bg-slate-900 text-indigo-400 border-t border-x border-slate-800 flex items-center justify-center gap-1.5"
                    : "tab-btn flex-1 py-2 px-3 text-xs font-semibold rounded-t-lg text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5";
            });
        });
    });

    // Export Modal
    const modal = document.getElementById('modal-export');
    const openBtn = document.getElementById('btn-open-export');
    const closeExportModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        openBtn.focus();
    };
    openBtn.addEventListener('click', () => {
        updateExportCodes();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.getElementById('btn-close-export').focus();
    });
    document.getElementById('btn-close-export').addEventListener('click', closeExportModal);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeExportModal();
    });

    const copyTextHelper = (elementId, btnId, defaultLabel) => {
        const text = document.getElementById(elementId).textContent;
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        const btn = document.getElementById(btnId);
        btn.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> ¡Copiado!';
        setTimeout(() => {
            btn.innerHTML = `<i class="fa-regular fa-copy"></i> ${defaultLabel}`;
        }, 2000);
    };

    document.getElementById('btn-copy-ggb').addEventListener('click', () => {
        copyTextHelper('code-geogebra', 'btn-copy-ggb', 'Copiar GeoGebra');
    });
    document.getElementById('btn-copy-py').addEventListener('click', () => {
        copyTextHelper('code-python', 'btn-copy-py', 'Copiar Python');
    });
}

// Start Application on Window Load (Static Mode by default)
window.onload = function () {
    compileCurrentExpressions();
    initThreeScene();
    setupUIEvents();
    updateAutoRotateButtonUI();
    updatePlayButtonUI();
    requestAnimationFrame(animate);
};
