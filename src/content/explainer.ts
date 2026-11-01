/**
 * The plain-language explanation of Something Clicks, shared by the About
 * page, the FAQ and llms.txt so they never drift apart. Copy only: prices and
 * plan contents here describe what's built, they don't control it.
 */
export const summary =
  "Something Clicks helps wedding businesses find the right partners, build referral relationships and grow their businesses together.";

export const steps = [
  {
    title: "Find partners",
    body: "Anyone can search to see how many complementary businesses (photographers, florists, venues, caterers) are nearby. Joining free shows who they are.",
  },
  { title: "Make connections", body: "Request an introduction. The other business must agree before contact details are shared." },
  { title: "Build partnerships", body: "Refer customers to each other, create shared offers, or promote each other's services." },
  { title: "Grow together", body: "Tracking links show how partnerships perform, and our team can coordinate promotions." },
] as const;

export const pricing = [
  { name: "Free account", price: "$0", body: "Claim your business, see your matches, request introductions and use tracking links." },
  {
    name: "Membership",
    price: "$149/month",
    body: "Ongoing matching and coordination from our team, a collaboration calendar, templates and a monthly performance report.",
  },
  { name: "Managed campaign", price: "$299", body: "We coordinate a joint promotion for you." },
] as const;
