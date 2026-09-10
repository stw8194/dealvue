type HeaderProps = {
  title?: string;
};

export default function Header({ title }: HeaderProps) {
  return (
    <header
      className="
        sticky top-0 z-40 flex h-14 items-center justify-center
        border-b border-page-border bg-page-background
      "
    >
      {title && <h1 className="text-base font-semibold text-page-heading">{title}</h1>}
    </header>
  );
}
