import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold mb-6 text-gray-900">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Got questions? We've got answers.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          <AccordionItem value="item-pricing" className="bg-emerald-50 px-6 rounded-xl border border-emerald-100 shadow-sm">
            <AccordionTrigger className="text-lg font-bold py-6 hover:no-underline text-emerald-900">
              How much does Shakthi cost?
            </AccordionTrigger>
            <AccordionContent className="text-emerald-800 pb-6 text-base leading-relaxed font-medium">
              Shakthi starts at just ₹10 per telecaller per day. You only pay for active users, with no long-term contracts, no setup fees, and absolutely zero hidden charges.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-1" className="bg-white px-6 rounded-xl border border-gray-100 shadow-sm">
            <AccordionTrigger className="text-lg font-semibold py-6 hover:no-underline">
              Is Shakthi compatible with my existing loan software?
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 pb-6 text-base leading-relaxed">
              Yes! Shakthi is designed to integrate seamlessly with major loan management systems (LMS) and banking software via API. We also support bulk Excel/CSV uploads for immediate starts.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="bg-white px-6 rounded-xl border border-gray-100 shadow-sm">
            <AccordionTrigger className="text-lg font-semibold py-6 hover:no-underline">
              How does the gamification work?
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 pb-6 text-base leading-relaxed">
              Shakthi turns recovery targets into a game. Agents earn points for calls made, promises to pay (PTP) secured, and actual revenue collected. Leaderboards update in real-time, and "Celebration Mode" triggers animations for big wins.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="bg-white px-6 rounded-xl border border-gray-100 shadow-sm">
            <AccordionTrigger className="text-lg font-semibold py-6 hover:no-underline">
              Is my data secure?
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 pb-6 text-base leading-relaxed">
              Absolutely. We use enterprise-grade encryption for all data at rest and in transit. Shakthi is ISO 27001 compliant and follows strict data privacy guidelines relevant to financial institutions.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="bg-white px-6 rounded-xl border border-gray-100 shadow-sm">
            <AccordionTrigger className="text-lg font-semibold py-6 hover:no-underline">
              Can I try it before I buy?
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 pb-6 text-base leading-relaxed">
              Yes, we offer a 14-day free pilot for qualifying agencies. You can test the full feature set with a small team to see the impact on your recovery rates.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
