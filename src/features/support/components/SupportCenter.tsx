"use client";

import { useState } from "react";
import { BookOpen, HelpCircle, MessageSquare } from "lucide-react";
import { HelpCategories } from "./HelpCategories";
import { SupportContactInfo } from "./SupportContactInfo";
import { FAQSection } from "./FAQSection";
import { ContactForm } from "./ContactForm";
import { KnowledgeBase } from "./KnowledgeBase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

export function SupportCenter() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("faq");

  return (
    <div className="min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12 space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider text-primary">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Help & Documentation</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Support Center
        </h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground">
          Find answers to common questions, explore platform guides, or get in
          touch with our team.
        </p>
      </div>

      {/* Main Content */}
      <div className="pb-12">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full space-y-6"
        >
          <div className="flex justify-center sm:justify-start">
            <TabsList className="inline-flex w-full justify-start gap-1 rounded-lg border border-border/40 bg-muted/60 p-1 sm:w-auto sm:justify-center">
              <TabsTrigger
                value="faq"
                className="gap-2 px-3.5 py-1.5 text-xs font-medium sm:text-sm"
              >
                <HelpCircle className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span>Frequently Asked Questions</span>
              </TabsTrigger>
              <TabsTrigger
                value="contact"
                className="gap-2 px-3.5 py-1.5 text-xs font-medium sm:text-sm"
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span>Contact Support</span>
              </TabsTrigger>
              <TabsTrigger
                value="knowledge"
                className="gap-2 px-3.5 py-1.5 text-xs font-medium sm:text-sm"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span>Knowledge Base</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="lg:col-span-1">
              {activeTab === "contact" ? (
                <SupportContactInfo />
              ) : (
                <HelpCategories
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                />
              )}
            </div>

            <div className="lg:col-span-3">
              <TabsContent value="faq" className="mt-0">
                <FAQSection category={activeCategory} />
              </TabsContent>
              <TabsContent value="contact" className="mt-0">
                <ContactForm category={activeCategory} />
              </TabsContent>
              <TabsContent value="knowledge" className="mt-0">
                <KnowledgeBase category={activeCategory} />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
