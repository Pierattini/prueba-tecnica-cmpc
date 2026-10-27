# Arquitectura

## Vista general (despliegue con Docker)

```mermaid
flowchart LR
    user([Usuario / Navegador])

    subgraph frontend["frontend (nginx :8080)"]
        spa["SPA React + Vite<br/>React Router · TanStack Query · axios"]
    end

    subgraph backend["backend (NestJS :3000)"]
        api["API REST /api<br/>Swagger en /api/docs"]
        files[("/app/uploads<br/>volumen uploads")]
    end

    db[("PostgreSQL 16<br/>volumen pgdata")]

    user -->|"HTTP :8080"| spa
    spa -->|"/api/* (proxy nginx)"| api
    spa -->|"/uploads/* (proxy nginx)"| api
    api -->|"Prisma ORM"| db
    api -->|"StorageService (local)"| files
```

nginx sirve el build estático del frontend y hace de reverse proxy de `/api` y `/uploads`. Así el navegador ve un solo origen: no hay CORS en producción y el JWT viaja en el header `Authorization`.

## Módulos del backend

```mermaid
flowchart TB
    subgraph core["Transversal (global)"]
        guards["Guards: Throttler → JwtAuth (@Public) → Roles"]
        interceptors["Interceptors: Logging · Transform {success,data,meta}"]
        filter["AllExceptionsFilter (Prisma P2002/P2025/P2003)"]
        pipe["ValidationPipe (class-validator)"]
        config["ConfigModule + validación de env"]
    end

    auth["AuthModule<br/>login · register · me<br/>passport-jwt + bcryptjs"]
    users["UsersModule"]
    books["BooksModule<br/>CRUD · export CSV · imagen · soft delete"]
    catalog["CatalogModule<br/>autores · editoriales · géneros"]
    audit["AuditModule<br/>audit_logs"]
    storage["StorageModule<br/>StorageService (abstracto)<br/>→ LocalStorageService"]
    health["HealthModule"]
    prisma["PrismaModule (global)"]

    auth --> users
    books --> audit
    books --> storage
    books --> repo["BooksRepository (abstracto)<br/>→ PrismaBooksRepository"]
    repo --> prisma
    users --> prisma
    catalog --> prisma
    audit --> prisma
    health --> prisma
```

## Flujo de una escritura (ej. `PATCH /api/books/:id`)

```mermaid
sequenceDiagram
    participant C as Cliente
    participant G as Guards
    participant V as ValidationPipe
    participant S as BooksService
    participant R as BooksRepository
    participant A as AuditService
    participant DB as PostgreSQL

    C->>G: PATCH /api/books/:id + Bearer JWT
    G->>G: throttle · valida JWT · valida rol
    G->>V: request autenticado
    V->>S: UpdateBookDto validado
    S->>DB: BEGIN ($transaction)
    S->>R: findById(id, tx)
    R-->>S: libro actual
    S->>R: update(id, data, tx)
    S->>A: record(tx, diff de campos)
    S->>DB: COMMIT
    S-->>C: { success: true, data: libro }
```

Si cualquier paso falla, la transacción hace rollback y ni el libro ni el registro de auditoría quedan escritos. El filtro global traduce el error a una respuesta uniforme.

## Frontend

```mermaid
flowchart TB
    main["main.tsx<br/>QueryClientProvider · BrowserRouter · AuthProvider"]
    app["App.tsx (rutas)"]
    protected["ProtectedRoute (sesión / rol)"]
    pages["Pages<br/>Login · Books · Detail · Create · Edit · Trash"]
    hooks["Hooks<br/>useBooks (queries/mutations)<br/>useBookSearchParams (estado en URL)<br/>useCatalog · useDebounce"]
    api["api/*<br/>axios + interceptores (token, 401 → logout)"]

    main --> app --> protected --> pages
    pages --> hooks --> api
```

- **Estado del servidor**: TanStack Query, con caché, `keepPreviousData` al paginar e invalidación tras cada mutación.
- **Estado del listado**: filtros, orden y página viven en la URL (`useSearchParams`), así que se pueden compartir y sobreviven a una recarga.
- **Formularios**: react-hook-form + zod, con validación en `onChange`.
