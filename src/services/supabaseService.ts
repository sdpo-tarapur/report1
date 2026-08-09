import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserAccount, FIRCase, LandDispute, UDCase, InvestigatingOfficer, DailyCrimeReport } from '../types';

/**
 * Service to sync application state with Supabase tables.
 * If Supabase is not configured yet (e.g. env vars missing),
 * methods silently return null so local state is used safely.
 */

// --- USER ACCOUNTS ---
export async function fetchUserAccountsFromSupabase(): Promise<UserAccount[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('user_accounts').select('*');
    if (error) {
      console.error('Error fetching user accounts from Supabase:', error);
      return null;
    }
    return data as UserAccount[];
  } catch (err) {
    console.error('Supabase exception:', err);
    return null;
  }
}

export async function saveUserAccountToSupabase(account: UserAccount): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('user_accounts').upsert([account], { onConflict: 'id' });
    if (error) {
      console.error('Error saving user account to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception:', err);
    return false;
  }
}

export async function deleteUserAccountFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('user_accounts').delete().eq('id', id);
    if (error) {
      console.error('Error deleting user account from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception:', err);
    return false;
  }
}

// --- FIR CASES ---
export async function fetchFIRCasesFromSupabase(): Promise<FIRCase[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('fir_cases').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching FIR cases from Supabase:', error);
      return null;
    }
    return data as FIRCase[];
  } catch (err) {
    console.error('Supabase exception:', err);
    return null;
  }
}

export async function saveFIRCaseToSupabase(firCase: FIRCase): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('fir_cases').upsert([firCase], { onConflict: 'id' });
    if (error) {
      console.error('Error saving FIR case to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception:', err);
    return false;
  }
}

export async function deleteFIRCaseFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('fir_cases').delete().eq('id', id);
    if (error) {
      console.error('Error deleting FIR case from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception:', err);
    return false;
  }
}

// --- LAND DISPUTES ---
export async function fetchLandDisputesFromSupabase(): Promise<LandDispute[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('land_disputes').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching land disputes from Supabase:', error);
      return null;
    }
    return data as LandDispute[];
  } catch (err) {
    console.error('Supabase exception:', err);
    return null;
  }
}

export async function saveLandDisputeToSupabase(dispute: LandDispute): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('land_disputes').upsert([dispute], { onConflict: 'id' });
    if (error) {
      console.error('Error saving land dispute to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception:', err);
    return false;
  }
}

// --- UD CASES ---
export async function fetchUDCasesFromSupabase(): Promise<UDCase[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('ud_cases').select('*');
    if (error) {
      console.error('Error fetching UD cases from Supabase:', error);
      return null;
    }
    return data as UDCase[];
  } catch (err) {
    console.error('Supabase exception:', err);
    return null;
  }
}

export async function saveUDCaseToSupabase(udCase: UDCase): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('ud_cases').upsert([udCase], { onConflict: 'id' });
    if (error) {
      console.error('Error saving UD case to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase exception:', err);
    return false;
  }
}
