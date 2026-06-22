import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Company, User, Invite, Attendance, Transaction } from './types';

const DB_PATH = path.join(process.cwd(), 'database.json');

interface Schema {
  companies: Company[];
  users: User[];
  invites: Invite[];
  attendances: Attendance[];
  transactions: Transaction[];
}

const DEFAULT_STATE: Schema = {
  companies: [],
  users: [],
  invites: [],
  attendances: [],
  transactions: [],
};

// Robust helper to read database state synchronously
function readDb(): Schema {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_STATE, null, 2), 'utf-8');
      return DEFAULT_STATE;
    }
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content) as Schema;
  } catch (error) {
    console.error('Error reading JSON database, resetting state', error);
    return DEFAULT_STATE;
  }
}

// Robust helper to write database state safely & atomically
function writeDb(data: Schema) {
  try {
    const tempPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
  } catch (error) {
    console.error('Error writing JSON database', error);
  }
}

// Password Hashing Helper using native node crypto
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_hadir_salt_123!').digest('hex');
}

// Generate secure simple tokens
export function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

export const db = {
  // Companies
  getCompanies: (): Company[] => readDb().companies,
  getCompany: (id: string): Company | undefined => 
    readDb().companies.find(c => c.id === id),
  saveCompany: (company: Company) => {
    const store = readDb();
    const idx = store.companies.findIndex(c => c.id === company.id);
    if (idx >= 0) {
      store.companies[idx] = company;
    } else {
      store.companies.push(company);
    }
    writeDb(store);
  },

  // Users
  getUsers: (): User[] => readDb().users,
  getUser: (id: string): User | undefined => 
    readDb().users.find(u => u.id === id),
  getUserByEmail: (email: string): User | undefined => 
    readDb().users.find(u => u.email.toLowerCase() === email.toLowerCase()),
  saveUser: (user: User) => {
    const store = readDb();
    const idx = store.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      store.users[idx] = user;
    } else {
      store.users.push(user);
    }
    writeDb(store);
  },

  // Invites
  getInvites: (): Invite[] => readDb().invites,
  getInviteByToken: (token: string): Invite | undefined => 
    readDb().invites.find(i => i.token === token),
  saveInvite: (invite: Invite) => {
    const store = readDb();
    const idx = store.invites.findIndex(i => i.id === invite.id);
    if (idx >= 0) {
      store.invites[idx] = invite;
    } else {
      store.invites.push(invite);
    }
    writeDb(store);
  },

  // Attendances
  getAttendances: (): Attendance[] => readDb().attendances,
  saveAttendance: (attendance: Attendance) => {
    const store = readDb();
    const idx = store.attendances.findIndex(a => a.id === attendance.id);
    if (idx >= 0) {
      store.attendances[idx] = attendance;
    } else {
      store.attendances.push(attendance);
    }
    writeDb(store);
  },

  // Transactions
  getTransactions: (): Transaction[] => readDb().transactions,
  getTransactionByOrderId: (orderId: string): Transaction | undefined => 
    readDb().transactions.find(t => t.order_id === orderId),
  saveTransaction: (transaction: Transaction) => {
    const store = readDb();
    const idx = store.transactions.findIndex(t => t.id === transaction.id);
    if (idx >= 0) {
      store.transactions[idx] = transaction;
    } else {
      store.transactions.push(transaction);
    }
    writeDb(store);
  },

  // Clear data (mainly for testing/resetting if needed)
  resetAll: () => {
    writeDb(DEFAULT_STATE);
  }
};
