const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Читаем аргументы
const requestFile = process.argv[2];
const outputZip = process.argv[3];

// Создаем директорию для dist если нет
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Читаем запрос
const requestData = JSON.parse(fs.readFileSync(requestFile, 'utf8'));
const requestedGraphs = requestData.requestedGraphs;

console.log(`Processing request for graphs: ${requestedGraphs.join(', ')}`);

// Создаем zip архив
const output = fs.createWriteStream(outputZip);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`✅ Created zip with ${archive.pointer()} bytes`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Добавляем запрошенные графы в zip
let addedCount = 0;
requestedGraphs.forEach(graphId => {
  const graphPath = path.join('data', `graph_${graphId}.json`);
  
  if (fs.existsSync(graphPath)) {
    // Читаем и валидируем граф
    const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    
    // Применяем фильтры если есть
    if (applyFilters(graphData, requestData.filters)) {
      archive.file(graphPath, { name: `graph_${graphId}.json` });
      addedCount++;
      console.log(`✅ Added graph_${graphId}.json (${graphData.vertices} vertices, ${graphData.edges} edges)`);
    } else {
      console.log(`⏭️  Skipped graph_${graphId}.json - doesn't match filters`);
    }
  } else {
    console.warn(`❌ Graph graph_${graphId}.json not found in data/ directory`);
  }
});

// Добавляем метаданные
const metadata = {
  requestId: path.basename(requestFile, '.json'),
  clientId: requestData.clientId,
  processedAt: new Date().toISOString(),
  totalRequested: requestedGraphs.length,
  totalAdded: addedCount,
  filters: requestData.filters || {}
};

archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

// Добавляем сам запрос для отслеживания
archive.file(requestFile, { name: 'original_request.json' });

archive.finalize();

// Функция применения фильтров
function applyFilters(graph, filters) {
  if (!filters) return true;
  
  // Фильтр по размеру
  if (filters.size && graph.size !== filters.size) {
    return false;
  }
  
  // Фильтр по свойствам
  if (filters.properties) {
    for (const [key, value] of Object.entries(filters.properties)) {
      if (graph.properties[key] !== value) {
        return false;
      }
    }
  }
  
  // Фильтр по количеству вершин
  if (filters.minVertices && graph.vertices < filters.minVertices) {
    return false;
  }
  if (filters.maxVertices && graph.vertices > filters.maxVertices) {
    return false;
  }
  
  return true;
}
