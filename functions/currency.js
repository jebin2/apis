//require('dotenv').config();
const {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    CURRENCY_API_KEY
} = process.env;
const CustomError = require('./utils/CustomError');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let supportedCurrency;
function convertCurrency(amount, fromCurrency, toCurrency, rates) {
    if (fromCurrency === toCurrency) {
        return amount;
    }

    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];

    if (fromRate === undefined || toRate === undefined) {
        throw new Error(`Unsupported currency code: ${fromCurrency} or ${toCurrency}`);
    }

    const convertedAmount = amount * (toRate / fromRate);

    for (let cur in rates) {
        rates[cur] = rates[cur] / fromRate;
    }

    return convertedAmount;
}
exports.handler = async function (event, context) {
    try {
        let response = await fetch("https://openexchangerates.org/api/currencies.json");
        supportedCurrency = await response.json();
        
        const amount = event.queryStringParameters.amount ? event.queryStringParameters.amount : 1;
        const fromCurrency = event.queryStringParameters.from ? event.queryStringParameters.from.toUpperCase() : event.queryStringParameters.from;
        const toCurrency = event.queryStringParameters.to ? event.queryStringParameters.to.toUpperCase() : event.queryStringParameters.to;

        if (!supportedCurrency[fromCurrency]) {
            throw new CustomError({key: "from", message: `Unsupported currency code: ${fromCurrency}`});
        }
        
        if (!supportedCurrency[toCurrency]) {
            throw new CustomError({key: "to", message: `Unsupported currency code: ${toCurrency}`});
        }
        
        if (isNaN(amount)) {
            throw new CustomError({key: "amount", message: "Amount should be in Integer"});
        }
        
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        let { data, error } = await supabase.from('currency').select('*').gte('generated_time', startOfToday);
        if (error) {
            throw new Error(error);
        }
        if (data.length === 0) {
            response = await fetch("https://openexchangerates.org/api/latest.json?app_id=" + CURRENCY_API_KEY + "&base=USD");
            const currencyRates = await response.json();

            await supabase.from('currency').insert({ base_currency: currencyRates.base, currency_map: currencyRates.rates, generated_time: currencyRates.timestamp + '000' });
            data = currencyRates.rates;
        } else {
            data = data[0].currency_map;
        }
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow all origins (adjust as needed)
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                value: convertCurrency(amount, fromCurrency, toCurrency, data),
                rates: data 
            }),
        };
    } catch (e) {
        console.log(e);
        let details = {};
        if (e instanceof CustomError) {
            details.param_name = e.key;
        }
        return {
            statusCode: statusCode: e instanceof CustomError ? 400 : 500,,
            headers: {
                'Access-Control-Allow-Origin': '*', // Allow all origins (adjust as needed)
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "error": true,
                details: details,
                message: e.message,
                supported_currency: supportedCurrency,
                api_format: "https://jeapis.netlify.app/.netlify/functions/currency?from=USD&to=INR&amount=1"
            })
        };
    }
};
