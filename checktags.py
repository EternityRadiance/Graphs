#!/bin/env python3

import json
import sys
from collections import defaultdict

def check_graph_properties(file_path):
    # Чтение JSON файла
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    properties = data['properties']
    edges_list = data['edges_list']
    vertices = data['vertices']
    
    # Проверка базовых свойств из JSON
    is_directed = properties['directed']
    is_weighted = properties['weighted']
    is_connected = properties['connected']
    
    # Анализ рёбер
    edges = []
    loops = 0
    multiple_edges = defaultdict(int)
    undirected_pairs = set()
    
    for edge in edges_list:
        source = edge['source']
        target = edge['target']
        
        edges.append((source, target))
        
        # Проверка на петли
        if source == target:
            loops += 1
        
        # Подсчет кратных рёбер
        edge_key = (min(source, target), max(source, target)) if not is_directed else (source, target)
        multiple_edges[edge_key] += 1
        
        # Для смешанных графов: проверяем наличие обратных рёбер
        if not is_directed:
            reverse_edge = (target, source)
            if reverse_edge in edges:
                undirected_pairs.add(tuple(sorted([source, target])))
    
    # Определение типа графа
    has_loops = loops > 0
    has_multiple_edges = any(count > 1 for count in multiple_edges.values())
    
    # Простой граф (без петель и кратных рёбер)
    is_simple = not has_loops and not has_multiple_edges
    
    # Мультиграф (кратные рёбра разрешены, петли могут быть)
    is_multi = has_multiple_edges and not has_loops
    
    # Псевдограф (петли и кратные рёбра)
    is_pseudo = has_loops or has_multiple_edges
    
    # Смешанный граф (если заявлен неориентированный, но есть направленные рёбра)
    is_mixed = False  # В данной реализации предполагаем, что граф либо направленный, либо нет
    
    # Полный граф
    is_full = check_complete_graph(vertices, edges, is_directed)
    
    # Двудольный граф
    is_bipartite = check_bipartite(vertices, edges, is_directed)
    
    # Дерево
    is_tree = check_tree(vertices, edges, is_connected, is_directed)
    
    # Пустой граф
    is_empty = len(edges_list) == 0
    
    # Планарный граф (упрощенная проверка)
    is_planar = check_planar(vertices, edges, is_directed)
    
    # Проверка соответствия заявленным свойствам
    expected_directed = properties['directed']
    expected_weighted = properties['weighted']
    expected_connected = properties['connected']
    
    # Проверяем направленность
    if expected_directed != is_directed:
        return 0
    
    # Проверяем взвешенность (в данном графе нет весов)
    if expected_weighted:
        # Если в данных нет информации о весах, но граф заявлен как взвешенный
        return 0
    
    # Проверяем связность
    if expected_connected != is_connected:
        return 0
    
    # Все проверки пройдены
    return 1

def check_complete_graph(vertices, edges, is_directed):
    """Проверка, является ли граф полным"""
    expected_edges = vertices * (vertices - 1)
    if is_directed:
        expected_edges *= 2
    
    return len(edges) == expected_edges

def check_bipartite(vertices, edges, is_directed):
    """Проверка, является ли граф двудольным"""
    if vertices == 0:
        return True
    
    # Создаем список смежности
    adj_list = defaultdict(list)
    for u, v in edges:
        adj_list[u].append(v)
        if not is_directed:
            adj_list[v].append(u)
    
    # Раскраска для проверки двудольности
    color = {}
    
    def bfs(start):
        queue = [start]
        color[start] = 0
        
        while queue:
            node = queue.pop(0)
            current_color = color[node]
            
            for neighbor in adj_list[node]:
                if neighbor not in color:
                    color[neighbor] = 1 - current_color
                    queue.append(neighbor)
                elif color[neighbor] == current_color:
                    return False
        return True
    
    # Проверяем все компоненты связности
    for node in range(1, vertices + 1):
        if node not in color:
            if not bfs(node):
                return False
    
    return True

def check_tree(vertices, edges, is_connected, is_directed):
    """Проверка, является ли граф деревом"""
    if not is_connected:
        return False
    
    # Для дерева: количество рёбер = количество вершин - 1
    expected_edges = vertices - 1
    if is_directed:
        # Для ориентированного дерева могут быть дополнительные ограничения
        pass
    
    return len(edges) == expected_edges

def check_planar(vertices, edges, is_directed):
    """Упрощенная проверка на планарность"""
    # Для малых графов используем эвристики
    if vertices <= 4:
        return True
    
    # Проверка на K5 (5 вершин, каждая соединена с каждой)
    if vertices >= 5:
        edge_count = len(edges)
        max_edges_planar = 3 * vertices - 6  # Формула для планарных графов
        return edge_count <= max_edges_planar
    
    return True

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Использование: python graph_checker.py <путь_к_json_файлу>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = check_graph_properties(file_path)
    print(result)
