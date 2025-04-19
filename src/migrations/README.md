# Database Migrations

This directory contains database migrations for the simplified karting management system.

## Migration Structure

Each migration file consists of two methods:
- `up()`: Contains the SQL commands to apply the migration
- `down()`: Contains the SQL commands to revert the migration

## Existing Migrations

### Simplified Schema Migration (1689087654321-SimplifiedSchema.ts)

This is the migration that creates the tables for our simplified schema:

- Users - Stores user information including roles (Member or Administrator)
- Clubs - Stores club information

The migration also creates necessary PostgreSQL extensions (uuid-ossp) and enum types.

## How to Apply Migrations in Production

1. First, ensure your `.env` file is configured with the correct production database settings:

```
DB_HOST=your-production-host
DB_PORT=5432
DB_USERNAME=your-production-username
DB_PASSWORD=your-production-password
DB_DATABASE=brk_competition
DB_SSL=true
NODE_ENV=production
```

2. Build the application:

```bash
npm run build
```

3. Run the migrations:

```bash
npm run migration:run
```

## How to Revert Migrations

If you need to revert the most recent migration:

```bash
npm run migration:revert
```

## Creating New Migrations

### Generate a New Migration

To generate a new migration based on entity changes:

```bash
npm run migration:generate -- migration-name
```

### Create an Empty Migration

To create an empty migration file that you can fill manually:

```bash
npm run typeorm -- migration:create src/migrations/migration-name
```

## Testing Migrations

Before applying migrations to production, it's recommended to test them in a staging environment first:

1. Set up a staging database with a copy of the production data
2. Configure the environment to connect to the staging database
3. Run the migrations on the staging database
4. Verify that everything works as expected
5. Once verified, apply the migrations to production 