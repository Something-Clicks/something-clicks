import { liveVocabulary } from "@/lib/network/vocabulary";

/** Category names and synonyms for the "What you do" type-ahead, including ones added in admin. Public data. */
export async function GET() {
  const vocab = await liveVocabulary();
  return Response.json(vocab, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } });
}
