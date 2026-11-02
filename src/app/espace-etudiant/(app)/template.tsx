/** Transition douce à chaque changement de page (transform + opacity uniquement). */
export default function StudentTemplate({ children }: { children: React.ReactNode }) {
  return <div className="student-page">{children}</div>;
}
