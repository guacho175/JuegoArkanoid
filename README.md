# Arkanoid Neon

Juego en vivo: https://juegoarkanoid-948774944187.europe-west1.run.app/

## Descripcion

Arkanoid Neon es una reinterpretacion del clasico rompebloques con interfaz neon responsiva, ranking global y control hibrido para desktop y movil.

## Estandar aplicado

Este juego se alinea con la referencia de JuegoSerpiente.

- Layout comun: header + ranking + canvas + reproductor.
- Identidad visual unificada con tokens neon compartidos.
- Mismas reglas de UX tactil y bloqueo de scroll accidental.

## Arquitectura comun

- React 19 + TypeScript + Vite
- Tailwind CSS v4 + motion/react
- Motor sobre canvas con logica de colisiones en tiempo real
- Ranking remoto (Apps Script) con respaldo localStorage
- Dockerfile multistage + cloudbuild.yaml

## Controles

- Escritorio: flechas izquierda/derecha, A/D, o raton.
- Movil: arrastre tactil del paddle.

## Desarrollo local

1. Instalar dependencias:

```bash
npm install
```

2. Ejecutar entorno local:

```bash
npm run dev
```

3. Validar tipado:

```bash
npm run lint
```

## Build y despliegue

- Build: npm run build
- Runtime: puerto 8080 en Cloud Run
- Artefacto: imagen Docker generada por cloudbuild.yaml

## Creditos

Desarrollado por Galindez & IA.
