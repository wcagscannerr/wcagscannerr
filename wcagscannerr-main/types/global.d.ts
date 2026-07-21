declare module 'framer-motion' {
  import * as React from 'react';
  export interface MotionProps {
    initial?: Record<string, any> | string;
    animate?: Record<string, any> | string;
    exit?: Record<string, any> | string;
    whileInView?: Record<string, any> | string;
    viewport?: { once?: boolean; amount?: number };
    transition?: Record<string, any>;
    variants?: Record<string, any>;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    [key: string]: any;
  }
  type MotionHTMLElement = React.FC<MotionProps>;
  type MotionSVGElement<T extends React.SVGElement> = React.FC<MotionProps & React.SVGProps<T>>;
  export const motion: {
    div: MotionHTMLElement;
    span: MotionHTMLElement;
    p: MotionHTMLElement;
    h1: MotionHTMLElement;
    h2: MotionHTMLElement;
    h3: MotionHTMLElement;
    section: MotionHTMLElement;
    nav: MotionHTMLElement;
    form: MotionHTMLElement;
    button: MotionHTMLElement;
    a: React.FC<MotionProps & React.AnchorHTMLAttributes<HTMLAnchorElement>>;
    li: MotionHTMLElement;
    ul: MotionHTMLElement;
    circle: MotionSVGElement<SVGCircleElement>;
    line: MotionSVGElement<SVGLineElement>;
    path: MotionSVGElement<SVGPathElement>;
    polyline: MotionSVGElement<SVGPolylineElement>;
    svg: MotionSVGElement<SVGSVGElement>;
  };
  export const AnimatePresence: React.FC<{
    children?: React.ReactNode;
    mode?: 'wait' | 'sync' | 'popLayout';
  }>;
}

declare module 'lucide-react' {
  import * as React from 'react';
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    absoluteStrokeWidth?: boolean;
  }
  export type LucideIcon = React.FC<LucideProps>;
  export const ArrowRight: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const Search: LucideIcon;
  export const ScanLine: LucideIcon;
  export const Menu: LucideIcon;
  export const Contrast: LucideIcon;
  export const Image: LucideIcon;
  export const FormInput: LucideIcon;
  export const MousePointerClick: LucideIcon;
  export const Languages: LucideIcon;
  export const X: LucideIcon;
  export const Check: LucideIcon;
  export const Star: LucideIcon;
  export const MessageCircle: LucideIcon;
  export const Pencil: LucideIcon;
  export const FileCheck2: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ListChecks: LucideIcon;
  export const FileText: LucideIcon;
  export const Bell: LucideIcon;
  export const Code: LucideIcon;
  export const Copy: LucideIcon;
  export const Building2: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Calendar: LucideIcon;
  export const FileDown: LucideIcon;
  export const Share: LucideIcon;
  export const Share2: LucideIcon;
  export const Layers: LucideIcon;
  export const XCircle: LucideIcon;
  export const Link2: LucideIcon;
  export const Download: LucideIcon;
  export const FileSpreadsheet: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Globe: LucideIcon;
  export const BarChart2: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Info: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const Shield: LucideIcon;
  export const Clock: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const Scale: LucideIcon;
  export const Zap: LucideIcon;
  export const AlertOctagon: LucideIcon;
  export const MapPin: LucideIcon;
  export const Wifi: LucideIcon;
  export const WifiOff: LucideIcon;
  export const Filter: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Quote: LucideIcon;  
  export const Loader2: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const Monitor: LucideIcon;
  export const FileBarChart: LucideIcon;
  export const Wand2: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const Activity: LucideIcon;
  export const ArrowUpRight: LucideIcon;
  export const Sun: LucideIcon;
  export const Moon: LucideIcon;
  export const Github: LucideIcon;
  export const Twitter: LucideIcon;
  export const Minus: LucideIcon;
  export const PlusCircle: LucideIcon;
  export const LayersLinked: LucideIcon;
  export const LayoutList: LucideIcon;
  export const LayoutGrid: LucideIcon;
  export const LayoutKanban: LucideIcon;
  export const LayoutTemplate: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const LayoutCards: LucideIcon;
  export const Smartphone: LucideIcon;
  export const Tablet: LucideIcon;
  export const ZoomIn: LucideIcon;
  export const ZoomOut: LucideIcon;
  export const Maximize2: LucideIcon;
  export const Move: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const Keyboard: LucideIcon;
  export const CreditCard: LucideIcon;
  export const Settings: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const Lock: LucideIcon;
  export const User: LucideIcon;
  export const Trash2: LucideIcon;
  export const Type: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Plus: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const TrendingDown: LucideIcon;
  export const Bug: LucideIcon;
  export const Key: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const SquareCheck: LucideIcon;
  export const CheckSquare: LucideIcon;
  export const Cookie: LucideIcon;
}

declare module 'stripe' {
  export default class Stripe {
    constructor(apiKey: string, config?: Record<string, any>);
    checkout: { sessions: { create: (params: any) => Promise<any> } };
    billingPortal: { sessions: { create: (params: any) => Promise<any> } };
    customers: { create: (params: any) => Promise<any> };
    subscriptions: { retrieve: (id: string) => Promise<any> };
    webhooks: { constructEvent: (body: string, sig: string, secret: string) => any };
  }
}