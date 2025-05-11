"use client";

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
import { motion } from "framer-motion";
import { StakingOptionType } from "@/hooks/useContracts";

interface APYComparisonProps {
  options: StakingOptionType[];
}

export default function APYComparison({ options }: APYComparisonProps) {
  if (!options || options.length === 0) return null;
  
  // Transform options data for the chart
  const chartData = options.map(option => ({
    name: option.name,
    apy: parseFloat(option.apy.replace('%', '')),
    lockDays: option.lockPeriodInDays
  }));
  
  return (
    <motion.div 
      className="minimalist-card p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <h3 className="text-lg font-semibold mb-4">APY Comparison</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#000' }} 
              axisLine={{ stroke: '#000' }}
            />
            <YAxis 
              label={{ 
                value: 'APY (%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#000' }
              }}
              tick={{ fill: '#000' }}
              axisLine={{ stroke: '#000' }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '4px'
              }}
              formatter={(value: number) => [`${value}%`, 'APY']}
            />
            <Bar 
              dataKey="apy" 
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.lockDays > 0 ? '#000000' : '#666666'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        <div className="flex justify-center mt-4 text-sm">
          <div className="flex items-center mr-6">
            <div className="w-3 h-3 bg-black rounded-sm mr-2"></div>
            <span>Locked staking</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-600 rounded-sm mr-2"></div>
            <span>Flexible staking</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}