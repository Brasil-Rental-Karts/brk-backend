# Database Migrations

## Migration Strategy

This project uses TypeORM for database migrations. Initially, we had multiple migration files, but as the application was still in development (not in production), we decided to consolidate all migrations into a single unified migration file for simplicity.

## Migration Files

- `1000000000000-UnifiedMigration.ts` - The unified migration file that contains all database setup required for the application.
- `1748500000000-RemoveClubAddChampionship.ts` - Migration that removes the Clubs table and adds the Championships table.

## Running Migrations

### Development

In development, migrations can be run manually:

```bash
# Run migrations
npm run migration:run

# Revert migrations
npm run migration:revert
```

### Production

In production, migrations run automatically on application startup if the `migrationsRun` option is set to `true` in the database configuration.

## Creating New Migrations

Since the app is still in development, if new database changes are needed:

1. Option 1 (Preferred): Modify the existing unified migration file directly.
2. Option 2: Generate a new migration file for significant changes:

```bash
# Generate a new migration
npm run migration:generate -- -n YourMigrationName
```

## Notes

- The unified migration includes:
  - Creation of the Users table
  - Manager role in the role enum
  - Database notification events functionality
- The RemoveClubAddChampionship migration:
  - Removes the deprecated Clubs table
  - Creates the Championships table with all required fields
  - Sets up proper foreign key relationships and triggers 