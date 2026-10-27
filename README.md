# CMPC Libros: gestión de inventario

Aplicación full stack para administrar el inventario de libros: autenticación con JWT y roles, CRUD con soft delete, búsqueda, filtros, orden múltiple y paginación del lado del servidor, exportación a CSV, carga de portadas y auditoría de cambios.

| Capa | Tecnologías |
| --- | --- |
| Backend | NestJS 11, TypeScript, Prisma 6, PostgreSQL 16, passport-jwt, class-validator, Swagger |
| Frontend | React 19, TypeScript, Vite, React Router 7, TanStack Query 5, axios, react-hook-form + zod |
| Testing | Jest (backend), Vitest + Testing Library (frontend), cobertura mínima de 80% obligatoria |
| DevOps | Docker multi-stage, docker-compose, nginx, GitHub Actions |

---

## Índice

1. [Inicio rápido con Docker](#1-inicio-rápido-con-docker)
2. [Instalación sin Docker](#2-instalación-sin-docker)
3. [Credenciales de prueba](#3-credenciales-de-prueba)
4. [Guía de uso](#4-guía-de-uso)
5. [API](#5-api)
6. [Arquitectura](#6-arquitectura)
7. [Modelo de datos](#7-modelo-de-datos)
8. [Decisiones de diseño](#8-decisiones-de-diseño)
9. [Supuestos](#9-supuestos)
10. [Testing](#10-testing)
11. [Pendientes y cómo los implementaría](#11-pendientes-y-cómo-los-implementaría)

---

## 1. Inicio rápido con Docker

Requisitos: Docker y Docker Compose v2.

```bash
docker compose up --build
```

Esto levanta tres servicios:

| Servicio | URL | Detalle |
| --- | --- | --- |
| frontend | http://localhost:8080 | nginx con la SPA, hace proxy de `/api` y `/uploads` al backend |
| backend | http://localhost:3000/api | Swagger en http://localhost:3000/api/docs |
| postgres | localhost:5432 | volumen `pgdata`, con healthcheck |

Al iniciar, el backend espera a que Postgres esté sano, aplica las migraciones (`prisma migrate deploy`), ejecuta el seed (que es idempotente) y recién entonces arranca la API. Las portadas subidas se guardan en el volumen `uploads`.

Los valores por defecto sirven para desarrollo. Para cambiarlos, copia `.env.example` a `.env` en la raíz y edita los valores (puertos, credenciales de Postgres, `JWT_SECRET`, etc.).

```bash
docker compose down        # detener
docker compose down -v     # detener y borrar los datos (volúmenes)
```

## 2. Instalación sin Docker

Requisitos: Node.js 22+ y PostgreSQL 14+ con la extensión `pg_trgm` disponible (viene en el paquete `contrib`, incluido en las instalaciones estándar).

Si no tienes Postgres instalado, puedes levantar solo la base con Docker: `docker compose up -d postgres`.

### Backend

```bash
cd backend
cp .env.example .env          # ajusta DATABASE_URL si tu Postgres es otro
npm install
npx prisma migrate deploy     # crea el esquema (incluye pg_trgm e índices)
npm run seed                  # usuarios y ~40 libros de ejemplo
npm run start:dev             # http://localhost:3000/api
```

### Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

En desarrollo, Vite hace proxy de `/api` y `/uploads` a `http://localhost:3000`, igual que nginx en producción. Para apuntar a otro backend: `VITE_BACKEND_URL=http://host:puerto npm run dev`.

### Scripts útiles

| Backend | |
| --- | --- |
| `npm run test` / `npm run test:cov` | tests unitarios / con cobertura |
| `npm run typecheck` | chequeo de tipos (incluye los tests) |
| `npm run prisma:migrate` | crear una migración nueva en desarrollo (`prisma migrate dev`) |
| `npm run build && npm start` | build y ejecución de producción |

| Frontend | |
| --- | --- |
| `npm run test` / `npm run test:cov` | tests / con cobertura |
| `npm run build` | typecheck + build de producción |

## 3. Credenciales de prueba

| Rol | Email | Contraseña | Permisos |
| --- | --- | --- | --- |
| ADMIN | `admin@cmpc.cl` | `Admin123!` | todo, incluido eliminar, papelera/restaurar, usuarios y auditoría |
| USER | `usuario@cmpc.cl` | `Usuario123!` | ver, crear, editar, subir imágenes y exportar |

## 4. Guía de uso

- **Inventario** (`/books`): tabla paginada en el servidor.
  - **Búsqueda** por título o autor, con debounce de 400 ms.
  - **Filtros** por género, editorial, autor y disponibilidad.
  - **Orden múltiple**: haz clic en los encabezados. Cada clic cicla ascendente → descendente → sin orden. Las columnas se suman en el orden en que las clickeas, y un número junto a la flecha muestra su prioridad.
  - Filtros, orden, página y tamaño de página quedan en la URL: se puede recargar o compartir el link.
  - **Exportar CSV** descarga el inventario completo con los filtros y el orden activos (no solo la página visible).
- **Nuevo / Editar libro**: formulario con validación en vivo. Autor, editorial y género sugieren valores existentes; si escribes uno nuevo, se crea. La disponibilidad se calcula sola a partir del stock. La portada (JPG, PNG o WEBP, máx. 2 MB) muestra una vista previa antes de guardar.
- **Detalle** (`/books/:id`): toda la información y las acciones del libro.
- **Papelera** (`/trash`, solo ADMIN): libros eliminados, con la opción de restaurarlos.
- Si el token expira o es inválido, cualquier 401 cierra la sesión y te devuelve al login. Después de iniciar sesión vuelves a la página donde estabas.

## 5. API

La documentación interactiva está en **`/api/docs`** (Swagger). Para probar los endpoints protegidos, usa el botón *Authorize* con el `accessToken` que devuelve el login.

Todas las respuestas exitosas usan el mismo formato:

```json
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
```

`meta` solo aparece en los listados paginados. Los errores también tienen un formato uniforme:

```json
{ "success": false, "statusCode": 400, "error": "BAD_REQUEST", "message": "Error de validación",
  "details": ["price must not be less than 0"], "path": "/api/books", "timestamp": "..." }
```

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | público | JWT; máximo 5 intentos por minuto |
| POST | `/api/auth/register` | público | crea un usuario con rol USER |
| GET | `/api/auth/me` | auth | usuario actual |
| GET | `/api/books` | auth | listado paginado (ver parámetros abajo) |
| GET | `/api/books/export` | auth | CSV con los mismos filtros |
| GET | `/api/books/deleted` | ADMIN | papelera (soft deleted) |
| GET | `/api/books/:id` | auth | detalle |
| POST | `/api/books` | auth | crear |
| PATCH | `/api/books/:id` | auth | actualizar (parcial) |
| DELETE | `/api/books/:id` | ADMIN | soft delete |
| PATCH | `/api/books/:id/restore` | ADMIN | restaurar |
| POST | `/api/books/:id/image` | auth | `multipart/form-data`, campo `image` |
| GET/POST | `/api/authors`, `/api/publishers`, `/api/genres` | auth | catálogos |
| GET/POST | `/api/users` | ADMIN | gestión de usuarios |
| GET | `/api/audit-logs` | ADMIN | auditoría (filtros: `entity`, `entityId`, `action`, `userId`) |
| GET | `/api/health` | público | estado de la API y de la BD |

**Parámetros de `GET /api/books`:** `page`, `limit` (máx. 100), `search`, `genreId`, `publisherId`, `authorId`, `available` (`true`/`false`) y `sort`.

`sort` usa el formato `campo:dir,campo:dir`, por ejemplo `sort=price:desc,title:asc`. Los campos permitidos son `title`, `author`, `publisher`, `genre`, `price`, `stock`, `isAvailable`, `createdAt` y `updatedAt`. Cualquier otro campo responde 400.

## 6. Arquitectura

Los diagramas (Mermaid) están en [`docs/arquitectura.md`](docs/arquitectura.md).

```
.
├── backend/
│   ├── prisma/                  schema.prisma + migraciones SQL versionadas
│   └── src/
│       ├── auth/                login/register/me, estrategia JWT
│       ├── users/
│       ├── books/               controller · service · mapper · dto
│       │   └── repositories/    BooksRepository (abstracto) + PrismaBooksRepository
│       ├── catalog/             autores, editoriales, géneros
│       ├── audit/               audit_logs, escrito dentro de cada transacción
│       ├── storage/             StorageService (abstracto) + LocalStorageService
│       ├── health/
│       ├── prisma/              PrismaService (global)
│       ├── common/              guards, interceptores, filtro, decoradores, utilidades
│       ├── config/              validación de variables de entorno
│       └── database/            seed idempotente
├── frontend/
│   ├── nginx.conf
│   └── src/
│       ├── api/                 cliente axios + servicios por recurso
│       ├── auth/                AuthContext, ProtectedRoute, tokenStorage
│       ├── hooks/               useBooks, useBookSearchParams, useCatalog, useDebounce
│       ├── components/          tabla, filtros, paginación, formulario, upload, estados
│       ├── pages/
│       └── utils/
├── docs/                        arquitectura (Mermaid) y modelo relacional (DBML)
├── .github/workflows/ci.yml
└── docker-compose.yml
```

### Cómo se aplica SOLID

- **Responsabilidad única (S)**: el controller solo traduce HTTP, el service tiene las reglas de negocio, el repository el acceso a datos y el mapper la forma de la respuesta. Los aspectos transversales (formato de respuesta, logging y errores) viven en interceptores y en el filtro, no en cada endpoint.
- **Abierto/cerrado (O)**: los campos de orden permitidos son un mapa `campo → orderBy` en el repositorio. Agregar uno nuevo es agregar una entrada, sin tocar la lógica.
- **Liskov (L)**: `PrismaBooksRepository` y `LocalStorageService` pueden reemplazarse por cualquier otra implementación de su contrato. Los tests del servicio usan dobles que cumplen el mismo contrato.
- **Segregación de interfaces (I)**: `StorageService` expone solo `save` y `delete`, que es lo único que necesita el dominio.
- **Inversión de dependencias (D)**: `BooksService` depende de las clases abstractas `BooksRepository` y `StorageService`, que se usan como tokens de inyección de Nest. La implementación concreta se decide en el módulo (`{ provide: BooksRepository, useClass: PrismaBooksRepository }`). Cambiar a S3 es cambiar un provider.

## 7. Modelo de datos

El DBML está en [`docs/modelo-relacional.dbml`](docs/modelo-relacional.dbml) (se puede pegar en [dbdiagram.io](https://dbdiagram.io)). El esquema se gestiona con **migraciones de Prisma** versionadas en `backend/prisma/migrations` (no se usa `db push`).

- **Normalización**: `books` referencia a `authors`, `publishers` y `genres` (FK con `ON DELETE RESTRICT`).
- **Precio**: `DECIMAL(10,2)`. Nunca se usa coma flotante para dinero; se convierte a `number` solo al serializar.
- **Índices**:
  - B-tree en las FK, `is_available`, `price`, `deleted_at` y `created_at` (filtros y órdenes más comunes).
  - **GIN `pg_trgm`** en `books.title` y `authors.name`, para que `ILIKE '%texto%'` use el índice en vez de un *seq scan*.
  - En `audit_logs`, índices por `(entity, entity_id)`, `user_id` y `created_at`.
- **Soft delete**: columna `deleted_at`. Todas las consultas del repositorio filtran `deleted_at IS NULL`, salvo la papelera.

## 8. Decisiones de diseño

| Decisión | Motivo |
| --- | --- |
| Auditoría dentro de la misma `$transaction` | Si falla el log, se revierte la operación, y al revés también. Nunca queda un cambio sin auditar. En `UPDATE` se guarda solo el diff `{campo: {from, to}}` y un PATCH sin cambios reales no genera registro. |
| `tx` opcional en los métodos del repositorio | Permite componer repositorio y auditoría en una sola transacción. Es una concesión consciente: la firma conoce el tipo de transacción de Prisma. La alternativa (Unit of Work propio) era sobreingeniería para este alcance. |
| Export CSV con `StreamableFile` y lotes de 500 | La memoria se mantiene constante aunque el inventario crezca. Lleva BOM UTF-8 para que Excel muestre bien las tildes, escapa según RFC 4180 y neutraliza fórmulas (`=`, `+`, `-`, `@`) para evitar inyección de CSV. El orden se valida antes de abrir el stream, así un error todavía puede responder 400. |
| Imagen: tipo validado por magic bytes | El `mimetype` lo envía el cliente y se puede falsear. El archivo se guarda con nombre UUID y la extensión detectada. Orden de operaciones: se guarda el archivo nuevo, se actualiza la BD y recién entonces se borra el anterior. Si la BD falla, se borra el archivo nuevo y la imagen anterior queda intacta. |
| Autor, editorial y género por nombre (`connectOrCreate`) | El formulario sugiere valores existentes y permite crear uno nuevo sin salir de la pantalla. La unicidad por nombre la garantiza un índice `UNIQUE`. Los filtros sí usan ids. |
| Comparación bcrypt también con email inexistente | Evita filtrar por tiempo de respuesta qué emails están registrados. El mensaje es el mismo en ambos casos. |
| Throttler global de 100 req/min y 5 req/min en login y registro | Mitiga fuerza bruta. `trust proxy` está activo para que detrás de nginx se limite por la IP real del cliente. |
| Estado del listado en la URL | Links compartibles, botón atrás funcional y nada de estado duplicado entre la URL y React. |
| Un 4xx no se reintenta en TanStack Query | Reintentar un 404 o un 403 solo retrasa el error. Los errores de red y los 5xx se reintentan hasta 2 veces. |
| CSS propio sin librería de UI | Bundle más liviano y control total. Usa variables CSS, es responsive (en pantallas chicas oculta columnas secundarias) y tiene foco visible y `aria-*` en tabla, orden y formularios. |

## 9. Supuestos

- **Disponibilidad derivada del stock**: un libro está disponible si `stock > 0`. No se acepta como input. El servicio la recalcula cada vez que cambia el stock y se **persiste en `is_available`** para poder indexarla y filtrar rápido, en vez de calcular `stock > 0` en cada consulta. Es una desnormalización controlada: el único punto de escritura es el servicio.
- **Un autor por libro**. Si se necesitaran varios, se cambiaría a una tabla puente `book_authors`.
- **Roles**: solo ADMIN elimina y restaura (lo pide el enunciado). USER puede crear y editar.
- **Moneda**: los precios se muestran en CLP. El modelo admite 2 decimales por si se usa otra moneda.
- **Registro público**: existe `POST /auth/register`, pero siempre crea usuarios con rol USER. Solo un ADMIN puede crear otros ADMIN (`POST /api/users`).
- **Separador del CSV**: coma (RFC 4180). En un Excel con configuración regional en español puede ser necesario usar *Datos → Desde texto/CSV*. Si se prefiere `;`, es una constante (`CSV_SEPARATOR`).
- **El rol vive en el JWT**: no se consulta la BD en cada request, así que un cambio de rol se aplica cuando el token expira (1 h por defecto).

## 10. Testing

```bash
cd backend && npm run test:cov
cd frontend && npm run test:cov
```

Ambos proyectos tienen el umbral de **80%** (líneas, ramas, funciones y sentencias) configurado para que la ejecución falle si la cobertura baja.

| Proyecto | Tests | Cobertura (líneas) | Qué se prueba |
| --- | --- | --- | --- |
| Backend | 118 | ~99% | servicios (transacciones, auditoría, diff, imagen con rollback, CSV por lotes), repositorio (where/orderBy), controladores, guards, interceptores, filtro de excepciones (P2002/P2025/P2003), utilidades, validación de env y storage con disco real |
| Frontend | 98 | ~99% | componentes (orden con prioridad, paginación, filtros con debounce, upload, formulario con zod), hooks (estado en URL, debounce), servicios axios (interceptores, 401), páginas completas con sus estados de carga, vacío y error, y rutas protegidas |

El código del backend además se validó a mano de punta a punta contra un PostgreSQL real: migraciones, seed ejecutado dos veces (idempotencia), login, filtros, orden múltiple, CSV con BOM, subida de imagen con magic bytes, límite de 2 MB, soft delete/restore, auditoría y respuestas 401/403/409.

## 11. Pendientes y cómo los implementaría

- **Imágenes en S3**: crear `S3StorageService extends StorageService` con `@aws-sdk/client-s3` (`PutObject` y `DeleteObject`) y registrarlo en `StorageModule` según una variable `STORAGE_DRIVER`. Ningún servicio de dominio cambia. Para archivos grandes convendría usar URLs prefirmadas, para que el cliente suba directo a S3, y CloudFront delante del bucket.
- **Refresh tokens en cookie httpOnly**: hoy el access token se guarda en `localStorage` (simple, pero expuesto a XSS). Lo cambiaría por un access token corto (5–15 min) en memoria y un refresh token en una cookie `httpOnly; Secure; SameSite=Strict` con path `/api/auth/refresh`. El refresh token iría hasheado en una tabla `refresh_tokens`, con rotación en cada uso y revocación si se detecta reutilización. El interceptor de axios, ante un 401, llamaría una sola vez a `/auth/refresh` (con una cola para los requests concurrentes) antes de cerrar sesión.
- **CI/CD**: ya hay un workflow en `.github/workflows/ci.yml` que corre typecheck, tests con umbral de cobertura y build de ambos proyectos, más el build de las imágenes Docker. Como siguiente paso agregaría: ESLint en el pipeline, tests e2e (Supertest contra un Postgres de servicio y Playwright para los flujos de UI), escaneo de dependencias e imágenes (Dependabot y Trivy), y publicación de imágenes en un registry con despliegue por ambiente.
- **Tests e2e del backend** con `@nestjs/testing` y Supertest sobre una base efímera (Testcontainers), para cubrir la integración real de guards, pipes y Prisma.
- **Observabilidad**: logs JSON estructurados (pino) con un *request id* propagado, métricas Prometheus y trazas OpenTelemetry.
- **Búsqueda**: con un volumen alto, pasaría a `similarity()` de `pg_trgm` para ordenar por relevancia, o a full-text search con `tsvector` y diccionario `spanish`.
- **Consistencia de `is_available`**: si en el futuro el stock se modifica desde otros sistemas, movería la derivación a una columna generada (`GENERATED ALWAYS AS (stock > 0) STORED`) o a un trigger.
