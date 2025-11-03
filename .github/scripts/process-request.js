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
const filters = requestData.filters || {};
const limit = requestData.limit || 50;
const sortBy = requestData.sortBy || 'random';

console.log(`🔍 Searching graphs in data/ with filters:`, filters);

// Создаем zip архив
const output = fs.createWriteStream(outputZip);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`✅ Created zip with ${archive.pointer()} bytes, ${addedCount} graphs`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Ищем все файлы графов в data/
let matchedGraphs = [];
const dataDir = 'data';

if (!fs.existsSync(dataDir)) {
  console.error(`❌ Directory ${dataDir} not found!`);
  process.exit(1);
}

const files = fs.readdirSync(dataDir);
console.log(`📁 Found ${files.length} files in data/ directory`);

// Проходим по всем файлам и применяем фильтры
files.forEach(filename => {
  if (!filename.startsWith('graph_') || !filename.endsWith('.json')) {
    return;
  }

  try {
    const graphPath = path.join(dataDir, filename);
    const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    
    // Применяем фильтры
    if (matchesFilters(graphData, filters)) {
      matchedGraphs.push({
        filename: filename,
        path: graphPath,
        data: graphData,
        id: filename.replace('graph_', '').replace('.json', '')
      });
    }
  } catch (error) {
    console.warn(`⚠️  Error reading ${filename}:`, error.message);
  }
});

console.log(`📊 Found ${matchedGraphs.length} graphs matching filters`);

// Сортируем результаты
if (sortBy === 'vertices') {
  matchedGraphs.sort((a, b) => a.data.vertices - b.data.vertices);
} else if (sortBy === 'edges') {
  matchedGraphs.sort((a, b) => a.data.edges - b.data.edges);
} else if (sortBy === 'random') {
  matchedGraphs.sort(() => Math.random() - 0.5);
}

// Ограничиваем количество
if (limit > 0 && matchedGraphs.length > limit) {
  matchedGraphs = matchedGraphs.slice(0, limit);
  console.log(`📦 Limited to ${limit} graphs`);
}

// Добавляем подходящие графы в zip
let addedCount = 0;
matchedGraphs.forEach(graph => {
  archive.file(graph.path, { name: graph.filename });
  addedCount++;
  console.log(`✅ Added ${graph.filename} (v:${graph.data.vertices}, e:${graph.data.edges}, ${graph.data.size})`);
});

// Добавляем метаданные
const metadata = {
  requestId: path.basename(requestFile, '.json'),
  clientId: requestData.clientId,
  processedAt: new Date().toISOString(),
  totalFound: matchedGraphs.length,
  totalAdded: addedCount,
  filters: filters,
  searchSummary: {
    scannedFiles: files.length,
    matchedGraphs: matchedGraphs.length,
    limit: limit,
    sortBy: sortBy
  }
};

archive.append(JSON.stringify(metadata, null, 2), { name: 'search-metadata.json' });

// Добавляем сам запрос для отслеживания
archive.file(requestFile, { name: 'original-request.json' });

// Добавляем краткий отчет в текстовом формате
const report = `
GRAPH SEARCH REPORT
===================
Request: ${path.basename(requestFile, '.json')}
Processed: ${new Date().toISOString()}
Scanned files: ${files.length}
Matched graphs: ${matchedGraphs.length}
Added to bundle: ${addedCount}

FILTERS:
- Size: ${filters.size || 'any'}
- Directed: ${filters.properties?.directed || 'any'}
- Weighted: ${filters.properties?.weighted || 'any'} 
- Connected: ${filters.properties?.connected || 'any'}
- Vertices: ${filters.minVertices || 'any'} to ${filters.maxVertices || 'any'}
- Edges: ${filters.minEdges || 'any'} to ${filters.maxEdges || 'any'}

MATCHED GRAPHS:
${matchedGraphs.map(g => `- ${g.filename} (v:${g.data.vertices}, e:${g.data.edges})`).join('\n')}
`;

archive.append(report, { name: 'search-report.txt' });

archive.finalize();

// Функция проверки соответствия фильтрам
function matchesFilters(graph, filters) {
  if (!filters) return true;
  
  // Фильтр по размеру
  if (filters.size && graph.size !== filters.size) {
    return false;
  }
  
  // Фильтр по свойствам графа
  if (filters.properties) {
    for (const [key, value] of Object.entries(filters.properties)) {
      if (value !== undefined && graph.properties[key] !== value) {
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
  
  // Фильтр по количеству ребер
  if (filters.minEdges && graph.edges < filters.minEdges) {
    return false;
  }
  if (filters.maxEdges && graph.edges > filters.maxEdges) {
    return false;
  }
  
  return true;
}
