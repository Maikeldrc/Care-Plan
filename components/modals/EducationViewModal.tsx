
import React, { useState } from 'react';
import type { EducationMaterial } from '../../types';
import { XIcon } from '../icons/XIcon';
import { DownloadIcon } from '../icons/DownloadIcon';

interface EducationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: EducationMaterial;
}

export const EducationViewModal: React.FC<EducationViewModalProps> = ({ isOpen, onClose, material }) => {
  const [currentLanguage, setCurrentLanguage] = useState(material.languages[0]);

  if (!isOpen) return null;

  const renderContent = () => {
    const format = material.formats[0]; // For simplicity, view the first format
    switch (format) {
      case 'Text':
        return <div className="prose max-w-none p-4 bg-gray-50 rounded-md whitespace-pre-wrap">{material.content}</div>;
      case 'PDF':
      case 'Image':
        return <div className="p-4 text-center bg-gray-50 rounded-md">
            <p className="font-semibold">Embedded {format} Viewer</p>
            <p className="text-sm text-gray-500 mt-2">(This is a placeholder for an embedded {format} viewer.)</p>
            <a href={material.content} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-blue-600 hover:underline">Open {format} in new tab</a>
        </div>
      case 'Video':
        return <div className="p-4 text-center bg-gray-50 rounded-md">
            <p className="font-semibold">Embedded Video Player</p>
            <p className="text-sm text-gray-500 mt-2">(This is a placeholder for an embedded video player.)</p>
            <iframe className="w-full aspect-video mt-4 rounded-md" src={material.content.replace('watch?v=', 'embed/')} title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
        </div>
      case 'URL':
        return <div className="p-4 text-center bg-gray-50 rounded-md">
            <p className="font-semibold">External Resource</p>
             <a href={material.content} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Visit Link
            </a>
        </div>
      default:
        return <p>Unsupported format.</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-brand-gray-900">{material.title}</h2>
            <p className="text-sm text-brand-gray-500">{material.summary}</p>
          </div>
          <button onClick={onClose} className="text-brand-gray-400 hover:text-brand-gray-600"><XIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-6 flex-grow overflow-y-auto">
          {renderContent()}
        </div>
        <div className="p-4 bg-brand-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Language:</label>
            <select
              value={currentLanguage}
              onChange={e => setCurrentLanguage(e.target.value as 'English' | 'Spanish')}
              className="h-9 pl-3 pr-8 py-1 text-sm border border-brand-gray-300 rounded-md focus:ring-brand-blue focus:border-brand-blue bg-white"
            >
              {material.languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => alert('Download initiated.')} className="flex items-center gap-2 px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-100">
                <DownloadIcon className="w-4 h-4" /> Download
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold hover:bg-blue-600">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};
