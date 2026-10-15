# Boletería

Sistema de venta y validación de entradas digitales para un solo organizador. El público compra online y recibe un QR. En la puerta, un celular del personal valida ese QR.

La interfaz va a estar en español (Argentina), los montos en pesos y los horarios en `America/Argentina/Mendoza`. La base guarda fechas en UTC y los importes en centavos enteros.

## Requisitos

- Docker Desktop con el backend de WSL2 (en Windows el disco del proyecto dentro de Docker va más rápido así).
- Node.js 22 y pnpm 8.14.3, solo si vas a correr la app fuera de Docker.

## Arranque

```bash
docker compose up --build
```

Eso levanta Postgres 16 y la app en el puerto 3000. Al iniciar, el contenedor aplica las migraciones. Cuando la base responde, `http://localhost:3000/api/health` devuelve `{"ok":true}`.

Los secretos que inyecta `docker-compose.yml` sirven solo en esta red local. Antes de cualquier despliegue hay que reemplazarlos.

Para trabajar sin Docker, copiá `.env.example` a `.env`, completá los secretos (mínimo 32 caracteres) y levantá Postgres por tu cuenta. Después:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Si cambian las dependencias, reconstruí la imagen con `docker compose up --build`.

## Scripts

- `pnpm lint` — ESLint
- `pnpm format:check` — Prettier
- `pnpm typecheck` — TypeScript
- `pnpm test` — Vitest
- `pnpm test:e2e` — Playwright (todavía sin flujos; hace falta `pnpm exec playwright install` la primera vez)
- `pnpm db:generate` — genera el cliente de Prisma
- `pnpm db:migrate` — aplica migraciones (`prisma migrate deploy`)
- `pnpm db:seed` — crea el administrador inicial si todavía no existe

## Ingreso del personal

Con Docker, el primer arranque crea un administrador local:

- Email: `admin@boleteria.local`
- Contraseña: `Cambiame1234`

Esa contraseña es solo para desarrollo. Cambiala en Seguridad apenas entres, y en producción definí `ADMIN_EMAIL` y `ADMIN_INITIAL_PASSWORD` en el entorno de Vercel o Supabase. El seed no pisa un administrador que ya existe.

El ingreso está en `/login`. Si el administrador activó el segundo factor, el login pide un código de 6 dígitos. Un rol que abre una sección ajena ve “Sin permiso”. Las APIs responden 401 sin sesión y 403 con el rol incorrecto.

## Roles

El control de acceso se aplica en el servidor, en cada pantalla y en `src/proxy.ts`.

- **ADMIN:** eventos, entradas, ventas, usuarios, reportes, anulaciones y auditoría.
- **BOLETERIA:** vende entradas manuales y ve sus propias ventas.
- **VALIDADOR:** escáner y conteo del evento que está validando.

## Variables de entorno

Están documentadas en [`.env.example`](.env.example). En la Fase 0 son obligatorias `DATABASE_URL`, `APP_URL`, `APP_SECRET` y `QR_SECRET`. `APP_SECRET` cifra el TOTP del administrador. `QR_SECRET` firma los QR. Tienen que ser distintas.

## Datos

El esquema inicial está en [`prisma/schema.prisma`](prisma/schema.prisma). Incluye usuarios, sesiones, eventos, lineup, tipos de entrada con cupo vendido y reservado, órdenes, tickets, auditoría, webhooks y un contador para rate limit. La lógica de negocio de cada parte llega en su fase.

Next.js 16 usa [`src/proxy.ts`](src/proxy.ts) en el lugar de `middleware.ts`. Ahí se exige la sesión y el rol antes de entrar a administración, boletería, validación y las APIs internas. Salud, webhooks y el cron quedan afuera de esa compuerta.

La impresión térmica no está implementada. [`src/modules/print/print-service.ts`](src/modules/print/print-service.ts) es un stub y [`src/modules/ticket-render/types.ts`](src/modules/ticket-render/types.ts) describe el ticket sin depender del medio.

## Copia de seguridad

Hoy el respaldo es manual. Un cron automático queda para la Fase 9.

Crear un volcado desde la raíz del proyecto:

```bash
docker compose exec -T db pg_dump -U boleteria --clean --if-exists boleteria > backup.sql
```

Restaurar sobre la base local (esto reescribe los datos actuales):

```bash
docker compose exec -T db psql -U boleteria -d boleteria < backup.sql
```

Guardá `backup.sql` fuera de la máquina. No lo subas al repositorio: puede contener datos personales de compradores.
