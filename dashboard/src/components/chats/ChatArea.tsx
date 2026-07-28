import { Conversation, ChatMessage, ProductRecommendation } from './types';
import { Bot, User, ShieldAlert, ExternalLink } from 'lucide-react';

interface ChatAreaProps {
  conversation: Conversation;
}

export function ChatArea({ conversation }: ChatAreaProps) {
  // Sort messages by created_at safely
  const messages = [...(conversation.chat_messages || [])].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#000000] text-zinc-300">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((msg, index) => (
          <MessageBubble key={msg.id || `msg-${index}`} message={msg} />
        ))}
      </div>
    </div>
  );
}

function parseMessageContent(content: string): { cleanText: string; options: string[] } {
  if (!content) return { cleanText: '', options: [] };

  let text = content;
  const options: string[] = [];

  // Extract <options>[...]</options>
  const optionsMatch = text.match(/<options>\s*(\[[\s\S]*?\])\s*<\/options>/);
  if (optionsMatch) {
    try {
      const parsed = JSON.parse(optionsMatch[1]);
      if (Array.isArray(parsed)) {
        parsed.forEach((opt: any) => {
          if (typeof opt === 'string' && opt.trim()) options.push(opt.trim());
        });
      }
    } catch (e) {}
    text = text.replace(/\s*<options>\s*\[[\s\S]*?\]\s*<\/options>/g, '').trimEnd();
  }

  // Extract [BUTTON]Label[/BUTTON]
  const btnRegex = /\[BUTTON\](.*?)\[\/BUTTON\]/g;
  let match;
  while ((match = btnRegex.exec(text)) !== null) {
    if (match[1]?.trim()) options.push(match[1].trim());
  }
  text = text.replace(/\[BUTTON\](.*?)\[\/BUTTON\]/g, '').trim();

  return { cleanText: text, options };
}

function formatProductPrice(price: number | string | undefined | null): string {
  if (price === undefined || price === null) return '';
  if (typeof price === 'number') return `$${price.toFixed(2)}`;
  return String(price);
}

function getNormalizedProducts(products: ProductRecommendation[] | string | undefined | null): ProductRecommendation[] {
  if (!products) return [];
  if (Array.isArray(products)) return products;
  if (typeof products === 'string') {
    try {
      const parsed = JSON.parse(products);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isAdmin = message.role === 'admin';

  const { cleanText, options } = parseMessageContent(message.content || '');
  const productsList = getNormalizedProducts(message.products);

  const timestampString = (() => {
    if (!message.created_at) return '';
    const d = new Date(message.created_at);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  })();

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar for agent/admin */}
      {!isUser && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${isAdmin ? 'bg-orange-500/20 text-orange-500' : 'bg-zinc-800 text-zinc-400'}`}>
          {isAdmin ? <ShieldAlert className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
      )}

      <div className={`flex flex-col gap-2 max-w-[80%]`}>
        {/* Message Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-[#1a1a1a] text-white rounded-br-sm'
              : isAdmin
              ? 'bg-orange-500/10 border border-orange-500/20 text-orange-100 rounded-bl-sm'
              : 'bg-[#1a1a1a] text-white rounded-bl-sm'
          }`}
        >
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{cleanText || message.content}</div>
        </div>

        {/* Options / Quick Reply Badges */}
        {!isUser && options.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {options.map((opt, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 text-xs rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-400 font-medium flex items-center gap-1.5 shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                {opt}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {timestampString && (
          <div className={`text-[10px] text-zinc-500 ${isUser ? 'text-right' : 'text-left'} px-1`}>
            {timestampString} {isAdmin && '• Admin'}
          </div>
        )}

        {/* Product Recommendations */}
        {productsList.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
            {productsList.map((product, idx) => {
              const imgUrl = product.image_url || product.image || 'https://placehold.co/400x300?text=Product';
              const formattedPrice = formatProductPrice(product.price);
              
              const CardContent = (
                <div className="min-w-[180px] max-w-[220px] bg-[#1a1a1a] rounded-xl overflow-hidden border border-zinc-800/50 hover:border-zinc-700 transition-colors cursor-pointer group flex flex-col h-full">
                  <div className="relative h-36 w-full bg-zinc-800 overflow-hidden">
                    <img
                      src={imgUrl}
                      alt={product.name || 'Product'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback image if source URL fails to load
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Product';
                      }}
                    />
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-sm font-medium text-white truncate flex items-center justify-between gap-1">
                        <span className="truncate">{product.name || 'Product'}</span>
                        {product.link && <ExternalLink className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                      </div>
                      {formattedPrice && (
                        <div className="text-xs text-blue-400 font-semibold mt-1">{formattedPrice}</div>
                      )}
                      {product.description && (
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{product.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              );

              return product.link ? (
                <a
                  key={product.id || `prod-${idx}`}
                  href={product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="no-underline"
                >
                  {CardContent}
                </a>
              ) : (
                <div key={product.id || `prod-${idx}`}>{CardContent}</div>
              );
            })}
          </div>
        )}
      </div>

      {/* Avatar for user (optional, right side) */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

