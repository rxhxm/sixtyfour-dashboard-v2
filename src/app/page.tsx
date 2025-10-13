import { redirect } from 'next/navigation'

// Root page redirects to Workflows (first tab)
export default function HomePage() {
  redirect('/workflows')
}

