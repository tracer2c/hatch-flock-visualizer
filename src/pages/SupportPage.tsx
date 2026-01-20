import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Phone, Mail, MessageSquare, Search, Headset } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SUPPORT_PHONE = "+1 (775) 571-3257";

const faqs = [
  {
    question: "How do I create a new house (batch)?",
    answer:
      "Go to Data Entry from the sidebar, click 'Add New House', fill in the flock, set date, and eggs set. Save to see it on your dashboard.",
  },
  {
    question: "Where can I view fertility data?",
    answer: "You can view fertility data from the Analytics dashboard or inside a house under the Fertility tab.",
  },
  {
    question: "How do I access QA Hub?",
    answer: "Select QA Hub from the sidebar to record temperatures, humidity, candling, and QA checks.",
  },
  {
    question: "How do I export reports?",
    answer: "Most tables include an export option. For full reports, go to Management → Reports.",
  },
];

export default function SupportPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* HERO */}
      <section className="bg-primary/90 text-primary-foreground">
        <div className="container mx-auto px-4 py-16 text-center max-w-5xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Headset className="h-8 w-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Gare Help Center</h1>
          <p className="text-primary-foreground/80 mb-8">
            Find answers, guides, and 24/7 support for your hatchery operations
          </p>

          {/* SEARCH */}
          <div className="mx-auto flex max-w-xl items-center gap-2 rounded-xl bg-background p-2 shadow-lg">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search help articles, reports, QA, data entry..."
              className="border-0 focus-visible:ring-0"
            />
            <Button>Search</Button>
          </div>
        </div>
      </section>

      {/* 24/7 PHONE HIGHLIGHT */}
      <section className="-mt-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <Card className="border-primary/30 shadow-xl">
            <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 py-8">
              <div>
                <p className="text-sm text-muted-foreground">24/7 Support Hotline</p>
                <p className="text-3xl font-bold text-primary mt-1">{SUPPORT_PHONE}</p>
                <p className="text-sm text-muted-foreground mt-1">Call anytime — real humans, no bots</p>
              </div>
              <Button size="lg" className="gap-2" asChild>
                <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}>
                  <Phone className="h-5 w-5" />
                  Call Now
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* QUICK HELP OPTIONS */}
      <section className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition">
            <CardHeader>
              <Phone className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Phone Support</CardTitle>
              <CardDescription>Available 24/7</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}>Call Support</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition">
            <CardHeader>
              <Mail className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Email Us</CardTitle>
              <CardDescription>Response within 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <a href="mailto:support@gare.ai">Send Email</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition">
            <CardHeader>
              <MessageSquare className="h-6 w-6 text-primary mb-2" />
              <CardTitle>Smart Help</CardTitle>
              <CardDescription>AI-powered assistance</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => navigate("/chat")}>
                Open Assistant
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 pb-20 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>Common questions from hatchery teams</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
