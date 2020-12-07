import packageJson from './package.json';
import { readFile, writeFile } from 'fs';
import { promisify } from 'util';
const [asyncReadFile, asyncWriteFile] = [readFile, writeFile].map(promisify);

const filesToUpdate = [
   './dist/controller/general.js',
   './dist/protectedRoutes.js',
];

Promise.all(
   filesToUpdate.map(async (file) => {
      const updatedFile = (await asyncReadFile(file, 'utf-8')).replace(
         'CURRENT_VERSION',
         packageJson.version
      );
      asyncWriteFile(file, updatedFile);
   })
);
