const GRAPHQL_URL = 'https://api.github.com/graphql';

export function createGraphqlClient(headers) {
  async function graphqlQuery(query, variables = {}) {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    const payload = await res.json();
    if (payload.errors) {
      const errorMessages = payload.errors.map((item) => item.message).join('; ');
      throw new Error(errorMessages);
    }

    return payload.data;
  }

  async function getPersonalProjectId(owner, projectNumber) {
    const projectData = await graphqlQuery(
      `query($owner: String!, $number: Int!) {
        user(login: $owner) {
          projectV2(number: $number) {
            id
          }
        }
      }`,
      { owner, number: projectNumber }
    );

    const project = projectData?.user?.projectV2;
    if (!project?.id) {
      throw new Error(
        `Could not resolve project ${projectNumber} under personal account ${owner}`
      );
    }

    return project.id;
  }

  async function addIssueToProject(projectId, issueNodeId, issueNumber) {
    const mutation = `mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item {
          id
        }
      }
    }`;

    try {
      await graphqlQuery(mutation, { projectId, contentId: issueNodeId });
      console.log(`  Added issue #${issueNumber} to project`);
      return { added: 1, skipped: 0 };
    } catch (error) {
      if (String(error.message).toLowerCase().includes('already exists')) {
        console.log(`  Issue #${issueNumber} is already in project`);
        return { added: 0, skipped: 1 };
      }
      throw error;
    }
  }

  return { graphqlQuery, getPersonalProjectId, addIssueToProject };
}
