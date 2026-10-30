/** The Network process, shared by Home (5-step summary) and How It Works (full 7 stages). */

export const shortSteps = [
  {
    title: "Map",
    body: "We map which local businesses serve the same customers at neighboring moments.",
  },
  {
    title: "Match",
    body: "We pair you with a complementary business and explain why the fit makes sense.",
  },
  {
    title: "Package",
    body: "Together you shape one joint offer that is genuinely useful to both customer bases.",
  },
  {
    title: "Share",
    body: "Each partner shares the offer with its own customers, openly disclosed as a partnership.",
  },
  {
    title: "Measure",
    body: "Unique links and codes show what each introduction led to, so you can decide what to keep doing.",
  },
] as const;

export const stages = [
  {
    key: "map",
    title: "Map",
    summary: "Find where customers overlap.",
    weDo: "Look at the sequence of needs a customer has (before, during, and after buying from you) and identify the local businesses that serve those moments.",
    youDo: "Tell us who your customers are and what they usually need right before and right after working with you.",
  },
  {
    key: "qualify",
    title: "Qualify",
    summary: "Check that a partnership is realistic.",
    weDo: "Review applications for fit: independent and local, serving a similar customer, with the capacity to run one tracked collaboration.",
    youDo: "Be candid about your channels and the time you can give. A smaller, realistic commitment is better than an ambitious one that stalls.",
  },
  {
    key: "match",
    title: "Match",
    summary: "Pair complementary businesses.",
    weDo: "Propose a partner and write down the rationale: where your customers overlap, why the timing works, and what each side brings.",
    youDo: "Meet the proposed partner and decide together whether to go ahead. Nobody is committed until both sides agree.",
  },
  {
    key: "package",
    title: "Package",
    summary: "Create one joint offer.",
    weDo: "Draft the collaboration brief: the offer, its terms, who shares it where and when, ready-to-adapt copy, and how it will be tracked.",
    youDo: "Shape the offer with your partner and approve the brief. You always control what goes out under your name.",
  },
  {
    key: "distribute",
    title: "Distribute",
    summary: "Each partner shares with its own customers.",
    weDo: "Send reminders and keep both partners on the timeline in the brief.",
    youDo: "Share your partner's offer through channels you already use (an email, a post, a note on an invoice, a conversation at handoff), clearly disclosed as a partnership.",
  },
  {
    key: "measure",
    title: "Measure",
    summary: "Track what the introductions led to.",
    weDo: "Set up a unique referral link and offer code for each partner, and collect the counts.",
    youDo: "Record redemptions and inquiries that mention your partner. We never ask for your customer list.",
  },
  {
    key: "learn",
    title: "Learn",
    summary: "Decide what to do next.",
    weDo: "Write a short results summary: what was shared, what was redeemed, and what we would change next time.",
    youDo: "Tell us what worked and what didn't. Keep the partnership going, adjust it, or stop. Your call.",
  },
] as const;

export const briefContents = [
  { title: "The match and the rationale", body: "Who your partner is, where your customers overlap, and why the timing makes sense." },
  { title: "The joint offer", body: "What customers get, any terms or limits, and how long it runs." },
  { title: "Who shares what, where, and when", body: "Each partner's channels and a simple timeline." },
  { title: "Ready-to-adapt copy", body: "Short drafts for email, social, and in-person mentions, written for you to edit in your own voice." },
  { title: "Disclosure language", body: "A plain line that tells customers this is a partnership between two businesses." },
  { title: "Tracking setup", body: "A unique link and offer code for each partner, plus how redemptions are recorded." },
  { title: "Check-in dates", body: "When we will check in, and when the results summary will arrive." },
] as const;

export const trackingMethods = [
  { title: "Referral links", body: "A unique link for each partner, so visits and inquiries can be attributed to the business that shared them." },
  { title: "Offer codes", body: "A distinct code per partner that the redeeming business records when the offer is used." },
  { title: "Redeemed offers", body: "A simple count of offers actually used, kept by the business that honors them." },
  { title: "Inquiries", body: "Calls, emails, or form submissions that mention the partner or the offer." },
] as const;
