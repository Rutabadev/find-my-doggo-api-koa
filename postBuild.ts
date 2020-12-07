import packageJson from './package.json';
import { readFileSync, writeFileSync } from 'fs';

const filePath = './dist/controller/general.js';
const updatedFile = readFileSync(filePath, 'utf-8').replace(
   'CURRENT_VERSION',
   packageJson.version
);
writeFileSync(filePath, updatedFile);
