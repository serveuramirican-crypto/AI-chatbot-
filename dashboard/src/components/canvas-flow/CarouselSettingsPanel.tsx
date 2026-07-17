import React, { useRef } from 'react';
import { Plus, X, Trash2, LayoutGrid, Image as ImageIcon, Link2, Upload, MoreHorizontal } from 'lucide-react';
import { CarouselCard, CarouselCardButton } from './CarouselNode';

interface CarouselSettingsPanelProps {
  cards: CarouselCard[];
  onChangeCards: (cards: CarouselCard[]) => void;
  onDelete?: () => void;
}

const ACTION_OPTIONS = [
  'Go to Block',
  'Go to Intent',
  'Call forward',
  'End',
  'Set variable',
  'Open URL',
  'Tool',
  'Code',
  'Component'
];

export default function CarouselSettingsPanel({
  cards,
  onChangeCards,
  onDelete,
}: CarouselSettingsPanelProps) {

  // ── Card operations ───────────────────────────────────────────────────────
  const addCard = () => {
    const newCard: CarouselCard = {
      id: `card_${Date.now()}`,
      imageType: 'upload',
      imageUrl: '',
      title: '',
      description: '',
      buttons: [],
    };
    onChangeCards([...cards, newCard]);
  };

  const removeCard = (id: string) => {
    onChangeCards(cards.filter(c => c.id !== id));
  };

  const updateCard = (id: string, updates: Partial<CarouselCard>) => {
    onChangeCards(cards.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  // ── Button operations ─────────────────────────────────────────────────────
  const addButton = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const newBtn: CarouselCardButton = {
      id: `btn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      label: `Button ${card.buttons.length + 1}`,
      action: 'Go to Block'
    };
    updateCard(cardId, { buttons: [...card.buttons, newBtn] });
  };

  const removeButton = (cardId: string, btnId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    updateCard(cardId, { buttons: card.buttons.filter(b => b.id !== btnId) });
  };

  const updateButton = (cardId: string, btnId: string, updates: Partial<CarouselCardButton>) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    updateCard(cardId, {
      buttons: card.buttons.map(b => (b.id === btnId ? { ...b, ...updates } : b))
    });
  };

  // ── Image Handlers ────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadCardId, setActiveUploadCardId] = React.useState<string | null>(null);

  const triggerUpload = (cardId: string) => {
    setActiveUploadCardId(cardId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUploadCardId) {
      const url = URL.createObjectURL(file);
      updateCard(activeUploadCardId, { imageUrl: url });
    }
    // reset
    if (fileInputRef.current) fileInputRef.current.value = '';
    setActiveUploadCardId(null);
  };

  return (
    <div
      className="absolute right-4 top-4 bottom-4 w-[400px] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col z-50"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleFileChange} />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Carousel</h2>
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

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-3">
            <LayoutGrid className="w-12 h-12 text-gray-200" />
            <p className="text-sm">No cards yet</p>
          </div>
        ) : (
          cards.map((card, idx) => (
            <div key={card.id} className="border border-gray-200 rounded-xl bg-gray-50 p-3 flex flex-col gap-3 relative group">
              <button 
                onClick={() => removeCard(card.id)}
                className="absolute -top-2 -right-2 bg-white border border-gray-200 shadow-sm p-1 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
              >
                <X size={14} />
              </button>

              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-semibold text-gray-700">Card {idx + 1}</span>
              </div>

              {/* Image Settings */}
              <div className="flex bg-gray-200/50 p-1 rounded-lg">
                <button 
                  onClick={() => updateCard(card.id, { imageType: 'upload' })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 ${card.imageType === 'upload' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Upload size={14} /> Upload
                </button>
                <button 
                  onClick={() => updateCard(card.id, { imageType: 'link' })}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 ${card.imageType === 'link' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Link2 size={14} /> Link
                </button>
              </div>

              {card.imageType === 'upload' ? (
                <div 
                  onClick={() => triggerUpload(card.id)}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-blue-50/50 hover:border-blue-400 transition"
                >
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt="preview" className="h-16 object-contain" />
                  ) : (
                    <>
                      <ImageIcon className="text-gray-400 h-6 w-6" />
                      <span className="text-xs text-gray-500">Click to upload image</span>
                    </>
                  )}
                </div>
              ) : (
                <input 
                  type="text" 
                  value={card.imageUrl} 
                  onChange={(e) => updateCard(card.id, { imageUrl: e.target.value })}
                  className="w-full text-sm p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500" 
                  placeholder="https://example.com/image.png" 
                />
              )}

              {/* Text Settings */}
              <div className="flex flex-col gap-2">
                <input 
                  type="text" 
                  value={card.title}
                  onChange={(e) => updateCard(card.id, { title: e.target.value })}
                  className="w-full text-sm font-semibold p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500" 
                  placeholder="Enter card title" 
                />
                <textarea 
                  value={card.description}
                  onChange={(e) => updateCard(card.id, { description: e.target.value })}
                  className="w-full text-sm p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 min-h-[60px] resize-y" 
                  placeholder="Enter card description" 
                />
              </div>

              {/* Buttons Settings */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Buttons</span>
                  <button onClick={() => addButton(card.id)} className="text-blue-500 hover:text-blue-700 text-xs font-medium flex items-center gap-1">
                    <Plus size={12} /> Add
                  </button>
                </div>
                
                <div className="flex flex-col gap-2">
                  {card.buttons.map(btn => (
                    <div key={btn.id} className="flex flex-col gap-1.5 p-2 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={btn.label}
                          onChange={(e) => updateButton(card.id, btn.id, { label: e.target.value })}
                          className="flex-1 text-sm p-1.5 border border-gray-200 rounded outline-none focus:border-blue-500"
                          placeholder="Button label"
                        />
                        <button onClick={() => removeButton(card.id, btn.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded bg-gray-50">
                          <X size={14} />
                        </button>
                      </div>
                      <select 
                        value={btn.action}
                        onChange={(e) => updateButton(card.id, btn.id, { action: e.target.value })}
                        className="w-full text-xs p-1.5 border border-gray-200 rounded outline-none bg-gray-50 focus:border-blue-500 text-gray-700"
                      >
                        {ACTION_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Footer / Add Card */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
        <button 
          onClick={addCard}
          className="w-full py-2 bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 text-gray-700 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition"
        >
          <Plus size={16} /> Add Card
        </button>
      </div>
    </div>
  );
}
