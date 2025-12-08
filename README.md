# VECTORCLASH

Portfolio website for Aaron Ezra Sterczewski - UI and web motion engineer.

## About

VECTORCLASH is a modern portfolio website featuring interactive 3D graphics and animations built with React and Three.js. The site showcases creative work through an immersive visual experience.

## Tech Stack

- **React 19** - UI framework
- **Three.js** - 3D graphics library
- **React Three Fiber** - React renderer for Three.js
- **React Three Drei** - Useful helpers for R3F
- **React Three Postprocessing** - Post-processing effects
- **GSAP** - Animation library
- **Vite** - Build tool and dev server
- **Sass** - CSS preprocessor

## Getting Started

### Prerequisites

- Node.js (latest LTS version recommended)
- npm

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm start
# or
npm run dev
```

The site will be available at `http://localhost:3000`

### Build

Create a production build:

```bash
npm run build
```

### Preview

Preview the production build locally:

```bash
npm run preview
```

### Testing

Run tests:

```bash
npm test
```

## Project Structure

```
vectorclash-site/
├── src/
│   ├── components/     # React components
│   ├── data/           # JSON data files (projects, skills, profile)
│   ├── images/         # Image files
│   ├── App.js          # Main app component
│   └── main.jsx        # Entry point
├── public/             # Public assets
└── dist/               # Production build output
```

## Data Management

The site uses local JSON files for content management:
- `src/data/projects.json` - Portfolio projects
- `src/data/skills.json` - Technical skills and categories
- `src/data/profile.json` - Personal information and resume link

## License

Private - All rights reserved
