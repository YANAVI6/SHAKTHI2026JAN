import {
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Trophy,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import celebrationBg from "@assets/generated_images/celebration_confetti_background.png";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-brand-purple/10 rounded-lg text-brand-purple">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">+12%</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">Recovered Today</p>
            <h3 className="text-2xl font-display font-bold text-gray-900">₹45,200</h3>
            <Progress value={65} className="h-1.5 mt-4 bg-gray-100" indicatorClassName="bg-brand-purple" />
            <p className="text-xs text-gray-400 mt-2">Target: ₹70,000</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg text-brand-blue">
                <Phone className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-500">45/80</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">Calls Made</p>
            <h3 className="text-2xl font-display font-bold text-gray-900">45</h3>
            <div className="flex gap-1 mt-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h - 1.5 flex - 1 rounded - full ${i < 3 ? 'bg-brand-blue' : 'bg-gray-100'} `}></div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">3 hours remaining</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-100 rounded-lg text-brand-orange">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-brand-orange bg-orange-50 px-2 py-1 rounded-full">High</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">PTPs Collected</p>
            <h3 className="text-2xl font-display font-bold text-gray-900">8</h3>
            <p className="text-sm text-gray-400 mt-4">Value: <span className="font-semibold text-gray-700">₹1.2L</span></p>
            <p className="text-xs text-gray-400 mt-1">Promise to Pay</p>
          </CardContent>
        </Card>

        {/* Gamification Card */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-brand-purple to-indigo-600 text-white overflow-hidden relative group cursor-pointer">
          <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: `url(${celebrationBg})`, backgroundSize: 'cover' }}></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm text-white">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="animate-pulse w-2 h-2 bg-yellow-400 rounded-full"></span>
            </div>
            <p className="text-sm text-purple-100 mb-1">Daily Streak</p>
            <h3 className="text-2xl font-display font-bold text-white">5 Days 🔥</h3>
            <p className="text-xs text-purple-200 mt-4">Next Reward: <span className="font-bold text-white">Amazon Voucher</span></p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
        {/* Main Active Case Panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Active Case
          </h2>

          <Card className="flex-1 border-none shadow-lg shadow-gray-200/50 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-2xl font-display font-bold text-gray-900">Rajesh Kumar</h3>
                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100">Overdue: 45 Days</Badge>
                  </div>
                  <p className="text-gray-500 flex items-center gap-2 text-sm">
                    <span className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">ID</span>
                    LN-2024-88392
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Outstanding Amount</p>
                  <p className="text-2xl font-bold text-red-600">₹1,25,000</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Risk Score</p>
                  <p className="font-bold text-gray-900 flex items-center gap-2">
                    High
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Last Interaction</p>
                  <p className="font-bold text-gray-900">2 Days ago</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Preferred Lang</p>
                  <p className="font-bold text-gray-900">Hindi / English</p>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-gray-50/50 p-6 flex flex-col gap-6 overflow-y-auto">
              {/* Action Area */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 animate-pulse">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">+91 98765 43210</p>
                      <p className="text-xs text-green-600 font-medium">Ready to call</p>
                    </div>
                  </div>
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8 shadow-lg shadow-green-600/20">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Now
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button variant="outline" className="h-12 border-2 hover:bg-green-50 hover:border-green-200 hover:text-green-700">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Paid
                  </Button>
                  <Button variant="outline" className="h-12 border-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700">
                    <Clock className="w-4 h-4 mr-2" />
                    PTP
                  </Button>
                  <Button variant="outline" className="h-12 border-2 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Callback
                  </Button>
                  <Button variant="outline" className="h-12 border-2 hover:bg-red-50 hover:border-red-200 hover:text-red-700">
                    <XCircle className="w-4 h-4 mr-2" />
                    No Answer
                  </Button>
                </div>
              </div>

              {/* History Snippet */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-3">Recent Activity</h4>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-gray-300 mt-2"></div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100 text-sm flex-1">
                      <p className="text-gray-900 font-medium">Call Not Answered</p>
                      <p className="text-gray-500 text-xs">Nov 28, 10:30 AM • Agent Alex</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-orange-400 mt-2"></div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100 text-sm flex-1">
                      <p className="text-gray-900 font-medium">Promise to Pay (Broken)</p>
                      <p className="text-gray-500 text-xs">Nov 25, 02:15 PM • Agent Alex</p>
                      <p className="text-gray-600 mt-1 italic">"Said he will pay by evening via UPI"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar - Queue */}
        <div className="flex flex-col gap-4 h-full">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Up Next</h2>
            <Button variant="ghost" size="sm" className="text-brand-purple hover:text-brand-purple/80">View All</Button>
          </div>

          <Card className="flex-1 border-none shadow-sm bg-white overflow-hidden flex flex-col">
            <div className="p-2 flex-1 overflow-y-auto">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors border-b border-gray-50 last:border-0 group">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-gray-900 text-sm group-hover:text-brand-purple transition-colors">Amit Patel</p>
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Med Risk</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">₹45,000 • 32 Days</p>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:text-brand-purple">
                      <Phone className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <div className="bg-brand-purple/10 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-purple text-white flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-purple">AI Insight</p>
                  <p className="text-[10px] text-brand-purple/80">Call "Medium Risk" cases now for higher pickup rates.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
