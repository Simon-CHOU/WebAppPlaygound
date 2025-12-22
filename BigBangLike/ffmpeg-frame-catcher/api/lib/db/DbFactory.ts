import { DbAdapter } from './DbAdapter';
import { SupabaseAdapter } from './SupabaseAdapter';
import { LocalPgAdapter } from './LocalPgAdapter';

export type DataSource = 'supabase' | 'local';

export class DbFactory {
  private static supabaseAdapter = new SupabaseAdapter();
  private static localPgAdapter = new LocalPgAdapter();

  static getAdapter(source: DataSource = 'supabase'): DbAdapter {
    if (source === 'local') {
      return this.localPgAdapter;
    }
    return this.supabaseAdapter;
  }
}
