import { summary } from "./explainer";
import { metros } from "./metros";

const cityList = (() => {
  const names = metros.map((m) => m.name);
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
})();

/** Homepage and /faq. Answers are plain text so they can go into FAQPage structured data as is. */
export const faq = [
  {
    q: "What is Something Clicks?",
    a: `${summary} Anyone can search to see how many complementary businesses are nearby, and joining free shows who they are. Request an introduction (the other business must agree before contact details are shared), then refer customers to each other, create shared offers or promote each other's services. Tracking links show how partnerships perform.`,
  },
  {
    q: "How do wedding vendors find referral partners?",
    a: "Tell Something Clicks what your business does and where you work. You'll see the kinds of local wedding businesses that fit yours, such as planners and venues for a photographer, with live counts and the reason each one fits. Claim your business to see who they are, then request an introduction. When both sides accept, you can see each other's contact details and agree on referrals, a shared offer or a promotion.",
  },
  {
    q: "Is it free?",
    a: "Yes. Claiming your business, seeing your matches, requesting introductions and using tracking links are free. Optional paid plans: a $149/month membership and a $299 managed campaign.",
  },
  {
    q: "Who can see my business?",
    a: "The public never sees business names: searches show only how many businesses of each kind are nearby. Verified owners who have claimed their business see the names of their matches. Your contact details are shared only with a business after you both accept an introduction. You can ask us to remove your business at any time.",
  },
  {
    q: "Which cities are live?",
    a: `Matches are live in ${cityList}. You can search from anywhere in the U.S. to see how many wedding businesses near you fit yours, and we're adding cities over time.`,
  },
] as const;

/** FAQPage structured data for the same questions. */
export const faqJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});
