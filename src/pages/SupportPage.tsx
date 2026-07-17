import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, Mail, MessageSquare, Search, Headset, X,
  Rocket, FileInput, ClipboardCheck, BarChart3, Settings2, Users, HelpCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const SUPPORT_PHONE = "+1 (775) 571-3257";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

interface FAQCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  faqs: FAQ[];
}

const faqCategories: FAQCategory[] = [
  {
    id: "getting-started",
    name: "Getting Started",
    icon: Rocket,
    description: "New to the platform? Start here",
    faqs: [
      {
        id: "gs-1",
        question: "How do I navigate the application?",
        answer: "Use the sidebar on the left to navigate between different sections. The main areas include Dashboard (overview), Data Entry (create/manage houses), QA Hub (quality checks), Analytics (smart insights), and Management (settings, users, machines). You can also use Ctrl+K to open the Command Palette for quick navigation.",
        keywords: ["navigate", "sidebar", "menu", "home", "navigation", "command palette"]
      },
      {
        id: "gs-2",
        question: "What is the Dashboard overview?",
        answer: "The Dashboard provides a high-level view of your hatchery operations including active houses by status (Scheduled, In Setter, In Hatcher, Completed), key performance metrics, upcoming hatches, and critical alerts. Use the filter options to view specific date ranges or units.",
        keywords: ["dashboard", "overview", "home", "summary", "metrics"]
      },
      {
        id: "gs-3",
        question: "How do I use the Command Palette (keyboard shortcuts)?",
        answer: "Press Ctrl+K (or Cmd+K on Mac) to open the Command Palette. You can quickly search for pages, actions, and navigate to any section without using the mouse. Type keywords like 'data entry', 'QA', 'reports' to find what you need.",
        keywords: ["keyboard", "shortcut", "command", "palette", "ctrl", "quick", "search"]
      },
      {
        id: "gs-4",
        question: "What do the different house statuses mean?",
        answer: "Houses progress through these statuses: Scheduled (eggs set, waiting for incubation), In Setter (actively incubating in setter machine, days 1-18), In Hatcher (transferred to hatcher, days 19-21), and Completed (hatch finished, chicks counted). Each status has specific actions available.",
        keywords: ["status", "scheduled", "setter", "hatcher", "completed", "stages", "lifecycle"]
      },
      {
        id: "gs-5",
        question: "How do I install the app on my mobile device?",
        answer: "Visit the Install page from the sidebar or navigate to /install. On iOS, tap the Share button and 'Add to Home Screen'. On Android, tap the browser menu and 'Install App' or 'Add to Home Screen'. This creates a progressive web app that works offline.",
        keywords: ["install", "mobile", "pwa", "app", "phone", "tablet", "offline"]
      }
    ]
  },
  {
    id: "data-entry",
    name: "Data Entry & Houses",
    icon: FileInput,
    description: "Creating and managing batches",
    faqs: [
      {
        id: "de-1",
        question: "How do I create a new house (batch)?",
        answer: "Go to Data Entry from the sidebar, click 'Add New House'. Select the flock (source farm), enter the set date and time, specify total eggs set, and optionally assign a unit/hatchery. The system automatically calculates the expected hatch date (21 days from set).",
        keywords: ["create", "new", "house", "batch", "add", "set eggs"]
      },
      {
        id: "de-2",
        question: "What fields are required when creating a house?",
        answer: "Required fields: Flock (source farm), Set Date, and Total Eggs Set. Optional fields include: Set Time, Unit/Hatchery, Machine Assignment, and Notes. The batch number is auto-generated based on the set date.",
        keywords: ["required", "fields", "mandatory", "flock", "eggs", "form"]
      },
      {
        id: "de-3",
        question: "How do I allocate eggs to machines?",
        answer: "After creating a house, use the Machine Allocation Wizard to distribute eggs across available setter machines. Select machines with capacity, specify eggs per machine, and the system tracks utilization. You can split one batch across multiple machines.",
        keywords: ["allocate", "machine", "wizard", "distribute", "capacity", "setter"]
      },
      {
        id: "de-4",
        question: "What is the difference between Single and Multi-setter machines?",
        answer: "Single-setter machines track one batch at a time with simple temperature/humidity monitoring. Multi-setter machines can hold eggs from multiple flocks in different zones (A/B/C) and levels (Top/Mid/Bottom), with 18-point temperature mapping for granular tracking.",
        keywords: ["single", "multi", "setter", "difference", "zones", "levels", "18-point"]
      },
      {
        id: "de-5",
        question: "How do I record fertility data?",
        answer: "Navigate to the house detail page, go to the Fertility tab. Enter sample size, fertile eggs count, and infertile eggs. The system calculates fertility percentage automatically. Include technician name and any notes for traceability.",
        keywords: ["fertility", "fertile", "infertile", "candling", "sample", "percentage"]
      },
      {
        id: "de-6",
        question: "How do I enter residue breakout data?",
        answer: "After hatch, go to the house's Residue tab. Enter counts for: Infertile, Early Dead, Mid Dead, Late Dead, Pipped Not Hatched, Contaminated, and other categories. The system calculates hatch percentages (HOF, HOI, Hatch%) automatically.",
        keywords: ["residue", "breakout", "dead", "early", "mid", "late", "contaminated", "hof", "hoi"]
      }
    ]
  },
  {
    id: "qa-hub",
    name: "QA Hub & Monitoring",
    icon: ClipboardCheck,
    description: "Quality assurance checks",
    faqs: [
      {
        id: "qa-1",
        question: "How do I access QA Hub?",
        answer: "Select 'QA Hub' from the sidebar. Choose the type of check you want to perform: Temperature readings, Humidity, Candling, Rectal Temperatures, Moisture Loss, Angles, or Daily Checklists. Select the machine and incubation day to begin.",
        keywords: ["qa", "hub", "access", "quality", "checks", "monitoring"]
      },
      {
        id: "qa-2",
        question: "What QA checks can I perform?",
        answer: "Available checks include: Temperature (spot or 18-point grid), Humidity readings, Candling results, Rectal temperatures (chick development), Moisture loss (egg weight), Turning angles, Tray wash verification, and Cull checks. Each has specific entry forms.",
        keywords: ["checks", "types", "temperature", "humidity", "candling", "rectal", "moisture"]
      },
      {
        id: "qa-3",
        question: "How do I record temperature readings?",
        answer: "In QA Hub, select Temperature entry. Choose the machine and day of incubation. For single-setter machines, enter overall temperature. For multi-setter, use the 18-point grid (Front/Middle/Back × Top/Mid/Bottom × Left/Right) for comprehensive monitoring.",
        keywords: ["temperature", "temp", "readings", "record", "18-point", "grid"]
      },
      {
        id: "qa-4",
        question: "What is the 18-point temperature check?",
        answer: "The 18-point check maps temperatures across the entire setter: 3 depths (Front, Middle, Back) × 3 heights (Top, Mid, Bottom) × 2 sides (Left, Right). This identifies hot/cold spots and ensures uniform incubation. Color coding shows deviations from target.",
        keywords: ["18-point", "eighteen", "point", "grid", "mapping", "zones", "uniform"]
      },
      {
        id: "qa-5",
        question: "How do I track moisture loss?",
        answer: "Navigate to QA Hub → Moisture Loss. Weigh sample eggs at set and again at day 18. Enter both weights; the system calculates percentage loss. Target is typically 11-13% loss. Adjust humidity settings if outside range.",
        keywords: ["moisture", "loss", "weight", "eggs", "humidity", "percentage", "11-13"]
      }
    ]
  },
  {
    id: "analytics",
    name: "Analytics & Reports",
    icon: BarChart3,
    description: "Insights and reporting",
    faqs: [
      {
        id: "an-1",
        question: "How do I use HatchAI Assistant?",
        answer: "Go to 'HatchAI Assistant' from the sidebar. Ask natural language questions like 'What was our hatch rate last week?' or 'Show fertility trends by flock age'. The AI analyzes your data and provides visualizations, insights, and recommendations.",
        keywords: ["smart", "analytics", "ai", "chat", "ask", "natural", "language", "insights"]
      },
      {
        id: "an-2",
        question: "How do I export reports?",
        answer: "Most data tables include an Export button in the top-right corner. Options include Excel (.xlsx) and PDF formats. For comprehensive reports, go to Management → Reports where you can generate batch summaries, performance reports, and custom date ranges.",
        keywords: ["export", "reports", "excel", "pdf", "download", "generate"]
      },
      {
        id: "an-3",
        question: "What metrics are shown in Timeline Analysis?",
        answer: "The Timeline view shows: Set dates, expected hatch dates, actual hatch dates, transfer dates (setter to hatcher), and key QA checkpoints. Color coding indicates on-time vs delayed events. Hover for detailed information.",
        keywords: ["timeline", "analysis", "dates", "events", "schedule", "gantt"]
      },
      {
        id: "an-4",
        question: "How do I compare performance across flocks?",
        answer: "Use Analytics → Comparison view. Select multiple flocks to compare side-by-side. Metrics include: Fertility %, Hatch of Fertile (HOF), Hatch of Set (HOI), Early/Mid/Late mortality. Filter by flock age to normalize comparisons.",
        keywords: ["compare", "comparison", "flocks", "performance", "side-by-side", "benchmark"]
      },
      {
        id: "an-5",
        question: "What formulas are used for Hatch% calculations?",
        answer: "Key formulas: Fertility% = (Fertile Eggs / Sample Size) × 100. HOF (Hatch of Fertile) = (Chicks Hatched / Fertile Eggs) × 100. HOI (Hatch of Incubated) = (Chicks Hatched / Eggs Set) × 100. IF Dev% = (Fertile Eggs / Eggs Injected) × 100.",
        keywords: ["formulas", "calculations", "hof", "hoi", "fertility", "hatch", "percentage", "math"]
      }
    ]
  },
  {
    id: "machines",
    name: "Machine Management",
    icon: Settings2,
    description: "Equipment and transfers",
    faqs: [
      {
        id: "mc-1",
        question: "How do I add a new machine?",
        answer: "Go to Management → Machines, click 'Add Machine'. Enter machine number, select type (Setter or Hatcher), specify capacity (egg count), assign to a unit, and set the mode (Single-setter or Multi-setter). Optional: add location notes.",
        keywords: ["add", "new", "machine", "create", "setter", "hatcher", "capacity"]
      },
      {
        id: "mc-2",
        question: "How do I view machine utilization?",
        answer: "Navigate to Machine Utilization from the sidebar. View real-time capacity usage across all machines. Color coding shows: Green (available capacity), Yellow (near full), Red (over capacity). Click a machine for detailed batch information.",
        keywords: ["utilization", "capacity", "usage", "available", "full", "occupancy"]
      },
      {
        id: "mc-3",
        question: "What is the Machine Daily Checklist?",
        answer: "Daily checklists ensure routine maintenance and monitoring. Access via Checklist page or QA Hub. Items include: temperature verification, humidity check, turning mechanism, ventilation, and general cleanliness. Completed items are logged with timestamp and technician.",
        keywords: ["checklist", "daily", "routine", "maintenance", "verification", "tasks"]
      },
      {
        id: "mc-4",
        question: "How do I track machine transfers?",
        answer: "Transfers from setter to hatcher are logged automatically when you update house status. Go to the house detail page → Transfers tab to see history. Manual transfer entry is available in Data Entry for backdated records.",
        keywords: ["transfer", "setter", "hatcher", "move", "history", "log"]
      }
    ]
  },
  {
    id: "account",
    name: "Account & Permissions",
    icon: Users,
    description: "Users and access control",
    faqs: [
      {
        id: "ac-1",
        question: "What are the different user roles?",
        answer: "Four roles exist: Staff (view + data entry), Operations Head (staff permissions + reports + targets), Company Admin (full access including user management), and Super Admin (system-wide access). Each role has specific page and action permissions.",
        keywords: ["roles", "permissions", "staff", "admin", "operations", "access"]
      },
      {
        id: "ac-2",
        question: "What can Staff members access?",
        answer: "Staff can: View dashboard and houses, enter data (houses, QA checks, fertility, residue), use QA Hub, view (not edit) reports, and access HatchAI Assistant. They cannot manage users, machines, flocks, or system settings.",
        keywords: ["staff", "access", "permissions", "data entry", "view", "restrictions"]
      },
      {
        id: "ac-3",
        question: "What additional permissions do Operations Heads have?",
        answer: "Beyond Staff access, Operations Heads can: Create and edit flocks, manage targets, view detailed reports, export data, and approve certain workflows. They cannot manage users or system configuration.",
        keywords: ["operations", "head", "manager", "permissions", "additional", "flocks", "targets"]
      },
      {
        id: "ac-4",
        question: "How do I manage users (Company Admin)?",
        answer: "Go to Management → Users. Here you can: Invite new users by email, assign roles, edit existing users, and deactivate accounts. New users receive an email invitation to set their password and complete profile.",
        keywords: ["manage", "users", "invite", "admin", "roles", "email", "deactivate"]
      },
      {
        id: "ac-5",
        question: "How do I update my profile?",
        answer: "Click your avatar/name in the top-right corner, select 'Profile'. Update your display name, email preferences, and notification settings. For password changes, use the security section. Two-factor authentication can also be enabled here.",
        keywords: ["profile", "update", "settings", "name", "email", "password", "2fa"]
      }
    ]
  }
];

export default function SupportPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("getting-started");

  // Filter FAQs based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return faqCategories;

    const query = searchQuery.toLowerCase();
    return faqCategories
      .map(category => ({
        ...category,
        faqs: category.faqs.filter(faq =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query) ||
          faq.keywords.some(kw => kw.toLowerCase().includes(query))
        )
      }))
      .filter(category => category.faqs.length > 0);
  }, [searchQuery]);

  // Get total results count
  const totalResults = useMemo(() => 
    filteredCategories.reduce((acc, cat) => acc + cat.faqs.length, 0),
    [filteredCategories]
  );

  // Get currently active category's FAQs
  const activeCategoryData = useMemo(() => {
    if (searchQuery.trim()) {
      // When searching, show all filtered results
      return {
        name: "Search Results",
        faqs: filteredCategories.flatMap(cat => cat.faqs)
      };
    }
    return filteredCategories.find(cat => cat.id === activeCategory) || filteredCategories[0];
  }, [activeCategory, filteredCategories, searchQuery]);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* HERO */}
      <section className="bg-primary/90 text-primary-foreground">
        <div className="container mx-auto px-4 py-16 text-center max-w-5xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Headset className="h-8 w-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Help Center</h1>
          <p className="text-primary-foreground/80 mb-8">
            Find answers, guides, and 24/7 support for your hatchery operations
          </p>

          {/* SEARCH */}
          <div className="mx-auto flex max-w-xl items-center gap-2 rounded-xl bg-background p-2 shadow-lg">
            <Search className="h-5 w-5 text-muted-foreground ml-2" />
            <Input
              placeholder="Search help articles, reports, QA, data entry..."
              className="border-0 focus-visible:ring-0 text-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
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
                <p className="text-sm text-muted-foreground mt-1">Call anytime</p>
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

      {/* FAQ SECTION */}
      <section className="container mx-auto px-4 pb-20 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>
              {searchQuery 
                ? `Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${searchQuery}"`
                : "Browse by category or search for specific topics"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category Pills */}
            {!searchQuery && (
              <div className="flex flex-wrap gap-2">
                {faqCategories.map((category) => {
                  const Icon = category.icon;
                  const isActive = activeCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-md" 
                          : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {category.name}
                      <Badge 
                        variant={isActive ? "secondary" : "outline"} 
                        className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs"
                      >
                        {category.faqs.length}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}

            {/* FAQ Accordion */}
            {activeCategoryData && activeCategoryData.faqs.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {activeCategoryData.faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-left hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground mb-6">
                  We couldn't find any FAQs matching "{searchQuery}"
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                  <Button asChild>
                    <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Call Support
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* Footer CTA */}
            {activeCategoryData && activeCategoryData.faqs.length > 0 && (
              <div className="border-t pt-6 mt-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                  <div>
                    <p className="font-medium">Can't find what you need?</p>
                    <p className="text-sm text-muted-foreground">Our team is here to help 24/7</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" asChild>
                      <a href="mailto:support@gare.ai">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </a>
                    </Button>
                    <Button asChild>
                      <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call Now
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
