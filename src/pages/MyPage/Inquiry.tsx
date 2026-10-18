import { useEffect, useRef, useState } from "react";
import { Bot, ChevronLeft, Send, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  content: string;
};

const QUICK_QUESTIONS = [
  "예약 취소는 어떻게 하나요?",
  "쿠폰 사용 방법을 알려주세요",
  "타임딜이 뭔가요?",
  "환불 정책이 궁금해요",
  "포인트 적립 방법은?",
  "딜뷰 패키지란?",
];

const INITIAL_MESSAGE: ChatMessage = {
  id: 1,
  role: "assistant",
  content: "안녕하세요! 딜뷰 고객센터 자동 응답입니다. 질문의 키워드에 맞춰 준비된 안내를 드려요. 예약, 쿠폰, 타임딜, 환불 등을 물어보세요.",
};

// Ordered from specific to general so "타임딜 예약 취소" answers the cancellation question.
const ANSWERS: { pattern: RegExp; answer: string }[] = [
  { pattern: /환불|환급|돌려/, answer: "지금 앱의 예약은 시연용이라 실제로 결제·청구되지 않아 환불도 발생하지 않아요. 취소하면 사용한 쿠폰과 포인트는 돌려드려요. 매장별 무료 취소 기한은 매장 상세의 '정보' 탭과 결제 화면에서 확인할 수 있고, 기한 이후 환불 기준은 아직 정해지지 않았어요." },
  { pattern: /취소/, answer: "하단의 '예약내역'에서 예약을 누른 뒤 '예약 취소'를 선택하면 바로 취소돼요. 방문 시간이 지나기 전까지 취소할 수 있고, 취소한 예약은 '취소·환불 내역' 탭에서 볼 수 있어요." },
  { pattern: /변경|바꾸|시간.*(옮|수정)|날짜/, answer: "예약내역에서 예약을 누르고 '예약 관리'에서 새 날짜와 시간을 고른 뒤 '일정 변경'을 누르면 돼요. 같은 시술 안에서 비어 있는 시간으로만 바꿀 수 있어요." },
  { pattern: /쿠폰|할인코드/, answer: "홈의 '첫방문 혜택'에서 3,000원 쿠폰을 받을 수 있어요. 15,000원 이상 예약하면 결제 화면의 '쿠폰' 칸에서 선택해 바로 할인받을 수 있고, 받은 쿠폰은 마이 > 쿠폰함에서 확인해요." },
  { pattern: /포인트|적립|리워드|룰렛|운세|출석/, answer: "놀이터의 출석(매일 10P), 운세(매일 5P), 행운 룰렛(최대 100P)과 이용 완료 후 리뷰 작성(100P)으로 포인트를 모을 수 있어요. 모은 포인트는 결제 화면에서 1P = 1원으로 쓸 수 있어요. 포인트는 이 기기에 저장돼요." },
  { pattern: /타임딜|특가|할인.*시간|시간.*할인/, answer: "타임딜은 매장의 빈 시간을 최대 60%까지 할인해 파는 한정 수량 특가예요. 여러 매장이 1~4시간씩 돌아가며 열리고, 타임딜이 아닌 시간에도 같은 시술을 정상가로 예약할 수 있어요." },
  { pattern: /패키지|딜키트|웨딩|프로필|수험생/, answer: "딜뷰 패키지(딜키트)는 여러 시술을 묶어 할인한 상품이에요. 웨딩·프로필·수험생 같은 목적별 패키지, 한 매장의 원샵 패키지, 두 매장을 잇는 샵+샵 패키지가 있고 홈의 '딜키트'에서 바로 예약할 수 있어요." },
  { pattern: /리뷰|후기/, answer: "예약 시간이 끝난 뒤 예약 상세에서 이용 완료로 표시하면 리뷰를 쓸 수 있어요. 실제 서비스에서는 매장이 시술 완료를 확인해야 해요. 첫 리뷰를 등록하면 100P를 드려요." },
  { pattern: /결제|카드|페이/, answer: "결제 화면에서 결제 수단을 고를 수 있지만, 지금은 시연용이라 실제 결제사로 연결되지 않고 청구되지 않아요. 예약은 이 기기에만 저장되고 매장에 전달되지 않아요." },
  { pattern: /담당|디자이너|원장|선생님/, answer: "결제 화면의 '담당자' 칸에서 담당자를 고를 수 있어요. 지금 보이는 담당자는 예시이며, 지정하지 않으면 매장에서 배정해요." },
  { pattern: /찜|저장|하트/, answer: "매장 상세의 '매장 찜 추가'나 타임딜 카드의 하트를 누르면 하단 '찜' 메뉴에 모여요. 다시 누르면 찜이 해제돼요." },
  { pattern: /주변|지도|위치|근처/, answer: "하단의 '내 주변'에서 지도와 목록으로 가까운 매장을 볼 수 있어요. 진한 핀은 지금 타임딜이 열린 매장이에요." },
  { pattern: /로그인|계정|비밀번호|회원/, answer: "이메일 또는 카카오·구글 계정으로 로그인할 수 있어요. 로그인하지 않아도 예약, 쿠폰, 찜은 이 기기에서 바로 이용할 수 있어요." },
  { pattern: /주차/, answer: "주차 가능 여부는 매장마다 달라요. 매장 상세의 '홈' 탭 방문 안내에서 확인할 수 있어요." },
  { pattern: /영업|몇 ?시|휴무|쉬는/, answer: "매장 상세 상단과 '정보' 탭에서 영업시간과 휴무일을 확인할 수 있어요. 예약 가능한 시간은 영업시간 안에서만 보여요." },
  { pattern: /예약/, answer: "홈의 타임딜이나 매장 상세의 '예약하기'에서 시술을 고른 뒤 날짜·시간을 선택하면 시연 예약이 저장돼요. 지금은 매장에 전달되지 않는 시연이에요. 타임딜이 열리지 않은 매장도 정상가로 예약해 볼 수 있어요." },
];

function getBotResponse(question: string) {
  const answer = ANSWERS.find(({ pattern }) => pattern.test(question))?.answer;
  return answer ?? "말씀하신 내용을 정확히 이해하지 못했어요. 예약·취소, 쿠폰, 타임딜, 환불, 포인트, 패키지 중에서 궁금한 내용을 함께 적어 주시면 바로 안내해 드릴게요.";
}

export default function Inquiry() {
  const navigate = useNavigate();
  const nextMessageId = useRef(2);
  const responseTimer = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isResponding, messages]);

  useEffect(
    () => () => {
      if (responseTimer.current !== null) {
        window.clearTimeout(responseTimer.current);
      }
    },
    [],
  );

  const sendMessage = (content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isResponding) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: nextMessageId.current++,
        role: "user",
        content: trimmedContent,
      },
    ]);
    setInput("");
    setIsResponding(true);

    responseTimer.current = window.setTimeout(() => {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: nextMessageId.current++,
          role: "assistant",
          content: getBotResponse(trimmedContent),
        },
      ]);
      setIsResponding(false);
      responseTimer.current = null;
    }, 650);
  };

  return (
    <section className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-[#f7f7f9]">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-page-border bg-white px-4">
        <button
          type="button"
          aria-label="뒤로 가기"
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 cursor-pointer place-items-center text-page-heading"
        >
          <ChevronLeft className="h-7 w-7" strokeWidth={2.2} />
        </button>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-pink-50 text-accent">
          <Bot className="h-6 w-6" strokeWidth={2.1} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black text-page-heading">딜뷰 고객센터</h2>
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            자동 응답 (키워드 안내)
          </p>
        </div>
      </header>

      <div
        className="flex-1 overflow-y-auto px-4 py-5 min-[390px]:px-5"
        aria-live="polite"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            궁금한 내용을 편하게 물어보세요
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <span className="mr-2 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white">
                  <Bot className="h-4.5 w-4.5" strokeWidth={2.2} />
                </span>
              )}
              <p
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  message.role === "user"
                    ? "rounded-br-md bg-accent text-white"
                    : "rounded-bl-md border border-page-border bg-white text-page-heading"
                }`}
              >
                {message.content}
              </p>
            </div>
          ))}

          {messages.length === 1 && (
            <div className="ml-10 grid gap-2 sm:grid-cols-2">
              {QUICK_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={isResponding}
                  onClick={() => sendMessage(question)}
                  className="min-h-11 cursor-pointer rounded-xl border border-accent/30 bg-white px-3 py-2 text-left text-xs font-semibold leading-snug text-accent hover:bg-pink-50 disabled:cursor-wait disabled:opacity-60"
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          {isResponding && (
            <div className="flex justify-start">
              <span className="mr-2 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white">
                <Bot className="h-4.5 w-4.5" strokeWidth={2.2} />
              </span>
              <div className="flex h-11 items-center gap-1 rounded-2xl rounded-bl-md border border-page-border bg-white px-4 shadow-sm">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                    style={{ animationDelay: `${dot * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(input);
        }}
        className="shrink-0 border-t border-page-border bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
            maxLength={500}
            placeholder="메시지를 입력해 주세요"
            aria-label="문의 내용"
            className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl border border-page-border bg-[#f7f7f9] px-4 py-3 text-sm leading-6 text-page-heading outline-none placeholder:text-gray-400 focus:border-accent"
          />
          <button
            type="submit"
            aria-label="메시지 보내기"
            disabled={!input.trim() || isResponding}
            className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full bg-accent text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Send className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>
      </form>
    </section>
  );
}
