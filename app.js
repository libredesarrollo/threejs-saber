import * as THREE from 'three';

// Configuración general del juego
class BeatSaberGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        
        // 1. Inicializar escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x06060c);
        this.scene.fog = new THREE.FogExp2(0x06060c, 0.03);

        // 2. Inicializar cámara
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 1.6, 3);

        // 3. Inicializar renderizador
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;

        // 4. Variables de Estado del Juego
        this.score = 0;
        this.combo = 1;
        this.blocks = [];
        this.particles = [];
        this.clock = new THREE.Clock();
        this.lastSpawnTime = 0;
        this.spawnInterval = 1.1; // Segundos entre cada bloque

        // Elementos DOM del HUD
        this.scoreValEl = document.getElementById('score-val');
        this.comboValEl = document.getElementById('combo-val');

        // 5. Setup de la escena
        this.setupLights();
        this.setupEnvironment();
        this.setupSabers();
        this.setupPointerControls();

        // 6. Manejadores de eventos
        window.addEventListener('resize', () => this.onWindowResize());

        // 7. Iniciar bucle de animación
        this.animate();
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x111122, 1.5);
        this.scene.add(ambientLight);

        const blueLight = new THREE.DirectionalLight(0x00f3ff, 2.5);
        blueLight.position.set(-5, 5, -10);
        this.scene.add(blueLight);

        const redLight = new THREE.DirectionalLight(0xff0055, 2.5);
        redLight.position.set(5, 5, -10);
        this.scene.add(redLight);
    }

    setupEnvironment() {
        const gridXZ = new THREE.GridHelper(50, 50, 0xff0055, 0x444444);
        gridXZ.position.y = 0;
        gridXZ.material.opacity = 0.4;
        gridXZ.material.transparent = true;
        this.scene.add(gridXZ);

        const trackGeometry = new THREE.BoxGeometry(4, 0.1, 40);
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x11111f,
            roughness: 0.2,
            metalness: 0.8,
            transparent: true,
            opacity: 0.8
        });
        const track = new THREE.Mesh(trackGeometry, trackMaterial);
        track.position.set(0, -0.05, -15);
        this.scene.add(track);

        const leftBorderGeom = new THREE.BoxGeometry(0.1, 0.1, 40);
        const leftBorderMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
        const leftBorder = new THREE.Mesh(leftBorderGeom, leftBorderMat);
        leftBorder.position.set(-2, 0.05, -15);
        this.scene.add(leftBorder);

        const rightBorderGeom = new THREE.BoxGeometry(0.1, 0.1, 40);
        const rightBorderMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const rightBorder = new THREE.Mesh(rightBorderGeom, rightBorderMat);
        rightBorder.position.set(2, 0.05, -15);
        this.scene.add(rightBorder);
    }

    createSaber(colorHex) {
        const saberGroup = new THREE.Group();

        const hiltGeom = new THREE.CylinderGeometry(0.025, 0.03, 0.22, 16);
        const hiltMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.95,
            roughness: 0.2
        });
        const hilt = new THREE.Mesh(hiltGeom, hiltMat);
        hilt.position.y = 0.11;
        saberGroup.add(hilt);

        const ringGeom = new THREE.TorusGeometry(0.03, 0.006, 12, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: colorHex });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.2;
        saberGroup.add(ring);

        const coreGeom = new THREE.CylinderGeometry(0.016, 0.016, 1.1, 16);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const core = new THREE.Mesh(coreGeom, coreMat);
        core.position.y = 0.22 + 0.55;
        saberGroup.add(core);

        const glowGeom = new THREE.CylinderGeometry(0.032, 0.032, 1.12, 16);
        const glowMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: colorHex,
            emissiveIntensity: 3.5,
            transparent: true,
            opacity: 0.75,
            roughness: 0.1
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        glow.position.y = 0.22 + 0.55;
        saberGroup.add(glow);

        const saberLight = new THREE.PointLight(colorHex, 3.0, 4);
        saberLight.position.y = 0.22 + 0.75;
        saberGroup.add(saberLight);

        saberGroup.rotation.x = -Math.PI / 4;

        return {
            group: saberGroup,
            colorHex: colorHex,
            light: saberLight,
            targetPos: new THREE.Vector3(),
            currentPos: new THREE.Vector3(),
            velocity: new THREE.Vector3()
        };
    }

    setupSabers() {
        // Sable Izquierdo (Rojo)
        this.leftSaber = this.createSaber(0xff0055);
        this.leftSaber.targetPos.set(-0.45, 1.2, 1.5);
        this.leftSaber.currentPos.copy(this.leftSaber.targetPos);
        this.leftSaber.group.position.copy(this.leftSaber.targetPos);
        this.scene.add(this.leftSaber.group);

        // Sable Derecho (Azul)
        this.rightSaber = this.createSaber(0x00f3ff);
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

            const worldX = this.pointer.x * 2.2;
            const worldY = 1.3 + this.pointer.y * 1.0;
            const saberZ = 1.5;

            this.leftSaber.targetPos.set(worldX - 0.4, worldY, saberZ);
            this.rightSaber.targetPos.set(worldX + 0.4, worldY, saberZ);
        };

        window.addEventListener('pointermove', (event) => {
            updatePointerPosition(event.clientX, event.clientY);
        });

        window.addEventListener('touchmove', (event) => {
            if (event.touches.length >= 2) {
                const t0 = event.touches[0];
                const x0 = (t0.clientX / window.innerWidth) * 2 - 1;
                const y0 = -(t0.clientY / window.innerHeight) * 2 + 1;
                this.leftSaber.targetPos.set(x0 * 2.2, 1.3 + y0 * 1.0, 1.5);

                const t1 = event.touches[1];
                const x1 = (t1.clientX / window.innerWidth) * 2 - 1;
                const y1 = -(t1.clientY / window.innerHeight) * 2 + 1;
                this.rightSaber.targetPos.set(x1 * 2.2, 1.3 + y1 * 1.0, 1.5);
            } else if (event.touches.length === 1) {
                const t0 = event.touches[0];
                updatePointerPosition(t0.clientX, t0.clientY);
            }
        }, { passive: true });
    }

    /**
     * Spawner de Bloques (Cubos)
     */
    spawnBlock() {
        const isRed = Math.random() < 0.5;
        const colorHex = isRed ? 0xff0055 : 0x00f3ff;

        const blockGroup = new THREE.Group();

        // 1. Cuerpo principal del cubo (oscuro con transparencia)
        const cubeGeom = new THREE.BoxGeometry(0.45, 0.45, 0.45);
        const cubeMat = new THREE.MeshStandardMaterial({
            color: 0x11111a,
            roughness: 0.3,
            metalness: 0.7
        });
        const cubeMesh = new THREE.Mesh(cubeGeom, cubeMat);
        blockGroup.add(cubeMesh);

        // 2. Borde exterior brillante con color del sable correspondiente
        const borderGeom = new THREE.BoxGeometry(0.47, 0.47, 0.47);
        const borderMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: colorHex,
            emissiveIntensity: 2.5,
            wireframe: true
        });
        const borderMesh = new THREE.Mesh(borderGeom, borderMat);
        blockGroup.add(borderMesh);

        // 3. Flecha frontal decorativa indicando la dirección
        const arrowShape = new THREE.Shape();
        arrowShape.moveTo(0, 0.12);
        arrowShape.lineTo(-0.1, -0.08);
        arrowShape.lineTo(-0.04, -0.08);
        arrowShape.lineTo(-0.04, -0.12);
        arrowShape.lineTo(0.04, -0.12);
        arrowShape.lineTo(0.04, -0.08);
        arrowShape.lineTo(0.1, -0.08);
        arrowShape.closePath();

        const arrowGeom = new THREE.ShapeGeometry(arrowShape);
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const arrowMesh = new THREE.Mesh(arrowGeom, arrowMat);
        arrowMesh.position.z = 0.23;
        blockGroup.add(arrowMesh);

        // Posicionamiento en uno de los 4 carriles y 3 alturas posibles
        const lanesX = [-1.2, -0.4, 0.4, 1.2];
        const heightsY = [0.9, 1.35, 1.8];
        const spawnX = lanesX[Math.floor(Math.random() * lanesX.length)];
        const spawnY = heightsY[Math.floor(Math.random() * heightsY.length)];
        const spawnZ = -35; // Distancia lejana

        blockGroup.position.set(spawnX, spawnY, spawnZ);
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
     * Sistema de Detección de Colisiones entre Sables y Bloques
     */
    checkCollisions() {
        const saberSegment = (saber) => {
            // Obtener el inicio (empuñadura) y el extremo (punta) del sable en el espacio 3D del mundo
            const start = new THREE.Vector3(0, 0.1, 0);
            const end = new THREE.Vector3(0, 1.2, 0);
            saber.group.localToWorld(start);
            saber.group.localToWorld(end);
            return { start, end };
        };

        const leftSeg = saberSegment(this.leftSaber);
        const rightSeg = saberSegment(this.rightSaber);

        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            if (block.sliced) continue;

            // Actualizar la BoundingBox 3D del bloque
            block.box.setFromObject(block.mesh);

            // Verificar colisión del sable según el color coincidente
            const targetSeg = block.isRed ? leftSeg : rightSeg;

            // Comprobar la distancia entre el segmento del sable y el centro del bloque
            const blockCenter = new THREE.Vector3();
            block.box.getCenter(blockCenter);

            const distToSaber = this.distanceToSegment(blockCenter, targetSeg.start, targetSeg.end);

            // Umbral de tolerancia de colisión (radio del sable + radio del bloque)
            if (distToSaber < 0.38) {
                // ¡Corte exitoso!
                block.sliced = true;
                this.createParticleExplosion(blockCenter, block.colorHex);
                this.scene.remove(block.mesh);
                this.blocks.splice(i, 1);

                // Incrementar Puntuación y Combo
                this.score += 100 * this.combo;
                this.combo = Math.min(this.combo + 1, 8); // Máximo combo x8
                this.updateHUD();
            }
        }
    }

    /**
     * Calcula la distancia más corta entre un punto P y un segmento de línea (A-B)
     */
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
     * Crea un efecto de explosión de partículas luminosas al cortar un bloque
     */
    createParticleExplosion(position, colorHex) {
        const particleCount = 18;
        for (let i = 0; i < particleCount; i++) {
            const size = 0.04 + Math.random() * 0.05;
            const geom = new THREE.BoxGeometry(size, size, size);
            const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1.0 });
            const particle = new THREE.Mesh(geom, mat);

            particle.position.copy(position);

            // Vector de velocidad hacia afuera aleatorio
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 6
            );

            this.scene.add(particle);
            this.particles.push({
                mesh: particle,
                velocity: vel,
                life: 1.0 // 100% de vida
            });
        }
    }

    updateParticles(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.addScaledVector(p.velocity, delta);
            p.velocity.multiplyScalar(0.92); // Fricción
            p.life -= delta * 2.5;

            p.mesh.material.opacity = Math.max(0, p.life);

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
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
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    updateSaber(saber) {
        const prevPos = saber.currentPos.clone();
        saber.currentPos.lerp(saber.targetPos, 0.25);
        saber.group.position.copy(saber.currentPos);

        saber.velocity.subVectors(saber.currentPos, prevPos);

        const targetRotZ = -saber.velocity.x * 2.5;
        const targetRotX = -Math.PI / 4 + saber.velocity.y * 2.0;

        saber.group.rotation.z += (targetRotZ - saber.group.rotation.z) * 0.2;
        saber.group.rotation.x += (targetRotX - saber.group.rotation.x) * 0.2;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        // 1. Spawner de Bloques a intervalos regulares
        if (elapsedTime - this.lastSpawnTime > this.spawnInterval) {
            this.spawnBlock();
            this.lastSpawnTime = elapsedTime;
        }

        // 2. Mover Bloques activos y despawnear al pasar la cámara
        const speed = 14.0; // Velocidad constante hacia el jugador
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            block.mesh.position.z += speed * delta;

            // Si el bloque sobrepasa la posición del jugador sin ser cortado -> Miss
            if (block.mesh.position.z > 3.5) {
                this.scene.remove(block.mesh);
                this.blocks.splice(i, 1);
                this.combo = 1; // Reiniciar combo
                this.updateHUD();
            }
        }

        // 3. Actualizar movimiento de sables
        if (this.leftSaber) this.updateSaber(this.leftSaber);
        if (this.rightSaber) this.updateSaber(this.rightSaber);

        // 4. Comprobar Colisiones entre Sables y Bloques
        this.checkCollisions();

        // 5. Actualizar partículas luminosas
        this.updateParticles(delta);

        // 6. Renderizar escena
        this.renderer.render(this.scene, this.camera);
    }
}

// Iniciar el juego una vez cargada la ventana
window.onload = () => {
    new BeatSaberGame();
};
