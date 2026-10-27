# ASAD — Or Noir

A landing page for the ASAD Or Noir, an original 18k gold and black diamond chronograph designed in Spline. The watch assembles itself in 3D, explodes into its components as you scroll, and can be rotated, zoomed and taken apart in the Explore section.

Frontend only: Vite + `@splinetool/runtime`. The 3D scene loads from the Spline export URL in `src/watch.js`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

`npm run deploy` builds the site and publishes `dist/` to the `gh-pages` branch, which GitHub Pages serves.

`video/pipeline/` holds the scripts that render the 30-second promo video (frame-stepped site capture plus a monitor mock-up composite).
