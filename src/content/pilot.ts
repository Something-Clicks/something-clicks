import { placeholder } from "./site";

/**
 * The founding pilot's partnership journey.
 *
 * Every page reads the concrete "first opportunity to join" from this file,
 * so changing the lead journey later is a one-file edit.
 */
export const pilot = {
  journey: "Small-business setup",
  shortName: "small-business setup",
  summary:
    "Businesses moving into, setting up, or maintaining commercial space.",
  why:
    "When a business signs a lease, it needs a string of services in quick succession: moving, furniture, cleaning, IT, signage, security, and ongoing maintenance. Each provider meets the customer at a different moment, which makes them natural partners for one another.",

  /** Member businesses we are recruiting for the first cycle. */
  memberTypes: [
    "Commercial movers",
    "Office furniture installers",
    "Commercial cleaning and janitorial",
    "IT, network, and phone setup",
    "Signage and print",
    "Security and access control",
    "Property maintenance and repair",
    "Space planning and interior design",
    "Commercial painting and flooring",
  ],

  /** Well-connected professionals who could introduce businesses. */
  referralPartnerTypes: [
    "Commercial real estate professionals",
    "Property managers",
    "Commercial movers",
    "Office furniture installers",
    "Property maintenance companies",
  ],

  /** The customer moments the journey follows, in order. */
  moments: [
    { label: "Signs a lease", detail: "Brokers and property managers see the move first." },
    { label: "Moves in", detail: "Movers and furniture installers handle the physical setup." },
    { label: "Sets up", detail: "IT, signage, and security make the space work." },
    { label: "Opens and operates", detail: "Cleaning and maintenance keep it running." },
  ],

  /** Labeled as illustrative wherever it is shown. */
  exampleOffer: {
    title: "Move-in ready package",
    partners: ["A commercial mover", "An office furniture installer"],
    description:
      "The mover tells its commercial clients about a discounted furniture install booked for move day; the installer tells its clients about the mover's priority scheduling. Each offer uses its own code so both sides can see which introductions led to bookings.",
  },

  firstCycleAsk: "One tracked collaboration within 30 days of being matched.",

  // [PLACEHOLDER] Confirm before launch.
  cycleLength: placeholder("[X]-week first cycle"),
  applicationWindow: placeholder("Applications reviewed on a rolling basis until [date]"),
} as const;
