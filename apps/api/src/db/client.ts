import supabase from '../middleware/supabaseAuth';

export async function insertTransaction(tx: {
  user_id: string;
  recipient_number: string;
  network: string;
  type: string;
  bundle_id?: string | null;
  amount_ghs: number;
  payment_method?: string | null;
  payment_ref?: string | null;
}) {
  const { data, error } = await supabase.from('transactions').insert([tx]).select().single();
  if (error) throw error;
  return data;
}

export async function getTransactionsByUser(userId: string, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data;
}

export async function getTransactionById(id: string) {
  const { data, error } = await supabase.from('transactions').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateTransaction(id: string, patch: Record<string, any>) {
  const { data, error } = await supabase.from('transactions').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
