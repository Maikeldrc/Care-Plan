import React from 'react';
import { XIcon } from '../icons/XIcon';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  zIndex?: number;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  zIndex = 70, // A high default z-index to ensure visibility
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-brand-gray-900">{title}</h2>
          <button onClick={onClose} className="text-brand-gray-400 hover:text-brand-gray-600">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-brand-gray-600">{message}</p>
        </div>
        <div className="p-4 bg-brand-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-brand-gray-300 rounded-md text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-brand-red text-white rounded-md text-sm font-semibold hover:bg-red-600"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
};
