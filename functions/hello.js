require('dotenv').config();
const {
    SUPABASE_URL,
    SUPABASE_ANON_KEY
} = process.env;

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async function(event, context) {
    let { data, error } = await supabase
        .from('currency')
        .select('*');

    if (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ data }),
    };
};
