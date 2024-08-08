const {
    DATABASE_URL,
    SUPABASE_SERVICE_API_KEY
} = process.env;

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(DATABASE_URL, SUPABASE_SERVICE_API_KEY);

let { data: id, create_at, base_currency, generate_time } = await supabase
    .from('currency')
    .select('*')
exports.handler = async function(event, context) {
    
    // const { data, error } = await supabase
    //     .from('notes')
    //     .insert([
    //         { note: 'I need to not forget this' },
    //     ]);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: data })
  };
};
