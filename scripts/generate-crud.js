#!/usr/bin/env node
/**
 * This script generates CRUD code for entities.
 * Usage: node scripts/generate-crud.js EntityName
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the entity name from command line arguments
const entityName = process.argv[2];
if (!entityName) {
  console.error('Please provide an entity name');
  process.exit(1);
}

// Convert entity name formats
const pascalCase = entityName.charAt(0).toUpperCase() + entityName.slice(1);
const camelCase = entityName.charAt(0).toLowerCase() + entityName.slice(1);
const kebabCase = entityName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
const pluralName = `${camelCase}s`; // Simple pluralization, enhance as needed

// Paths
const srcDir = path.join(__dirname, '..', 'src');
const dtoFilePath = path.join(srcDir, 'dtos', `${kebabCase}.dto.ts`);
const repoFilePath = path.join(srcDir, 'repositories', `${kebabCase}.repository.ts`);
const serviceFilePath = path.join(srcDir, 'services', `${kebabCase}.service.ts`);
const controllerFilePath = path.join(srcDir, 'controllers', `${kebabCase}.controller.ts`);

// Ensure directories exist
const dirs = [
  path.join(srcDir, 'dtos'),
  path.join(srcDir, 'repositories'),
  path.join(srcDir, 'services'),
  path.join(srcDir, 'controllers')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Templates
const dtoTemplate = `import { IsString, IsOptional, IsUUID, Length, IsBoolean } from 'class-validator';
import { BaseDto } from './base.dto';

export class Create${pascalCase}Dto extends BaseDto {
  @IsString()
  @Length(3, 100)
  name!: string;

  @IsString()
  @Length(3, 500)
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class Update${pascalCase}Dto extends BaseDto {
  @IsString()
  @Length(3, 100)
  @IsOptional()
  name?: string;

  @IsString()
  @Length(3, 500)
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}`;

const repositoryTemplate = `import { Repository } from 'typeorm';
import { ${pascalCase} } from '../models/${kebabCase}.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class ${pascalCase}Repository extends BaseRepositoryImpl<${pascalCase}> {
  constructor(repository: Repository<${pascalCase}>) {
    super(repository);
  }
}`;

const serviceTemplate = `import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { ${pascalCase} } from '../models/${kebabCase}.entity';
import { ${pascalCase}Repository } from '../repositories/${kebabCase}.repository';

export class ${pascalCase}Service extends BaseService<${pascalCase}> {
  constructor(private ${camelCase}Repository: ${pascalCase}Repository) {
    super(${camelCase}Repository);
  }

  async findAll(): Promise<${pascalCase}[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<${pascalCase} | null> {
    return super.findById(id);
  }

  async create(${camelCase}Data: DeepPartial<${pascalCase}>): Promise<${pascalCase}> {
    return super.create(${camelCase}Data);
  }

  async update(id: string, ${camelCase}Data: DeepPartial<${pascalCase}>): Promise<${pascalCase} | null> {
    return super.update(id, ${camelCase}Data);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}`;

const controllerTemplate = `import { BaseCrudController } from './base.crud.controller';
import { ${pascalCase} } from '../models/${kebabCase}.entity';
import { ${pascalCase}Service } from '../services/${kebabCase}.service';
import { Create${pascalCase}Dto, Update${pascalCase}Dto } from '../dtos/${kebabCase}.dto';
import { UserRole } from '../models/user.entity';

export class ${pascalCase}Controller extends BaseCrudController<${pascalCase}, Create${pascalCase}Dto, Update${pascalCase}Dto> {
  protected service: ${pascalCase}Service;
  protected createDtoClass = Create${pascalCase}Dto;
  protected updateDtoClass = Update${pascalCase}Dto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(${camelCase}Service: ${pascalCase}Service) {
    super('/${pluralName}');
    this.service = ${camelCase}Service;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}`;

// Write files
fs.writeFileSync(dtoFilePath, dtoTemplate);
fs.writeFileSync(repoFilePath, repositoryTemplate);
fs.writeFileSync(serviceFilePath, serviceTemplate);
fs.writeFileSync(controllerFilePath, controllerTemplate);

console.log(`CRUD code generated for ${pascalCase} entity.`);
console.log('Remember to update the index.ts file to register the new controller and service.'); 