FROM postgres:16-alpine

ENV POSTGRES_DB=super_erp
ENV POSTGRES_USER=super_erp
ENV POSTGRES_PASSWORD=super_erp

COPY docker/db/init/001_extensions.sql /docker-entrypoint-initdb.d/001_extensions.sql
COPY supabase/migrations/002_production_schema.sql /docker-entrypoint-initdb.d/010_schema.sql
COPY supabase/seed.sql /docker-entrypoint-initdb.d/020_seed.sql
