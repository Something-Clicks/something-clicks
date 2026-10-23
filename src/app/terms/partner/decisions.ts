// Partner-terms points the owner has not decided yet. Each one is shown on the page as a marked
// "decision needed" note, and the draft banner stays up while this list is non-empty.
// When the owner decides one: write the agreed wording into page.tsx, remove its <OwnerDecision>,
// delete it here, and bump PARTNER_TERMS_VERSION in src/lib/constants.ts before publishing.

import type { OwnerDecisionItem } from "@/components/terms";

export const PENDING_PARTNER_TERMS_DECISIONS: OwnerDecisionItem[] = [
  {
    id: "commission-amount",
    title: "Commission amount",
    question:
      "The commission per completed walkthrough is not set yet (Admin → Settings). Decide the amount, and whether it can differ by partner or change over time (and with how much notice).",
  },
  {
    id: "attribution-conflicts",
    title: "Attribution conflicts",
    question:
      "Link attribution depends on a browser cookie, so it can be lost if the business uses another device or clears cookies. When two partners claim the same business, or a business arrives directly after a partner mentioned us, what evidence does admin use to decide?",
  },
  {
    id: "review-requests",
    title: "Asking for a review of a decision",
    question:
      "How and within how many days can a partner ask us to reconsider a rejected, duplicate, or voided referral, and how quickly will we respond?",
  },
  {
    id: "monthly-cap",
    title: "Monthly referral limit",
    question: "The requirements allow a monthly cap on referrals per partner. Decide whether to use one and the number.",
  },
  {
    id: "commission-reversal",
    title: "Reversing a commission after it is created or paid",
    question:
      "If fraud or a terms violation is found after a commission has been created or paid, can it be reversed or recovered from future commissions?",
  },
  {
    id: "payouts",
    title: "Payout method, timing, fees, minimum, and tax forms",
    question:
      "Payouts are planned through PromoteKit, sent manually by Something Clicks from the PromoteKit dashboard. PromoteKit's payout method, fees (reported as 5% bank / 8% card), $20 minimum per payout, and 1099-NEC handling have not been verified on our account yet. Decide the payout schedule, who pays any fees, and the minimum, once verified.",
  },
  {
    id: "partner-portal-data",
    title: "What the partner portal shows",
    question:
      "The PromoteKit partner portal is not connected yet. Confirm what referral details partners will see there (the plan is no business contact details) before describing it.",
  },
  {
    id: "suspension-effects",
    title: "Ending or suspending a partnership",
    question:
      "How can either side end the partnership, and what happens to commissions already earned but not yet paid when a partner leaves or is suspended?",
  },
  {
    id: "support-contact",
    title: "Support contact",
    question:
      "No support email address or phone number is configured. Which contact should partners use for questions and review requests?",
  },
  {
    id: "terms-changes",
    title: "Changes to these terms",
    question: "How and how far in advance will partners be told about changes to these terms?",
  },
  {
    id: "legal-review",
    title: "Legal review",
    question:
      "These terms have not been reviewed by a lawyer. Independent-contractor status, taxes, limitation of liability, governing law, and similar clauses are intentionally not included until legal review.",
  },
];
