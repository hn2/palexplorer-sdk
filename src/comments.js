export class CommentsAPI {
  constructor(client) { this.client = client; }

  async list(shareId) {
    return this.client.fetchLocal(`/api/shares/${encodeURIComponent(shareId)}/comments`);
  }

  async add(shareId, text) {
    return this.client.fetchLocal(`/api/shares/${encodeURIComponent(shareId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async delete(shareId, commentId) {
    return this.client.fetchLocal(`/api/shares/${encodeURIComponent(shareId)}/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
    });
  }
}
