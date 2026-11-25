/* Fictional sample dataset: 30 days × 5 menu items. All amounts are illustrative CNY. */
const MENU_ITEMS = [
  { name: '经典美式', category: '咖啡', price: 28 },
  { name: '燕麦拿铁', category: '咖啡', price: 32 },
  { name: '焦糖玛奇朵', category: '咖啡', price: 36 },
  { name: '抹茶拿铁', category: '茶饮', price: 34 },
  { name: '可颂套餐', category: '烘焙', price: 24 }
];
const SAMPLE_STORES = ['暖木店', '街角店', '河畔店'];
const SAMPLE_CHANNELS = ['堂食', '外卖', '自提'];
const SAMPLE_PAYMENTS = ['移动支付', '银行卡', '现金'];
const SAMPLE_DAYS = 30;

// Fixed fictional period keeps the demo reproducible and usable offline.
const SALES_DATA = Array.from({ length: SAMPLE_DAYS }, (_, dayIndex) => {
  const date = new Date(Date.UTC(2025, 0, dayIndex + 1));
  const dateKey = date.toISOString().slice(0, 10);
  const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
  return MENU_ITEMS.map((menu, menuIndex) => {
    // Predictable variation with a weekend lift; quantities remain fictional.
    const units = 20 + (dayIndex % 10) + menuIndex * 3 + (weekend ? 5 : 0);
    const storeIndex = (dayIndex + menuIndex) % SAMPLE_STORES.length;
    const channelIndex = (dayIndex * 2 + menuIndex) % SAMPLE_CHANNELS.length;
    const paymentIndex = (dayIndex + menuIndex * 2) % SAMPLE_PAYMENTS.length;
    const hour = 8 + ((dayIndex * 3 + menuIndex * 2) % 15);
    const memberUnits = Math.round(units * (0.42 + ((dayIndex + menuIndex) % 4) * 0.06));
    return {
      date: dateKey, menu: menu.name, category: menu.category, units,
      unitPrice: menu.price, revenue: units * menu.price,
      store: SAMPLE_STORES[storeIndex], channel: SAMPLE_CHANNELS[channelIndex],
      payment: SAMPLE_PAYMENTS[paymentIndex], memberUnits, hour
    };
  });
}).flat();
