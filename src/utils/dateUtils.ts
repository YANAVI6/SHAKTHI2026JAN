export const getDateRangeString = (period: 'daily' | 'weekly' | 'monthly'): string => {
  const now = new Date();

  if (period === 'daily') {
    return now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  if (period === 'weekly') {
    const currentDay = now.getDay();
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return `${startOfWeek.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }

  if (period === 'monthly') {
    return now.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric'
    });
  }

  return '';
};

export const getCurrentPeriodLabel = (period: 'daily' | 'weekly' | 'monthly'): string => {
  if (period === 'daily') return 'Today';
  if (period === 'weekly') return 'This Week';
  if (period === 'monthly') return 'This Month';
  return '';
};

export const formatIndianCurrency = (amount: number | string | null | undefined): string => {
  // Handle null, undefined, or empty values
  if (amount === null || amount === undefined || amount === '') {
    return '₹0';
  }

  // Convert to number if it's a string
  let numAmount: number;
  if (typeof amount === 'string') {
    // Remove any existing currency symbols, commas, and spaces
    const cleanedAmount = amount.replace(/[₹,\s]/g, '');
    numAmount = parseFloat(cleanedAmount);
  } else {
    numAmount = amount;
  }

  // Handle NaN or invalid numbers
  if (isNaN(numAmount)) {
    return '₹0';
  }

  // Format using Indian number system
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(numAmount);
};

export const getPerformanceStatus = (current: number, target: number): 'on-track' | 'behind' | 'critical' | 'no-target' => {
  if (target === 0) return 'no-target';

  const percentage = (current / target) * 100;

  if (percentage >= 80) return 'on-track';
  if (percentage >= 50) return 'behind';
  return 'critical';
};

export const getStatusColor = (status: 'on-track' | 'behind' | 'critical' | 'no-target'): string => {
  switch (status) {
    case 'on-track':
      return 'text-green-700 bg-green-100 border-green-300';
    case 'behind':
      return 'text-yellow-700 bg-yellow-100 border-yellow-300';
    case 'critical':
      return 'text-red-700 bg-red-100 border-red-300';
    case 'no-target':
      return 'text-gray-700 bg-gray-100 border-gray-300';
    default:
      return 'text-gray-700 bg-gray-100 border-gray-300';
  }
};

export const getStatusBadge = (status: 'on-track' | 'behind' | 'critical' | 'no-target'): { text: string; icon: string } => {
  switch (status) {
    case 'on-track':
      return { text: 'On Track', icon: '✓' };
    case 'behind':
      return { text: 'Behind', icon: '⚠' };
    case 'critical':
      return { text: 'Critical', icon: '!' };
    case 'no-target':
      return { text: 'No Target', icon: '-' };
    default:
      return { text: 'Unknown', icon: '?' };
  }
};

export const calculateProgress = (current: number, target: number): number => {
  if (target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
};
