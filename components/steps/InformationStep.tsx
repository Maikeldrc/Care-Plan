import React, { useState, useMemo, useEffect } from 'react';
import type { CarePlan, BaselineMetric } from '../../types';
import { AiSparkleIcon } from '../icons/AiSparkleIcon';
import { getAiInformationSuggestions } from '../../services/geminiService';
import { MultiSelectInput } from '../shared/MultiSelectInput';
import {
    predefinedComorbidities,
    predefinedAllergies,
    predefinedRiskFactors,
    conditionToIcdMap
} from '../../data/predefinedData';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { LightBulbIcon } from '../icons/LightBulbIcon';
import { LightningBoltIcon } from '../icons/LightningBoltIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { AddMetricModal } from '../modals/AddMetricModal';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { DeleteConfirmationModal } from '../modals/DeleteConfirmationModal';


interface InformationStepProps {
  carePlan: CarePlan;
  setCarePlan: React.Dispatch<React.SetStateAction<CarePlan>>;
  onGeneratePlan: () => void;
  isGenerating: boolean;
  onManualBuild: () => void;
}

const selectStyles = "mt-1 block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue h-10 pl-3 pr-10 py-2 bg-white";
const inputStyles = "mt-1 block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue h-10 px-3 py-2 bg-white";
const textareaStyles = "mt-1 block w-full border border-brand-gray-300 text-brand-gray-900 shadow-sm sm:text-sm rounded-md focus:ring-1 focus:ring-brand-blue focus:border-brand-blue px-3 py-2 bg-white";


export const InformationStep: React.FC<InformationStepProps> = ({
  carePlan,
  setCarePlan,
  onGeneratePlan,
  isGenerating,
  onManualBuild,
}) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false);
  const [metricToEdit, setMetricToEdit] = useState<BaselineMetric | null>(null);
  const [metricToDelete, setMetricToDelete] = useState<BaselineMetric | null>(null);

  const [aiSuggestedItems, setAiSuggestedItems] = useState<{
      primary: Set<string>;
      comorbidities: Set<string>;
      allergies: Set<string>;
      riskFactors: Set<string>;
  }>({
      primary: new Set(),
      comorbidities: new Set(),
      allergies: new Set(),
      riskFactors: new Set(),
  });
  
  const handleAiAutocomplete = async () => {
    setIsAiLoading(true);
    try {
        const suggestions = await getAiInformationSuggestions({ 
            primary: carePlan.diagnoses.primary,
            conditions: carePlan.diagnoses.comorbidities,
        });

        const newPrimary = [...new Set([...carePlan.diagnoses.primary, ...(suggestions.primary || [])])];
        const newComorbidities = [...new Set([...carePlan.diagnoses.comorbidities, ...(suggestions.comorbidities || [])])];
        const newRiskFactors = [...new Set([...carePlan.diagnoses.riskFactors, ...(suggestions.riskFactors || [])])];

        setAiSuggestedItems(prev => ({
            ...prev,
            primary: new Set([...prev.primary, ...(suggestions.primary || [])]),
            comorbidities: new Set([...prev.comorbidities, ...(suggestions.comorbidities || [])]),
            riskFactors: new Set([...prev.riskFactors, ...(suggestions.riskFactors || [])]),
        }));

        setCarePlan(prev => ({
            ...prev,
            diagnoses: {
                ...prev.diagnoses,
                primary: newPrimary,
                comorbidities: newComorbidities,
                riskFactors: newRiskFactors,
            }
        }));

    } catch (error) {
        console.error("AI auto-complete failed:", error);
    } finally {
        setIsAiLoading(false);
    }
  };
  
  const handleSaveMetric = (metric: BaselineMetric) => {
    setCarePlan(prev => {
        const existing = prev.clinicalContext.baselineMetrics.find(m => m.id === metric.id);
        const newMetrics = existing
            ? prev.clinicalContext.baselineMetrics.map(m => m.id === metric.id ? metric : m)
            : [...prev.clinicalContext.baselineMetrics, metric];
        
        return {
            ...prev,
            clinicalContext: {
                ...prev.clinicalContext,
                baselineMetrics: newMetrics,
            }
        }
    });
  };

  const handleEditMetric = (metric: BaselineMetric) => {
    setMetricToEdit(metric);
    setIsMetricModalOpen(true);
  };
  
  const handleConfirmDeleteMetric = () => {
    if (metricToDelete) {
        setCarePlan(prev => ({
            ...prev,
            clinicalContext: {
                ...prev.clinicalContext,
                baselineMetrics: prev.clinicalContext.baselineMetrics.filter(m => m.id !== metricToDelete.id)
            }
        }));
        setMetricToDelete(null);
    }
  };

  const summaryItems = useMemo(() => [
    { label: 'Care Program', value: carePlan.careProgram, completed: !!carePlan.careProgram },
    { label: 'Diagnoses', value: carePlan.diagnoses.primary.join(', '), completed: carePlan.diagnoses.primary.length > 0 },
    { label: 'Conditions', value: carePlan.diagnoses.comorbidities.join(', '), completed: carePlan.diagnoses.comorbidities.length > 0 },
    { label: 'Allergies', value: carePlan.diagnoses.allergies.join(', ') || 'NKDA (No Known Drug Allergies)', completed: true }, // Optional field, always complete
    { label: 'Risk Factors', value: carePlan.diagnoses.riskFactors.join(', ') || 'None specified', completed: true }, // Optional field
    { label: 'Timeframe', value: `${new Date(carePlan.timeframe.startDate).toLocaleDateString()} – ${carePlan.timeframe.targetHorizon} (${carePlan.timeframe.priority} priority)`, completed: !!carePlan.timeframe.startDate && !!carePlan.timeframe.targetHorizon && !!carePlan.timeframe.priority },
    { label: 'Clinical Context', value: carePlan.clinicalContext.patientPreferences || 'Prefers telehealth appointments and home monitoring', completed: true }, // Optional field
  ], [carePlan]);

  const requiredFields = useMemo(() => new Set(['Care Program', 'Diagnoses', 'Conditions']), []);

  const requiredFieldsCompleted = useMemo(() =>
    summaryItems
        .filter(item => requiredFields.has(item.label))
        .every(item => item.completed),
    [summaryItems, requiredFields]);
    
  const availableDiagnoses = useMemo(() => {
    const selectedConditions = carePlan.diagnoses.comorbidities;
    if (selectedConditions.length === 0) {
        return [];
    }
    
    const relatedCodes = new Set<string>();
    selectedConditions.forEach(condition => {
        const codes = conditionToIcdMap[condition];
        if (codes) {
            codes.forEach(code => relatedCodes.add(code));
        }
    });
    
    carePlan.diagnoses.primary.forEach(dx => relatedCodes.add(dx));

    return Array.from(relatedCodes).sort();
  }, [carePlan.diagnoses.comorbidities, carePlan.diagnoses.primary]);

  useEffect(() => {
    const availableSet = new Set(availableDiagnoses);
    const currentDiagnoses = carePlan.diagnoses.primary;
    if (carePlan.diagnoses.comorbidities.length > 0) {
        const validDiagnoses = currentDiagnoses.filter(dx => availableSet.has(dx));

        if (validDiagnoses.length !== currentDiagnoses.length) {
            setCarePlan(p => ({ ...p, diagnoses: { ...p.diagnoses, primary: validDiagnoses } }));
        }
    }
  }, [availableDiagnoses, carePlan.diagnoses.primary, carePlan.diagnoses.comorbidities.length, setCarePlan]);

  const careProgramError = !carePlan.careProgram;
  const conditionsError = carePlan.diagnoses.comorbidities.length === 0;
  const diagnosesError = carePlan.diagnoses.primary.length === 0;


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-gray-900">Care Plan Information</h2>
        <p className="text-brand-gray-500">Complete the intake form to generate a comprehensive care plan with AI or start building manually.</p>
      </div>

      <div className="space-y-6">
          {/* Card: Care Program */}
          <div className="p-6 border rounded-xl bg-white shadow-sm" style={{borderRadius: '12px'}}>
              <div className="flex items-center gap-3">
                  <ClipboardListIcon className="w-5 h-5" style={{color: '#6D28D9'}} />
                  <h3 className="font-semibold text-lg text-brand-gray-800" style={{fontSize: '16px'}}>Care Program</h3>
              </div>
              <p className="text-sm text-brand-gray-500 mt-1 pl-8" style={{color: '#6B7280', fontSize: '14px'}}>Select the type of care management program for this plan.</p>
              <div className="mt-4 pl-8">
                  <label className="block text-sm font-medium text-brand-gray-700">Care Program <span className="text-red-600">*</span></label>
                   <select value={carePlan.careProgram} onChange={e => setCarePlan(p => ({...p, careProgram: e.target.value}))} className={`${selectStyles} ${careProgramError ? 'border-red-600 text-red-600' : 'border-brand-gray-300'}`}>
                      <option value="">Select a program</option>
                      <option>CCM (Chronic Care Management)</option>
                      <option>RPM (Remote Patient Monitoring)</option>
                      <option>BHI (Behavioral Health Integration)</option>
                      <option>TCM (Transitional Care Management)</option>
                  </select>
                  {careProgramError && <p className="mt-1 text-sm text-red-600" style={{color: '#DC2626'}}>Care program is required.</p>}
              </div>
          </div>

          {/* Card: Clinical Information */}
          <div className="p-6 border rounded-xl bg-white shadow-sm" style={{borderRadius: '12px'}}>
              <div className="flex justify-between items-start">
                  <div>
                      <div className="flex items-center gap-3">
                        <BeakerIcon className="w-5 h-5" style={{color: '#6D28D9'}} />
                        <h3 className="font-semibold text-lg text-brand-gray-800" style={{fontSize: '16px'}}>Clinical Information</h3>
                      </div>
                      <p className="text-sm text-brand-gray-500 mt-1 pl-8" style={{color: '#6B7280', fontSize: '14px'}}>Select the patient’s conditions, diagnoses, allergies, and risk factors.</p>
                  </div>
                  <button onClick={handleAiAutocomplete} disabled={isAiLoading} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm font-semibold hover:bg-violet-50 disabled:opacity-50" style={{borderColor: '#6D28D9', color: '#6D28D9'}}>
                      <LightningBoltIcon className={`w-4 h-4 ${isAiLoading ? 'animate-aiPulse' : ''}`} />
                      Auto-complete with AI
                  </button>
              </div>
              <div className="mt-4 space-y-4 pl-8">
                  <MultiSelectInput
                      label="Conditions (Required)"
                      placeholder="Select or type conditions..."
                      data={predefinedComorbidities}
                      items={carePlan.diagnoses.comorbidities}
                      onItemsChange={items => setCarePlan(p => ({...p, diagnoses: {...p.diagnoses, comorbidities: items}}))}
                      aiItems={aiSuggestedItems.comorbidities}
                      chipColorClass="bg-blue-100 text-blue-800"
                  />
                  {conditionsError && <p className="mt-1 text-sm text-red-600" style={{color: '#DC2626'}}>At least one condition is required.</p>}
                  <MultiSelectInput
                      label="Diagnoses (ICD-10) (Required)"
                      placeholder={carePlan.diagnoses.comorbidities.length > 0 ? "Select or type diagnoses..." : "Select a condition first"}
                      data={availableDiagnoses}
                      items={carePlan.diagnoses.primary}
                      onItemsChange={items => setCarePlan(p => ({ ...p, diagnoses: { ...p.diagnoses, primary: items } }))}
                      aiItems={aiSuggestedItems.primary}
                      chipColorClass="bg-red-100 text-red-800"
                  />
                   {diagnosesError && <p className="mt-1 text-sm text-red-600" style={{color: '#DC2626'}}>At least one diagnosis is required.</p>}
                  <MultiSelectInput
                      label="Allergies (Optional)"
                      placeholder="Select or type allergies..."
                      data={predefinedAllergies}
                      items={carePlan.diagnoses.allergies}
                      onItemsChange={items => setCarePlan(p => ({...p, diagnoses: {...p.diagnoses, allergies: items}}))}
                      aiItems={aiSuggestedItems.allergies}
                      chipColorClass="bg-yellow-100 text-yellow-800"
                  />
                  <MultiSelectInput
                      label="Risk Factors (Optional)"
                      placeholder="Select or type risk factors..."
                      data={predefinedRiskFactors}
                      items={carePlan.diagnoses.riskFactors}
                      onItemsChange={items => setCarePlan(p => ({...p, diagnoses: {...p.diagnoses, riskFactors: items}}))}
                      aiItems={aiSuggestedItems.riskFactors}
                      chipColorClass="bg-orange-100 text-orange-800"
                  />
              </div>
          </div>
          
          {/* Card: Timeframe & Priority */}
          <div className="p-6 border rounded-xl bg-white shadow-sm" style={{borderRadius: '12px'}}>
                <div className="flex items-center gap-3">
                    <CalendarDaysIcon className="w-5 h-5" style={{color: '#6D28D9'}} />
                    <h3 className="font-semibold text-lg text-brand-gray-800" style={{fontSize: '16px'}}>Timeframe & Priority</h3>
                </div>
                <p className="text-sm text-brand-gray-500 mt-1 pl-8" style={{color: '#6B7280', fontSize: '14px'}}>Set the care plan timeline and priority level.</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pl-8">
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Start Date</label>
                    <input type="date" value={carePlan.timeframe.startDate} onChange={e => setCarePlan(p => ({...p, timeframe: {...p.timeframe, startDate: e.target.value}}))} className={inputStyles} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Target Horizon</label>
                     <select value={carePlan.timeframe.targetHorizon} onChange={e => setCarePlan(p => ({...p, timeframe: {...p.timeframe, targetHorizon: e.target.value}}))} className={selectStyles}>
                        <option>1 month</option><option>3 months</option><option>6 months</option><option>1 year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Priority</label>
                     <select value={carePlan.timeframe.priority} onChange={e => setCarePlan(p => ({...p, timeframe: {...p.timeframe, priority: e.target.value}}))} className={selectStyles}>
                        <option>Low</option><option>Medium</option><option>High</option>
                    </select>
                  </div>
              </div>
          </div>

          {/* Card: Clinical Context */}
          <div className="p-6 border rounded-xl bg-white shadow-sm" style={{borderRadius: '12px'}}>
                <div className="flex items-center gap-3">
                    <LightBulbIcon className="w-5 h-5" style={{color: '#6D28D9'}} />
                    <h3 className="font-semibold text-lg text-brand-gray-800" style={{fontSize: '16px'}}>Clinical Context (Optional)</h3>
                </div>
                <p className="text-sm text-brand-gray-500 mt-1 pl-8" style={{color: '#6B7280', fontSize: '14px'}}>Provide relevant notes or additional clinical context for this plan.</p>
              <div className="mt-4 space-y-4 pl-8">
                  <div>
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium text-brand-gray-700">Baseline Metrics</label>
                        <button onClick={() => { setMetricToEdit(null); setIsMetricModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm font-semibold hover:bg-violet-50" style={{borderColor: '#6D28D9', color: '#6D28D9'}}>
                            <PlusIcon className="w-4 h-4" /> Add Metric
                        </button>
                      </div>
                      <div className="mt-2 space-y-2">
                        {carePlan.clinicalContext.baselineMetrics.length > 0 ? (
                            carePlan.clinicalContext.baselineMetrics.map((m) => (
                                <div key={m.id} className="text-sm text-brand-gray-600 bg-brand-gray-50 p-2 rounded-md flex justify-between items-center">
                                    <p>{m.name}: <span className="font-semibold">{m.operator}{m.value} {m.unit}</span></p>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleEditMetric(m)} className="text-brand-gray-400 hover:text-brand-gray-600"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={() => setMetricToDelete(m)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-brand-gray-400 italic">No baseline metrics added.</p>
                        )}
                      </div>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-brand-gray-700">Patient Preferences / Constraints</label>
                      <textarea value={carePlan.clinicalContext.patientPreferences} onChange={e => setCarePlan(p => ({...p, clinicalContext: {...p.clinicalContext, patientPreferences: e.target.value}}))} rows={3} className={textareaStyles} placeholder="Enter any patient preferences, constraints, or special considerations..."></textarea>
                  </div>
              </div>
          </div>

        {/* Review Summary */}
         <div className="p-6 rounded-xl" style={{backgroundColor: '#F9FAFB', borderRadius: '12px'}}>
             <div className="flex items-center gap-3">
                <ClipboardListIcon className="w-5 h-5" style={{color: '#6D28D9'}} />
                <h3 className="font-semibold text-lg text-brand-gray-800" style={{fontSize: '16px'}}>Review Summary</h3>
             </div>
             <p className="text-sm text-brand-gray-500 mt-1 pl-8" style={{color: '#6B7280', fontSize: '14px'}}>Review the information before generating the care plan.</p>
             <ul className="mt-4 space-y-3 pl-8">
                {summaryItems.map(item => (
                  <li key={item.label} className="flex items-start">
                    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center mr-3 mt-0.5">
                        {item.completed 
                            ? <CheckCircleIcon className="w-5 h-5" style={{color: '#22C55E'}} /> 
                            : <div className="w-3 h-3 mt-1 rounded-full" style={{backgroundColor: '#9CA3AF'}} />
                        }
                    </div>
                    <div className="text-sm">
                        <strong className="font-semibold text-brand-gray-800">{item.label}:</strong>
                        <span className="text-brand-gray-600 ml-1">{item.value || 'Pending'}</span>
                    </div>
                  </li>
                ))}
             </ul>
             <div className="mt-4 pl-8">
                {requiredFieldsCompleted ? (
                    <div className="flex items-center px-5 py-4 rounded-xl border border-emerald-500 bg-gradient-to-b from-emerald-50 to-emerald-100 animate-scale-in">
                        <div className="flex items-center gap-4">
                            <CheckCircleIcon className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                            <div>
                                <h4 className="text-base font-semibold text-emerald-800">Everything is ready!</h4>
                                <p className="text-sm text-brand-gray-700">All required information has been completed. You can now generate the care plan.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-3 rounded-md text-sm font-semibold flex items-center bg-amber-100 text-amber-800">
                        <span className="font-bold mr-2 text-lg">⚠️</span>
                        Some required information is missing.
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="pt-6 border-t border-brand-gray-200 flex justify-end items-center gap-4">
        <button onClick={() => alert('Draft saved!')} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Save Draft</button>
        <button onClick={onManualBuild} className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50">Start Manual Build</button>
        <button onClick={onGeneratePlan} disabled={isGenerating || !requiredFieldsCompleted} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
           <AiSparkleIcon className={`w-5 h-5 ${isGenerating ? 'animate-aiPulse' : ''}`}/>
           {isGenerating ? 'Generating...' : 'Generate Care Plan with AI'}
        </button>
      </div>

      <AddMetricModal
        isOpen={isMetricModalOpen}
        onClose={() => setIsMetricModalOpen(false)}
        onSave={handleSaveMetric}
        metricToEdit={metricToEdit}
      />
      <DeleteConfirmationModal
        isOpen={!!metricToDelete}
        onClose={() => setMetricToDelete(null)}
        onConfirm={handleConfirmDeleteMetric}
        title="Delete Metric"
        message={`Are you sure you want to delete the metric: "${metricToDelete?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};