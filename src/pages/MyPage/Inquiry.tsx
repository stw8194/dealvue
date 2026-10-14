import { useEffect, useRef, useState } from "react";
import { Bot, ChevronLeft, Send, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  content: string;
};

const QUICK_QUESTIONS = [
  "예약을 변경하거나 취소하고 싶어요",
  "쿠폰은 어떻게 사용하나요?",
  "결제 취소와 환불이 궁금해요",
  "로그인이 되지 않아요",
];

const INITIAL_MESSAGE: ChatMessage = {
  id: 1,
  role: "assistant",
  content: "딜뷰 도움말입니다. 현재는 화면 흐름을 확인하는 자동 응답 예시를 제공합니다.",
};

function getBotResponse(question: string) {
  const normalizedQuestion = question.replace(/\s/g, "");

  if (/예약|변경|취소/.test(normalizedQuestion)) {
    return "미리보기에서는 예약내역에서 시작 전 예약의 일정 변경과 취소를 체험할 수 있어요. 실제 매장 예약과 취소 처리는 연결 준비 중입니다.";
  }

  if (/쿠폰|할인/.test(normalizedQuestion)) {
    return "쿠폰함에서 쿠폰 정보를 확인할 수 있어요. 예약 단계의 쿠폰 적용은 연결 준비 중입니다.";
  }

  if (/결제|환불|카드/.test(normalizedQuestion)) {
    return "현재 테스트 예약은 실제 비용이 청구되지 않아 환불도 발생하지 않아요. 실결제와 환불 정책은 결제 연동 시 안내합니다.";
  }

  if (/로그인|계정|비밀번호/.test(normalizedQuestion)) {
    return "가입한 이메일을 먼저 확인해 주세요. 이메일이 맞다면 비밀번호를 다시 입력하고, 소셜 계정으로 가입했다면 해당 소셜 로그인 버튼을 이용해 주세요.";
  }

  if (/포인트/.test(normalizedQuestion)) {
    return "보유 포인트와 적립 내역은 마이페이지의 포인트 메뉴에서 확인할 수 있어요.";
  }

  return "문의 내용을 확인했어요. 예약, 쿠폰, 결제·환불, 로그인 중 궁금한 항목을 조금 더 구체적으로 말씀해 주세요.";
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
          <h2 className="text-base font-black text-page-heading">딜뷰 도움말</h2>
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            자동 응답 예시
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
