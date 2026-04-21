# MeetSyncFront

Frontend de MeetSync construit avec React, TypeScript et Vite.

## Prerequisites

- Node.js 20+
- npm

## Installation

```bash
npm install
```

## Environment Variables

Créer un fichier `.env` a partir de `.env.example`.

Variables disponibles :

- `VITE_API_URL` : URL de l'API backend
- `VITE_CHAT_SOCKET_URL` : URL du serveur Socket.IO backend
- `VITE_GOOGLE_CLIENT_ID` : identifiant Google OAuth pour la connexion et l'inscription Google

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Socket.IO Client
