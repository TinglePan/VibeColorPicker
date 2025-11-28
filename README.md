# Vibe Color Picker

A React-based Progressive Web App (PWA) for color-based concentration analysis. This app allows users to calibrate color measurements and then use those calibrations to measure concentrations from images.

## Features

### Step 1: Calibration
- Upload a JSON file containing color and concentration data
- Automatic linear regression fitting (y = mx + n)
- Interactive plot visualization with customizable axis labels
- Editable regression parameters (slope and intercept)

### Step 2: Color Picker
- Upload images for color analysis
- Circular region color picker with adjustable radius
- Point color picker (radius = 0)
- Real-time concentration calculation using calibration data
- Mobile-friendly interface

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to Cloudflare Pages.

## Deployment to Cloudflare Pages

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. In Cloudflare Dashboard, go to Pages
3. Connect your repository
4. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Deploy!

## JSON File Format

The calibration JSON file should be an array of entries, where each entry is:
```json
[
  [[R, G, B], Concentration],
  ...
]
```

Example:
```json
[
  [[255, 100, 50], 10.5],
  [[200, 80, 40], 20.3],
  [[150, 60, 30], 30.1]
]
```

Where:
- R, G, B are RGB values (0-255)
- Concentration is a float value (0 to several hundreds)

## PWA Icons (Optional)

To add custom PWA icons:
1. Create `public/pwa-192x192.png` (192x192 pixels)
2. Create `public/pwa-512x512.png` (512x512 pixels)
3. Update `vite.config.js` to include the icons in the manifest

## Mobile Support

This app is fully responsive and works on mobile devices. It can be installed as a PWA on mobile phones for offline access.

## Technologies

- React 18
- Vite
- Recharts (for plotting)
- Vite PWA Plugin

