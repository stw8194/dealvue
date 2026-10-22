import { useEffect, useRef, useState } from "react";
import { Bot, ChevronLeft, Send, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { INQUIRY_FLOW, resolveInquiry } from "./inquiryFlow";

type ChatMessage = { id: number; role: "assistant" | "user"; content: string; step?: string };
const INITIAL_MESSAGE: ChatMessage = { id: 1, role: "assistant", step: "start", content: INQUIRY_FLOW.start.content };

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

  const respondingRef = useRef(false);
  const sendMessage = (content: string, nextStep?: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || respondingRef.current) return;
    respondingRef.current = true;
    const previous = messages.findLast(message => message.role === "assistant")?.step ?? "start";
    const step = nextStep ?? resolveInquiry(trimmedContent, previous);

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
          content: INQUIRY_FLOW[step].content,
          step,
        },
      ]);
      respondingRef.current = false;
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
          <h2 className="text-base font-black text-page-heading">딜뷰 뷰티 도우미</h2>
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            예약부터 혜택까지 함께 찾아봐요
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
                className={`whitespace-pre-line max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  message.role === "user"
                    ? "rounded-br-md bg-accent text-white"
                    : "rounded-bl-md border border-page-border bg-white text-page-heading"
                }`}
              >
                {message.content}
              </p>
            </div>
          ))}

          {!isResponding && messages.at(-1)?.role === "assistant" && (
            <div className="ml-10 grid gap-2 sm:grid-cols-2" aria-label="이어서 알아보기">
              {(INQUIRY_FLOW[messages.at(-1)?.step ?? "start"].choices).map(choice => choice.path
                ? <Link key={choice.label} to={choice.path} className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${choice.primary ? "border-accent bg-accent text-white shadow-sm" : "border-accent/25 bg-white text-accent hover:bg-pink-50"}`}>{choice.label}<span aria-hidden="true">→</span></Link>
                : <button key={choice.label} type="button" onClick={() => sendMessage(choice.label, choice.next)} className="min-h-11 rounded-xl border border-accent/25 bg-white px-3 py-3 text-left text-sm font-semibold text-accent hover:bg-pink-50">{choice.label}</button>)}
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

      <p className="bg-white px-4 pt-2 text-center text-[10px] text-gray-400">선택한 내용에 따라 안내하는 자동 상담이에요.</p>
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
