const fs = require('fs');
const path = require('path');

function processGraphFiles(directoryPath, outputFile) {
    const result = {};
    
    try {
        // Читаем все файлы в директории
        const files = fs.readdirSync(directoryPath);
        
        // Фильтруем только .json файлы
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        if (jsonFiles.length === 0) {
            console.log('В указанной директории не найдено .json файлов');
            return;
        }
        
        // Сортируем файлы по имени (graph_1, graph_2, graph_3, ...)
        const sortedJsonFiles = jsonFiles.sort((a, b) => {
            // Извлекаем числа из имен файлов для числовой сортировки
            const numA = parseInt(a.match(/\d+/)?.[0]) || 0;
            const numB = parseInt(b.match(/\d+/)?.[0]) || 0;
            return numA - numB;
        });
        
        console.log('Найдены файлы:', sortedJsonFiles);
        
        // Обрабатываем каждый JSON файл
        sortedJsonFiles.forEach(file => {
            try {
                const filePath = path.join(directoryPath, file);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const graphData = JSON.parse(fileContent);
                
                // Извлекаем имя файла без расширения
                const fileName = path.parse(file).name;
                
                // Собираем нужные поля
                result[fileName] = {
                    author: graphData.author || null,
                    properties: graphData.properties || {},
                    size: graphData.size || null,
                    vertices: graphData.vertices || null,
                    edges: graphData.edges || null
                };
                
                console.log(`Обработан файл: ${file}`);
                
            } catch (error) {
                console.error(`Ошибка при обработке файла ${file}:`, error.message);
            }
        });
        
        // Записываем результат в выходной файл
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        console.log(`Результат сохранен в файл: ${outputFile}`);
        console.log(`Обработано файлов: ${Object.keys(result).length}`);
        
    } catch (error) {
        console.error('Ошибка:', error.message);
    }
}

// Функция для вывода справки
function showHelp() {
    console.log(`
Использование:
  node ${path.basename(__filename)} <директория> <выходной_файл>

Аргументы:
  директория     - путь к директории с JSON файлами
  выходной_файл - путь для сохранения результата

Пример:
  node ${path.basename(__filename)} ./graphs ./result.json
    `);
}

// Обработка аргументов командной строки
function main() {
    const args = process.argv.slice(2);
    
    // Проверяем количество аргументов
    if (args.length !== 2) {
        console.error('Ошибка: Необходимо указать два аргумента - директорию и выходной файл');
        showHelp();
        process.exit(1);
    }
    
    const directoryPath = args[0];
    const outputFile = args[1];
    
    // Проверяем существование директории
    if (!fs.existsSync(directoryPath)) {
        console.error(`Ошибка: Директория '${directoryPath}' не существует`);
        process.exit(1);
    }
    
    // Проверяем, что это действительно директория
    if (!fs.statSync(directoryPath).isDirectory()) {
        console.error(`Ошибка: '${directoryPath}' не является директорией`);
        process.exit(1);
    }
    
    console.log(`Обработка файлов из: ${directoryPath}`);
    console.log(`Результат будет сохранен в: ${outputFile}`);
    
    // Запускаем обработку
    processGraphFiles(directoryPath, outputFile);
}

// Запускаем основную функцию
main();
