// OpenRouter provider routing for the Xiaomi mimo models. Novita runs its own
// content filter and answers some ordinary detrans conversations with the
// plain-text reply "The request was rejected because it was considered high
// risk" (returned as content, not an error, so it lands in transcripts).
// Replaying 46 prod turns that hit it: Novita rejected 2/32 runs, every other
// provider (Xiaomi, Makora, Venice, Io Net) 0/229.
export const openRouterProvider = { ignore: ["Novita"] };
