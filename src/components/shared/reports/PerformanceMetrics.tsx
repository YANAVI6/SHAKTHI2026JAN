import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { IndianRupee, FileText, PieChart } from 'lucide-react';
import { PerformanceStats } from '../../../services/analyticsService';

interface PerformanceMetricsProps {
    stats: PerformanceStats;
    isLoading: boolean;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ stats, isLoading }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Cases */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    {isLoading ? (
                        <div className="animate-pulse space-y-2 w-full">
                            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Total Assigned Cases</p>
                                <h3 className="text-2xl font-bold text-gray-900">{stats.totalCases.toLocaleString()}</h3>
                            </div>
                            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
                                <FileText className="w-6 h-6" />
                            </div>
                        </>
                    )}
                </div>

                {/* Total Collected */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    {isLoading ? (
                        <div className="animate-pulse space-y-2 w-full">
                            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                            <div className="h-8 bg-green-100 rounded w-3/4"></div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Total Collected</p>
                                <h3 className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalCollected)}</h3>
                            </div>
                            <div className="p-4 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-100 transition-colors">
                                <IndianRupee className="w-6 h-6" />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Charts Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
                <h3 className="text-lg font-bold text-gray-900 mb-6 font-display">Case Status Distribution</h3>

                {isLoading ? (
                    <div className="animate-pulse space-y-6">
                        <div className="h-64 bg-gray-50/50 rounded-xl flex items-end justify-around p-4 gap-2">
                            {[60, 80, 45, 90, 30, 70, 50].map((h, i) => (
                                <div key={i} className="bg-gray-200 rounded-t-lg w-full" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                        <div className="flex justify-between px-2">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-3 bg-gray-100 rounded w-8"></div>
                            ))}
                        </div>
                    </div>
                ) : stats.statusDistribution.length === 0 ? (
                    <div className="h-80 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <PieChart className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-sm font-medium">No outcome data available</span>
                    </div>
                ) : (
                    <div className="w-full h-80 relative" style={{ minHeight: '320px' }}>
                        <ResponsiveContainer width="99%" height="100%">
                            <BarChart
                                data={stats.statusDistribution}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="status"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 11 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 11 }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6', opacity: 0.4 }}
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                        padding: '12px'
                                    }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50} animationDuration={1000}>
                                    {stats.statusDistribution.map((_entry: unknown, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};
