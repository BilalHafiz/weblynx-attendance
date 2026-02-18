# Weblynx Attendance

Weblynx Attendance Management System – employee attendance tracking, leave management, and reporting.

## Tech stack

- **Vite** – build tool
- **TypeScript** – type safety
- **React** – UI
- **shadcn-ui** – components
- **Tailwind CSS** – styling
- **Firebase** – auth and data

## Getting started

### Prerequisites

- Node.js and npm – [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Run locally

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd weblynx-attendance

# Install dependencies
npm i

# Start development server
npm run dev
```

### Scripts

- `npm run dev` – start dev server with hot reload
- `npm run build` – production build
- `npm run preview` – preview production build locally
- `npm run lint` – run ESLint

## Deploy

Build the app and deploy the `dist` output to your hosting (Vercel, Netlify, Firebase Hosting, etc.):

```sh
npm run build
```

Then configure your host to serve the generated static files from the `dist` directory.
