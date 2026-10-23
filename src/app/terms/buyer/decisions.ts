// Buyer-terms points the owner has not decided yet. Each one is shown on the page as a marked
// "decision needed" note, and the draft banner stays up while this list is non-empty.
// When the owner decides one: write the agreed wording into page.tsx, remove its <OwnerDecision>,
// delete it here, and bump BUYER_TERMS_VERSION in src/lib/constants.ts before publishing.

import type { OwnerDecisionItem } from "@/components/terms";

export const PENDING_BUYER_TERMS_DECISIONS: OwnerDecisionItem[] = [
  {
    id: "support-contact",
    title: "Support contact",
    question:
      "No support email address or phone number is configured. Which contact should buyers use for questions, disputes, and refund requests?",
  },
  {
    id: "credit-expiry",
    title: "Credit expiration",
    question:
      "Credits currently never expire in the system. Confirm that credits do not expire, or set an expiration rule.",
  },
  {
    id: "buyer-cancellation",
    title: "Buyer cancellations and rescheduling",
    question:
      "The current business rule releases the held credit for any cancellation. Should a cancellation by the cleaning company (especially a late one) still return the credit? How are reschedules handled?",
  },
  {
    id: "no-show-evidence",
    title: "Verifying no-shows",
    question:
      "A buyer-reported no-show returns the credit. What happens if the business says the walkthrough did happen? What evidence decides it?",
  },
  {
    id: "unanswered-resolution",
    title: "Resolving unanswered outcome requests",
    question:
      "When a buyer never reports an outcome, what standard does admin apply (for example, the business confirms the walkthrough happened) before a credit is consumed or released?",
  },
  {
    id: "dispute-rules",
    title: "Dispute grounds, window, and outcome",
    question:
      "What can a buyer dispute (for example, wrong contact details, business outside the service area or criteria, business not actually seeking a quote)? Does the 72-hour window start at the scheduled time or when completion is reported? If a dispute is upheld, is the credit returned?",
  },
  {
    id: "refund-unused",
    title: "Refunds of unused credits",
    question:
      "Are unused credits refundable? If so: on request at any time or within a time limit, whole packs only or individual credits, any fees, and how a buyer requests one.",
  },
  {
    id: "refund-credit-removal",
    title: "Credits removed when a payment is refunded",
    question:
      "The system currently removes credits in proportion to the refunded amount, rounded up to whole credits, and a balance can go below zero if credits were already used. Confirm this is the policy.",
  },
  {
    id: "exclusivity-override",
    title: "Exclusivity override",
    question:
      "The original requirements allow an admin to share one walkthrough with more than one company, but the consent text every business agrees to promises one company only. Recommendation: remove the override. Confirm.",
  },
  {
    id: "terms-changes",
    title: "Changes to these terms",
    question: "How and how far in advance will buyers be told about changes to these terms?",
  },
  {
    id: "legal-review",
    title: "Legal review",
    question:
      "These terms have not been reviewed by a lawyer. Limitation of liability, governing law, account termination, and similar clauses are intentionally not included until legal review.",
  },
];
