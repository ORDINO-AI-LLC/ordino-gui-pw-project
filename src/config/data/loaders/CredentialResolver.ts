import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataLoader } from './DataLoader';
import { LoginCredentials, LoginUsersFile } from '../interfaces';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

/**
 * Resolves user credentials from JSON with optional .env override for admin.
 *
 * Strategy:
 *   1. Load all users from src/data/json/login/users.json (single source of truth)
 *   2. For 'admin' key only: override with .env values if ADMIN_USERNAME + ADMIN_PASSWORD are set
 *      This allows CI/CD to inject real credentials via environment variables
 *      while testers use the JSON defaults locally.
 */
export class CredentialResolver {
  private static users: Record<string, LoginCredentials> | null = null;

  private static loadUsers(): Record<string, LoginCredentials> {
    if (this.users) return this.users;

    const file = DataLoader.load<LoginUsersFile>('login/users');
    this.users = { ...file.users };

    // .env overrides for admin credentials (CI/CD support)
    if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
      this.users['admin'] = {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      };
    }

    return this.users;
  }

  /** Get credentials by user key. Throws if key not found. */
  static getUser(key: string): LoginCredentials {
    const users = this.loadUsers();
    const user = users[key];
    if (!user) {
      throw new Error(
        `Unknown user key: "${key}". ` +
        `Available keys: ${Object.keys(users).join(', ')}. ` +
        `Add the user to src/data/json/login/users.json`
      );
    }
    return user;
  }

  /** Get all users — for data-driven parameterized tests. */
  static getAllUsers(): Record<string, LoginCredentials> {
    return { ...this.loadUsers() };
  }
}
