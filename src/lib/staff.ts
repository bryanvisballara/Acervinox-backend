import { useLocation } from 'react-router-dom'

export function useStaffBase() {
  const { pathname } = useLocation()
  return pathname.startsWith('/workshop') ? '/workshop' : '/admin'
}
