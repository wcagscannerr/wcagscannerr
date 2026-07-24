'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ScanLine, ArrowRight, Shield, Zap, BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Hero() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Dynamic Mesh Glow Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-40"
          style={{
            background: 'radial-gradient(circle, hsl(262 83% 58% / 0.3) 0%, transparent 70%)',
            left: `${mousePosition.x * 0.05}px`,
            top: `${mousePosition.y * 0.05}px`,
            transform: 'translate(-50%, -50%)',
            transition: 'left 0.3s ease-out, top 0.3s ease-out',
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-30"
          style={{
            background: 'radial-gradient(circle, hsl(280 70% 60% / 0.25) 0%, transparent 70%)',
            right: `${mousePosition.x * 0.03}px`,
            bottom: `${mousePosition.y * 0.03}px`,
            transform: 'translate(50%, 50%)',
            transition: 'right 0.5s ease-out, bottom 0.5s ease-out',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-primary/5 to-transparent blur-3xl" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-wide"
            >
              <Zap className="w-3.5 h-3.5" />
              WCAG 2.1 & 2.2 Compliant
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
            >
              <span className="text-foreground">Automated</span><br />
              <span className="gradient-text">Accessibility</span><br />
              <span className="text-foreground">Compliance</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-lg leading-relaxed"
            >
              Scan your website for WCAG violations in seconds. Get actionable reports, 
              lawsuit risk assessments, and AI-powered fixes — all in one platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                href="/free-scan"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm btn-magnetic"
              >
                <ScanLine className="w-4 h-4" />
                Start Free Scan
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/sample-report"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-border rounded-xl font-semibold text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                View Sample Report
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center gap-6 text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>axe-core Engine</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>57% Auto Detection</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <span>2,500+ Scans Run</span>
            </motion.div>
          </div>

          {/* Right - Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/5">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
              <div className="bg-[hsl(var(--surface-elevated))] p-4 sm:p-6">
                {/* Mock Dashboard Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  <div className="ml-auto text-xs text-muted-foreground font-mono">wcagscannerr.com</div>
                </div>
                
                {/* Mock Score Card */}
                <div className="glass-panel rounded-xl p-5 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Compliance Score</p>
                      <p className="text-3xl font-bold text-foreground mt-1">87<span className="text-lg text-muted-foreground">/100</span></p>
                    </div>
                    <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">87%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Critical', value: 2, color: 'text-red-400' },
                      { label: 'Serious', value: 5, color: 'text-orange-400' },
                      { label: 'Moderate', value: 8, color: 'text-yellow-400' },
                      { label: 'Minor', value: 3, color: 'text-blue-400' },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mock Chart */}
                <div className="glass-panel rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">Violation Trend</p>
                    <span className="badge-glow-success">-12% vs last week</span>
                  </div>
                  <div className="h-24 flex items-end gap-1">
                    {[40, 65, 45, 80, 55, 70, 45, 60, 35, 50, 40, 30].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm bg-primary/20 hover:bg-primary/40 transition-colors"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 glass-panel rounded-lg px-3 py-2 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-medium">Scan Complete</span>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-4 -left-4 glass-panel rounded-lg px-3 py-2 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium">WCAG 2.1 AA</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}