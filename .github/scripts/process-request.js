const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Читаем аргументы
const requestFile = process.argv[2];
const outputZip = process.argv[3];

// Читаем запрос
const request = JSON.parse(fs.readFileSync(requestFile, 'utf8'));

// Создаем zip архив
const output = fs.createWriteStream(outputZip);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Created zip with ${archive.pointer()} total bytes`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Добавляем запрошенные графы в zip
request.requestedGraphs.forEach(graphName => {
  const graphPath = path.join('data', graphName);
  if (fs.existsSync(graphPath)) {
    archive.file(graphPath, { name: graphName });
    console.log(`Added ${graphName} to bundle`);
  } else {
    console.warn(`Graph ${graphName} not found`);
  }
});

// Добавляем метаданные
archive.append(JSON.stringify({
  requestId: path.basename(requestFile, '.json'),
  processedAt: new Date().toISOString(),
  totalGraphs: request.requestedGraphs.length
}, null, 2), { name: 'metadata.json' });

archive.finalize();
