# Curso (visor local)

Visor local del curso. La **navegación** vive en este repo (liviano). Los **videos y PDFs**
se piden a un dataset **privado de Hugging Face** usando tu token.

## Requisitos

- **Node.js 18+** (nada más: no hace falta `npm install`, es cero dependencias).

## Uso

1. Cloná el repo.
2. Corré el visor:

   ```bash
   npm run serve
   # o directamente:
   node server.js
   ```

3. Abrí **http://localhost:4317/**
4. La primera vez te pide un **token de Hugging Face**:
   - Andá a https://huggingface.co/settings/tokens
   - Creá un token **Fine-grained**, permiso **Read**, con acceso al repo del curso.
   - Pegalo en el popup → "Entrar".
   - Se guarda en `.hf-token` (local, no se sube a ningún lado).

## Cómo funciona

```
Navegador (localhost:4317)  ──▶  server.js  ──(tu token)──▶  Hugging Face (privado)
   navegación + reproductor        proxy /media/*             videos, PDFs
```

- `server.js`: sirve la navegación (`./site`) y hace de proxy autenticado a Hugging Face.
- `site/`: la navegación (HTML), regenerable con `npm run publish`.
- Los videos hacen *seek* (soporta HTTP Range).

## Regenerar la navegación (solo el dueño)

Si actualizás el contenido, desde la carpeta del proyecto:

```bash
node ../share/publish.js
```

## Notas

- Necesitás **internet** para ver videos/PDFs (vienen de Hugging Face).
- El token es **de solo lectura**: no puede modificar nada del repo.
- Para revocar acceso: borrá el token en https://huggingface.co/settings/tokens
