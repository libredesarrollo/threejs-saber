# `gameRoot` — contenedor del mundo jugable

## Qué es

`gameRoot` es un `THREE.Group` creado en el constructor de `BeatSaberGame`. Actúa como **padre único del contenido del nivel** que se mueve y desaparece con la partida: pista, bordes, rejilla y bloques de ritmo.

```javascript
this.gameRoot = new THREE.Group();
this.scene.add(this.gameRoot);
```

No es un concepto de Three.js con nombre especial: es un grupo vacío al que se cuelgan objetos para poder **mover todo el “escenario del juego” de una vez** sin tocar la cámara, las luces ni los sables.

## Qué cuelga de `gameRoot` y qué no

| Dentro de `gameRoot` | Fuera (directamente en `scene`) |
|----------------------|----------------------------------|
| Rejilla (`GridHelper`) | Luces (ambient + direccionales) |
| Plataforma de la pista | Sables (escritorio) o grips VR |
| Bordes neón izquierdo/derecho | Partículas de corte (posición world) |
| Cubos del beatmap (spawn / remove) | Grupos `ControllerGrip` de WebXR |

Los **sables** siguen fuera del grupo porque en VR deben seguir la pose de los mandos; en pantalla se posicionan con ratón/touch en coordenadas de mundo. Mover `gameRoot` no arrastra los sables: eso es intencional.

## Por qué existe (escritorio vs VR)

En **escritorio**, la cámara está en `(0, 1.6, 3)` mirando hacia la pista. El plano de corte lógico del juego es `hitZ = 1.5`: los bloques avanzan en **+Z** hasta esa zona.

En **VR (WebXR)**, la cabeza suele estar cerca del origen `(0, ~1.6, 0)` con espacio de referencia `local-floor`. Si la pista siguiera en las mismas coordenadas que en escritorio, el plano de corte quedaría **detrás** del jugador (en +Z respecto a alguien que mira hacia −Z).

Solución: al entrar en VR se aplica un desplazamiento solo al escenario:

```javascript
this.vrWorldOffsetZ = -3;
// sessionstart → this.gameRoot.position.z = this.vrWorldOffsetZ;
// sessionend   → this.gameRoot.position.z = 0;
```

Con `gameRoot.position.z = -3`, un bloque o punto de la pista que en coordenadas **locales** del grupo sigue en `hitZ = 1.5` queda en **world** `z ≈ -1.5`, es decir ~1,5 m **delante** de la cabeza al mirar hacia la pista. La lógica del juego (`spawnZ`, `hitZ`, velocidad de bloques) **no cambia**; solo se traslada el contenedor.

## Resumen en una frase

**`gameRoot` es el “carro” del nivel**: agrupa pista y bloques para alinearlos con la cámara de escritorio por defecto y, en Quest/VR, desplazarlos en Z para que el ritmo y los cortes coincidan con donde estás parado y mirando.

## Referencia rápida en código

- Creación: `app.js` (constructor).
- Entorno: `setupEnvironment()` → `this.gameRoot.add(...)`.
- Bloques: `spawnBlock()` → `this.gameRoot.add(blockGroup)`; al destruir o fallar → `this.gameRoot.remove(...)`.
- VR: `onXRSessionStart()` / `onXRSessionEnd()` ajustan `gameRoot.position.z`.

y porque hubo falta actualizarlo_

Porque antes no hacía falta mover el mundo; con VR sí.

En escritorio todo el diseño asume una cámara fija en (0, 1.6, 3) mirando la pista. Pista, bloques y hitZ = 1.5 se añadían directo a scene y encajaban con esa vista.

Con WebXR la “cámara” es la cabeza en el espacio de la habitación (local-floor), casi en el origen, no en z = 3. Las mismas coordenadas dejaban el plano de corte mal colocado respecto a donde estás mirando (el ritmo ya no pasa delante de los sables).

Opciones:

Duplicar lógica — distintos spawnZ / hitZ en VR y en escritorio (más bugs, dos reglas).
Mover solo la cámara en VR — en WebXR no controlas la cabeza como en una cámara de Three.js normal.
gameRoot — un solo beatmap y una sola física de bloques; al entrar en VR desplazas todo el escenario en Z (-3) y listo.
Por eso hubo que refactorizar: lo que era “el nivel” pasó de scene.add(...) a gameRoot.add(...), y en sessionstart / sessionend se ajusta gameRoot.position.z.

Los sables no van en gameRoot porque en VR van pegados a los mandos; si fueran hijos del grupo, se moverían con el offset del mundo y romperían el agarre.

En corto: no era un capricho de arquitectura; fue el cambio mínimo para que Quest y escritorio compartan el mismo juego sin reescribir spawns ni colisiones. Eso es lo que resume gameRoot.md.