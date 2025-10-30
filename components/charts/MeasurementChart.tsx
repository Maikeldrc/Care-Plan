

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { MeasurementTarget, TargetValue } from '../../types';
import { metricDefinitions } from '../../data/metricDefinitions';

interface MeasurementChartProps {
  target: MeasurementTarget;
}

const formatTargetValue = (target: TargetValue, unit: string): string => {
    if (!target) return `N/A ${unit}`;
    const { operator, value_min, value_max } = target;
    if (operator === 'range') {
        return `${value_min} - ${value_max} ${unit}`;
    }
    const displayOperator = operator.replace('<=', '≤').replace('>=', '≥');
    const value = operator === '>' || operator === '>=' ? value_min : value_max;
    return `${displayOperator} ${value} ${unit}`;
};

export const MeasurementChart: React.FC<MeasurementChartProps> = ({ target }) => {
  const { operator, value_min, value_max } = target.target;
  const unit = metricDefinitions.find(m => m.name === target.name)?.unit || '';
  const primaryTargetValue = operator === '>' || operator === '>=' ? value_min : value_max;

  return (
    <div className="p-4 border border-brand-gray-200 rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-semibold text-brand-gray-800">{target.name}</h4>
          <p className="text-sm text-brand-gray-500">Target: {formatTargetValue(target.target, unit)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-brand-gray-500">Latest</p>
          <p className="text-lg font-bold text-brand-gray-900">{target.latestValue} {unit}</p>
          <p className={`text-sm font-semibold ${target.delta > 0 ? 'text-red-500' : 'text-green-500'}`}>
            Delta {target.delta > 0 ? `+${target.delta.toFixed(1)}` : target.delta.toFixed(1)}
          </p>
        </div>
      </div>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <AreaChart data={target.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={['dataMin - 10', 'dataMax + 10']} />
            <Tooltip />
            {primaryTargetValue !== null && operator !== 'range' && (
              <ReferenceLine y={primaryTargetValue} label={{ value: 'Target', position: 'insideTopLeft', fill: '#EF4444' }} stroke="#EF4444" strokeDasharray="3 3" />
            )}
            {operator === 'range' && value_min !== null && (
              <ReferenceLine y={value_min} label={{ value: 'Min', position: 'insideBottomLeft', fill: '#3B82F6' }} stroke="#3B82F6" strokeDasharray="3 3" />
            )}
            {operator === 'range' && value_max !== null && (
              <ReferenceLine y={value_max} label={{ value: 'Max', position: 'insideTopLeft', fill: '#3B82F6' }} stroke="#3B82F6" strokeDasharray="3 3" />
            )}
            <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-brand-gray-400 mt-2 text-center">Chart shows {target.name} measurements over the selected time period with target reference line</p>
    </div>
  );
};