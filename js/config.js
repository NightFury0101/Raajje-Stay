/* Raajje Stay configuration.
   Leave supabaseUrl empty to run in demo mode (everything saved in this browser).
   To go live, create a Supabase project, run supabase/schema.sql and supabase/seed.sql,
   then paste the project URL and anon (public) key below. The anon key is safe to publish;
   the database rules in schema.sql decide what each user can read and change. */
window.RS_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  // Where BML sends guests back after card payment. Must match your GitHub Pages address.
  siteUrl: ''
};
