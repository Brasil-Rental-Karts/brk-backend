# Database Migrations

This directory contains database migrations for the karting management system.

## Migration Structure

Each migration file consists of two methods:
- `up()`: Contains the SQL commands to apply the migration
- `down()`: Contains the SQL commands to revert the migration

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
npm run migration:generate -- ./src/migrations/name-of-your-migration
```

### Create an Empty Migration

To create an empty migration file that you can fill manually:

```bash
npm run migration:create -- ./src/migrations/name-of-your-migration
```

## Testing Migrations

Before applying migrations to production, it's recommended to test them in a staging environment first:

1. Set up a staging database with a copy of the production data
2. Configure the environment to connect to the staging database
3. Run the migrations on the staging database
4. Verify that everything works as expected
5. Once verified, apply the migrations to production 