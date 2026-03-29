export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginUsersFile {
  users: Record<string, LoginCredentials>;
}

export interface LoginExpectedFile {
  errors: Record<string, string>;
  labels: Record<string, string>;
}
