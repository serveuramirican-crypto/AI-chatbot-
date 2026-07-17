import { Conversation } from './types';

export const mockConversations: Conversation[] = [
  {
    id: 'o9QZNnVHqd5xD6T',
    user: {
      id: 'u1',
      name: 'o9QZNnVHqd5xD6T',
    },
    isTakenOver: false,
    lastInteraction: 'Jul 12, 09:48 pm',
    messages: [
      {
        id: 'm1',
        role: 'agent',
        content: 'مزيان! 🤩 دعيني نقلب ليك على أحسن الشيميزات البيضاء في قياس S...',
        timestamp: 'Jul 12, 09:40 pm'
      },
      {
        id: 'm2',
        role: 'user',
        content: 'ما لقيت شيميزات بيضاء في قياس S بالضبط، خاصني نوسع البحث شوية!',
        timestamp: 'Jul 12, 09:42 pm'
      },
      {
        id: 'm3',
        role: 'agent',
        content: 'ما عندناش شيميز بيضاء في الوقت الحالي. ولكن عندي بديلات قريبة منك في قياس S! 🤩 هاهي أحسن الخيارات المتاحة:',
        timestamp: 'Jul 12, 09:48 pm',
        products: [
          { id: 'p1', name: 'Red Plaid Shirt', price: 29.99, image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500&q=80' },
          { id: 'p2', name: 'Beige Plaid Shirt', price: 34.99, image: 'https://images.unsplash.com/photo-1604644401890-0bd678c83788?w=500&q=80' },
          { id: 'p3', name: 'Blue Striped Shirt', price: 24.99, image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&q=80' },
        ]
      }
    ]
  },
  {
    id: 'MpAdxpojyZebz68',
    user: {
      id: 'u2',
      name: 'MpAdxpojyZebz68',
    },
    isTakenOver: true,
    lastInteraction: 'Apr 24, 03:26 am',
    messages: [
      {
        id: 'm4',
        role: 'user',
        content: 'شنو بالضبط كتقلب عليه اليوم؟',
        timestamp: 'Apr 24, 03:20 am'
      },
      {
        id: 'm5',
        role: 'agent',
        content: 'يسعدني مساعدتكم في العثور على المنتجات المثالية!',
        timestamp: 'Apr 24, 03:21 am'
      },
      {
        id: 'm6',
        role: 'admin',
        content: 'سلام! أنا هنا باش نعاونك، شنو خاصك بالضبط؟',
        timestamp: 'Apr 24, 03:26 am'
      }
    ]
  },
  {
    id: 'Sf8GsEachmouHnT',
    user: {
      id: 'u3',
      name: 'Sf8GsEachmouHnT',
    },
    isTakenOver: false,
    lastInteraction: 'Feb 7, 04:39 pm',
    messages: [
      {
        id: 'm7',
        role: 'user',
        content: 'Je ne sais pas encore',
        timestamp: 'Feb 7, 04:30 pm'
      },
      {
        id: 'm8',
        role: 'agent',
        content: 'Pas de problème! Voici quelques suggestions pour vous:',
        timestamp: 'Feb 7, 04:39 pm'
      }
    ]
  }
];
