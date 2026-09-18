export default function Skull({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 180 190" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Caveira barbada BarberFlow" role="img">
    <path d="M42 36c11-17 31-25 48-25s37 8 48 25l10 21-5 35-15 20-8 21-16 14H76l-16-14-8-21-15-20-5-35 10-21Z" fill="currentColor"/>
    <path d="M40 56c10-7 16-21 18-29 12 7 22 7 32 5 10 2 20 2 32-5 2 8 8 22 18 29l-4 29-13 15-11-3c-5-6-13-9-22-9s-17 3-22 9l-11 3-13-15-4-29Z" fill="#0a0a0a"/>
    <path d="M56 72c3-12 14-18 28-13 2 10-3 19-13 21-8 2-14-1-15-8Zm68 0c-3-12-14-18-28-13-2 10 3 19 13 21 8 2 14-1 15-8Z" fill="currentColor"/>
    <path d="m83 92 7-10 7 10-7 5-7-5Z" fill="currentColor"/>
    <path d="M49 102c11 2 18 10 24 16l17-8 17 8c6-6 13-14 24-16-2 24-14 51-41 69-27-18-39-45-41-69Z" fill="currentColor"/>
    <path d="M72 123c11 7 25 7 36 0M90 129v24" stroke="#0a0a0a" strokeWidth="5" strokeLinecap="round"/>
    <path d="M37 52 24 43M143 52l13-9M45 31 35 19M135 31l10-12" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
  </svg>;
}
