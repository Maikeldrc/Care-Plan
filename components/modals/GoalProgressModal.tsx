import React, { useState } from 'react';
import type { Goal } from '../../types';
import { XIcon } from '../icons/XIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { LinkIcon } from '../icons/LinkIcon';
import { MeasurementChart } from '../charts/MeasurementChart';

interface GoalProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-semibold rounded-md ${
      active ? 'bg-blue-100 text-brand-blue' : 'text-brand-gray-500 hover:bg-brand-gray-100'
    }`}
  >
    {children}
  </button>
);

export const GoalProgressModal: React.FC<GoalProgressModalProps> = ({ isOpen, onClose, goal }) => {
  const [activeTab, setActiveTab] = useState<'targets' | 'events' | 'data'>('targets');
  const [timeRange, setTimeRange] = useState('Last 30 days');

  if (!isOpen) return null;
  
  const handleExportCsv = () => {
    if (goal.dataTable.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = ["Timestamp", "Target", "Value", "Unit", "Source"];
    const rows = goal.dataTable.map(row => 
        [row.timestamp, row.target, `"${row.value}"`, row.unit, row.source].join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${goal.title.replace(/\s+/g, '_')}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = () => {
    // A more robust solution would use a library like jsPDF, but for this environment,
    // we use the browser's print functionality.
    alert("This will open the browser's print dialog. You can save as PDF from there. For best results, enable 'Background graphics' and disable 'Headers and footers'.");
    window.print();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'targets':
        return (
          <div className="space-y-8">
            {goal.measurementTargets.length > 0 ? (
                goal.measurementTargets.map(target => (
                    <MeasurementChart key={target.name} target={target} />
                ))
            ) : (
                <p className="text-center text-brand-gray-500 py-8">No measurement targets defined for this goal.</p>
            )}
          </div>
        );
      case 'events':
        return (
            <div className="space-y-3">
                {goal.eventsAndTasks.length > 0 ? (
                    goal.eventsAndTasks.map(event => (
                        <div key={event.id} className="p-4 border border-brand-gray-200 rounded-lg flex items-center justify-between">
                            <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-4 ${event.status === 'Completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                <div>
                                    <p className="text-brand-gray-800">{event.description}</p>
                                    <p className="text-sm text-brand-gray-500">{event.date} • {event.status}</p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-brand-gray-500 py-8">No events or tasks logged for this goal.</p>
                )}
            </div>
        );
      case 'data':
        return (
            <div className="overflow-x-auto">
                {goal.dataTable.length > 0 ? (
                <table className="w-full text-sm text-left text-brand-gray-500">
                    <thead className="text-xs text-brand-gray-700 uppercase bg-brand-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Timestamp</th>
                            <th scope="col" className="px-6 py-3">Target</th>
                            <th scope="col" className="px-6 py-3">Value</th>
                            <th scope="col" className="px-6 py-3">Unit</th>
                            <th scope="col" className="px-6 py-3">Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        {goal.dataTable.map(row => (
                            <tr key={row.id} className="bg-white border-b">
                                <td className="px-6 py-4">{row.timestamp}</td>
                                <td className="px-6 py-4">{row.target}</td>
                                <td className="px-6 py-4">{row.value.toFixed(1)}</td>
                                <td className="px-6 py-4">{row.unit}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.source === 'RPM' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {row.source}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                ) : (
                    <p className="text-center text-brand-gray-500 py-8">No data available in the data table.</p>
                )}
            </div>
        );
      default: return null;
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col printable-area">
        {/* Header */}
        <div className="p-6 border-b border-brand-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-brand-gray-900">Goal Progress</h2>
            <button onClick={onClose} className="text-brand-gray-400 hover:text-brand-gray-600 no-print"><XIcon className="w-6 h-6"/></button>
          </div>
          <h3 className="text-lg font-semibold text-brand-gray-800 mt-2">{goal.title}</h3>
          <p className="text-sm text-brand-gray-500">Started {new Date(goal.startDate).toLocaleDateString()} • Target {new Date(goal.targetDate).toLocaleDateString()}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${goal.status === 'On track' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{goal.status}</span>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${goal.priority === 'High' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>{goal.priority}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-grow overflow-y-auto">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-2 p-1 bg-brand-gray-100 rounded-lg">
                   <TabButton active={activeTab === 'targets'} onClick={() => setActiveTab('targets')}>Measurement Targets</TabButton>
                   <TabButton active={activeTab === 'events'} onClick={() => setActiveTab('events')}>Events & Tasks</TabButton>
                   <TabButton active={activeTab === 'data'} onClick={() => setActiveTab('data')}>Data Table</TabButton>
                </div>
                <div className="relative">
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="h-10 pl-3 pr-8 py-2 text-sm border border-brand-gray-300 rounded-md focus:ring-brand-blue focus:border-brand-blue appearance-none"
                  >
                    <option>Last 30 days</option>
                    <option>Last 60 days</option>
                    <option>Last 90 days</option>
                    <option>All time</option>
                  </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
            </div>
            {renderContent()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-brand-gray-200 bg-brand-gray-50 flex justify-end items-center gap-3 no-print">
            <button onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-100">
                <DownloadIcon className="w-4 h-4" /> Export CSV
            </button>
             <button onClick={handleExportPdf} className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-100">
                <DownloadIcon className="w-4 h-4" /> Export PDF
            </button>
             <button onClick={() => alert('This would open a modal to link or sync data from a patient\'s Remote Patient Monitoring device.')} className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-100">
                <LinkIcon className="w-4 h-4" /> Link RPM Data
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-brand-gray-700 text-white rounded-md text-sm font-semibold hover:bg-brand-gray-800">Close</button>
        </div>
      </div>
    </div>
  );
};