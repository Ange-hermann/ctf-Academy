/** Transition de page : fondu depuis le noir + balayage doré (CSS pur, rejoué à chaque navigation). */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden">
        <span className="page-sweep absolute inset-y-0 left-0 w-1/2 bg-linear-to-r from-transparent via-or-light to-transparent" />
      </div>
      <div className="page-enter">{children}</div>
    </>
  );
}
