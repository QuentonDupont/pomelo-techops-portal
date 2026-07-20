// src/components/catalog/catalogIcons.js
// Icon registry for service-catalog request types. Types store an icon *name*
// (TEXT column) so the catalog stays data-driven; this map resolves names to
// lucide components with a safe fallback. Add here when a new type needs one.

import {
  Laptop,
  KeyRound,
  PackagePlus,
  Bug,
  MessageCircleQuestion,
  ClipboardList,
  Wrench,
  Wifi,
  Mail,
  Smartphone,
  Printer,
  ShieldCheck,
  UserPlus,
  Database,
  Globe,
} from 'lucide-react';

export const CATALOG_ICONS = {
  Laptop,
  KeyRound,
  PackagePlus,
  Bug,
  MessageCircleQuestion,
  ClipboardList,
  Wrench,
  Wifi,
  Mail,
  Smartphone,
  Printer,
  ShieldCheck,
  UserPlus,
  Database,
  Globe,
};

export const ICON_NAMES = Object.keys(CATALOG_ICONS);

export function catalogIcon(name) {
  return CATALOG_ICONS[name] || ClipboardList;
}
