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

function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace all variations of relative shared imports
  const patterns = [
    /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\//g,
    /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\//g,
    /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/shared\//g,
    /from ['"]\.\.\/\.\.\/\.\.\/shared\//g,
  ];

  patterns.forEach(pattern => {
    if (pattern.test(content)) {
      content = content.replace(pattern, "from 'shared/");
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

// Process web directory
const webDir = path.join(__dirname, 'web');
const files = getAllFiles(webDir);

console.log(`Processing ${files.length} files...`);
files.forEach(fixImports);
console.log('Done!');