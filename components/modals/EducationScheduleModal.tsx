

import React, { useState, useEffect } from 'react';
import type { CarePlan, EducationMaterial, EducationSchedule } from '../../types';
import { getAiEducationScheduleSuggestion } from '../../services/geminiService';
import { XIcon } from '../icons/XIcon';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';

interface EducationScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: EducationMaterial) => void;
  material: EducationMaterial;
  carePlan: CarePlan;
}

const baseInputStyles = "block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue bg-white";
const inputStyles = `${baseInputStyles} h-10 px-3 py-2`;
const selectStyles = `${baseInputStyles} h-10 pl-3 pr-10 py-2`;
const checkboxStyles = "h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue focus:ring-2 bg-white";

const getInitialSchedule = (material: EducationMaterial): EducationSchedule => {
  return material.schedule || {
    type: 'now',
    fixedAt: null,
    relative: null,
    recurring: { enabled: false, freq: 'WEEKLY', count: 1 },
  };
};

export const EducationScheduleModal: React.FC<EducationScheduleModalProps> = ({ isOpen, onClose, onSave, material, carePlan }) => {
  const [schedule, setSchedule] = useState<EducationSchedule>(getInitialSchedule(material));
  const [channels, setChannels] = useState<('App' | 'Email' | 'SMS')[]>(material.channels || ['App']);
  const [ackRequired, setAckRequired] = useState(material.ackRequired || false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ schedule: EducationSchedule, channels: ('App' | 'Email' | 'SMS')[], rationale: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSchedule(getInitialSchedule(material));
      setChannels(material.channels || ['App']);
      setAckRequired(material.ackRequired || false);
      setAiSuggestion(null);
    }
  }, [isOpen, material]);

  if (!isOpen) return null;
  
  const handleScheduleChange = (field: keyof EducationSchedule, value: any) => {
    setSchedule(prev => ({...prev, [field]: value}));
  };

  const handleChannelChange = (channel: 'App' | 'Email' | 'SMS') => {
    setChannels(prev => prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]);
  };

  const handleGenerateAiSuggestion = async () => {
    setIsAiLoading(true);
    try {
        const suggestion = await getAiEducationScheduleSuggestion(carePlan, material);
        setAiSuggestion(suggestion);
    } catch (error) {
        console.error("AI suggestion failed:", error);
        alert("Failed to get AI suggestion.");
    } finally {
        setIsAiLoading(false);
    }
  };

  const applyAiSuggestion = () => {
    if (aiSuggestion) {
        setSchedule(aiSuggestion.schedule);
        setChannels(aiSuggestion.channels);
        setAiSuggestion(null);
    }
  };

  const handleSave = () => {
    const updatedMaterial: EducationMaterial = {
        ...material,
        schedule,
        channels,
        ackRequired,
        status: schedule.type === 'now' ? 'Delivered' : 'Scheduled',
        last_updated: new Date().toISOString().split('T')[0],
        nextDeliveryAt: schedule.type === 'fixed' ? schedule.fixedAt : null,
    };
    onSave(updatedMaterial);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-brand-gray-900">Schedule Education Delivery</h2>
          <button onClick={onClose}><XIcon className="w-6 h-6 text-brand-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
            <div className="p-3 bg-brand-gray-50 rounded-lg border">
                <h3 className="font-semibold">{material.title}</h3>
                <p className="text-sm text-brand-gray-600 line-clamp-2">{material.summary}</p>
            </div>
          
            {aiSuggestion && (
                 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <h4 className="font-semibold text-brand-blue flex items-center gap-2"><AiSparkleIcon className="w-5 h-5"/>AI Suggestion</h4>
                    <p className="text-sm text-brand-gray-700 italic"><strong>Rationale:</strong> {aiSuggestion.rationale}</p>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setAiSuggestion(null)} className="text-xs font-semibold text-brand-gray-600 hover:underline">Dismiss</button>
                        <button onClick={applyAiSuggestion} className="px-3 py-1 bg-brand-blue text-white rounded-md text-xs font-semibold hover:bg-blue-600">Apply Suggestion</button>
                    </div>
                </div>
            )}

            <div>
                <label className="text-sm font-medium">Delivery Timing</label>
                <div className="mt-2 flex items-center gap-4">
                   {(['now', 'fixed', 'relative'] as const).map(type => (
                       <label key={type} className="flex items-center gap-2">
                           <input type="radio" name="scheduleType" value={type} checked={schedule.type === type} onChange={() => handleScheduleChange('type', type)} />
                           <span className="capitalize">{type}</span>
                       </label>
                   ))}
                </div>
            </div>

            {schedule.type === 'fixed' && (
                 <div>
                    <label className="text-sm font-medium">Date & Time</label>
                    <input type="datetime-local" value={schedule.fixedAt || ''} onChange={e => handleScheduleChange('fixedAt', e.target.value)} className={inputStyles}/>
                 </div>
            )}
            
            {schedule.type === 'relative' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">Relative to Event</label>
                        <select className={selectStyles} value={schedule.relative?.event || ''} onChange={e => handleScheduleChange('relative', {...schedule.relative, event: e.target.value})}>
                            <option value="lab_result">Lab Result Arrives</option>
                            <option value="visit_completed">Visit Completed</option>
                            <option value="target_out_of_range">Target Out of Range</option>
                        </select>
                    </div>
                     <div>
                        <label className="text-sm font-medium">Offset (days after)</label>
                        <input type="number" className={inputStyles} value={schedule.relative?.offset.days || 0} onChange={e => handleScheduleChange('relative', {...schedule.relative, offset: { days: parseInt(e.target.value) }})}/>
                    </div>
                </div>
            )}

            <div>
                <label className="text-sm font-medium">Delivery Channels</label>
                <div className="mt-2 flex items-center gap-4">
                    {(['App', 'Email', 'SMS'] as const).map(channel => (
                         <label key={channel} className="flex items-center gap-2">
                           <input type="checkbox" checked={channels.includes(channel)} onChange={() => handleChannelChange(channel)} className={checkboxStyles} />
                           <span>{channel}</span>
                       </label>
                    ))}
                </div>
            </div>

             <div className="pt-4 border-t">
                <label className="text-sm font-medium">Recurring Delivery</label>
                <div className="mt-2 flex items-center gap-4">
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={schedule.recurring?.enabled || false} onChange={e => handleScheduleChange('recurring', {...schedule.recurring, enabled: e.target.checked})} className={checkboxStyles}/>
                        <span>Enable recurring delivery</span>
                    </label>
                    {schedule.recurring?.enabled && (
                        <>
                             <select className={selectStyles} value={schedule.recurring.freq} onChange={e => handleScheduleChange('recurring', {...schedule.recurring, freq: e.target.value})}>
                                <option>WEEKLY</option><option>MONTHLY</option><option>DAILY</option>
                            </select>
                             <input type="number" min="1" className={inputStyles} value={schedule.recurring.count} onChange={e => handleScheduleChange('recurring', {...schedule.recurring, count: parseInt(e.target.value)})}/>
                             <span className="text-sm">times</span>
                        </>
                    )}
                </div>
            </div>
             <div className="pt-4 border-t">
                 <label className="text-sm font-medium">Require Acknowledgement</label>
                 <div className="mt-2 flex items-center gap-2">
                    <input type="checkbox" checked={ackRequired} onChange={e => setAckRequired(e.target.checked)} className={checkboxStyles}/>
                    <span>Patient must acknowledge or complete a quiz after viewing.</span>
                 </div>
             </div>

        </div>
        <div className="p-4 bg-brand-gray-50 flex justify-between items-center">
            <button onClick={handleGenerateAiSuggestion} disabled={isAiLoading} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-blue hover:bg-blue-50 disabled:opacity-50">
                <AiSparkleIcon className={`w-5 h-5 ${isAiLoading ? 'animate-aiPulse' : ''}`}/> {isAiLoading ? 'Analyzing...' : 'Suggest Schedule with AI'}
            </button>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">Save Schedule</button>
            </div>
        </div>
      </div>
    </div>
  );
};