# Vishwa S — Software Developer Portfolio

Professional static portfolio for Vishwa S, focused on Angular, ASP.NET Core and enterprise application engineering. `src/` is the single source of truth; `public/` is generated and is the Vercel output directory.

## Local development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:3000` and rebuilds when files under `src/` change.

Use `npm run build:dev` when you need an unminified development build without starting the server.

## Production build

```bash
npm run build
npm run check
```

On Windows with Microsoft Edge installed, `npm run check:visual` runs the responsive and interaction suite. Set `PLAYWRIGHT_EXECUTABLE_PATH` to another Chromium executable when needed.

Do not edit `public/` directly. Edit the Pug templates, Sass, or JavaScript under `src/`, then rebuild.

## Resume asset

Add the real resume PDF at:

```text
src/resume/Vishwa-S-Resume.pdf
```

The build copies it to `public/resume/Vishwa-S-Resume.pdf`. The file is intentionally not fabricated when the source PDF is unavailable.

## Contact form and Vercel

The form posts to the Vercel function at `api/contact.js`, which sends mail through Resend. No credentials are exposed to browser JavaScript.

Configure these variables in Vercel Project Settings → Environment Variables:

- `RESEND_API_KEY`: Resend API key.
- `CONTACT_TO_EMAIL`: destination address, normally `vishwajayanth3@gmail.com`.
- `CONTACT_FROM_EMAIL`: sender on a domain verified in Resend, for example `Portfolio <portfolio@example.com>`.

Copy `.env.example` to `.env.local` only for local function testing and supply real values locally. Never commit the resulting file. Deploy to Vercel after the sender domain is verified and the environment variables are configured. The visible email link remains available as a fallback.

## Deployment

Vercel uses `npm run build`, publishes `public/`, and deploys `api/contact.js` as a serverless function. Add the resume before the production deployment if download functionality is required.
