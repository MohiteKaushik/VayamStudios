import {
  Camera, Frame, Footprints, Lightbulb, Mic, Sparkles, Wand2, Shirt, Package,
  Shield, Flame, Droplets, Zap, Clapperboard, Eye, Car, Dog, Utensils, Clock,
  Map, Wrench, HelpCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  camera: Camera, frame: Frame, footprints: Footprints, lightbulb: Lightbulb,
  mic: Mic, sparkles: Sparkles, wand: Wand2, shirt: Shirt, package: Package,
  shield: Shield, flame: Flame, droplets: Droplets, zap: Zap,
  clapperboard: Clapperboard, eye: Eye, car: Car, dog: Dog, utensils: Utensils,
  clock: Clock, map: Map, wrench: Wrench,
};

export function Icon({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  const C = MAP[name] ?? HelpCircle;
  return <C size={size} color={color} strokeWidth={1.9} aria-hidden />;
}
