import { env } from '../config/env.js';
import { logger } from './logger.js';
import { toRgbPixels } from './images.js';

const INPUT_SIZE = 224;
const UNSAFE_CLASSES = new Set(['Porn', 'Hentai']);

export const NSFW_THRESHOLDS = Object.freeze({ REJECT: 0.7, BLUR: 0.4 });

let modelPromise;

async function loadModel() {
  const [tf, nsfwjs] = await Promise.all([import('@tensorflow/tfjs'), import('nsfwjs')]);
  const model = await nsfwjs.load('MobileNetV2');
  logger.info('Model NSFW dimuat');
  return { tf, model };
}

export function nsfwVerdict(score) {
  if (score === null) return 'ALLOW';
  if (score > NSFW_THRESHOLDS.REJECT) return 'REJECT';
  if (score >= NSFW_THRESHOLDS.BLUR) return 'BLUR';
  return 'ALLOW';
}

export async function scoreImage(buffer) {
  if (!env.NSFW_ENABLED) return null;
  modelPromise ??= loadModel();
  const { tf, model } = await modelPromise;
  const { data, width, height } = await toRgbPixels(buffer, INPUT_SIZE);
  const input = tf.tensor3d(new Uint8Array(data), [height, width, 3], 'int32');
  try {
    const predictions = await model.classify(input);
    return predictions
      .filter((prediction) => UNSAFE_CLASSES.has(prediction.className))
      .reduce((sum, prediction) => sum + prediction.probability, 0);
  } finally {
    input.dispose();
  }
}
