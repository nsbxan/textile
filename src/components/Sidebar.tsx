import React from 'react';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  Truck, 
  BarChart3, 
  Settings,
  CircleDollarSign,
  Layers
} from 'lucide-react';
import { ViewTab } from '../types';

import { soundManager } from '../utils/sound';

interface SidebarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  debtCount: number;
  lowStockCount: number;
  isLargeText: boolean;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  debtCount,
  lowStockCount,
  isLargeText,
  isAdmin = false,
}) => {
  const allMenuItems: Array<{
    id: ViewTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
    adminOnly?: boolean;
  }> = [
    {
      id: 'pos',
      label: 'Kassa (POS)',
      icon: ShoppingCart,
    },
    {
      id: 'inventory',
      label: 'Ombor & Tovarlar',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    },
    {
      id: 'debts',
      label: 'Nasiya / Qarzlar',
      icon: Users,
      badge: debtCount > 0 ? debtCount : undefined,
      badgeColor: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    },
    {
      id: 'suppliers',
      label: 'Ta\'minot & Kirim',
      icon: Truck,
      adminOnly: true,
    },
    {
      id: 'expenses',
      label: 'Xarajatlar',
      icon: CircleDollarSign,
    },
    {
      id: 'reports',
      label: 'Hisobotlar',
      icon: BarChart3,
    },
    {
      id: 'settings',
      label: 'Sozlamalar',
      icon: Settings,
      adminOnly: true,
    },
  ];

  const menuItems = allMenuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="w-64 glass-panel border-r flex flex-col justify-between p-3.5 z-10 shrink-0 select-none">
      <div className="space-y-2">
        <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          <span>Bo'limlar</span>
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                soundManager.playHapticClick();
                onSelectTab(item.id);
              }}
              className={`w-full min-h-[50px] flex items-center justify-between px-4 py-3.5 rounded-[22px] font-bold oxista-btn ${
                isLargeText ? 'text-base' : 'text-sm'
              } ${
                isActive
                  ? 'btn-ios-blue shadow-lg shadow-blue-600/30'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 hover:text-black dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Icon className={`w-5 h-5 transition-transform duration-300 ${
                  isActive ? 'text-white scale-110' : 'text-slate-500 dark:text-slate-400'
                }`} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
