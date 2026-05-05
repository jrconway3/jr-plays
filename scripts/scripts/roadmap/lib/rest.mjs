export function createRestClient(apiBase, headers) {
  async function restGet(apiPath) {
    const res = await fetch(`${apiBase}${apiPath}`, { headers });
    if (!res.ok) {
      throw new Error(`GET ${apiPath}: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async function restPost(apiPath, body) {
    const res = await fetch(`${apiBase}${apiPath}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`POST ${apiPath}: ${res.status} ${res.statusText}\n${errorBody}`);
    }

    return res.json();
  }

  return { restGet, restPost };
}
