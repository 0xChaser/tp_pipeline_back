# tasklist-backend

API de gestion de tâches (Express + Prisma + MySQL).

## Lancer en local

```bash
npm ci
npx prisma generate
cp .env.example .env   # adapter DATABASE_URL
npm run dev
```

## Tests

```bash
npm test
npm run test:coverage
```

## Docker

```bash
docker build -t tasklist-backend .
docker run -p 3001:3001 -e DATABASE_URL="mysql://root@host:3306/tasklist" tasklist-backend
```

## CI/CD

Le pipeline Jenkins (`Jenkinsfile`) enchaine : tests unitaires + couverture, analyse SonarQube + quality gate, build TypeScript, build de l'image Docker, scan Trivy, génération du SBOM (SPDX) et push sur Docker Hub.
