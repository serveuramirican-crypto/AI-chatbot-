import React, { useState, useCallback } from 'react';
import { X, Play, Plus, Trash2, ChevronDown } from 'lucide-react';
import { ApiNodeData, KeyValuePair } from './ApiNode';

interface ApiConfigModalProps {
  data: ApiNodeData;
  onChangeData: (data: ApiNodeData) => void;
  onClose: () => void;
}

export default function ApiConfigModal({ data, onChangeData, onClose }: ApiConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'variables' | 'headers' | 'params'>('variables');
  const [responseOutput, setResponseOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof ApiNodeData>(key: K, value: ApiNodeData[K]) => {
    onChangeData({ ...data, [key]: value });
  };

  const updateKeyValueList = (key: 'headers' | 'params' | 'body', list: KeyValuePair[]) => {
    updateField(key, list);
  };

  const addKeyValue = (key: 'headers' | 'params' | 'body') => {
    const list = [...data[key]];
    list.push({ key: '', value: '' });
    updateKeyValueList(key, list);
  };

  const removeKeyValue = (key: 'headers' | 'params' | 'body', index: number) => {
    const list = [...data[key]];
    list.splice(index, 1);
    updateKeyValueList(key, list);
  };

  const updateKeyValue = (target: 'headers' | 'params' | 'body', index: number, field: 'key' | 'value', value: string) => {
    const list = [...data[target]];
    list[index][field] = value;
    updateKeyValueList(target, list);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setResponseOutput(null);

    try {
      // Basic variable interpolation in URL
      let finalUrl = data.url;
      data.body.forEach(v => {
        if (v.key) {
          finalUrl = finalUrl.replace(new RegExp(`{${v.key}}`, 'g'), v.value);
        }
      });

      // Construct headers
      const headers = new Headers();
      data.headers.forEach(h => {
        if (h.key && h.value) headers.append(h.key, h.value);
      });

      // Construct query params
      const urlObj = new URL(finalUrl.startsWith('http') ? finalUrl : `https://${finalUrl}`);
      data.params.forEach(p => {
        if (p.key && p.value) urlObj.searchParams.append(p.key, p.value);
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), data.timeout * 1000);

      const options: RequestInit = {
        method: data.method,
        headers,
        signal: controller.signal,
      };

      if (data.method !== 'GET' && (data.method as string) !== 'HEAD') {
        // If it's a POST/PUT, and body is not empty, we send it as JSON
        if (data.body.length > 0) {
          const bodyObj: Record<string, string> = {};
          data.body.forEach(b => {
            if (b.key) bodyObj[b.key] = b.value;
          });
          options.body = JSON.stringify(bodyObj);
          headers.set('Content-Type', 'application/json');
        }
      }

      const startTime = performance.now();
      const response = await fetch(urlObj.toString(), options);
      clearTimeout(timeoutId);
      const endTime = performance.now();

      const responseText = await response.text();
      let formattedResponse = responseText;
      try {
        const json = JSON.parse(responseText);
        formattedResponse = JSON.stringify(json, null, 2);
      } catch (e) {
        // not json
      }

      setResponseOutput(
        `Status: ${response.status} ${response.statusText}\nTime: ${Math.round(endTime - startTime)}ms\n\n${formattedResponse}`
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError(`Request timed out after ${data.timeout} seconds.`);
      } else {
        setError(`Failed to fetch: ${err.message}`);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const renderKeyValueTable = (target: 'headers' | 'params' | 'body') => (
    <div className="space-y-2">
      {data[target].map((item, index) => (
        <div key={index} className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Key"
            value={item.key}
            onChange={(e) => updateKeyValue(target, index, 'key', e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Value"
            value={item.value}
            onChange={(e) => updateKeyValue(target, index, 'value', e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
          />
          <button
            onClick={() => removeKeyValue(target, index)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        onClick={() => addKeyValue(target)}
        className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
      >
        <Plus size={14} /> Add {target === 'body' ? 'variable' : target.slice(0, -1)}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-8">
      <div className="bg-white w-full max-w-6xl h-full max-h-[800px] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <input
            type="text"
            value={data.name || ''}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Untitled API"
            className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none placeholder-gray-400 focus:ring-1 focus:ring-blue-500 rounded px-2 -ml-2"
          />
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
              (..) Variables
            </button>
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Play size={16} fill="currentColor" />
              {isRunning ? 'Running...' : 'Run'}
            </button>
            <div className="w-px h-6 bg-gray-300" />
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content (Split Pane) */}
        <div className="flex-1 flex min-h-0">
          {/* Left Pane - Config */}
          <div className="w-1/2 border-r border-gray-100 flex flex-col overflow-y-auto p-6 bg-gray-50/30">
            <div className="space-y-6">
              
              {/* Method and URL */}
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={data.method}
                    onChange={(e) => updateField('method', e.target.value as ApiNodeData['method'])}
                    className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer h-full"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                <input
                  type="text"
                  placeholder="Request URL or {variable}"
                  value={data.url}
                  onChange={(e) => updateField('url', e.target.value)}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Accordion-like Sections */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Input Variables */}
                <div className="border-b border-gray-100 last:border-0">
                  <div className="px-4 py-3 flex items-center justify-between cursor-pointer bg-gray-50/50" onClick={() => setActiveTab('variables')}>
                    <span className="text-sm font-semibold text-gray-800">Input variables</span>
                  </div>
                  {activeTab === 'variables' && (
                    <div className="p-4 pt-2">
                      {renderKeyValueTable('body')}
                    </div>
                  )}
                </div>

                {/* Headers */}
                <div className="border-b border-gray-100 last:border-0">
                  <div className="px-4 py-3 flex items-center justify-between cursor-pointer bg-gray-50/50" onClick={() => setActiveTab('headers')}>
                    <span className="text-sm font-semibold text-gray-800">Headers</span>
                  </div>
                  {activeTab === 'headers' && (
                    <div className="p-4 pt-2">
                      {renderKeyValueTable('headers')}
                    </div>
                  )}
                </div>

                {/* Parameters */}
                <div className="border-b border-gray-100 last:border-0">
                  <div className="px-4 py-3 flex items-center justify-between cursor-pointer bg-gray-50/50" onClick={() => setActiveTab('params')}>
                    <span className="text-sm font-semibold text-gray-800">Parameters</span>
                  </div>
                  {activeTab === 'params' && (
                    <div className="p-4 pt-2">
                      {renderKeyValueTable('params')}
                    </div>
                  )}
                </div>
              </div>

              {/* Timeout Slider */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-800">Request timeout (sec)</span>
                  <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{data.timeout}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={data.timeout}
                  onChange={(e) => updateField('timeout', parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex items-center justify-between mt-2 text-[10px] font-medium text-gray-400">
                  <span>1s</span>
                  <span>20s</span>
                </div>
              </div>

            </div>
          </div>

          {/* Right Pane - Output */}
          <div className="w-1/2 bg-white flex flex-col p-6">
            {!responseOutput && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
                  {/* Pseudo illustration */}
                  <Play size={40} className="ml-2" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Run to see output</h3>
                <p className="text-sm text-gray-500 max-w-[240px]">
                  Run the API to see the response appear here.
                </p>
              </div>
            )}
            
            {(responseOutput || error) && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Output</h3>
                  <button
                    onClick={() => { setResponseOutput(null); setError(null); }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-900"
                  >
                    Clear
                  </button>
                </div>
                
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 font-mono whitespace-pre-wrap break-all mb-4">
                    {error}
                  </div>
                )}

                {responseOutput && (
                  <div className="flex-1 bg-gray-900 text-gray-100 p-4 rounded-xl font-mono text-xs overflow-auto whitespace-pre-wrap break-all">
                    {responseOutput}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
