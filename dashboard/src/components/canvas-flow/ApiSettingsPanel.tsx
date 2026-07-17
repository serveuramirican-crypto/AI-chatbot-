import React from 'react';
import { Network, MoreHorizontal, Trash2, Pencil, Play } from 'lucide-react';
import { ApiNodeData } from './ApiNode';

interface ApiSettingsPanelProps {
  data: ApiNodeData;
  onEditTool: () => void;
  onRunTool: () => void;
  onChangeCaptureResponse: (val: boolean) => void;
  onChangeAsyncExecution: (val: boolean) => void;
  onChangeFailurePath: (val: boolean) => void;
  onDelete?: () => void;
}

export default function ApiSettingsPanel({
  data,
  onEditTool,
  onRunTool,
  onChangeCaptureResponse,
  onChangeAsyncExecution,
  onChangeFailurePath,
  onDelete,
}: ApiSettingsPanelProps) {
  return (
    <div
      className="absolute right-4 top-4 bottom-4 w-96 bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col z-50"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Tool</h2>
        </div>
        <div className="flex items-center gap-1">
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 hover:bg-red-50 hover:text-red-600 rounded-md text-gray-500 transition-colors"
              title="Delete Node"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button className="p-1 hover:bg-gray-100 rounded-md text-gray-500">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto flex flex-col space-y-6">
        
        {/* Name and Edit Button */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700">
            <Pencil size={14} className="text-gray-400" />
            <span className="flex-1 truncate">{data.name || "Untitled API"}</span>
          </div>
          
          <button
            onClick={onEditTool}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded-lg transition-colors shadow-sm"
          >
            Edit tool
          </button>
        </div>

        {/* Toggles */}
        <div className="space-y-1">
          {/* Capture Response Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Capture response</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={data.captureResponse}
                onChange={(e) => onChangeCaptureResponse(e.target.checked)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500" />
            </label>
          </div>

          {/* Async Execution Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Async execution</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={data.asyncExecution}
                onChange={(e) => onChangeAsyncExecution(e.target.checked)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500" />
            </label>
          </div>

          {/* Failure Path Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Failure path</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={data.failurePath}
                onChange={(e) => onChangeFailurePath(e.target.checked)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500" />
            </label>
          </div>
        </div>

        <div className="flex-1" /> {/* Spacer */}

        {/* Run Button */}
        <button
          onClick={onRunTool}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-auto"
        >
          <Play size={16} />
          Run
        </button>
      </div>
    </div>
  );
}
