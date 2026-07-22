# Project Guidelines & Architecture - Three.js Beat Saber Clone

This repository contains a modern 3D Beat Saber clone web application built using **HTML5**, **Vanilla CSS**, **Modern ES6 Modules**, **Three.js**, **Web Audio API**, and **Vite**.

## Architecture & Component Breakdown

### 1. Scene & Graphics Engine (`app.js`)
- **Three.js Setup**: Uses a `PerspectiveCamera` positioned at eye level (`y = 1.6`, `z = 3`) looking down a futuristic neon track.
- **Lighting System**: Ambient light (`AmbientLight`), directional lights (`DirectionalLight`) with blue and red hues, plus dynamic point lights attached to each saber blade.
- **Environment**: Metallic track platform, neon glowing side borders, and an infinite floor grid helper (`GridHelper`) with background exponential fog (`FogExp2`).

### 2. Sabers & Pointer Motion Tracking
- **3D Saber Models**: Constructed from `THREE.Group` consisting of a dark metallic hilt with an accent ring, a bright white core cylinder, an emissive outer glow cylinder, and a tip `PointLight`.
- **Pointer Controls**: Tracks pointer movement mapped into 3D world space at the player slicing plane (`z = 1.5`).
- **Touch Support**: Native multi-touch handling for separate mobile touch points controlling left (Red) and right (Blue) sabers independently.
- **Physical Sway (Interpolation)**: Smooth position lerping (`0.25`) with dynamic rotation sway based on movement velocity.

### 3. Audio & Beatmap Synchronization
- **Lead-Time Calculation**: Blocks spawn at `spawnZ = -35.0` and travel at `blockSpeed = 14.0` towards the hit plane (`hitZ = 1.5`). Lead time is calculated as:
  $$\text{leadTime} = \frac{|\text{spawnZ} - \text{hitZ}|}{\text{blockSpeed}} \approx 2.607\text{ seconds}$$
- **Beatmap Spawner**: Blocks are scheduled to spawn at `t_spawn = t_hit - leadTime` to hit the saber plane precisely on beat.
- **Audio Support**: MP3 file uploader via HTML5 `<input type="file">` and automatic 120 BPM synth rhythm generator.

### 4. Collision Detection & Particle System
- **Blade Segment Collision**: Performs 3D line-segment-to-point/box distance checking between saber blade limits (`y = 0.1` to `y = 1.2`) and block bounding boxes (`THREE.Box3`).
- **Particle Slash Effect**: Upon valid slice (Red saber -> Red block, Blue saber -> Blue block), 18 glowing box particles explode outward with 3D velocity and friction decay.
- **Score System**: Tracks total score (`+100 * combo`) and combo multiplier (up to `x8`), updating the HUD overlay dynamically.

---

## Guidelines for Future Enhancements

- **Preserve Modern ES Module Imports**: Keep modular, modern ES6 imports (`import * as THREE from 'three'`).
- **Maintain Performance**: Reuse geometries/materials where appropriate and dispose of particle geometries/materials when lifetime expires to avoid WebGL memory leaks.
- **Styling**: Maintain the dark synthwave/cyberpunk aesthetic with glassmorphism UI overlay elements.
