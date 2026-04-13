require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('order_items').select('*').limit(1);
  console.log("Order items:", data);
  if (error) console.log("Error:", error);
}
test();
