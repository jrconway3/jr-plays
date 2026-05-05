import { createRestClient } from './rest.mjs';
import { createGraphqlClient } from './graphql.mjs';

export function createGithubClient(config) {
  const apiBase = `https://api.github.com/repos/${config.owner}/${config.repo}`;
  const headers = {
    Authorization: `Bearer ${config.token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    Accept: 'application/vnd.github+json',
  };

  const { restGet, restPost } = createRestClient(apiBase, headers);
  const { getPersonalProjectId, addIssueToProject } = createGraphqlClient(headers);

  return {
    restGet,
    restPost,
    getPersonalProjectId: (projectNumber) => getPersonalProjectId(config.owner, projectNumber),
    addIssueToProject,
  };
}
