export type User = {
  name: string;
  email: string;
  password: string;
};

const USERS_KEY = "users";
const SESSION_KEY = "session";

export function getUsers(): User[] {
  if (typeof window === "undefined") return [];
  const usersJson = localStorage.getItem(USERS_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
}

export function saveUser(user: User) {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function findUser(email: string): User | undefined {
  return getUsers().find((u) => u.email === email);
}

export function login(email: string, password: string): boolean {
  const user = findUser(email);
  if (user && user.password === password) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): User | null {
  if (typeof window === "undefined") return null;
  const sess = localStorage.getItem(SESSION_KEY);
  return sess ? JSON.parse(sess) : null;
}
