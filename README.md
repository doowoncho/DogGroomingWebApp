# Mung Mung's Grooming— Premium Dog Grooming

A modern, full-stack dog grooming booking web application built with Next.js and TypeScript. Designed for mobile-first users, KIIN lets pet owners book professional grooming services in under a minute.

🌐 **Live Demo:** [dog-grooming-web-app.vercel.app](https://dog-grooming-web-app.vercel.app)

---

## Features

- **Quick Booking Flow** — Streamlined appointment scheduling designed to complete in under a minute
- **Service Catalog** — Browse available grooming packages and add-ons
- **Responsive Design** — Mobile-first layout built with Tailwind CSS
- **Custom Illustrations** — Hand-crafted SVG hero banner with park scene visuals
- **CI/CD Pipeline** — Automated deployments to Vercel via GitHub Actions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Deployment | Vercel |
| CI/CD | GitHub Actions |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/doowoncho/DogGroomingWebApp.git
cd DogGroomingWebApp/dog-grooming
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

---

## Project Structure

```
dog-grooming/
├── src/
│   ├── app/          # Next.js App Router pages and layouts
│   ├── components/   # Reusable UI components
│   └── styles/       # Global styles
├── public/           # Static assets
└── .github/
    └── workflows/    # CI/CD pipeline configuration
```

---

## Deployment

This project is deployed on [Vercel](https://vercel.com). Every push to `main` triggers an automatic deployment via the GitHub Actions workflow.

---

## License

MIT
