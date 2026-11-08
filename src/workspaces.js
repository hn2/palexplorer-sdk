import { unsupported } from './unsupported.js';

export class WorkspacesAPI {
  constructor(client) { this.client = client; }

  async list() {
    unsupported('workspaces.list');
  }

  async create(name) {
    unsupported('workspaces.create');
  }

  async delete(id) {
    unsupported('workspaces.delete');
  }

  async activate(id) {
    unsupported('workspaces.activate');
  }

  async addShare(id, shareId) {
    unsupported('workspaces.addShare');
  }

  async removeShare(id, shareId) {
    unsupported('workspaces.removeShare');
  }
}
