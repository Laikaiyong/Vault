"use client";

import { useState, useEffect } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { motion } from "framer-motion";
import { ethers } from "ethers";

interface RewardsForecastProps {
  stakingAmount: string;
  apy: number;
  lockPeriodInDays: number;
}

// Estimate rewards at the given time
const calculateRewards = (
  amount: number, 
  apy: number, 
  daysElapsed: number
): number => {
  // Convert APY to daily rate
  const dailyRate = apy / 365;
  return amount * (dailyRate / 100) * daysElapsed;
};

export default function RewardsForecast({
  stakingAmount,
  apy,
  lockPeriodInDays
}: RewardsForecastProps) {
  const [data, setData] = useState<any[]>([]);
  
  useEffect(() => {
    if (!stakingAmount || parseFloat(stakingAmount) === 0) {
      setData([]);
      return;
    }
    
    const amount = parseFloat(stakingAmount);
    const chartData = [];
    
    // Calculate forecast based on days (create data points)
    // For locked staking we'll show through lock period
    // For flexible staking, we'll show a year
    const forecastPeriod = lockPeriodInDays > 0 ? lockPeriodInDays : 365;
    const interval = Math.max(1, Math.floor(forecastPeriod / 10)); // At most 10 data points
    
    for (let day = 0; day <= forecastPeriod; day += interval) {
      const rewards = calculateRewards(amount, apy, day);
      chartData.push({
        day,
        rewards: parseFloat(rewards.toFixed(6)),
        total: parseFloat((amount + rewards).toFixed(6))
      });
    }
    
    // Add the exact end of lock period for locked stakes
    if (lockPeriodInDays > 0) {
      const day = lockPeriodInDays;
      const rewards = calculateRewards(amount, apy, day);
      // Only add if not already in the data
      if (!chartData.find(d => d.day === day)) {
        chartData.push({
          day,
          rewards: parseFloat(rewards.toFixed(6)),
          total: parseFloat((amount + rewards).toFixed(6)),
          isLockEnd: true
        });
      }
    }
    
    // Sort by day to ensure proper order
    chartData.sort((a, b) => a.day - b.day);
    
    setData(chartData);
  }, [stakingAmount, apy, lockPeriodInDays]);
  
  if (data.length === 0) return null;
  
  return (
    <motion.div 
      className="minimalist-card p-4 mt-4"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-semibold mb-4">Estimated Rewards Over Time</h3>
      <div className="text-sm mb-4">
        <div className="flex justify-between">
          <div>Initial stake: <span className="font-medium">{stakingAmount} TOKEN</span></div>
          <div>APY: <span className="font-medium">{apy}%</span></div>
        </div>
        <div className="mt-2">
          <div>
            Estimated rewards after {lockPeriodInDays > 0 ? lockPeriodInDays : 365} days: 
            <span className="font-medium"> 
              {data[data.length - 1]?.rewards.toFixed(6)} TOKEN
            </span>
          </div>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
            <XAxis 
              dataKey="day" 
              label={{ value: 'Days', position: 'insideBottom', offset: -5 }} 
              stroke="#000"
            />
            <YAxis stroke="#000" />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '4px'
              }}
              formatter={(value: number) => [`${value.toFixed(6)} TOKEN`, undefined]}
              labelFormatter={(day) => `Day ${day}`}
            />
            <Line 
              type="monotone" 
              dataKey="rewards" 
              name="Rewards" 
              stroke="#000" 
              strokeWidth={2} 
              dot={{ fill: '#000', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#000' }}
            />
            {lockPeriodInDays > 0 && (
              <ReferenceLine
                x={lockPeriodInDays}
                stroke="rgba(0, 0, 0, 0.5)"
                strokeDasharray="3 3"
                label={{ value: 'Unlock', position: 'insideTopRight', fill: '#000' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}