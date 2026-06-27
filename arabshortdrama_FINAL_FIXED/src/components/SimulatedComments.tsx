import { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import type { Drama } from '../types';

interface SimulatedCommentsProps {
  drama: Drama;
}

const COMMENTS_TEMPLATES = [
  { name: 'أحمد', text: 'واو المسلسل رائع! القصة تفاجئني في كل حلقة' },
  { name: 'كريم', text: 'الأحداث تشد الأعصاب، لا أستطيع إيقاف المشاهدة' },
  { name: 'سلطان', text: 'التمثيل ممتاز والإخراج احترافي' },
  { name: 'يوسف', text: 'من أفضل المسلسلات القصيرة التي شاهدتها!' },
  { name: 'محمد', text: 'الحلقة هذي جنننن! ما توقعت النهاية!' },
  { name: 'عمر', text: 'الممثل الرئيسي أبدع في هالمشهد' },
  { name: 'خالد', text: 'جاري المشاهدة الآن، تشويق عالي' },
  { name: 'فهد', text: 'المسلسل يستحق أكتر من هيك مشاهدة!' },
  { name: 'ماجد', text: 'القصة جد خطيرة، ما تقدر توقف' },
  { name: 'راشد', text: 'نصحت كل أصدقائي يشوفونه' },
  { name: 'سعد', text: 'الإخراج والمؤثرات عالية المستوى!' },
  { name: 'ناصر', text: 'كل حلقة أحسن من اللي قبلها' },
  { name: 'عبدالله', text: 'شكراً على الجودة العالية' },
  { name: 'حمد', text: 'ما توقعت القصة تتطور بهالشكل' },
  { name: 'زياد', text: 'متحمس للحلقة القادمة!' },
  { name: 'طارق', text: 'الممثلين اختيارهم ممتاز' },
  { name: 'بدر', text: 'الحلقة الجاية على وشك النزول؟' },
  { name: 'فاروق', text: 'أنصح الكل بمشاهدته' },
];

export function SimulatedComments({ drama }: SimulatedCommentsProps) {
  const [comments, setComments] = useState<Array<{ id: string; name: string; text: string; time: string }>>([]);
  const [nextCommentIndex, setNextCommentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialComments = COMMENTS_TEMPLATES.slice(0, 3).map((c, i) => ({
      id: `comment-${i}`,
      name: c.name,
      text: c.text,
      time: 'منذ دقائق',
    }));
    setComments(initialComments);
    setNextCommentIndex(3);
  }, [drama.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomDelay = Math.floor(Math.random() * 15000) + 15000;
      setTimeout(() => {
        const commentTemplate = COMMENTS_TEMPLATES[nextCommentIndex % COMMENTS_TEMPLATES.length];
        const newComment = {
          id: `comment-${Date.now()}`,
          name: commentTemplate.name,
          text: commentTemplate.text,
          time: 'الآن',
        };

        setComments((prev) => [newComment, ...prev.slice(0, 9)]);
        setNextCommentIndex((prev) => (prev + 1) % COMMENTS_TEMPLATES.length);
      }, randomDelay);
    }, 20000);

    return () => clearInterval(interval);
  }, [nextCommentIndex]);

  return (
    <div className="bg-deep-purple rounded-xl p-4 border border-gold/10">
      <div className="flex items-center gap-2 mb-3 border-b border-gold/10 pb-3">
        <MessageCircle size={16} className="text-gold" />
        <h3 className="text-sm font-bold text-white" dir="rtl">
          التعليقات المباشرة
        </h3>
        <span className="px-1.5 py-0.5 bg-orange text-white text-[9px] font-bold rounded animate-pulse mr-1">
          LIVE
        </span>
        <span className="text-gray-500 text-xs mr-auto">{comments.length}</span>
      </div>

      <div
        ref={containerRef}
        className="comments-container hide-scrollbar space-y-2"
      >
        {comments.map((comment, index) => (
          <div
            key={comment.id}
            className={`flex items-start gap-2 p-2 rounded-lg bg-midnight/60 ${index === 0 ? 'animate-slide-in-left' : ''}`}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0">
              <span className="text-midnight text-[10px] font-bold">{comment.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center justify-end gap-2 mb-0.5">
                <span className="text-gray-500 text-[9px]">{comment.time}</span>
                <span className="text-gold font-bold text-xs">{comment.name}</span>
              </div>
              <p className="text-gray-300 text-[11px] leading-relaxed" dir="rtl">{comment.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
