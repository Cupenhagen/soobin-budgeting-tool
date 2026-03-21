import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-grouped)] px-4">
      <div className="mb-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-2xl">S</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create account</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Sign up — access requires admin approval
        </p>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: 'w-full max-w-sm',
            card: 'shadow-card rounded-2xl border border-[var(--border)]',
          },
        }}
      />
    </div>
  )
}
