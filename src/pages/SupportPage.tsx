import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Phone, Mail, MessageSquare, ArrowLeft, Headset, Clock, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SUPPORT_PHONE = "+1 (775) 571-3257";

const faqs = [
  {
    question: "How do I create a new house (batch)?",
    answer: "Navigate to Data Entry from the sidebar, click 'Add New House', fill in the required details including flock, set date, and eggs set, then click 'Save'. The house will appear in your dashboard."
  },
  {
    question: "Where can I view fertility data?",
    answer: "Fertility data can be viewed in the Analytics dashboard or by selecting a specific house and navigating to the Fertility tab. You can also access detailed fertility analysis from the Data Sheets menu."
  },
  {
    question: "How do I access QA Hub?",
    answer: "Click on 'QA Hub' in the sidebar navigation. Here you can record temperature checks, humidity readings, candling results, and other quality assurance metrics for your machines."
  },
  {
    question: "What do the house status colors mean?",
    answer: "Green (Scheduled) = House is planned but not yet set. Blue (In Setter) = Eggs are in the setter machine. Purple (In Hatcher) = Eggs have been transferred to hatcher. Gray (Completed) = Hatch cycle is complete."
  },
  {
    question: "How do I export my data?",
    answer: "Most data tables have an export button (download icon) in the top-right corner. You can export to Excel or PDF format. For comprehensive reports, visit Management > Reports."
  },
  {
    question: "Where can I manage machines and flocks?",
    answer: "Go to Management from the sidebar, then select 'Machines' to add/edit incubators and hatchers, or 'Flocks' to manage your breeder flock information."
  },
  {
    question: "How do I reset my password?",
    answer: "On the sign-in page, click 'Forgot Password?' and enter your email address. You'll receive a password reset link within a few minutes."
  },
  {
    question: "What is the 18-point temperature grid?",
    answer: "The 18-point grid is a QA method for recording egg shell temperatures at 18 positions inside a setter (6 positions × 3 zones: front, middle, back). This helps identify temperature uniformity issues."
  },
  {
    question: "How do I record residue analysis?",
    answer: "Navigate to Data Entry, select the house, and click on 'Residue Analysis'. Enter the breakout results including infertile, early dead, mid dead, late dead, and other categories."
  },
  {
    question: "Can I use the app offline?",
    answer: "Yes! The app supports offline mode for data entry. Your changes will sync automatically when you're back online. Look for the sync status indicator in the header."
  }
];

export default function SupportPage() {
  const navigate = useNavigate();

  const handleCall = () => {
    window.location.href = `tel:${SUPPORT_PHONE.replace(/\s/g, '')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 mb-4 shadow-lg">
            <Headset className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Help & Support
          </h1>
          <p className="text-muted-foreground text-lg">
            We're here to help you 24/7
          </p>
        </div>

        {/* Main Helpline Card */}
        <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-success to-accent" />
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-muted-foreground font-medium">
              24/7 Support Hotline
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-8">
            <a 
              href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}
              className="text-3xl md:text-4xl font-bold text-primary hover:text-primary/80 transition-colors block mb-4"
            >
              {SUPPORT_PHONE}
            </a>
            <div className="flex items-center justify-center gap-2 text-success mb-6">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
              </span>
              <span className="text-sm font-medium">Available Now</span>
            </div>
            <Button 
              size="lg" 
              onClick={handleCall}
              className="gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg"
            >
              <Phone className="h-5 w-5" />
              Call Now
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleCall}>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Call Us</h3>
              <p className="text-sm text-muted-foreground">Direct phone support</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = 'mailto:support@hatcherypro.com'}>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                <Mail className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-1">Email Support</h3>
              <p className="text-sm text-muted-foreground">Get help via email</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/chat')}>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-semibold mb-1">Smart Analytics</h3>
              <p className="text-sm text-muted-foreground">AI-powered assistance</p>
            </CardContent>
          </Card>
        </div>

        {/* Support Hours */}
        <Card className="mb-10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Support Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Phone Support</p>
                  <p className="text-sm text-muted-foreground">24 hours, 7 days a week</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Email Support</p>
                  <p className="text-sm text-muted-foreground">Response within 24 hours</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>
              Quick answers to common questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <div className="text-center mt-10 py-8 border-t">
          <p className="text-muted-foreground mb-4">
            Can't find what you're looking for?
          </p>
          <Button variant="outline" size="lg" onClick={handleCall} className="gap-2">
            <Phone className="h-4 w-4" />
            Talk to a Support Specialist
          </Button>
        </div>
      </div>
    </div>
  );
}
