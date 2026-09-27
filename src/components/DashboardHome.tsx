import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  RefreshCw,
  Boxes,
} from 'lucide-react';
import { Order, OrderStatus, Product, StockMovementLog, Sheet3ProductEntry } from '../types';
import { fetchListSheetProductNames } from '../services/sheets';
import { StockManagerHome } from './StockManagerHome';
import { OrderCalendar } from './OrderCalendar';

interface DashboardHomeProps {
  orders: Order[];
  onNavigateToOrders: () => void;
  onOpenNewOrder: () => void;
  onSyncSheet: () => void;
  isSyncing: boolean;
  onSelectOrder: (order: Order) => void;
  onUpdateOrderStatus: (order: Order, newStatus: OrderStatus) => void;
  // Stock management & Cancel Return Approval
  products: Product[];
  onUpdateProductStock: (productId: string, newStock: number, reason?: StockMovementLog['reason'], orderId?: string) => void;
  onApproveCancelReturn: (order: Order, restock: boolean) => void;
  stockLogs: StockMovementLog[];
  onAddProduct?: (newProduct: Omit<Product, 'rowIndex'>) => void;
  sheet3Entries?: Sheet3ProductEntry[];
  onUpdateSheet3Entry?: (entry: Sheet3ProductEntry) => Promise<void> | void;
  onAddSheet3Entry?: (entry: Omit<Sheet3ProductEntry, 'rowIndex' | 'id'>) => Promise<void> | void;
  onRefreshSheet3?: () => void;
  isRefreshingSheet3?: boolean;
  // Dynamic Realtime Product Names from List Sheet Column B
  spreadsheetId?: string;
  accessToken?: string | null;
  listProductNames?: string[];
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  orders,
  onOpenNewOrder,
  onSyncSheet,
  isSyncing,
  onSelectOrder,
  products,
  onUpdateProductStock,
  onApproveCancelReturn,
  stockLogs,
  onAddProduct,
  sheet3Entries,
  onUpdateSheet3Entry,
  onAddSheet3Entry,
  onRefreshSheet3,
  isRefreshingSheet3,
  spreadsheetId,
  accessToken,
  listProductNames,
}) => {
  // Real-time 6 Product names loaded from 'List' Sheet Column B
  const [dynamicProductNames, setDynamicProductNames] = useState<string[]>(() => {
    if (listProductNames && listProductNames.length >= 6) return listProductNames;
    try {
      const saved = localStorage.getItem('sheet_list_product_names');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 6) return parsed;
      }
    } catch (e) {}
    return [
      'Rose 599',
      'Watch 599',
      'Doll and toys tk',
      'Cutting Dispancer tk',
      'Porbash Rose 990',
      'Porbash Rose 1350',
    ];
  });
  const [isLoadingListNames, setIsLoadingListNames] = useState<boolean>(false);

  // Sync state when parent provides updated listProductNames
  useEffect(() => {
    if (listProductNames && listProductNames.length >= 6) {
      setDynamicProductNames(listProductNames);
    }
  }, [listProductNames]);

  // Fetch real-time names directly from 'List' sheet Column B
  const loadListNames = useCallback(async () => {
    setIsLoadingListNames(true);
    try {
      const names = await fetchListSheetProductNames(spreadsheetId, accessToken);
      if (names && names.length > 0) {
        setDynamicProductNames(names);
        localStorage.setItem('sheet_list_product_names', JSON.stringify(names));
      }
    } catch (err) {
      console.warn('Failed to load List product names:', err);
    } finally {
      setIsLoadingListNames(false);
    }
  }, [spreadsheetId, accessToken]);

  // Initial load and sync on mount / spreadsheet change
  useEffect(() => {
    loadListNames();
  }, [loadListNames]);

  // When global sync occurs, also refresh the List sheet names
  useEffect(() => {
    if (!isSyncing) {
      loadListNames();
    }
  }, [isSyncing, loadListNames]);

  // The 6 products configuration matching List sheet order (Row 1 to Row 6 in Column B)
  const SIX_PRODUCTS_CONFIG = [
    {
      key: 'rose',
      name: 'Rose 599',
      cell: 'A3',
      matchKeys: ['rose', '599'],
      fallbackStock: 18,
    },
    {
      key: 'watch',
      name: 'Watch 599',
      cell: 'B3',
      matchKeys: ['watch', 'golden', 'ঘড়ি'],
      fallbackStock: 24,
    },
    {
      key: 'doll',
      name: 'Doll and toys tk',
      cell: 'F3',
      matchKeys: ['doll', 'toy', 'খেলনা'],
      fallbackStock: 4,
    },
    {
      key: 'cutting',
      name: 'Cutting Dispancer tk',
      cell: 'C3',
      matchKeys: ['cutting', 'dispancer'],
      fallbackStock: 2,
    },
    {
      key: '990',
      name: 'Porbash Rose 990',
      cell: 'D3',
      matchKeys: ['990', 'probash 990', 'porbash rose 990'],
      fallbackStock: 15,
    },
    {
      key: '1350',
      name: 'Porbash Rose 1350',
      cell: 'E3',
      matchKeys: ['1350', 'probash 1350', 'porbash rose 1350'],
      fallbackStock: 8,
    },
  ];

  const displayProducts = SIX_PRODUCTS_CONFIG.map((cfg, idx) => {
    // Exact real-time product name from 'List' sheet Column B
    const realTimeName = (dynamicProductNames && dynamicProductNames[idx]) || cfg.name;
    const nameNorm = realTimeName.toLowerCase();

    let stock = cfg.fallbackStock;
    if (sheet3Entries && sheet3Entries.length > 0) {
      const match = sheet3Entries.find((entry) => {
        const pName = (entry.productName || '').toLowerCase();
        return (
          pName === nameNorm ||
          pName.includes(nameNorm) ||
          nameNorm.includes(pName) ||
          cfg.matchKeys.some((k) => pName.includes(k))
        );
      });
      if (match && match.currentStock !== undefined && !isNaN(Number(match.currentStock))) {
        stock = Number(match.currentStock);
      }
    } else {
      const match = products.find((p) => {
        const pName = (p.name || '').toLowerCase();
        return (
          pName === nameNorm ||
          pName.includes(nameNorm) ||
          nameNorm.includes(pName) ||
          cfg.matchKeys.some((k) => pName.includes(k))
        );
      });
      if (match && match.stock !== undefined) {
        stock = match.stock;
      }
    }

    return {
      name: realTimeName,
      cell: cfg.cell,
      stock,
    };
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-20 sm:pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">
            মাই ব্যবসা ড্যাশবোর্ড
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            আজকের ব্যবসার সামগ্রিক বিক্রয়, পণ্য স্টক ও অর্ডার পরিসংখ্যান
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onSyncSheet}
            disabled={isSyncing}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2.5 rounded-xl bg-[#171b26] hover:bg-[#202636] border border-[#262f44] text-gray-200 text-xs sm:text-sm font-medium transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'সিঙ্ক হচ্ছে...' : 'Sync Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Top 6 Product Stock Cards Header */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Boxes className="w-4 h-4 text-pink-400" />
          <span className="text-xs sm:text-sm font-bold text-white">
            পণ্য স্টক কার্ড (৬টি প্রোডাক্টের লাইভ স্টক - Sheet 3)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadListNames}
            disabled={isLoadingListNames}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#141824] hover:bg-[#1e2436] border border-[#232b3e] text-[10px] sm:text-[11px] text-gray-300 hover:text-pink-300 transition-colors font-siliguri"
            title="List শিট কলাম B থেকে ৬টি নাম পুনরায় লোড করুন"
          >
            <RefreshCw className={`w-3 h-3 text-pink-400 ${isLoadingListNames ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">নাম সিঙ্ক</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold font-mono">
              List (Col B) & Sheet 3 Live
            </span>
          </div>
        </div>
      </div>

      {/* Exactly 6 Product Stock Cards (Pure Display, NO edit button here) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {displayProducts.map((prod, idx) => {
          const isLowStock = prod.stock > 0 && prod.stock <= 5;
          const isOutOfStock = prod.stock <= 0;

          return (
            <div
              key={`dash-prod-${idx}`}
              className={`bg-[#12151f] border rounded-2xl p-3 sm:p-3.5 relative overflow-hidden group transition-all flex flex-col justify-between ${
                isOutOfStock
                  ? 'border-rose-500/40 hover:border-rose-500/70'
                  : isLowStock
                  ? 'border-amber-500/40 hover:border-amber-500/70'
                  : 'border-[#1e2436] hover:border-pink-500/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1">
                  <span
                    className="text-xs font-bold text-white tracking-tight line-clamp-1 group-hover:text-pink-300 transition-colors flex-1"
                    title={prod.name}
                  >
                    {prod.name}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
                    <Package className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="mt-2 text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-baseline justify-center sm:justify-start gap-1">
                    <span
                      className={
                        isOutOfStock
                          ? 'text-rose-400'
                          : isLowStock
                          ? 'text-amber-400'
                          : 'text-pink-500'
                      }
                    >
                      {prod.stock}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-gray-300">পিস</span>
                  </div>

                  <div className="flex items-center justify-center sm:justify-between mt-1 gap-1 flex-wrap sm:flex-nowrap">
                    <p
                      className={`text-[10px] font-semibold flex items-center justify-center gap-1 ${
                        isOutOfStock
                          ? 'text-rose-400'
                          : isLowStock
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>
                        {isOutOfStock
                          ? 'স্টক শেষ'
                          : isLowStock
                          ? 'কম স্টক'
                          : 'মজুদ স্টক'}
                      </span>
                    </p>
                    <span className="text-[9px] font-mono text-gray-400 bg-[#161a26] px-1 rounded border border-[#22293d]">
                      {prod.cell}
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-pink-500/5 rounded-full blur-xl pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* All Product Order Calendar (তারিখ অনুযায়ী কবে কয়টা অর্ডার) */}
      <OrderCalendar
        orders={orders}
        onSelectOrder={onSelectOrder}
        listProductNames={dynamicProductNames}
      />

      {/* Stock Management & Cancel/Return Approval Section */}
      <div className="pt-2">
        <StockManagerHome
          products={products}
          orders={orders}
          onUpdateProductStock={onUpdateProductStock}
          onApproveCancelReturn={onApproveCancelReturn}
          stockLogs={stockLogs}
          onAddProduct={onAddProduct}
          sheet3Entries={sheet3Entries}
          onUpdateSheet3Entry={onUpdateSheet3Entry}
          onAddSheet3Entry={onAddSheet3Entry}
          onRefreshSheet3={onRefreshSheet3}
          isRefreshingSheet3={isRefreshingSheet3}
          listProductNames={dynamicProductNames}
        />
      </div>
    </div>
  );
};
