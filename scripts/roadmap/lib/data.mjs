import fs from 'node:fs';
import path from 'node:path';

function loadJson(dataDir, fileName) {
  const jsonPath = path.join(dataDir, fileName);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(
      `Missing ${jsonPath}. Create it from ${path.join(dataDir, fileName.replace('.json', '.example.json'))}.`
    );
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${jsonPath}: ${error.message}`);
  }
}

export function loadRoadmapData(scriptDir) {
  const dataDir = path.join(scriptDir, 'data');
  const sprints = loadJson(dataDir, 'sprints.json');
  const tasks = loadJson(dataDir, 'tasks.json');

  return { sprints, tasks };
}

export function issueTitleFromTask(task) {
  return `Task ${task.number}: ${task.title}`;
}

export function taskBody(task) {
  const lines = [
    `Sprint: ${task.sprint}`,
    `Task: ${task.number}`,
  ];

  if (task.description) {
    lines.push('', task.description);
  }

  return lines.join('\n');
}
