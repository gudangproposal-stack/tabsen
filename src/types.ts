export type UserRole = 'admin' | 'karyawan';
export type UserStatus = 'invited' | 'active';
export type SubscriptionPlan = 'starter' | 'pro' | 'trial';
export type SubscriptionStatus = 'trialing' | 'active' | 'expired';
export type AttendanceStatus = 'hadir' | 'terlambat' | 'luar_lokasi' | 'absen';

export interface Company {
  id: string;
  name: string;
  address: string;
  logo_url: string;
  lat: number;
  long: number;
  radius_meter: number;
  jam_masuk: string; // e.g., "08:00"
  jam_keluar: string; // e.g., "17:00"
  toleransi_menit: number; // default: 15
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string;
}

export interface User {
  id: string;
  company_id: string;
  role: UserRole;
  nama: string;
  email: string;
  nomor_hp: string;
  password_hash: string;
  jabatan: string;
  departemen: string;
  foto_wajah_url: string; // reference selfie
  status: UserStatus;
}

export interface Invite {
  id: string;
  company_id: string;
  user_id: string;
  token: string;
  expired_at: string;
  status: 'sent' | 'opened' | 'completed';
}

export interface Attendance {
  id: string;
  user_id: string;
  company_id: string;
  tanggal: string; // "YYYY-MM-DD"
  jam_clock_in: string | null; // "HH:MM:SS" or null
  jam_clock_out: string | null; // "HH:MM:SS" or null
  lat_in: number | null;
  long_in: number | null;
  lat_out: number | null;
  long_out: number | null;
  status: AttendanceStatus | null; // overall status (typically in-status)
  selfie_in_url: string | null; // base64 or storage url
  selfie_out_url: string | null;
  notified_outside_in?: boolean;
  notified_outside_out?: boolean;
}

export interface Transaction {
  id: string;
  company_id: string;
  order_id: string;
  plan_id: string; // 'starter_monthly' | 'starter_yearly' | 'pro_monthly' | 'pro_yearly'
  billing_cycle: 'monthly' | 'yearly';
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  created_at: string;
}
