export class AiAPI {
  constructor(client) { this.client = client; }

  async overview() {
    return this.client.fetchLocal('/api/ai/overview');
  }

  async listGrants({ all = false } = {}) {
    const { grants } = await this.client.fetchLocal(`/api/ai/context${all ? '?all=true' : ''}`);
    return grants;
  }

  async revokeGrant(grantId) {
    return this.client.fetchLocal(`/api/ai/context/${encodeURIComponent(grantId)}`, { method: 'DELETE' });
  }

  async revokeAllGrants() {
    return this.client.fetchLocal('/api/ai/context', { method: 'DELETE' });
  }

  async listMemories({ all = false } = {}) {
    const { memories } = await this.client.fetchLocal(`/api/ai/memory${all ? '?all=true' : ''}`);
    return memories;
  }

  async forgetMemory(memoryId) {
    return this.client.fetchLocal(`/api/ai/memory/${encodeURIComponent(memoryId)}`, { method: 'DELETE' });
  }

  async getPolicy() {
    return this.client.fetchLocal('/api/ai/policy');
  }

  async setPolicy({ cloudOptOut, localFallback, embeddingPolicy } = {}) {
    const body = {};
    if (cloudOptOut !== undefined) body.cloudOptOut = cloudOptOut;
    if (localFallback !== undefined) body.localFallback = localFallback;
    if (embeddingPolicy !== undefined) body.embeddingPolicy = embeddingPolicy;
    return this.client.fetchLocal('/api/ai/policy', { method: 'POST', body: JSON.stringify(body) });
  }
}
