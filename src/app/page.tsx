'use client';

import { Button } from '@/components/ui/button';
import { Star, Flame, Shield } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

const data = [{ v: 1 }, { v: 4 }, { v: 2 }, { v: 6 }, { v: 3 }, { v: 8 }, { v: 5 }];

export default function Home() {
    return (
        <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
            <div className="flex flex-col gap-6 p-8 bg-[#141417] rounded-xl border border-gray-800 w-80">
                <h1 className="text-orange-500 font-bold text-xl">P.I.T — Teste Task 1.2</h1>

                {/* shadcn/ui Button */}
                <div className="flex flex-col gap-2">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">shadcn/ui</p>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                        Botão shadcn ✓
                    </Button>
                </div>

                {/* lucide-react Icons */}
                <div className="flex flex-col gap-2">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">lucide-react</p>
                    <div className="flex gap-3">
                        <Star className="text-orange-500" size={24} />
                        <Flame className="text-orange-400" size={24} />
                        <Shield className="text-orange-300" size={24} />
                    </div>
                </div>

                {/* recharts */}
                <div className="flex flex-col gap-2">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">recharts</p>
                    <ResponsiveContainer width="100%" height={80}>
                        <LineChart data={data}>
                            <Line type="monotone" dataKey="v" stroke="#f97316" strokeWidth={2} dot={false} />
                            <Tooltip contentStyle={{ background: '#141417', border: '1px solid #374151', color: '#fff' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
