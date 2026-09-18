# Icon Tech

A web application built with [Next.js](https://nextjs.org) (App Router), React 19, TypeScript, and Tailwind CSS v4.

## Tech Stack

- **Framework:** Next.js 16
- **UI:** React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Linting:** ESLint (`eslint-config-next`)

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm

### Installation

```bash
git clone https://github.com/Arman-2107046/Icon-Tech.git
cd Icon-Tech
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app hot-reloads as you edit files.

## Available Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the development server         |
| `npm run build` | Create an optimized production build |
| `npm run start` | Serve the production build           |
| `npm run lint`  | Run ESLint                           |

## Project Structure

```
icon-tech/
├── app/                # App Router pages, layouts, and global styles
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles (Tailwind)
├── public/             # Static assets
├── next.config.ts      # Next.js configuration
├── postcss.config.mjs  # PostCSS / Tailwind configuration
├── tsconfig.json       # TypeScript configuration
└── eslint.config.mjs   # ESLint configuration
```

## Deployment

Build for production and start the server:

```bash
npm run build
npm run start
```

The app can also be deployed to any platform that supports Next.js, such as [Vercel](https://vercel.com).

## License

This project is private.
