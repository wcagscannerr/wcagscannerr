'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { ScanActivity } from '@/types/scan';

const CATEGORY_EMOJIS: Record<string, string> = {
  'E-commerce': '🛒',
  'Blog': '📝',
  'SaaS': '⚡',
  'Portfolio': '🎨',
  'Education': '📚',
  'Government': '🏛️',
  'Website': '🌐',
};

function TickerItem({ activity }: { activity: ScanActivity }) {
  const emoji = CATEGORY_EMOJIS[activity.category] || '🌐';
  const scoreColor =
    activity.score >= 75 ? 'text-success' :
    activity.score >= 50 ? 'text-warning' :
    'text-danger';

  return (
    <span className="inline-flex items-center gap-3 whitespace-nowrap px-6 text-sm">
      <span className="text-base">{emoji}</span>
      <span className="text-text-secondary">{activity.category}</span>
      <span>scanned —</span>
      <span className={`font-semibold ${scoreColor}`}>{activity.score}/100</span>
    </span>
  );
}

export default function RecentScansTicker() {
  const [activities, setActivities] = useState<ScanActivity[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/scan-activity');
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
        }
      } catch (err) {
        console.error('Failed to fetch scan activity:', err);
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 60000);
    return () => clearInterval(interval);
  }, []);

  if (activities.length === 0) return null;

  // Duplicate items for seamless loop
  const tickerItems = [...activities, ...activities, ...activities];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="relative py-4 overflow-hidden bg-surface-elevated/50 border-y border-border"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Gradient edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div
        ref={tickerRef}
        className="flex"
        style={{
          animation: `ticker-scroll ${activities.length * 3}s linear infinite`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        {tickerItems.map((activity, i) => (
          <TickerItem key={`${activity.id}-${i}`} activity={activity} />
        ))}
      </div>

      <style jsx>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
      `}</style>
    </motion.div>
  );
}