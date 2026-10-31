/**
 * The Planner Partner Agreement, exactly as published. Each version is kept
 * forever (acceptances point at the version accepted); a new version is a new
 * entry with its own effective date, never an edit to an old one.
 */
export type AgreementBlock = ["h" | "p" | "li", string];

export type AgreementVersion = { version: string; effective: string; title: string; blocks: AgreementBlock[] };

export const plannerPartnerAgreements: AgreementVersion[] = [
  {
    version: "1.0",
    effective: "2026-10-31",
    title: "Planner Partner Agreement",
    blocks: [
      [
        "p",
        "Effective October 31, 2026"
      ],
      [
        "p",
        "This Planner Partner Agreement (the \"Agreement\") is between Something Clicks LLC, a Utah limited liability company (\"Something Clicks\", \"we\", \"us\"), and the wedding planning business that accepts it (the \"Planner Partner\", \"you\"). The person accepting confirms they are authorized to accept on that business's behalf."
      ],
      [
        "p",
        "You accept this Agreement by checking the agreement box and submitting your Planner Partner application on somethingclicks.com. The date you accept is the \"Effective Date.\" Something Clicks and the Planner Partner are each a \"Party\" and together the \"Parties.\""
      ],
      [
        "h",
        "1. Purpose"
      ],
      [
        "p",
        "Something Clicks operates a platform that helps wedding businesses discover complementary local businesses, request introductions, and build referral partnerships. Planner Partners are wedding planners who help shape Something Clicks and bring trusted businesses into the network. This Agreement sets out what each Party provides."
      ],
      [
        "h",
        "2. Term"
      ],
      [
        "li",
        "This Agreement starts on the Effective Date and lasts 12 months, unless ended earlier under Section 14."
      ],
      [
        "li",
        "It does not renew automatically. The Parties may agree in writing to extend it."
      ],
      [
        "h",
        "3. What the Planner Partner receives"
      ],
      [
        "p",
        "For the term of this Agreement, Something Clicks will provide:"
      ],
      [
        "li",
        "Complimentary Membership. Network Membership at no charge (normally $149 per month). No payment details are required, and you will not be charged automatically when the term ends."
      ],
      [
        "li",
        "Planner Partner designation. A \"Planner Partner\" label on your Something Clicks profile, visible to signed-in members."
      ],
      [
        "li",
        "Vendor onboarding help. Personal help from our team bringing up to 10 businesses you recommend onto Something Clicks."
      ],
      [
        "li",
        "Early access. Access to new features before general release, where available."
      ],
      [
        "li",
        "A direct contact. A named person at Something Clicks for questions and suggestions."
      ],
      [
        "p",
        "These benefits are the only consideration you receive under this Agreement. Before the term ends, we will tell you your options at least 30 days in advance. Continuing as a paying member is your choice."
      ],
      [
        "h",
        "4. What the Planner Partner may do"
      ],
      [
        "p",
        "Participation is voluntary. There are no quotas, minimum referrals, or required posts. As a Planner Partner, you may:"
      ],
      [
        "li",
        "Recommend wedding businesses you know and trust."
      ],
      [
        "li",
        "Introduce those businesses to Something Clicks, or invite them through the platform."
      ],
      [
        "li",
        "Share feedback on how Something Clicks works and what wedding professionals need."
      ],
      [
        "li",
        "Use Something Clicks to discover partners and build your own referral relationships."
      ],
      [
        "p",
        "You are not responsible for managing other businesses, providing customer support, or running campaigns."
      ],
      [
        "h",
        "5. Introductions and consent"
      ],
      [
        "li",
        "You will submit a business's contact details only if that business has agreed to be contacted by Something Clicks."
      ],
      [
        "li",
        "You will not share your clients' (couples') personal information with Something Clicks."
      ],
      [
        "li",
        "Each business decides for itself whether to join, claim its listing, or accept any introduction. Neither Party guarantees that any business will join or that any referral will result in work."
      ],
      [
        "h",
        "6. No compensation"
      ],
      [
        "li",
        "You will not receive commissions, referral fees, or any payment under this Agreement beyond the benefits in Section 3."
      ],
      [
        "li",
        "Any future referral reward program would be offered separately, in writing, with its own terms."
      ],
      [
        "h",
        "7. Independent relationship"
      ],
      [
        "p",
        "The Parties are independent businesses. This Agreement does not create an employment, partnership, joint venture, franchise, or agency relationship. You cannot make commitments or statements on behalf of Something Clicks, and you will not describe yourself as its employee or representative."
      ],
      [
        "h",
        "8. Matching stays independent"
      ],
      [
        "p",
        "Being a Planner Partner does not affect how Something Clicks matches, ranks, or displays any business, including yours and the businesses you introduce. Matches are based only on the platform's matching rules."
      ],
      [
        "h",
        "9. Disclosure of this relationship"
      ],
      [
        "p",
        "You receive a free membership, so if you publicly recommend or promote Something Clicks (social media, website, email, or in person), you must clearly disclose that relationship, as required by the U.S. Federal Trade Commission's Endorsement Guides."
      ],
      [
        "li",
        "Place the disclosure where people will see it, next to the recommendation, not hidden in a profile, link, or hashtag pile."
      ],
      [
        "li",
        "Example: \"I'm a Something Clicks Planner Partner and receive a complimentary membership.\""
      ],
      [
        "li",
        "Only say things you honestly believe and that are true. Do not promise bookings, results, or income."
      ],
      [
        "p",
        "Something Clicks will remind Planner Partners of these rules and may ask you to correct a post that lacks a clear disclosure."
      ],
      [
        "h",
        "10. Use of names and logos"
      ],
      [
        "li",
        "You permit Something Clicks to display your name, business name, and Planner Partner designation on Something Clicks and in materials describing the program."
      ],
      [
        "li",
        "Something Clicks permits you to use the Something Clicks name and logo, as supplied by us and unaltered, only to describe your participation."
      ],
      [
        "li",
        "Either Party may withdraw this permission by written notice. The other Party will stop new uses within 14 days."
      ],
      [
        "h",
        "11. Confidentiality"
      ],
      [
        "p",
        "You may see features, plans, or data before they are public. You will keep that non-public information confidential and use it only to take part in the program. This does not cover information that is already public or that you received lawfully from someone else."
      ],
      [
        "h",
        "12. Feedback"
      ],
      [
        "p",
        "Something Clicks may use any suggestions or feedback you give to improve its services, without payment or obligation to you."
      ],
      [
        "h",
        "13. Privacy and platform terms"
      ],
      [
        "li",
        "Your use of Something Clicks is also governed by the Something Clicks Terms of Use and Privacy Policy published at somethingclicks.com. If they conflict with this Agreement on the program, this Agreement controls."
      ],
      [
        "li",
        "Each Party will handle personal information it receives in line with applicable privacy law and its own privacy policy."
      ],
      [
        "h",
        "14. Ending the Agreement"
      ],
      [
        "li",
        "Either Party may end this Agreement at any time, for any reason, with 14 days' written notice (email is enough)."
      ],
      [
        "li",
        "Something Clicks may end it immediately if you break Section 5 or Section 9, or misuse the platform."
      ],
      [
        "li",
        "When it ends: the Planner Partner designation is removed, and the complimentary Membership stops. Your free account and claimed profile remain unless you close them. Sections 6, 7, 11, 12, 15, and 16 continue to apply."
      ],
      [
        "h",
        "15. No guarantees; limitation of liability"
      ],
      [
        "li",
        "Something Clicks provides the program and platform \"as is.\" Neither Party guarantees any referrals, bookings, or business results."
      ],
      [
        "li",
        "To the extent the law allows, neither Party is liable to the other for indirect or consequential losses (such as lost profits) arising from this Agreement, and Something Clicks' total liability under it is limited to $100."
      ],
      [
        "h",
        "16. General"
      ],
      [
        "li",
        "Entire agreement. This Agreement is the full agreement between the Parties on the program. Changes must be in writing and agreed by both Parties."
      ],
      [
        "li",
        "Governing law. This Agreement is governed by the laws of the State of Utah."
      ],
      [
        "li",
        "Assignment. Neither Party may transfer this Agreement without the other's written consent."
      ],
      [
        "li",
        "Electronic acceptance. Accepting this Agreement electronically is the same as signing it."
      ],
      [
        "h",
        "17. Acceptance and records"
      ],
      [
        "li",
        "By checking \"I have read and agree to the Planner Partner Agreement\" and submitting your application, you agree to this Agreement on behalf of your business."
      ],
      [
        "li",
        "Something Clicks keeps a record of your acceptance: the agreement version, date and time, your account and business, and the IP address used."
      ],
      [
        "li",
        "We email you a copy of this Agreement when you accept. You can view the current version at somethingclicks.com/planner-partners/agreement."
      ],
      [
        "li",
        "If we update this Agreement, we will tell you by email at least 30 days before changes take effect. If you do not agree, you may end it under Section 14."
      ]
    ],
  },
];
