import React, { useState, useMemo } from 'react';
import type { CarePlan, Goal } from '../../types';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { ShareIcon } from '../icons/ShareIcon';
import { AiOptimizationModal } from '../modals/AiOptimizationModal';
import { FloppyDiskIcon } from '../icons/FloppyDiskIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { TargetIcon } from '../icons/TargetIcon';

interface SummaryStepProps {
    carePlan: CarePlan;
    setCarePlan: React.Dispatch<React.SetStateAction<CarePlan>>;
}

const statusColors: { [key: string]: string } = {
  'On track': 'bg-green-100 text-green-800',
  'At risk': 'bg-yellow-100 text-yellow-800',
  'Active': 'bg-blue-100 text-blue-800',
  'Resolved': 'bg-green-100 text-green-800'
};

const chip = (text: string, colorClass: string, key?: string | number) => <span key={key} className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>{text}</span>;

const AccordionItem: React.FC<{ title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-brand-gray-200 rounded-lg">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left">
                <div className="flex-1">{title}</div>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="p-4 border-t border-brand-gray-200">{children}</div>}
        </div>
    );
};

const GoalSummary: React.FC<{ goal: Goal }> = ({ goal }) => (
    <div className="space-y-4">
        <div>
            <h5 className="font-semibold text-brand-gray-700">Metrics</h5>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {goal.metrics.map(m => <div key={m.name} className="p-2 bg-white rounded border text-sm"><strong className="text-brand-gray-600">{m.name}:</strong> {m.current} {m.unit}</div>)}
            </div>
        </div>
        <div>
            <h5 className="font-semibold text-brand-gray-700">Tasks</h5>
            <ul className="list-disc list-inside text-sm pl-2 mt-2 space-y-1 text-brand-gray-600">
                {goal.tasks.length > 0 ? goal.tasks.map(task => <li key={task.id}>{task.title} <span className="text-xs">({task.status})</span></li>) : <li>No tasks defined.</li>}
            </ul>
        </div>
        {goal.qualityMeasures.length > 0 && <div>
            <h5 className="font-semibold text-brand-gray-700">Quality Measures</h5>
            <div className="flex flex-wrap gap-2 mt-2">
                {goal.qualityMeasures.map(qm => chip(qm, 'bg-green-100 text-green-800', qm))}
            </div>
        </div>}
    </div>
);

export const SummaryStep: React.FC<SummaryStepProps> = ({ carePlan, setCarePlan }) => {
    const [isOptimizeModalOpen, setIsOptimizeModalOpen] = useState(false);

    const { progressValue, showAiAlert } = useMemo(() => {
        const totalGoals = carePlan.goals.length;
        const onTrackGoals = carePlan.goals.filter(g => g.status === 'On track').length;
        const progress = totalGoals > 0 ? 20 + Math.round((onTrackGoals / totalGoals) * 60) : 20;
        const hasMisalignedTarget = carePlan.goals.some(g => 
            g.qualityMeasures.includes('CMS165') && 
            g.metrics.some(m => m.name === 'Systolic BP' && m.target.value_max !== 130)
        );
        return { progressValue: progress, showAiAlert: hasMisalignedTarget };
    }, [carePlan.goals]);

    const SummaryCard: React.FC<{title: string; icon: React.ReactNode; children: React.ReactNode;}> = ({title, icon, children}) => (
         <div className="bg-white p-6 border border-brand-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-brand-blue">{icon}</div>
                <h3 className="text-lg font-bold text-brand-gray-900">{title}</h3>
            </div>
            {children}
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-brand-gray-900">Care Plan Summary</h2>
                <p className="text-brand-gray-500 mt-1">Review the complete care plan before saving or sharing.</p>
            </div>
             <div className="space-y-4">
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-brand-blue">Overall Progress</span>
                        <span className="text-sm font-medium text-brand-blue">{progressValue}% Complete</span>
                    </div>
                    <div className="w-full bg-brand-gray-200 rounded-full h-2.5">
                        <div className="bg-brand-blue h-2.5 rounded-full" style={{ width: `${progressValue}%` }}></div>
                    </div>
                </div>
                {showAiAlert && (
                    <div className="p-4 bg-blue-50 border border-brand-blue rounded-lg flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center mt-1">
                             <AiSparkleIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-brand-blue">AI Insight</h4>
                            <p className="text-sm text-brand-gray-700">Gemini has identified potential optimizations in your care plan. Click “Optimize Care Plan” to review suggestions.</p>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-2">
                    <SummaryCard title="Care Program & Patient Overview" icon={<ClipboardListIcon className="w-5 h-5" />}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-sm">
                            <div><strong className="block text-brand-gray-500">Program</strong> <span className="text-brand-gray-800">{carePlan.careProgram}</span></div>
                            <div><strong className="block text-brand-gray-500">Timeframe</strong> <span className="text-brand-gray-800">{carePlan.timeframe.targetHorizon}</span></div>
                            <div><strong className="block text-brand-gray-500">Start Date</strong> <span className="text-brand-gray-800">{new Date(carePlan.timeframe.startDate).toLocaleDateString()}</span></div>
                            <div><strong className="block text-brand-gray-500">Priority</strong> {chip(carePlan.timeframe.priority, 'bg-orange-100 text-orange-800')}</div>
                            <div className="col-span-full"><strong className="block text-brand-gray-500">Primary Diagnoses</strong> <div className="flex flex-wrap gap-2 mt-1">{carePlan.diagnoses.primary.map((dx, i) => chip(dx, 'bg-red-100 text-red-800', i))}</div></div>
                        </div>
                    </SummaryCard>
                </div>
                <div className="lg:col-span-2">
                    <SummaryCard title="Goals & Tasks" icon={<TargetIcon className="w-5 h-5" />}>
                         <div className="space-y-3">
                            {carePlan.goals.map((goal, index) => (
                                <AccordionItem 
                                    key={goal.id} 
                                    defaultOpen={index === 0}
                                    title={
                                        <div className="flex items-center gap-3">
                                            {chip(goal.status, statusColors[goal.status])}
                                            <h4 className="font-semibold text-brand-gray-800">{goal.title}</h4>
                                            {chip(goal.priority, `bg-orange-100 text-orange-800`)}
                                        </div>
                                    }
                                >
                                    <GoalSummary goal={goal} />
                                </AccordionItem>
                            ))}
                         </div>
                    </SummaryCard>
                </div>
                <SummaryCard title="Barriers & Mitigations" icon={<ShieldCheckIcon className="w-5 h-5" />}>
                     <div className="space-y-3">
                        {carePlan.barriers.filter(b => b.status === 'Active').map(barrier => (
                            <div key={barrier.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                <h4 className="font-semibold text-yellow-900">{barrier.category}</h4>
                                <p className="text-sm text-yellow-800 mt-1">{barrier.description}</p>
                            </div>
                        ))}
                        {carePlan.barriers.filter(b => b.status === 'Active').length === 0 && <p className="text-sm text-brand-gray-500">No active barriers identified.</p>}
                     </div>
                </SummaryCard>
                 <SummaryCard title="Patient Education & Instructions" icon={<CalendarIcon className="w-5 h-5" />}>
                    <h5 className="font-semibold text-brand-gray-700">Instructions</h5>
                    <ul className="list-decimal list-inside text-sm space-y-1 text-brand-gray-600">
                        {carePlan.instructions.slice(0, 3).map(i => <li key={i.id}>{i.title}</li>)}
                        {carePlan.instructions.length > 3 && <li className="text-xs italic">...and {carePlan.instructions.length - 3} more</li>}
                    </ul>
                     <h5 className="font-semibold text-brand-gray-700 mt-4">Education</h5>
                     <ul className="list-disc list-inside text-sm space-y-1 text-brand-gray-600">
                        {carePlan.education.slice(0, 3).map(e => <li key={e.id}>{e.title} ({e.status})</li>)}
                        {carePlan.education.length > 3 && <li className="text-xs italic">...and {carePlan.education.length - 3} more</li>}
                    </ul>
                 </SummaryCard>
            </div>
            
            <div className="pt-8 mt-8 border-t border-brand-gray-200 flex justify-between items-center flex-wrap gap-4">
                 <div className="flex items-center gap-3">
                    <button onClick={() => setIsOptimizeModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-md font-semibold hover:bg-blue-600 text-sm shadow-sm">
                        <AiSparkleIcon className="w-5 h-5"/> Optimize with Gemini
                    </button>
                    <button onClick={() => alert("Saving care plan...")} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-md font-semibold hover:bg-blue-600 text-sm shadow-sm">
                        <FloppyDiskIcon className="w-5 h-5"/> Save Care Plan
                    </button>
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-300 rounded-md font-semibold text-brand-gray-700 hover:bg-brand-gray-50 text-sm">
                        <DownloadIcon className="w-5 h-5"/> Export as PDF
                    </button>
                    <button onClick={() => alert("Sharing...")} className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-300 rounded-md font-semibold text-brand-gray-700 hover:bg-brand-gray-50 text-sm">
                        <ShareIcon className="w-5 h-5"/> Share
                    </button>
                </div>
            </div>

            <AiOptimizationModal
                isOpen={isOptimizeModalOpen}
                onClose={() => setIsOptimizeModalOpen(false)}
                carePlan={carePlan}
                onApply={(optimizedPlan) => {
                    setCarePlan(optimizedPlan);
                    setIsOptimizeModalOpen(false);
                }}
            />
        </div>
    );
};
