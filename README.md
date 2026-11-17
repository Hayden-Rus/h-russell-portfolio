# Hayden Russell — Portfolio

A responsive dark portfolio built with HTML, CSS, and vanilla JavaScript. No installation or build step is required.

## Run locally

From this folder, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://localhost:8000 in your browser. Stop the server with Ctrl+C.

## Edit

- `index.html`: introduction, experience, links, and education.
- `styles.css`: dark theme, responsive layouts, and CSS interactions.
- `script.js`: scroll progress, active sections, reveals, and a morphing canvas sculpture.

Motion can be paused from the header. System reduced-motion preferences are respected. The page remains readable without JavaScript.
- `assets/hayden-russell-resume.pdf`: the original résumé download.

Content comes from the supplied 2026 résumé, with the Oracle OCI Software Engineer role (Compute Control Plane, July 2026–present) supplied separately. LinkedIn is linked but was not accessible for content verification. The original PDF does not include the Oracle update or the new website email (hrussell.pro@gmail.com). Google Fonts is optional; fallback fonts work without it.

## Publish

Serve the repository root with any static website host. There is no build command. Keep `index.html`, `styles.css`, `script.js`, and `assets/` together. This site has not been deployed.
