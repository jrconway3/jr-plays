import { loadRoadmapConfig } from './env.mjs';
import { loadRoadmapData, issueTitleFromTask, taskBody } from './data.mjs';
import { createGithubClient } from './github.mjs';

export async function syncRoadmap(scriptDir) {
  const config = loadRoadmapConfig(scriptDir);
  const github = createGithubClient(config);
  const { sprints, tasks } = loadRoadmapData(scriptDir);

  console.log(`Preparing roadmap for ${config.owner}/${config.repo}`);

  const milestones = await github.restGet('/milestones?state=all&per_page=100');
  const milestonesByTitle = new Map(milestones.map((milestone) => [milestone.title, milestone]));
  const sprintMilestoneNumbers = new Map();

  console.log('Syncing milestones...');
  for (const sprint of sprints) {
    const existing = milestonesByTitle.get(sprint.title);
    if (existing) {
      sprintMilestoneNumbers.set(sprint.number, existing.number);
      console.log(`  Milestone already exists: ${sprint.title}`);
      continue;
    }

    const created = await github.restPost('/milestones', {
      title: sprint.title,
      description: sprint.description ?? '',
      state: 'open',
    });

    sprintMilestoneNumbers.set(sprint.number, created.number);
    console.log(`  Created milestone: ${sprint.title}`);
  }

  const issues = await github.restGet('/issues?state=all&per_page=100');
  const issuesByTitle = new Map(
    issues
      .filter((issue) => !Object.prototype.hasOwnProperty.call(issue, 'pull_request'))
      .map((issue) => [issue.title, issue])
  );

  const roadmapIssues = [];
  let createdCount = 0;
  let existingCount = 0;

  console.log('Syncing issues...');
  for (const task of tasks) {
    const issueTitle = issueTitleFromTask(task);
    const existing = issuesByTitle.get(issueTitle);

    if (existing) {
      roadmapIssues.push(existing);
      existingCount += 1;
      console.log(`  Issue already exists: #${existing.number}`);
      continue;
    }

    const milestoneNumber = sprintMilestoneNumbers.get(task.sprint);
    if (!milestoneNumber) {
      throw new Error(`No milestone mapped for sprint ${task.sprint}`);
    }

    const created = await github.restPost('/issues', {
      title: issueTitle,
      body: taskBody(task),
      milestone: milestoneNumber,
      labels: Array.isArray(task.labels) ? task.labels : [],
    });

    roadmapIssues.push(created);
    createdCount += 1;
    console.log(`  Created issue: #${created.number}`);
  }

  console.log('Resolving project id...');
  const projectId = await github.getPersonalProjectId(config.projectNumber);  // owner bound in createGithubClient

  console.log('Adding issues to project...');
  let projectAdded = 0;
  let projectSkipped = 0;
  for (const issue of roadmapIssues) {
    const result = await github.addIssueToProject(projectId, issue.node_id, issue.number);
    projectAdded += result.added;
    projectSkipped += result.skipped;
  }

  console.log('Roadmap sync complete.');
  console.log(`  Milestones defined: ${sprints.length}`);
  console.log(`  Issues created: ${createdCount}`);
  console.log(`  Issues already existing: ${existingCount}`);
  console.log(`  Project items added: ${projectAdded}`);
  console.log(`  Project items skipped: ${projectSkipped}`);
  console.log(`  Project URL: https://github.com/users/${config.owner}/projects/${config.projectNumber}`);
}
