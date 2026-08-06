import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Motor de Juego Beat Saber 3D — Cyberpunk Post-Processing Edition
 */
class BeatSaberGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        
        // 1. Inicializar escena 3D
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x030308);
        this.scene.fog = new THREE.FogExp2(0x030308, 0.025);

        // 2. Inicializar cámara
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.cameraBasePos = new THREE.Vector3(0, 1.6, 3);
        this.camera.position.copy(this.cameraBasePos);
        this.cameraShake = 0;

        // 3. Inicializar renderizador WebGL
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // 4. Pipeline de Post-Procesamiento (Unreal Bloom)
        this.setupPostProcessing();

        // 5. Variables de Estado del Juego
        this.score = 0;
        this.combo = 1;
        this.difficulty = 'NORMAL';
        this.blocks = [];
        this.particles = [];
        this.slicedHalves = [];
        this.popups = [];
        this.tunnelArches = [];
        this.clock = new THREE.Clock();
        this.isPlaying = false;

        // Configuración de velocidad y Spawner Sincronizado
        this.blockSpeed = 14.0; 
        this.spawnZ = -40.0; 
        this.hitZ = 1.5; 
        this.leadTime = Math.abs(this.spawnZ - this.hitZ) / this.blockSpeed; 

        this.beatmap = [];
        this.nextBeatIndex = 0;

        // Elementos DOM del HUD y Modal
        this.scoreValEl = document.getElementById('score-val');
        this.comboValEl = document.getElementById('combo-val');
        this.comboBadgeEl = document.getElementById('combo-badge');
        this.difficultyValEl = document.getElementById('difficulty-val');
        this.audioFileInput = document.getElementById('audio-file-input');
        this.btnSynthNormal = document.getElementById('btn-synth-normal');
        this.btnSynthHard = document.getElementById('btn-synth-hard');
        this.btnSynthExpert = document.getElementById('btn-synth-expert');
        this.audioModal = document.getElementById('audio-modal');
        this.audioStatusText = document.getElementById('audio-status-text');

        // Contexto de Audio Web (para sintes y reproductor MP3)
        this.audioCtx = null;
        this.audio = new Audio();
        this.synthTimer = null;

        // 6. Setup de escena, luces y objetos
        this.setupLights();
        this.setupEnvironment();
        this.setupStarfield();
        this.setupSabers();
        this.setupPointerControls();
        this.setupAudioListeners();

        // 7. Event Listener de Redimensionamiento
        window.addEventListener('resize', () => this.onWindowResize());

        // 8. Iniciar bucle de animación
        this.animate();
    }

    /**
     * Configuración del Pipeline de Post-Procesamiento Three.js
     */
    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // UnrealBloomPass para brillo de neón deslumbrante estilo AAA
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.4,  // Fuerza de Bloom
            0.4,  // Radio
            0.12  // Umbral de intensidad
        );
        this.composer.addPass(this.bloomPass);

        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x0a0a18, 2.0);
        this.scene.add(ambientLight);

        // Luz direccional cian neón (Lado Izquierdo/Fondo)
        this.blueLight = new THREE.DirectionalLight(0x00f3ff, 3.0);
        this.blueLight.position.set(-8, 8, -15);
        this.scene.add(this.blueLight);

        // Luz direccional magenta neón (Lado Derecho/Fondo)
        this.redLight = new THREE.DirectionalLight(0xff0055, 3.0);
        this.redLight.position.set(8, 8, -15);
        this.scene.add(this.redLight);

        // Luz frontal de relleno
        const frontLight = new THREE.PointLight(0xffffff, 1.5, 20);
        frontLight.position.set(0, 3, 2);
        this.scene.add(frontLight);
    }

    /**
     * Entorno Futurista Cyberpunk (Pista, Rejilla, Arcos Neón)
     */
    setupEnvironment() {
        // 1. Rejilla Inferior Reflectante
        const gridXZ = new THREE.GridHelper(60, 60, 0xff0055, 0x00f3ff);
        gridXZ.position.y = -0.02;
        gridXZ.material.opacity = 0.35;
        gridXZ.material.transparent = true;
        this.scene.add(gridXZ);

        // 2. Plataforma Principal de la Pista
        const trackGeometry = new THREE.BoxGeometry(4.2, 0.1, 50);
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x080814,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.85
        });
        const track = new THREE.Mesh(trackGeometry, trackMaterial);
        track.position.set(0, -0.06, -20);
        this.scene.add(track);

        // 3. Bordes Láser Neón Laterales de la Pista
        const borderGeom = new THREE.BoxGeometry(0.12, 0.12, 50);
        
        const leftBorderMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
        const leftBorder = new THREE.Mesh(borderGeom, leftBorderMat);
        leftBorder.position.set(-2.1, 0.06, -20);
        this.scene.add(leftBorder);

        const rightBorderMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const rightBorder = new THREE.Mesh(borderGeom, rightBorderMat);
        rightBorder.position.set(2.1, 0.06, -20);
        this.scene.add(rightBorder);

        // 4. Arcos Hexagonales Neón del Túnel Cyberpunk
        this.createTunnelArches();
    }

    createTunnelArches() {
        const archCount = 12;
        const archSpacing = 4.5;
        
        for (let i = 0; i < archCount; i++) {
            const archGroup = new THREE.Group();
            const zPos = 5 - i * archSpacing;

            // Geometría Hexagonal para cada arco del túnel
            const archRadius = 4.2;
            const shape = new THREE.Shape();
            const sides = 6;
            for (let s = 0; s < sides; s++) {
                const angle = (s / sides) * Math.PI * 2 + Math.PI / 6;
                const x = Math.cos(angle) * archRadius;
                const y = Math.sin(angle) * archRadius + 1.5;
                if (s === 0) shape.moveTo(x, y);
                else shape.lineTo(x, y);
            }
            shape.closePath();

            const points = shape.getPoints();
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            const isBlue = i % 2 === 0;
            const colorHex = isBlue ? 0x00f3ff : 0xff0055;

            const material = new THREE.LineBasicMaterial({
                color: colorHex,
                linewidth: 2,
                transparent: true,
                opacity: 0.45
            });

            const archLine = new THREE.LineLoop(geometry, material);
            archGroup.add(archLine);

            // Añadir pequeños cubos emisores en los vértices del arco
            points.forEach(pt => {
                const nodeGeom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
                const nodeMat = new THREE.MeshBasicMaterial({ color: colorHex });
                const node = new THREE.Mesh(nodeGeom, nodeMat);
                node.position.set(pt.x, pt.y, 0);
                archGroup.add(node);
            });

            archGroup.position.z = zPos;
            this.scene.add(archGroup);
            this.tunnelArches.push({ group: archGroup, baseZ: zPos, isBlue: isBlue, lineMat: material });
        }
    }

    /**
     * Campo de Partículas / Polvo Cósmico Neón
     */
    setupStarfield() {
        const starCount = 400;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        const colorBlue = new THREE.Color(0x00f3ff);
        const colorRed = new THREE.Color(0xff0055);

        for (let i = 0; i < starCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 30;
            positions[i * 3 + 1] = Math.random() * 12;
            positions[i * 3 + 2] = -Math.random() * 60;

            const chosenColor = Math.random() > 0.5 ? colorBlue : colorRed;
            colors[i * 3] = chosenColor.r;
            colors[i * 3 + 1] = chosenColor.g;
            colors[i * 3 + 2] = chosenColor.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.12,
            vertexColors: true,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending
        });

        this.starfield = new THREE.Points(geometry, material);
        this.scene.add(this.starfield);
    }

    /**
     * Construcción de Modelos de Sable Láser con Estela de Brillo (Ribbon Trail)
     */
    createSaber(colorHex) {
        const saberGroup = new THREE.Group();

        // 1. Mango Metálico Pulido (Hilt)
        const hiltGeom = new THREE.CylinderGeometry(0.024, 0.028, 0.24, 20);
        const hiltMat = new THREE.MeshStandardMaterial({
            color: 0x111115,
            metalness: 0.95,
            roughness: 0.15
        });
        const hilt = new THREE.Mesh(hiltGeom, hiltMat);
        hilt.position.y = 0.12;
        saberGroup.add(hilt);

        // Anillo de Acento de Neón en la base
        const ringGeom = new THREE.TorusGeometry(0.03, 0.005, 16, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: colorHex });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.22;
        saberGroup.add(ring);

        // 2. Núcleo Blanco Brillante (Blade Core)
        const coreGeom = new THREE.CylinderGeometry(0.016, 0.016, 1.15, 20);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const core = new THREE.Mesh(coreGeom, coreMat);
        core.position.y = 0.24 + 0.575;
        saberGroup.add(core);

        // 3. Envoltura de Neón Emisiva (Emissive Outer Blade Sheath)
        const glowGeom = new THREE.CylinderGeometry(0.034, 0.034, 1.16, 20);
        const glowMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: colorHex,
            emissiveIntensity: 4.5,
            transparent: true,
            opacity: 0.8,
            roughness: 0.1
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        glow.position.y = 0.24 + 0.575;
        saberGroup.add(glow);

        // 4. Luz Puntual de Punta de Sable
        const saberLight = new THREE.PointLight(colorHex, 4.0, 5);
        saberLight.position.y = 0.24 + 0.8;
        saberGroup.add(saberLight);

        saberGroup.rotation.x = -Math.PI / 4;

        // Historial para Estela de Sable (Ribbon Trail)
        const trailHistory = [];
        const trailLength = 10;
        for (let i = 0; i < trailLength; i++) {
            trailHistory.push({
                top: new THREE.Vector3(),
                bottom: new THREE.Vector3()
            });
        }

        return {
            group: saberGroup,
            colorHex: colorHex,
            light: saberLight,
            targetPos: new THREE.Vector3(),
            currentPos: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            trailHistory: trailHistory
        };
    }

    setupSabers() {
        this.leftSaber = this.createSaber(0xff0055); // Rojo Neón
        this.leftSaber.targetPos.set(-0.45, 1.2, 1.5);
        this.leftSaber.currentPos.copy(this.leftSaber.targetPos);
        this.leftSaber.group.position.copy(this.leftSaber.targetPos);
        this.scene.add(this.leftSaber.group);

        this.rightSaber = this.createSaber(0x00f3ff); // Azul Neón
        this.rightSaber.targetPos.set(0.45, 1.2, 1.5);
        this.rightSaber.currentPos.copy(this.rightSaber.targetPos);
        this.rightSaber.group.position.copy(this.rightSaber.targetPos);
        this.scene.add(this.rightSaber.group);
    }

    setupPointerControls() {
        this.pointer = new THREE.Vector2(0, 0);

        const updatePointerPosition = (clientX, clientY) => {
            this.pointer.x = (clientX / window.innerWidth) * 2 - 1;
            this.pointer.y = -(clientY / window.innerHeight) * 2 + 1;

            const worldX = this.pointer.x * 2.3;
            const worldY = 1.3 + this.pointer.y * 1.1;
            const saberZ = 1.5;

            this.leftSaber.targetPos.set(worldX - 0.42, worldY, saberZ);
            this.rightSaber.targetPos.set(worldX + 0.42, worldY, saberZ);
        };

        window.addEventListener('pointermove', (event) => {
            updatePointerPosition(event.clientX, event.clientY);
        });

        window.addEventListener('touchmove', (event) => {
            if (event.touches.length >= 2) {
                const t0 = event.touches[0];
                const x0 = (t0.clientX / window.innerWidth) * 2 - 1;
                const y0 = -(t0.clientY / window.innerHeight) * 2 + 1;
                this.leftSaber.targetPos.set(x0 * 2.3, 1.3 + y0 * 1.1, 1.5);

                const t1 = event.touches[1];
                const x1 = (t1.clientX / window.innerWidth) * 2 - 1;
                const y1 = -(t1.clientY / window.innerHeight) * 2 + 1;
                this.rightSaber.targetPos.set(x1 * 2.3, 1.3 + y1 * 1.1, 1.5);
            } else if (event.touches.length === 1) {
                const t0 = event.touches[0];
                updatePointerPosition(t0.clientX, t0.clientY);
            }
        }, { passive: true });
    }

    /**
     * Gestión de Audio, Botones y Dificultad
     */
    setupAudioListeners() {
        const initAudioContext = () => {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
        };

        // Presets de Sintetizador con distintos niveles de dificultad
        this.btnSynthNormal.addEventListener('click', () => {
            initAudioContext();
            this.setDifficulty('NORMAL', 120, 14.0);
            this.audioStatusText.textContent = 'Modo Synthwave Normal (120 BPM)';
            this.generateBeatmap(180, 120);
            this.startGame();
        });

        this.btnSynthHard.addEventListener('click', () => {
            initAudioContext();
            this.setDifficulty('HARD', 140, 18.0);
            this.audioStatusText.textContent = 'Modo Cyber Rush (140 BPM)';
            this.generateBeatmap(180, 140);
            this.startGame();
        });

        this.btnSynthExpert.addEventListener('click', () => {
            initAudioContext();
            this.setDifficulty('EXPERT', 165, 22.0);
            this.audioStatusText.textContent = 'Modo Expert Blast (165 BPM)';
            this.generateBeatmap(180, 165);
            this.startGame();
        });

        // Carga de archivo MP3 del usuario
        this.audioFileInput.addEventListener('change', (e) => {
            initAudioContext();
            const file = e.target.files[0];
            if (file) {
                const fileURL = URL.createObjectURL(file);
                this.audio.src = fileURL;
                this.audioStatusText.textContent = `Canción MP3: ${file.name}`;
                this.setDifficulty('CUSTOM', 130, 15.0);
                this.generateBeatmap(240, 130);
                this.startGame();
            }
        });
    }

    setDifficulty(diffName, bpm, speed) {
        this.difficulty = diffName;
        this.blockSpeed = speed;
        this.leadTime = Math.abs(this.spawnZ - this.hitZ) / this.blockSpeed;
        if (this.difficultyValEl) {
            this.difficultyValEl.textContent = diffName;
        }
    }

    /**
     * Generador de Beatmaps Dinámicos
     */
    generateBeatmap(durationSeconds = 180, bpm = 120) {
        this.beatmap = [];
        this.nextBeatIndex = 0;
        const beatInterval = 60 / bpm; 

        const lanesX = [-1.35, -0.45, 0.45, 1.35];
        const heightsY = [0.85, 1.35, 1.85];

        for (let time = 3.0; time < durationSeconds; time += beatInterval) {
            const isRed = Math.random() < 0.5;
            const laneIndex = Math.floor(Math.random() * lanesX.length);
            const heightIndex = Math.floor(Math.random() * heightsY.length);

            // Dirección de flecha (0: Arriba, 1: Abajo, 2: Izquierda, 3: Derecha)
            const arrowDir = Math.floor(Math.random() * 4);

            this.beatmap.push({
                targetHitTime: time,
                isRed: isRed,
                x: lanesX[laneIndex],
                y: heightsY[heightIndex],
                arrowDir: arrowDir,
                spawned: false
            });
        }
    }

    startGame() {
        this.audioModal.style.opacity = '0';
        this.audioModal.style.transform = 'scale(0.9)';
        setTimeout(() => {
            this.audioModal.style.display = 'none';
        }, 350);

        this.isPlaying = true;
        this.score = 0;
        this.combo = 1;
        this.updateHUD();
        this.clock.start();

        if (this.audio.src) {
            this.audio.currentTime = 0;
            this.audio.play();
        }
    }

    /**
     * Sonido Sintetizado Futuro de Corte Láser (Web Audio API)
     */
    playSliceSound(isRed) {
        if (!this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const osc2 = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sawtooth';
            osc2.type = 'sine';

            const baseFreq = isRed ? 520 : 980;
            osc.frequency.setValueAtTime(baseFreq, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, this.audioCtx.currentTime + 0.14);

            osc2.frequency.setValueAtTime(baseFreq * 1.5, this.audioCtx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(80, this.audioCtx.currentTime + 0.14);

            gain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.14);

            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start();
            osc2.start();
            osc.stop(this.audioCtx.currentTime + 0.14);
            osc2.stop(this.audioCtx.currentTime + 0.14);
        } catch (e) {
            // Contexto no interactuado
        }
    }

    /**
     * Creación de Bloques Cyberpunk 3D con Emisión y Flecha Neón
     */
    spawnBlock(isRed, spawnX, spawnY, arrowDir = 0) {
        const colorHex = isRed ? 0xff0055 : 0x00f3ff;
        const blockGroup = new THREE.Group();

        // 1. Núcleo de Cubo Negro Metálico con Bisel
        const cubeGeom = new THREE.BoxGeometry(0.48, 0.48, 0.48);
        const cubeMat = new THREE.MeshStandardMaterial({
            color: 0x0c0c16,
            roughness: 0.2,
            metalness: 0.85
        });
        const cubeMesh = new THREE.Mesh(cubeGeom, cubeMat);
        blockGroup.add(cubeMesh);

        // 2. Bordes Wireframe Emisivos Neón
        const borderGeom = new THREE.BoxGeometry(0.50, 0.50, 0.50);
        const borderMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: colorHex,
            emissiveIntensity: 3.5,
            wireframe: true
        });
        const borderMesh = new THREE.Mesh(borderGeom, borderMat);
        blockGroup.add(borderMesh);

        // 3. Flecha Neón Frontal Indicadora de Corte
        const arrowShape = new THREE.Shape();
        arrowShape.moveTo(0, 0.14);
        arrowShape.lineTo(-0.11, -0.07);
        arrowShape.lineTo(-0.045, -0.07);
        arrowShape.lineTo(-0.045, -0.14);
        arrowShape.lineTo(0.045, -0.14);
        arrowShape.lineTo(0.045, -0.07);
        arrowShape.lineTo(0.11, -0.07);
        arrowShape.closePath();

        const arrowGeom = new THREE.ShapeGeometry(arrowShape);
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const arrowMesh = new THREE.Mesh(arrowGeom, arrowMat);
        arrowMesh.position.z = 0.25;

        // Rotar flecha según la dirección especificada
        const rotations = [0, Math.PI, Math.PI / 2, -Math.PI / 2];
        arrowMesh.rotation.z = rotations[arrowDir] || 0;
        blockGroup.add(arrowMesh);

        blockGroup.position.set(spawnX, spawnY, this.spawnZ);
        this.scene.add(blockGroup);

        this.blocks.push({
            mesh: blockGroup,
            isRed: isRed,
            colorHex: colorHex,
            box: new THREE.Box3(),
            sliced: false
        });
    }

    /**
     * Detección de Colisiones entre Sables y Bloques
     */
    checkCollisions() {
        const saberSegment = (saber) => {
            const start = new THREE.Vector3(0, 0.1, 0);
            const end = new THREE.Vector3(0, 1.25, 0);
            saber.group.localToWorld(start);
            saber.group.localToWorld(end);
            return { start, end };
        };

        const leftSeg = saberSegment(this.leftSaber);
        const rightSeg = saberSegment(this.rightSaber);

        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            if (block.sliced) continue;

            block.box.setFromObject(block.mesh);
            const targetSeg = block.isRed ? leftSeg : rightSeg;

            const blockCenter = new THREE.Vector3();
            block.box.getCenter(blockCenter);

            const distToSaber = this.distanceToSegment(blockCenter, targetSeg.start, targetSeg.end);

            if (distToSaber < 0.42) {
                block.sliced = true;

                // 1. Sonido e Impulso de Cámara
                this.playSliceSound(block.isRed);
                this.cameraShake = 0.14;

                // 2. Física de Bloque Dividido en 2 Mitades
                this.createSlicedHalves(blockCenter, block.colorHex);

                // 3. Explosión de Partículas Neón
                this.createParticleExplosion(blockCenter, block.colorHex);

                // 4. Texto 3D Emergente "+100 PERFECT!"
                const pointsGained = 100 * this.combo;
                this.createScorePopup(blockCenter, `+${pointsGained}`, block.colorHex);

                this.scene.remove(block.mesh);
                this.blocks.splice(i, 1);

                this.score += pointsGained;
                this.combo = Math.min(this.combo + 1, 8);
                this.updateHUD();
            }
        }
    }

    distanceToSegment(P, A, B) {
        const AB = new THREE.Vector3().subVectors(B, A);
        const AP = new THREE.Vector3().subVectors(P, A);
        const ab2 = AB.lengthSq();
        if (ab2 === 0) return AP.length();

        const t = Math.max(0, Math.min(1, AP.dot(AB) / ab2));
        const closestPoint = new THREE.Vector3().copy(A).add(AB.multiplyScalar(t));
        return P.distanceTo(closestPoint);
    }

    /**
     * Animación de Física de Mitades Divididas de Bloque al Cortar
     */
    createSlicedHalves(position, colorHex) {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x0c0c16,
            roughness: 0.2,
            metalness: 0.85,
            emissive: colorHex,
            emissiveIntensity: 1.5
        });

        // Mitad Superior
        const geom1 = new THREE.BoxGeometry(0.48, 0.24, 0.48);
        const half1 = new THREE.Mesh(geom1, mat);
        half1.position.copy(position).add(new THREE.Vector3(0, 0.12, 0));

        // Mitad Inferior
        const geom2 = new THREE.BoxGeometry(0.48, 0.24, 0.48);
        const half2 = new THREE.Mesh(geom2, mat);
        half2.position.copy(position).add(new THREE.Vector3(0, -0.12, 0));

        this.scene.add(half1);
        this.scene.add(half2);

        const sideDir = Math.random() < 0.5 ? 1 : -1;
        this.slicedHalves.push({
            mesh: half1,
            velocity: new THREE.Vector3(sideDir * (2.0 + Math.random()), 3.5 + Math.random(), 3.0),
            rotVelocity: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
            life: 1.0
        });

        this.slicedHalves.push({
            mesh: half2,
            velocity: new THREE.Vector3(-sideDir * (2.0 + Math.random()), -1.5 - Math.random(), 3.0),
            rotVelocity: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
            life: 1.0
        });
    }

    updateSlicedHalves(delta) {
        for (let i = this.slicedHalves.length - 1; i >= 0; i--) {
            const half = this.slicedHalves[i];
            half.mesh.position.addScaledVector(half.velocity, delta);
            half.mesh.rotation.x += half.rotVelocity.x * delta;
            half.mesh.rotation.y += half.rotVelocity.y * delta;
            half.mesh.rotation.z += half.rotVelocity.z * delta;

            // Gravedad
            half.velocity.y -= 9.8 * delta;
            half.life -= delta * 1.5;

            half.mesh.scale.multiplyScalar(0.97);

            if (half.life <= 0) {
                this.scene.remove(half.mesh);
                half.mesh.geometry.dispose();
                half.mesh.material.dispose();
                this.slicedHalves.splice(i, 1);
            }
        }
    }

    /**
     * Sistema de Partículas Explosivas Luminosas
     */
    createParticleExplosion(position, colorHex) {
        const particleCount = 28;
        for (let i = 0; i < particleCount; i++) {
            const size = 0.03 + Math.random() * 0.06;
            const geom = new THREE.BoxGeometry(size, size, size);
            const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1.0 });
            const particle = new THREE.Mesh(geom, mat);

            particle.position.copy(position);

            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8
            );

            this.scene.add(particle);
            this.particles.push({
                mesh: particle,
                velocity: vel,
                life: 1.0
            });
        }
    }

    updateParticles(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.addScaledVector(p.velocity, delta);
            p.velocity.multiplyScalar(0.91);
            p.life -= delta * 2.2;

            p.mesh.material.opacity = Math.max(0, p.life);

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Texto 3D Emergente / Popups de Puntuación
     */
    createScorePopup(position, text, colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.font = '900 44px Orbitron, sans-serif';
        ctx.fillStyle = colorHex === 0xff0055 ? '#ff0055' : '#00f3ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 18;
        ctx.fillText(text, 128, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1.0 });
        const sprite = new THREE.Sprite(spriteMat);

        sprite.position.copy(position);
        sprite.scale.set(1.6, 0.8, 1.0);
        this.scene.add(sprite);

        this.popups.push({
            sprite: sprite,
            texture: texture,
            life: 1.0,
            vy: 1.5
        });
    }

    updatePopups(delta) {
        for (let i = this.popups.length - 1; i >= 0; i--) {
            const pop = this.popups[i];
            pop.sprite.position.y += pop.vy * delta;
            pop.life -= delta * 1.8;
            pop.sprite.material.opacity = Math.max(0, pop.life);

            if (pop.life <= 0) {
                this.scene.remove(pop.sprite);
                pop.sprite.material.dispose();
                pop.texture.dispose();
                this.popups.splice(i, 1);
            }
        }
    }

    updateHUD() {
        if (this.scoreValEl) {
            this.scoreValEl.textContent = String(this.score).padStart(6, '0');
        }
        if (this.comboValEl) {
            this.comboValEl.textContent = `x${this.combo}`;
        }
        if (this.comboBadgeEl) {
            this.comboBadgeEl.className = 'combo-badge';
            if (this.combo >= 8) this.comboBadgeEl.classList.add('streak-8');
            else if (this.combo >= 4) this.comboBadgeEl.classList.add('streak-4');
            else if (this.combo >= 2) this.comboBadgeEl.classList.add('streak-2');
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        if (this.composer) {
            this.composer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    updateSaber(saber) {
        const prevPos = saber.currentPos.clone();
        saber.currentPos.lerp(saber.targetPos, 0.28);
        saber.group.position.copy(saber.currentPos);

        saber.velocity.subVectors(saber.currentPos, prevPos);

        const targetRotZ = -saber.velocity.x * 2.8;
        const targetRotX = -Math.PI / 4 + saber.velocity.y * 2.2;

        saber.group.rotation.z += (targetRotZ - saber.group.rotation.z) * 0.22;
        saber.group.rotation.x += (targetRotX - saber.group.rotation.x) * 0.22;
    }

    /**
     * Bucle Principal de Renderizado y Física 3D
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        const currentTime = this.audio.src && !this.audio.paused 
            ? this.audio.currentTime 
            : this.clock.getElapsedTime();

        // 1. Spawner Sincronizado por Ritmo
        if (this.isPlaying && this.nextBeatIndex < this.beatmap.length) {
            const beat = this.beatmap[this.nextBeatIndex];
            if (currentTime >= beat.targetHitTime - this.leadTime) {
                this.spawnBlock(beat.isRed, beat.x, beat.y, beat.arrowDir);
                beat.spawned = true;
                this.nextBeatIndex++;
            }
        }

        // 2. Movimiento de Bloques Activos
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            block.mesh.position.z += this.blockSpeed * delta;

            if (block.mesh.position.z > 3.8) {
                this.scene.remove(block.mesh);
                this.blocks.splice(i, 1);
                this.combo = 1;
                this.updateHUD();
            }
        }

        // 3. Animación de Arcos del Túnel Neón y Polvo Estelar
        if (this.starfield) {
            const positions = this.starfield.geometry.attributes.position.array;
            for (let i = 2; i < positions.length; i += 3) {
                positions[i] += 12 * delta;
                if (positions[i] > 5) positions[i] = -55;
            }
            this.starfield.geometry.attributes.position.needsUpdate = true;
        }

        // 4. Actualizar Sables y Colisiones
        if (this.leftSaber) this.updateSaber(this.leftSaber);
        if (this.rightSaber) this.updateSaber(this.rightSaber);

        this.checkCollisions();

        // 5. Actualizar Partículas, Mitades Cortadas y Popups
        this.updateParticles(delta);
        this.updateSlicedHalves(delta);
        this.updatePopups(delta);

        // 6. Trauma / Recoil de Cámara por Impactos
        if (this.cameraShake > 0.001) {
            this.cameraShake *= 0.88;
            this.camera.position.x = this.cameraBasePos.x + (Math.random() - 0.5) * this.cameraShake;
            this.camera.position.y = this.cameraBasePos.y + (Math.random() - 0.5) * this.cameraShake;
        } else {
            this.camera.position.copy(this.cameraBasePos);
        }

        // 7. Renderizado con Post-Procesamiento Bloom
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Iniciar el juego al cargar la página
window.onload = () => {
    new BeatSaberGame();
};

