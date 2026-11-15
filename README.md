# Room Booking API

REST API do rezerwacji sal: budynki, sale, rezerwacje z kontrolą nakładania się terminów, logowanie JWT i role `USER` / `ADMIN`. Express 5, PostgreSQL, Knex, Zod.

## Uruchomienie od zera (Docker)

Wymagany jest tylko Docker z Docker Compose v2.

1. Sklonuj repozytorium:

   ```bash
   git clone https://github.com/Yume24/ztpai-lab.git
   cd ztpai-lab
   ```

2. Skopiuj przykładową konfigurację:

   ```bash
   cp .env.example .env
   ```

3. Otwórz `.env` i uzupełnij `JWT_SECRET` dowolnym ciągiem co najmniej 32 znaków. Pozostałe wartości mogą zostać bez zmian.

4. Zbuduj obraz i uruchom aplikację:

   ```bash
   docker compose up --build
   ```

Po starcie:

- Swagger UI z opisem wszystkich endpointów: <http://localhost:8000/api/docs>
- endpointy API mają prefiks `http://localhost:8000/api`, np. `POST /api/auth/login`

Kontener `api` przy starcie wykonuje migracje (`knex migrate:latest`), a startuje dopiero, gdy baza przejdzie healthcheck.

### Dane demo

```bash
docker compose exec api knex seed:run
```

| Email | Hasło | Rola |
| --- | --- | --- |
| `admin@example.com` | `admin-password-123` | ADMIN |
| `jan.kowalski@example.com`, `anna.nowak@example.com`, `piotr.wisniewski@example.com`, `katarzyna.wojcik@example.com`, `tomasz.zielinski@example.com` | `user-password-123` | USER |

Token z `POST /api/auth/login` wklej w Swagger UI w **Authorize**.

### Zatrzymanie

```bash
docker compose down      # kontenery znikają, dane bazy zostają w volume
docker compose down -v   # razem z danymi
```

## Uruchomienie bez Dockera dla API

Wymagany Node.js 26 i pnpm (wersja z pola `packageManager`). Projekt używa pnpm, a `devEngines` w `package.json` sprawia, że `npm` i `npx` kończą się błędem `EBADDEVENGINES`.

```bash
pnpm install
docker compose up -d db
pnpm exec knex migrate:latest
pnpm exec knex seed:run
pnpm start
```

## Testy

```bash
pnpm test                    # unit + integration
pnpm run test:unit           # bez bazy danych
pnpm run test:integration    # wymaga PostgreSQL
```

Testy integracyjne działają na osobnej bazie `roombooking_test` i czyszczą ją przed każdym testem. Baza jest tworzona skryptem z `docker/postgres-init` przy pierwszym uruchomieniu kontenera `db` na pustym volume. Na wcześniej utworzonym volume trzeba ją założyć raz ręcznie:

```bash
docker compose exec db createdb -U roombooking roombooking_test
```

Inny adres bazy testowej można podać w zmiennej `TEST_DATABASE_URL`. Nazwa bazy musi kończyć się na `_test`.
