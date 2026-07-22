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

        // 6. Manejadores de eventos
        window.addEventListener('resize', () => this.onWindowResize());

        // 7. Iniciar bucle de animación
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
        // Crear una cuadrícula para simular el suelo holográfico
        const gridXZ = new THREE.GridHelper(50, 50, 0xff0055, 444444);
        gridXZ.position.y = 0;
        // Hacer que las líneas centrales resalten en azul
        gridXZ.material.opacity = 0.4;
        gridXZ.material.transparent = true;
        this.scene.add(gridXZ);

        // Añadir una plataforma de pista (donde vienen los bloques)
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

        // Bordes de la pista iluminados con "neon"
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

    onWindowResize() {
        // Actualizar aspect ratio de la cámara
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        // Actualizar tamaño de renderizador
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Aquí se agregarán actualizaciones de la física/elementos en las siguientes fases

        // Renderizar la escena
        this.renderer.render(this.scene, this.camera);
    }
}

// Iniciar el juego una vez cargada la ventana
window.onload = () => {
    new BeatSaberGame();
};
