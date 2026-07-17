import React from 'react';
import { Play, Bold, Italic, Underline, Strikethrough, Link, History, Plus, MoreHorizontal, X, Trash2, MousePointerClick, SaveAll } from 'lucide-react';
import { NodeButton } from './MessageNode';

interface MessageSettingsPanelProps {
  variants: string[];
  waitForInput: boolean;
  saveEntireReply: boolean;
  captureVariable?: string;
  buttons: NodeButton[];
  onChangeVariants: (variants: string[]) => void;
  onChangeWait: (wait: boolean) => void;
  onChangeSaveReply: (save: boolean) => void;
  onChangeCaptureVariable?: (val: string) => void;
  onChangeButtons: (buttons: NodeButton[]) => void;
  onDelete?: () => void;
}

export default function MessageSettingsPanel({
  variants,
  waitForInput,
  saveEntireReply,
  captureVariable,
  buttons,
  onChangeVariants,
  onChangeWait,
  onChangeSaveReply,
  onChangeCaptureVariable,
  onChangeButtons,
  onDelete,
}: MessageSettingsPanelProps) {

  // ── Variant handlers ────────────────────────────────────────────────────────
  const handleVariantChange = (index: number, value: string) => {
    const next = [...variants];
    next[index] = value;
    onChangeVariants(next);
  };

  const addVariant = () => onChangeVariants([...variants, '']);

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      onChangeVariants(variants.filter((_, i) => i !== index));
    }
  };

  // ── Button handlers ─────────────────────────────────────────────────────────
  const addButton = () => {
    const newBtn: NodeButton = {
      id: `btn_${Date.now()}`,
      label: `Button ${buttons.length + 1}`,
    };
    onChangeButtons([...buttons, newBtn]);
  };

  const updateButtonLabel = (id: string, label: string) => {
    onChangeButtons(buttons.map((b) => (b.id === id ? { ...b, label } : b)));
  };

  const removeButton = (id: string) => {
    onChangeButtons(buttons.filter((b) => b.id !== id));
  };

  const toggleSaveAsContext = (id: string, value: boolean) => {
    onChangeButtons(buttons.map((b) => (b.id === id ? { ...b, saveAsContext: value } : b)));
  };

  return (
    <div
      className="absolute right-4 top-4 bottom-4 w-96 bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col z-50"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Message</h2>
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

      <div className="p-4 flex-1 overflow-y-auto space-y-0">
        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
          <button className="flex-1 bg-white shadow-sm py-1.5 text-sm font-medium rounded-md text-gray-900">Scripted</button>
          <button className="flex-1 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">Prompt</button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 text-gray-500 mb-3 px-1">
          <Play size={16} className="cursor-pointer hover:text-gray-900" />
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <Bold size={16} className="cursor-pointer hover:text-gray-900" />
          <Italic size={16} className="cursor-pointer hover:text-gray-900" />
          <Underline size={16} className="cursor-pointer hover:text-gray-900" />
          <Strikethrough size={16} className="cursor-pointer hover:text-gray-900" />
          <Link size={16} className="cursor-pointer hover:text-gray-900 mx-1" />
          <History size={16} className="cursor-pointer hover:text-gray-900 ml-auto" />
        </div>

        {/* Variants */}
        <div className="space-y-3 mb-4">
          {variants.map((variant, index) => (
            <div key={index} className="relative group">
              <textarea
                value={variant}
                onChange={(e) => handleVariantChange(index, e.target.value)}
                placeholder="Enter message"
                className="w-full min-h-[100px] p-3 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
              {variants.length > 1 && (
                <button
                  onClick={() => removeVariant(index)}
                  className="absolute top-2 right-2 p-1 bg-white text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-gray-100"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Variants footer */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <span className="text-sm font-medium text-gray-700">Variants</span>
          <button onClick={addVariant} className="text-gray-500 hover:text-gray-900">
            <Plus size={20} />
          </button>
        </div>

        {/* ── Buttons Section ─────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MousePointerClick size={15} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Buttons</span>
            </div>
            <button
              onClick={addButton}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {buttons.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2 text-center">
              No buttons yet — add one to create branching paths.
            </p>
          ) : (
            <div className="space-y-2">
              {buttons.map((btn) => (
                <div
                  key={btn.id}
                  className={`flex flex-col rounded-lg border px-2 py-1.5 transition-colors ${
                    btn.saveAsContext
                      ? 'border-indigo-200 bg-indigo-50/60'
                      : 'border-blue-100 bg-blue-50/60'
                  }`}
                >
                  {/* Button label row */}
                  <div className="flex items-center gap-2">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                      btn.saveAsContext ? 'bg-indigo-100 text-indigo-500' : 'bg-blue-100 text-blue-500'
                    }`}>
                      <MousePointerClick size={11} />
                    </span>
                    <input
                      type="text"
                      value={btn.label}
                      onChange={(e) => updateButtonLabel(btn.id, e.target.value)}
                      className="flex-1 bg-transparent text-sm text-gray-800 outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
                      placeholder="Button label"
                    />
                    <button
                      onClick={() => removeButton(btn.id)}
                      className="shrink-0 p-0.5 text-gray-400 hover:text-red-500 transition-colors rounded"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* Save as context toggle */}
                  <label className="mt-1.5 flex cursor-pointer items-center gap-2 pl-7">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!btn.saveAsContext}
                        onChange={(e) => toggleSaveAsContext(btn.id, e.target.checked)}
                      />
                      <div className="w-7 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500" />
                    </div>
                    <span className={`text-[11px] font-medium ${
                      btn.saveAsContext ? 'text-indigo-600' : 'text-gray-400'
                    }`}>
                      Save as context
                    </span>
                    {btn.saveAsContext && (
                      <SaveAll size={11} className="text-indigo-400 shrink-0" />
                    )}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wait for Input Toggle */}
        <div className="flex items-center justify-between py-4 border-t border-gray-100 mt-3">
          <span className="text-sm font-medium text-gray-700">Wait for user input</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={waitForInput}
              onChange={(e) => onChangeWait(e.target.checked)}
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
          </label>
        </div>

        {/* Save Entire Reply Toggle — only shown when waitForInput is enabled */}
        {waitForInput && (
          <div className="flex flex-col border-t border-gray-100 py-3 mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <SaveAll size={14} className="text-indigo-500 shrink-0" />
                <div>
                  <span className="text-sm font-medium text-gray-700">Capture User Reply</span>
                  <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                    Save the user&apos;s answer as a variable
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={saveEntireReply}
                  onChange={(e) => onChangeSaveReply(e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500" />
              </label>
            </div>

            {saveEntireReply && (
              <div className="mt-1 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Save entire reply to...</label>
                <div className="relative">
                  <select
                    className="w-full bg-white border border-gray-200 rounded-md py-1.5 px-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={captureVariable || 'last_utterance'}
                    onChange={(e) => {
                      if (e.target.value === 'create_new') {
                        const val = prompt('Enter new variable name (e.g. name, email, phone):');
                        if (val && val.trim() !== '' && onChangeCaptureVariable) {
                          onChangeCaptureVariable(val.trim());
                        }
                      } else if (onChangeCaptureVariable) {
                        onChangeCaptureVariable(e.target.value);
                      }
                    }}
                  >
                    <option value="last_utterance">last_utterance</option>
                    <option value="name">name</option>
                    <option value="email">email</option>
                    <option value="phone">phone</option>
                    {captureVariable && !['last_utterance', 'name', 'email', 'phone'].includes(captureVariable) && (
                      <option value={captureVariable}>{captureVariable}</option>
                    )}
                    <option value="create_new" className="font-medium text-blue-600">Create variable...</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
