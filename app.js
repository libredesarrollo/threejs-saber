import * as THREE from 'three';

// Configuración general del juego
class BeatSaberGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        
        // 1. Inicializar escena
        this.scene = new THREE.Scene();
        
        // Agregar niebla (fog) para dar sensación de profundidad infinita
        this.scene.background = new THREE.Color(0x06060c);
        this.scene.fog = new THREE.FogExp2(0x06060c, 0.03);

        // 2. Inicializar cámara
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        // Posicionar cámara a la altura de los ojos en la posición del jugador
        this.camera.position.set(0, 1.6, 3);

        // 3. Inicializar renderizador
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;

        // 4. Agregar iluminación
        this.setupLights();

        // 5. Agregar suelo y entorno
        this.setupEnvironment();

        // 6. Configurar Sables y Controles
        this.setupSabers();
        this.setupPointerControls();

        // 7. Manejadores de eventos
        window.addEventListener('resize', () => this.onWindowResize());

        // 8. Iniciar bucle de animación
        this.animate();
    }

    setupLights() {
        // Luz ambiental suave de fondo
        const ambientLight = new THREE.AmbientLight(0x111122, 1.5);
        this.scene.add(ambientLight);

        // Luces direccionales con tonos azul y rojo (típicos de Beat Saber)
        const blueLight = new THREE.DirectionalLight(0x00f3ff, 2.5);
        blueLight.position.set(-5, 5, -10);
        this.scene.add(blueLight);

        const redLight = new THREE.DirectionalLight(0xff0055, 2.5);
        redLight.position.set(5, 5, -10);
        this.scene.add(redLight);
    }

    setupEnvironment() {
        // Cuadrícula para simular el suelo holográfico
        const gridXZ = new THREE.GridHelper(50, 50, 0xff0055, 0x444444);
        gridXZ.position.y = 0;
        gridXZ.material.opacity = 0.4;
        gridXZ.material.transparent = true;
        this.scene.add(gridXZ);

        // Pista principal por donde avanzan los bloques
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

        // Bordes de la pista iluminados con neón
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

    /**
     * Fábrica para crear un Sable de Luz (Hilt + Blade + Glow + PointLight)
     */
    createSaber(colorHex) {
        const saberGroup = new THREE.Group();

        // 1. Mango (Hilt) metálico
        const hiltGeom = new THREE.CylinderGeometry(0.025, 0.03, 0.22, 16);
        const hiltMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.95,
            roughness: 0.2
        });
        const hilt = new THREE.Mesh(hiltGeom, hiltMat);
        hilt.position.y = 0.11; // Alineado desde la base
        saberGroup.add(hilt);

        // Anillo acentuado en el mango
        const ringGeom = new THREE.TorusGeometry(0.03, 0.006, 12, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: colorHex });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.2;
        saberGroup.add(ring);

        // 2. Núcleo blanco brillante de la hoja (Blade Core)
        const coreGeom = new THREE.CylinderGeometry(0.016, 0.016, 1.1, 16);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const core = new THREE.Mesh(coreGeom, coreMat);
        core.position.y = 0.22 + 0.55; // Colocado inmediatamente arriba del mango
        saberGroup.add(core);

        // 3. Hoja exterior translúcida con brillo intenso (Outer Glow)
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

        // 4. Luz puntual dinámica para iluminar el entorno al mover el sable
        const saberLight = new THREE.PointLight(colorHex, 3.0, 4);
        saberLight.position.y = 0.22 + 0.75;
        saberGroup.add(saberLight);

        // Orientación inicial: inclinado hacia adelante para simular sostenerlo
        saberGroup.rotation.x = -Math.PI / 4;

        return {
            group: saberGroup,
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
            // Convertir coordenadas de pantalla a espacio normalizado (-1 a 1)
            this.pointer.x = (clientX / window.innerWidth) * 2 - 1;
            this.pointer.y = -(clientY / window.innerHeight) * 2 + 1;

            // Proyectar movimiento a coordenadas del mundo 3D
            const worldX = this.pointer.x * 2.2;
            const worldY = 1.3 + this.pointer.y * 1.0;
            const saberZ = 1.5;

            // Actualizar objetivo de posición de cada sable manteniendo distancia relativa
            this.leftSaber.targetPos.set(worldX - 0.4, worldY, saberZ);
            this.rightSaber.targetPos.set(worldX + 0.4, worldY, saberZ);
        };

        // Eventos de ratón
        window.addEventListener('pointermove', (event) => {
            updatePointerPosition(event.clientX, event.clientY);
        });

        // Soporte Multi-Touch para dispositivos móviles/táctiles
        window.addEventListener('touchmove', (event) => {
            if (event.touches.length >= 2) {
                // Toque 1 -> Sable Izquierdo
                const t0 = event.touches[0];
                const x0 = (t0.clientX / window.innerWidth) * 2 - 1;
                const y0 = -(t0.clientY / window.innerHeight) * 2 + 1;
                this.leftSaber.targetPos.set(x0 * 2.2, 1.3 + y0 * 1.0, 1.5);

                // Toque 2 -> Sable Derecho
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

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    updateSaber(saber) {
        // Interpolación suave (lerp) para movimiento fluido
        const prevPos = saber.currentPos.clone();
        saber.currentPos.lerp(saber.targetPos, 0.25);
        saber.group.position.copy(saber.currentPos);

        // Calcular velocidad de movimiento para oscilación/inercia física (sway)
        saber.velocity.subVectors(saber.currentPos, prevPos);

        // Aplicar rotación dinámica de oscilación basada en velocidad
        const targetRotZ = -saber.velocity.x * 2.5;
        const targetRotX = -Math.PI / 4 + saber.velocity.y * 2.0;

        saber.group.rotation.z += (targetRotZ - saber.group.rotation.z) * 0.2;
        saber.group.rotation.x += (targetRotX - saber.group.rotation.x) * 0.2;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Actualizar posición y rotación dinámica de ambos sables
        if (this.leftSaber) this.updateSaber(this.leftSaber);
        if (this.rightSaber) this.updateSaber(this.rightSaber);

        // Renderizar la escena
        this.renderer.render(this.scene, this.camera);
    }
}

// Iniciar el juego una vez cargada la ventana
window.onload = () => {
    new BeatSaberGame();
};
