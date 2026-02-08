const Finnhub_URL = "https://finnhub.io/api/v1";
const AlphaV_URL = "https://www.alphavantage.co/query";

export const fetchFinnhubQuote = async (symbol) => {
  const response = await fetch(`${Finnhub_URL}/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`);
  if (!response.ok) throw new Error("Finnhub API error");
  return response.json();
};

export const fetchAlphaVData = async (symbol, functionType) => {
  const response = await fetch(`${AlphaV_URL}?function=${functionType}&symbol=${symbol}&apikey=${process.env.ALPHAV_API_KEY}`);
  if (!response.ok) throw new Error("Alpha Vantage API error");
  return response.json();
};