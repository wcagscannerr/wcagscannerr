'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    quote: "WCAG Scanner caught 12 critical violations our dev team missed. The lawsuit risk assessment alone saved us from a potential ADA suit.",
    author: "Sarah Chen", role: "VP Engineering", company: "TechFlow SaaS", rating: 5,
    gradient: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    quote: "We run weekly scans on 15 client sites. The batch processing and white-labeled PDF reports are game-changers for our agency workflow.",
    author: "Marcus Johnson", role: "Founder", company: "Accessible Web Co.", rating: 5,
    gradient: 'from-violet-500/10 to-purple-500/10',
  },
  {
    quote: "The AI fix suggestions cut our remediation time by 60%. Instead of googling WCAG rules, we get platform-specific code fixes instantly.",
    author: "Elena Rodriguez", role: "Frontend Lead", company: "Shopify Agency", rating: 5,
    gradient: 'from-emerald-500/10 to-teal-500/10',
  },
  {
    quote: "Went from 0 accessibility knowledge to a 94 compliance score in 2 weeks. The dashboard makes it easy to track progress over time.",
    author: "David Park", role: "Solo Developer", company: "Indie Apps", rating: 5,
    gradient: 'from-amber-500/10 to-orange-500/10',
  },
];

export default function Testimonials() {
  return (
    <section className="relative py-24 lg:py-32 bg-background overflow-hidden">
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-wide mb-4">
            <Star className="w-3.5 h-3.5" /> Loved by Teams
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Trusted by <span className="gradient-text">2,500+</span> developers
          </h2>
          <p className="text-muted-foreground">See what teams are saying about their accessibility transformation.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative glass-panel rounded-2xl p-6 glow-border card-lift"
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${testimonial.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <Quote className="w-8 h-8 text-primary/20 mb-4" />
                
                <p className="text-foreground leading-relaxed mb-6 text-[15px]">"{testimonial.quote}"</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 flex items-center justify-center text-sm font-bold text-primary">
                      {testimonial.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role} · {testimonial.company}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-0.5">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}