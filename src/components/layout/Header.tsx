import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type HeaderProps = {
  title?: string;
};

export default function Header({ title }: HeaderProps) {
  const navigate = useNavigate();
  const back = () => Number(window.history.state?.idx) > 0 ? navigate(-1) : navigate("/", { replace: true });
  return (
    <header
      className="
        sticky top-0 z-40 flex h-14 items-center justify-center
        border-b border-page-border bg-page-background
      "
    >
      <button type="button" aria-label="뒤로 가기" onClick={back} className="absolute left-3 grid h-10 w-10 place-items-center rounded-full text-page-heading hover:bg-gray-100"><ChevronLeft size={23} /></button>
      {title && <h1 className="text-base font-semibold text-page-heading">{title}</h1>}
    </header>
  );
}
