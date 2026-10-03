import { sendData } from '../../utils/response.js';
import { checkHealth } from './health.service.js';

export async function getHealth(req, res) {
  const health = await checkHealth();
  sendData(res, health);
}
