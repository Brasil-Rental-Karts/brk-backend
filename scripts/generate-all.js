#!/usr/bin/env node
/**
 * This script generates CRUD code for all entities in the models directory.
 * Usage: node scripts/generate-all.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all entity files
const modelsDir = path.join(__dirname, '..', 'src', 'models');
const entityFiles = fs.readdirSync(modelsDir)
  .filter(file => file.endsWith('.entity.ts') && file !== 'base.entity.ts');

// Get existing controllers to avoid duplicating
const controllersDir = path.join(__dirname, '..', 'src', 'controllers');
const existingControllers = fs.readdirSync(controllersDir)
  .filter(file => file.endsWith('.controller.ts'))
  .map(file => file.replace('.controller.ts', ''));

// Process each entity
for (const entityFile of entityFiles) {
  // Extract entity name
  const entityName = entityFile.replace('.entity.ts', '');
  
  // Skip already processed entities
  if (existingControllers.includes(entityName)) {
    console.log(`Skipping ${entityName}, controller already exists.`);
    continue;
  }

  // Convert kebab case to pascal case
  let pascalCase = entityName.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  
  // Generate the CRUD code
  console.log(`Generating CRUD code for ${pascalCase}...`);
  try {
    execSync(`node scripts/generate-crud.js ${pascalCase}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error generating CRUD for ${pascalCase}:`, error.message);
  }
}

console.log('\nAll CRUD code generated. Remember to update index.ts to register new controllers.'); 