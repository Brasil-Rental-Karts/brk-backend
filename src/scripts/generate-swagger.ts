import fs from 'fs';
import path from 'path';
import { specs } from '../config/swagger.config';

// Create the output directory if it doesn't exist
const outputDir = path.join(process.cwd(), 'swagger');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Write the swagger specs to a file
const outputPath = path.join(outputDir, 'swagger.json');
fs.writeFileSync(outputPath, JSON.stringify(specs, null, 2));

console.log(`Swagger documentation generated at ${outputPath}`); 