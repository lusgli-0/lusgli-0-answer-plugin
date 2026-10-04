/**
 * 拉取并解析公开 cell 配置。后端返回 HTML/CSS/JS 内容，前端 runtime 不负责读磁盘。
 * 接口失败时返回空配置。
 */
import { overlayCss } from '../mount/overlay';
import type { PublicConfig } from '../cellConfig';

export const CONFIG_API_PATH = '/answer/api/v1/lite-runtime/config';

export async function fetchPublicConfig(): Promise<PublicConfig> {
  try {
    const response = await fetch(CONFIG_API_PATH, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error('bad response');
    }

    const body = (await response.json()) as { data: PublicConfig };
    return body.data;
  } catch {
    // Keep the runtime empty when configuration cannot be loaded.
  }
  return { shared_css: overlayCss, cells: [] };
}