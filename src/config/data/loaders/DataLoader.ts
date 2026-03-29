import * as fs from 'fs';
import * as path from 'path';

const JSON_ROOT = path.resolve(__dirname, '../../../data');

/**
 * Generic JSON data loader.
 * Reads a JSON file from src/data/json/ and returns typed data.
 * Uses in-memory cache to avoid re-reading files.
 */
export class DataLoader {
  private static cache = new Map<string, unknown>();

  /**
   * Load a JSON file relative to src/data/json/ and cast to T.
   * @param featurePath - e.g., 'login/users' resolves to json/login/users.json
   */
  static load<T>(featurePath: string): T {
    if (this.cache.has(featurePath)) {
      return this.cache.get(featurePath) as T;
    }

    const fullPath = path.resolve(JSON_ROOT, `${featurePath}.json`);

    if (!fs.existsSync(fullPath)) {
      throw new Error(
        `Test data file not found: ${fullPath}. ` +
        `Create the JSON file at src/data/json/${featurePath}.json`
      );
    }

    const raw = fs.readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(raw) as T;
    this.cache.set(featurePath, data);
    return data;
  }

  /** Clear cache — useful if tests modify data files at runtime. */
  static clearCache(): void {
    this.cache.clear();
  }
}
