const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (filePath.match(/\.(ts|tsx)$/)) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function fixFirebaseImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Count how many ../ we need based on file depth
  const relativePath = path.relative(path.join(__dirname, 'web', 'app'), filePath);
  const depth = relativePath.split(path.sep).length - 1;
  const prefix = '../'.repeat(depth);

  // Replace shared/firebaseConfig with local firebase
  if (content.includes("from 'shared/firebaseConfig'")) {
    content = content.replace(/from 'shared\/firebaseConfig'/g, `from '${prefix}lib/firebase'`);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath} (depth: ${depth}, prefix: ${prefix})`);
  }
}

// Process web/app directory
const webAppDir = path.join(__dirname, 'web', 'app');
const files = getAllFiles(webAppDir);

console.log(`Processing ${files.length} files...`);
files.forEach(fixFirebaseImports);
console.log('Done!');